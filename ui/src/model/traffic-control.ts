import { Bus, RanchUtils } from "@pb33f/ranch";
import { In, Info } from "./arazzo";
import {
  normalizeMap,
  deepSnakeToCamel,
  httpMethods,
  IO,
} from "./traffic-control-utils";
import { MediaType, Operation, PathItem, ResponseCode } from "./paths";
import { relativeTimeThreshold } from "moment";
import { html } from "lit";
import { TrafficControlComponent } from "@/components/controls/traffic-control.component";

export class StepMetadata {
  id: string;
  description: string;
  stepName: string;
  operationID: string;
  position: { x: number; y: number };
  operation: Operation;
  pathName: string;

  constructor(operationID: string) {
    this.operationID = operationID;
    this.position = {
      x: 0,
      y: 0,
    };
    this.stepName = "";
    this.id = RanchUtils.genShortId(6);
  }

  static NewStepMetadata(sm): StepMetadata {
    const nsm = new StepMetadata(sm.operationid);

    nsm.id = sm.id;
    nsm.description = sm.description;
    nsm.stepName = sm.stepname;
    nsm.pathName = sm.pathname;
    nsm.position.x = sm.position.x;
    nsm.position.y = sm.position.y;

    return nsm;
  }

  update(stepMetadata: StepMetadata) {
    this.operation = stepMetadata.operation;
    this.position.x = stepMetadata.position.x;
    this.position.y = stepMetadata.position.y;
  }

  debug() {
    const debugPosition = `x: ${this.position.x} y: ${this.position.y}`;

    return `operationID: ${
      this.operationID
    }, position: ${debugPosition} operation: ${this.operation?.debug()}`;
  }

  setOperation(operation: Operation): StepMetadata {
    this.operation = operation;

    return this;
  }
  setPositionByCoords(position: { x: number; y: number }): StepMetadata {
    this.position = position;

    return this;
  }

  setPathName(pathName: string): StepMetadata {
    this.pathName = pathName;

    return this;
  }

  setPosition(parent: Element): StepMetadata {
    const root = parent.shadowRoot;

    const b = document.body.getBoundingClientRect();
    this.position.x = b.width / 2;
    this.position.y = b.height / 2;

    return this;
  }

  doesStepContainAnchors(pipe: Pipe): Anchor[] {
    const anchors = [pipe.input, ...pipe.outputs].filter((a: Anchor) => {
      return a.stepID === this.id;
    });

    return anchors;
  }

  normalize() {
    return {
      id: this.id,
      description: this.description,
      stepName: this.stepName,
      operationID: this.operationID,
      position: this.position,
      pathName: this.pathName,
    };
  }

  // all other UI state goes here, like positioning of yadayada, if something is opened or not
}

export class WorkflowMetadata {
  stepMetadatas: Map<string, StepMetadata>;
  workflowID: string;
  isActivated: boolean;
  pipes: Map<string, Pipe>;
  summary: string;
  description: string;
  workflowName: string;
  constructor() {
    this.workflowID = RanchUtils.genShortId(6);
    this.isActivated = true;
    this.stepMetadatas = new Map();
    this.pipes = new Map();
    this.workflowName = "";
  }

  debug() {
    const stepMetadataDebug = normalizeMap(this.stepMetadatas).map(
      (stepMetadata: StepMetadata) => {
        return stepMetadata.debug();
      }
    );

    return `\tworkflowMetadata ${this.workflowID} ${this.isActivated} \n\t\t stepMetadata: ${stepMetadataDebug}\n`;
  }

  addStepMetadata(operationID: string, parent: Element): StepMetadata {
    const stepMetadata = new StepMetadata(operationID).setPosition(parent);

    this.stepMetadatas.set(stepMetadata.id, stepMetadata);

    return stepMetadata;
  }

  updateStepMetadata(stepMetadata: StepMetadata) {
    this.stepMetadatas.get(stepMetadata.id).update(stepMetadata);
  }

  static NewWorkflowMetadata(workflowMetadata): WorkflowMetadata {
    const wfm = new WorkflowMetadata();

    wfm.isActivated = workflowMetadata.isActivated;

    Object.entries(workflowMetadata.stepMetadata).map(([_, value]) => {
      const sm = StepMetadata.NewStepMetadata(value);
      wfm.stepMetadatas.set(sm.id, sm);
    });

    Object.entries(workflowMetadata.pipes).map(([_, value]) => {
      const pipe = Pipe.NewPipe(value);
      wfm.pipes.set(pipe.id, pipe);
    });

    // Object.entries(workflowMetadata.variables).map(([_, value]) => {
    //   const v = Variable.NewVariable(value);
    //   wfm.variables.set(v.id, v);
    // });

    wfm.workflowName = workflowMetadata.workflowname;
    wfm.description = workflowMetadata.description;
    wfm.summary = workflowMetadata.summary;
    wfm.workflowID = workflowMetadata.workflowId;

    return wfm;
  }

