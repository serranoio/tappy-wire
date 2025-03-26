import { Bus, RanchUtils } from "@pb33f/ranch";
import { In, Info } from "./arazzo";
import {
  normalizeMap,
  deepSnakeToCamel,
  httpMethods,
  IO,
  insertSpaces,
} from "./traffic-control-utils";
import { MediaType, Operation, PathItem, ResponseCode } from "./paths";
import { relativeTimeThreshold } from "moment";
import { html } from "lit";
import { StepMetadata } from "./traffic-control/step-metadata";
import { WorkflowMetadata } from "./traffic-control/workflow-metadata";

export type AnchorType =
  | "request-body"
  | "response-body"
  | "parameter"
  | "workflow"
  | "custom";

export type Polymorphism = "anyOf" | "allOf" | "not" | "oneOf" | "";

export class ResponseBodyProperty {
  mediaTypeName: string;
  responseCodeName: string;
  example: string;
  examples: string;
  property: string;

  constructor(
    mediaTypeName: string,
    responseCodeName: string,
    property: string
  ) {
    this.mediaTypeName = mediaTypeName;
    this.responseCodeName = responseCodeName;
    this.example = "";
    this.examples = "";
    this.property = property;
  }

  static New(value): ResponseBodyProperty {
    const rbp = new ResponseBodyProperty(
      value.mediatypename,
      value.responsecodename,
      value.property
    );
    rbp.example = value.example;
    rbp.examples = value.examples;
    return rbp;
  }

  addExtraFields(value) {
    this.example = value?.example;
    this.examples = value?.examples;
  }

  getProperty() {
    return `${this.property}`;
  }

  normalize() {
    return {
      responseCodeName: this.responseCodeName,
      mediaTypeName: this.mediaTypeName,
      example: this.example,
      examples: this.examples,
      property: this.property,
    };
  }
}

export class RequestBodyProperty {
  mediaTypeName: string;
  example: string;
  examples: string;
  property: string;
  constructor(mediaTypeName: string, property: string) {
    this.mediaTypeName = mediaTypeName;
    this.example = "";
    this.examples = "";
    this.property = property;
  }

  static New(value): RequestBodyProperty {
    const rqbp = new RequestBodyProperty(value.mediatypename, value.property);
    rqbp.example = value.example;
    rqbp.examples = value.examples;
    return rqbp;
  }

  addExtraFields(value) {
    this.example = value?.example;
    this.examples = value?.examples;
  }

  getProperty() {
    return `${this.property}`;
  }

  normalize() {
    return {
      mediaTypeName: this.mediaTypeName,
      example: this.example,
      examples: this.examples,
      property: this.property,
    };
  }
}
export class ParameterProperty {
  type: In;
  property: string;

  constructor(type: In, property: string) {
    this.property = property;
    this.type = type;
  }

  static New(value): ParameterProperty {
    return new ParameterProperty(value.type, value.property);
  }

  static ConstructProperty(type: In, property: string) {
    return `${type}.${property}`;
  }

  getProperty() {
    return `${this.type}.${this.property}`;
  }

  normalize() {
    return {
      type: this.type,
      property: this.property,
    };
  }
}

type Property = ResponseBodyProperty | RequestBodyProperty | ParameterProperty;

export interface AnchorReference {
  id: string; // anchor id
  property: string; // anchor property
  pathName: string; // human readable stepID
}

export class Anchor {
  referenceType: AnchorType;
  id: string;
  responseBodyProperty?: ResponseBodyProperty;
  requestBodyProperty?: RequestBodyProperty;
  parameterProperty?: ParameterProperty;
  expression: string;
  pathName?: string;
  pathMethod?: string;
  stepID: string;
  value: string;
  expressionValue: string;
  receiverPipes: string[];
  senderPipes: string[];
  lastSelectedPipe: Pipe | null;
  anchorReferences: AnchorReference[];

  constructor(referenceType: AnchorType, propertyType: Property) {
    this.id = RanchUtils.genShortId(6);
    this.value = "";
    this.referenceType = referenceType;
    if (propertyType instanceof ResponseBodyProperty) {
      this.responseBodyProperty = propertyType;
    } else if (propertyType instanceof RequestBodyProperty) {
      this.requestBodyProperty = propertyType;
    } else if (propertyType instanceof ParameterProperty) {
      this.parameterProperty = propertyType;
    }
    this.pathMethod = "";
    this.pathName = "";
    this.receiverPipes = [];
    this.senderPipes = [];
    this.lastSelectedPipe = null;
    this.stepID = "";
    this.anchorReferences = [];
    this.expressionValue = "";
  }

