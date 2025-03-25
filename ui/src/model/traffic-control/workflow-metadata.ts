import { RanchUtils } from "@pb33f/ranch";
import { Pipe } from "../traffic-control";
import { normalizeMap } from "../traffic-control-utils";
import { StepMetadata } from "./step-metadata";

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

  getWorkflowName() {
    return this.workflowName === "" ? this.workflowID : this.workflowName;
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

    // the backend did not send operation. we had to take it every time with operationId
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