  normalize() {
    return {
      summary: this.summary,
      description: this.description,
      workflowName: this.workflowName,
      workflowID: this.workflowID,
      isActivated: this.isActivated,
      stepMetadatas: normalizeMap(this.stepMetadatas).map(
        (stepMetadata: StepMetadata) => {
          return stepMetadata.normalize();
        }
      ),
      pipes: normalizeMap(this.pipes).map((pipe: Pipe) => {
        return pipe.normalize();
      }),
    };
  }
}

export class MockBoard {
  arazzo: string;
  workflowMetadatas: Map<string, WorkflowMetadata>;
  info: Info;

  constructor() {
    this.workflowMetadatas = new Map();
  }

  debug(
    suppressArazzo: boolean = false,
    suppressWorkflowMetadata: boolean = false
  ) {
    if (!suppressArazzo) {
      // this.arazzo.debugArazzo();
    }

    if (!suppressWorkflowMetadata) {
      const workflowMetadataDeub = normalizeMap(this.workflowMetadatas)
        .map((workflowMetadata: WorkflowMetadata) => {
          return workflowMetadata.debug();
        })
        .join();
    }
  }

  static NewMockBoard(payload: any): MockBoard {
    const mockboard = new MockBoard();

    payload = deepSnakeToCamel(payload);
    Object.entries(payload.workflowMetadata).map(([_, workflowMetadata]) => {
      const wfm = WorkflowMetadata.NewWorkflowMetadata(workflowMetadata);
      mockboard.workflowMetadatas.set(wfm.workflowID, wfm);
    });

    return mockboard;
  }

  setOperationsInSteps(pathItems: PathItem[]) {
    normalizeMap(this.workflowMetadatas).forEach((wfm: WorkflowMetadata) => {
      normalizeMap(wfm.stepMetadatas).forEach((sm: StepMetadata) => [
        sm.setOperation(PathItem.GetOperation(pathItems, sm.operationID)),
      ]);
    });
  }

  addNewStep(
    currentWorkflowID: string,
    pathItem: PathItem,
    operationID: string,
    parent: Element,
    bus: Bus
  ): StepMetadata {
    let operation: Operation;
    httpMethods.forEach((method: string) => {
      const curOp = pathItem[method] as Operation;

      if (curOp.operationId === operationID) {
        operation = curOp;
      }
    });

    const stepMetadata = this.workflowMetadatas
      .get(currentWorkflowID)
      .addStepMetadata(operationID, parent)
      .setOperation(operation)
      .setPathName(pathItem.name);

    if (bus?.getClient()?.connected) {
      bus.publish({
        destination: "/pub/queue/traffic-control",
        body: JSON.stringify({
          id: RanchUtils.genUUID(),
          request: UpdateWorkflow,
          payload: JSON.stringify({
            workflowID: currentWorkflowID,
            workflowMetadata: this.workflowMetadatas
              .get(currentWorkflowID)
              .normalize(),
          }),
        }),
      });
    }

    return stepMetadata;
  }

  createNewWorkflow(bus: Bus): WorkflowMetadata {
    const newWorkflowMetadata = new WorkflowMetadata();
    this.workflowMetadatas.set(
      newWorkflowMetadata.workflowID,
      newWorkflowMetadata
    );

    if (bus?.getClient()?.connected) {
      bus.publish({
        destination: "/pub/queue/traffic-control",
        body: JSON.stringify({
          id: RanchUtils.genUUID(),
          request: CreateNewWorkflow,
          payload: JSON.stringify({
            workflowMetadatas: this.normalizeWorkflowMetadatas(
              this.workflowMetadatas
            ),
          }),
        }),
      });
    }

    return newWorkflowMetadata;
  }

  private normalizeWorkflowMetadatas(
    workflowMetadata: Map<string, WorkflowMetadata>
  ) {
    return normalizeMap(workflowMetadata).map(
      (workflowMetadata: WorkflowMetadata) => {
        return workflowMetadata.normalize();
      }
    );
  }

  addNewPipe(workflowID: string, pipe: Pipe, bus: Bus) {
    const workflow = this.workflowMetadatas.get(workflowID);
    workflow.pipes.set(pipe.id, pipe);

    this.updateWorkflow(workflowID, bus);
  }