  static NewAnchor(value): Anchor {
    const anchor = new Anchor(value.referencetype, value[value.referencetype]);

    anchor.id = value.id;
    anchor.value = value.value;
    anchor.expression = value.expression;
    anchor.expressionValue = value.expressionvalue;
    anchor.pathMethod = value?.pathmethod;
    anchor.pathName = value?.pathname;
    anchor.receiverPipes = value?.receiverpipes;
    anchor.senderPipes = value?.senderpipes;
    anchor.stepID = value?.stepid;
    if (value.anchorreferences) {
      anchor.anchorReferences = value.anchorreferences.map((ar) => {
        return {
          id: ar.id,
          property: ar.property,
          pathName: ar.pathname,
        };
      });
    } else {
      anchor.anchorReferences = [];
    }

    anchor.referenceType = value.referencetype;
    switch (value.referencetype as AnchorType) {
      case "request-body":
        anchor.requestBodyProperty = RequestBodyProperty.New(
          value.requestbodyproperty
        );
        break;
      case "response-body":
        anchor.responseBodyProperty = ResponseBodyProperty.New(
          value.responsebodyproperty
        );
        break;
      case "parameter":
        anchor.parameterProperty = ParameterProperty.New(
          value.parameterproperty
        );
        break;
      case "workflow":
    }

    return anchor;
  }
  renderInputExpressionBox() {
    return this.getInputExpression().map((ar: AnchorReference) => {
      return html`
        <sl-tooltip>
          <p slot="content">${insertSpaces(ar.pathName)}</p>
          <sl-badge
            >${ar.property}
            <sl-copy-button value=${ar.property}></sl-copy-button>
          </sl-badge>
        </sl-tooltip>
      `;
    });
  }

  // get all receiver pipe's properties.
  getInputExpression() {
    if (this.anchorReferences.length === 0) {
      return [
        {
          id: this.id,
          property: this.getFullProperty(),
          pathName: this.pathName,
        },
      ];
    }

    return [
      ...this.anchorReferences,
      {
        id: this.id,
        property: this.getFullProperty(),
        pathName: this.pathName,
      },
    ];
  }

  addAnchorReference(anchorReference: AnchorReference) {
    this.anchorReferences.push(anchorReference);
  }

  isInPipe() {
    return this.isAReceiver() || this.isASender();
  }

  isAReceiver() {
    return this.receiverPipes.length > 0;
  }

  isASender() {
    return this.senderPipes.length > 0;
  }

  addAnchorPipe(pipe: Pipe) {
    this.lastSelectedPipe = pipe;
    this.senderPipes.push(pipe.id);

    return pipe;
  }

  addPathAnchor(pathName: string, pathMethod: string, stepID: string) {
    this.pathMethod = pathMethod;
    this.pathName = pathName;
    this.stepID = stepID;
  }

  // send data through this pipe
  newPipe(): Pipe {
    const pipe = new Pipe(this.id);
    this.addAnchorPipe(pipe);

    this.expression = this.getFullProperty();

    return pipe;
  }

  getProperty() {
    if (this.responseBodyProperty) {
      return this.responseBodyProperty.getProperty();
    }
    if (this.requestBodyProperty) {
      return this.requestBodyProperty.getProperty();
    }
    if (this.parameterProperty) {
      return this.parameterProperty.getProperty();
    }
  }

  getExpression() {
    return this.getFullProperty();
  }

  getFullProperty() {
    return `$${this.id}-${this.getProperty()}`;
  }

  addExtraFields(value) {
    this.id = value?.id;
    this.value = value.value;
  }

  deleteAnchor(workflowID: string, pipeID: string, bus: Bus) {
    if (bus?.getClient()?.connected) {
      bus.publish({
        destination: "/pub/queue/traffic-control",
        body: JSON.stringify({
          id: RanchUtils.genUUID(),
          request: DeleteAnchor,
          payload: JSON.stringify({
            workflowID: workflowID,
            pipeID: pipeID,
            anchorID: this.id,
          }),
        }),
      });
    }
  }

  updateAnchor(workflowID: string, bus: Bus) {
    if (bus?.getClient()?.connected) {
      bus.publish({
        destination: "/pub/queue/traffic-control",
        body: JSON.stringify({
          id: RanchUtils.genUUID(),
          request: UpdateAnchor,
          payload: JSON.stringify({
            workflowID: workflowID,
            anchor: this.normalize(),
          }),
        }),
      });
    }
  }

  normalize() {
    let obj: any = {};

    if (this.responseBodyProperty) {
      obj.responseBodyProperty = this.responseBodyProperty.normalize();
    }
    if (this.requestBodyProperty) {
      obj.requestBodyProperty = this.requestBodyProperty.normalize();
    }

    if (this.parameterProperty) {
      obj.parameterProperty = this.parameterProperty.normalize();
    }

    if (this.pathName) {
      obj.pathName = this.pathName;
    }

    if (this.pathMethod) {
      obj.pathMethod = this.pathMethod;
    }

    return {
      referenceType: this.referenceType,
      id: this.id,
      expression: this.expression,
      stepID: this.stepID,
      value: this.value,
      expressionValue: this.expressionValue,
      receiverPipes: this.receiverPipes,
      senderPipes: this.senderPipes,
      anchorReferences: this.anchorReferences,
      ...obj,
    };
  }
}

