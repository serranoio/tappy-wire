import { RanchUtils } from "@pb33f/ranch";
import { MediaType, Operation, Parameter } from "../paths";
import { Pipe, Anchor } from "../traffic-control";

// & keep eye out, I have to now send in Operation to the backend
// or at least some form of it
export class StepMetadata {
  id: string;
  description: string;
  stepName: string;
  operationID: string;
  position: { x: number; y: number };
  operation: Operation;
  pathName: string;
  isGlowing: boolean;
  selectedCode: string;

  constructor(operationID: string) {
    this.operationID = operationID;
    this.position = {
      x: 0,
      y: 0,
    };
    this.stepName = "";
    this.id = RanchUtils.genShortId(6);
    this.isGlowing = false;
  }

  glow() {
    this.isGlowing = true;

    setTimeout(() => {
      this.isGlowing = false;
    }, 5 * 1000);
  }

  static NewStepMetadata(sm): StepMetadata {
    const nsm = new StepMetadata(sm.operationid);

    nsm.id = sm.id;
    nsm.description = sm.description;
    nsm.stepName = sm.stepname;
    nsm.pathName = sm.pathname;
    nsm.position.x = sm.position.x;
    nsm.position.y = sm.position.y;
    nsm.operation = new Operation(sm.operation, sm.method);
    nsm.selectedCode = sm.selectedcode;

    console.log(nsm, sm);

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
    const clonedOperation = structuredClone(this.operation);
    if (!this.operation) {
      this.operation = operation;
      return this;
    }

    // we only need to keep the state, the schema can be handled by the newOperation
    // we lose the selectedRef
    this.operation = operation;

    // only keep the schema values from the operation
    this.operation.requestBody?.content?.forEach((mt: MediaType) => {
      mt.schema.ref = clonedOperation.requestBody?.content?.get(
        mt.name
      )?.schema.ref;
      mt.selectedExample = clonedOperation.requestBody?.content?.get(
        mt.name
      ).selectedExample;
    });

    this.operation.responses?.codes?.forEach((code) => {
      code.content.forEach((mt: MediaType) => {
        mt.schema.ref = clonedOperation.responses?.codes
          ?.get(code.name)
          .content.get(mt.name)?.schema.ref;

        mt.selectedExample = clonedOperation.responses?.codes
          ?.get(code.name)
          .content.get(mt.name)?.selectedExample;
      });
    });

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
      operation: this.operation.normalize(),
      selectedCode: this.selectedCode,
    };
  }

  // all other UI state goes here, like positioning of yadayada, if something is opened or not
}