  deleteWorkflow(workflowID: string, bus: Bus) {
    this.workflowMetadatas.delete(workflowID);
    if (bus?.getClient()?.connected) {
      bus.publish({
        destination: "/pub/queue/traffic-control",
        body: JSON.stringify({
          id: RanchUtils.genUUID(),
          request: DeleteWorkflow,
          payload: JSON.stringify({
            workflowID: workflowID,
          }),
        }),
      });
    }
  }

  updateWorkflow(workflowID: string, bus: Bus) {
    if (bus?.getClient()?.connected) {
      bus.publish({
        destination: "/pub/queue/traffic-control",
        body: JSON.stringify({
          id: RanchUtils.genUUID(),
          request: UpdateWorkflow,
          payload: JSON.stringify({
            workflowID: workflowID,
            workflowMetadata: this.workflowMetadatas
              .get(workflowID)
              .normalize(),
          }),
        }),
      });
    }
  }
}

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
    return `$${this.property}`;
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
    return `$${this.property}`;
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

  getProperty() {
    return `$${this.type}.${this.property}`;
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
    anchor.anchorReferences = value?.anchorreferences;
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
      return html`<sl-badge>${ar.property}</sl-badge>`;
    });
  }

  // get all receiver pipe's properties.
  getInputExpression() {
    if (this.anchorReferences.length === 0) {
      return [{ id: this.id, property: this.getProperty() }];
    }

    return [
      ...this.anchorReferences,
      { id: this.id, property: this.getProperty() },
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
    const pipe = new Pipe(this.referenceType, this.parameterProperty);
    this.addAnchorPipe(pipe);

    this.expression = this.getExpression();

    // overwright input
    pipe.input = this;
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
    return this.getProperty();
  }

  getFullProperty() {
    return `${this.pathName} | ${this.pathMethod} | ${this.getProperty()}`;
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
    const pipeID = this.receiverPipes[0];

    if (bus?.getClient()?.connected) {
      bus.publish({
        destination: "/pub/queue/traffic-control",
        body: JSON.stringify({
          id: RanchUtils.genUUID(),
          request: UpdateAnchor,
          payload: JSON.stringify({
            workflowID: workflowID,
            pipeID: pipeID,
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
  input: Anchor;
  outputs: Anchor[];
  exposeOutOfWorkflow: boolean;
  isPopulated: boolean;
  constructor(referenceType: AnchorType, propertyType: Property) {
    this.id = RanchUtils.genShortId(6);
    this.name = "";
    this.input = new Anchor(referenceType, propertyType);
    this.outputs = [];
    this.exposeOutOfWorkflow = false;
    this.isPopulated = false;
  }

  renderOutputs() {
    if (this.outputs.length === 0) {
      return html`❌`;
    }
    if (this.outputs.length === 1) {
      return html` ${this.outputs[0].getProperty()} `;
    }

    return html` <sl-badge variant="primary" pill pulse
      >${this.outputs.length}</sl-badge
    >`;
  }

  renderPipeBadge() {
    return html`<sl-badge class="pipe-badge"
      >${this.input.getProperty()}
      <sl-icon name="chevron-double-right"></sl-icon
      >${this.renderOutputs()}</sl-badge
    >`;
  }

  static NewPipe(value): Pipe {
    const pipe = new Pipe(
      value.input.referencetype,
      value.input[value.input.referencetype]
    );

    pipe.id = value.id;
    pipe.exposeOutOfWorkflow = value.exposeoutofworkflow;
    pipe.isPopulated = value.ispopulated;
    pipe.name = value.name;
    pipe.input = Anchor.NewAnchor(value.input);
    pipe.id = value.id;
    pipe.outputs = value.outputs.map((output: Anchor) =>
      Anchor.NewAnchor(output)
    );

    return pipe;
  }

  addPathAnchor(pathName: string, pathMethod: string, stepID: string): Pipe {
    this.input.addPathAnchor(pathName, pathMethod, stepID);

    return this;
  }

  addOutput(reference: Anchor) {
    reference.receiverPipes.push(this.id);
    // I need to send in the anchor ID, but also the property
    // why not just property? that won't work. However, render it as
    reference.addAnchorReference({
      id: this.input.id,
      property: this.input.getProperty(),
    });

    reference.expression = this.input.getExpression();
    reference.lastSelectedPipe = this;
    this.outputs.push(reference);
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
      input: this.input.normalize(),
      outputs: this.outputs.map((output: Anchor) => output.normalize()),
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