export class Pipe {
  id: string;
  name: string;
  input: string;
  outputs: string[];
  exposeOutOfWorkflow: boolean;
  isPopulated: boolean;
  constructor(inputID: string) {
    this.id = RanchUtils.genShortId(6);
    this.name = "";
    this.outputs = [];
    this.exposeOutOfWorkflow = false;
    this.isPopulated = false;
    this.input = inputID;
  }

  renderOutputs(workflow: WorkflowMetadata) {
    const outputs = workflow.getOutputAnchorsInThisPipe(this.outputs);

    if (outputs.length === 0) {
      return html`❌`;
    }
    if (outputs.length === 1) {
      return html` ${outputs[0].getProperty()} `;
    }

    return html` <sl-badge variant="primary" pill pulse
      >${outputs.length}</sl-badge
    >`;
  }

  renderPipeBadge(workflow: WorkflowMetadata) {
    const input = workflow.getInputAnchorInThisPipe(this.input);

    return html`<sl-badge class="pipe-badge"
      >${input.getProperty()}
      <sl-icon name="chevron-double-right"></sl-icon>${this.renderOutputs(
        workflow
      )}</sl-badge
    >`;
  }

  static NewPipe(value): Pipe {
    const pipe = new Pipe(value.input);

    pipe.id = value.id;
    pipe.exposeOutOfWorkflow = value.exposeoutofworkflow;
    pipe.isPopulated = value.ispopulated;
    pipe.name = value.name;
    pipe.input = value.input;
    pipe.id = value.id;
    pipe.outputs = value.outputs;

    return pipe;
  }

  addOutput(reference: Anchor, workflow: WorkflowMetadata) {
    reference.receiverPipes.push(this.id);
    // I need to send in the anchor ID, but also the property
    // why not just property? that won't work. However, render it as
    const inputAnchor = workflow.getInputAnchorInThisPipe(this.input);
    reference.addAnchorReference({
      id: inputAnchor.id,
      property: inputAnchor.getFullProperty(),
      pathName: inputAnchor.pathName,
    });

    reference.expression = inputAnchor.getExpression();
    reference.lastSelectedPipe = this;
    this.outputs.push(reference.id);
  }

  // ! not implementing yet
  deletePipe(workflowID: string, bus: Bus) {
    if (bus?.getClient()?.connected) {
      bus.publish({
        destination: "/pub/queue/traffic-control",
        body: JSON.stringify({
          id: RanchUtils.genUUID(),
          request: DeletePipe,
          payload: JSON.stringify({
            workflowID: workflowID,
          }),
        }),
      });
    }
  }

  updatePipe(workflowID: string, bus: Bus) {
    if (bus?.getClient()?.connected) {
      bus.publish({
        destination: "/pub/queue/traffic-control",
        body: JSON.stringify({
          id: RanchUtils.genUUID(),
          request: UpdatePipe,
          payload: JSON.stringify({
            workflowID: workflowID,
            pipe: this.normalize(),
          }),
        }),
      });
    }
  }

  normalize() {
    return {
      id: this.id,
      name: this.name,
      input: this.input,
      outputs: this.outputs,
      exposeOutOfWorkflow: this.exposeOutOfWorkflow,
      isPopulated: this.isPopulated,
    };
  }
}

export const MockBoardKey = "mockboard-key";
export const PathsKey = "paths-key";

export const TrafficControlStore = "traffic-control-store";
export const TrafficControlPaths = "traffic-control-paths";
export const TrafficControlChannel = "traffic-control";
export const SetPathToMockModeCommand = "set-path-to-mock-mode";
export const SetPathPolymorphicSchema = "set-path-polymorphic-schema";
export const SetPathPreferenceExample = "set-path-preference-example";
export const SetPathVariablesCommand = "set-path-variables-command";
export const SetPathRQVariablesCommand =
  "set-path-request-body-variables-command";

export const CreateNewWorkflow = "create-new-workflow";
export const ChangeWorkflowName = "change-workflow-name";
export const UpdateWorkflow = "update-workflow";
export const DeleteWorkflow = "delete-workflow";
export const GetWorkflows = "get-workflows";

// holy shit
export const UpdateAnchor = "update-anchor";
export const DeleteAnchor = "delete-anchor";

export const UpdatePipe = "update-pipe";
export const DeletePipe = "delete-pipe";

export const GetAllPathsCommand = "get-all-paths";

export const Test = "test";
