import { Bus, RanchUtils } from "@pb33f/ranch";
import { Info } from "../arazzo";
import { PathItem, Operation } from "../paths";
import {
  UpdateWorkflow,
  CreateNewWorkflow,
  Pipe,
  DeleteWorkflow,
  Anchor,
} from "../traffic-control";
import {
  normalizeMap,
  deepSnakeToCamel,
  httpMethods,
} from "../traffic-control-utils";
import { StepMetadata } from "./step-metadata";
import { WorkflowMetadata } from "./workflow-metadata";

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

  addNewAnchor(workflowID: string, anchor: Anchor, bus: Bus) {
    const workflow = this.workflowMetadatas.get(workflowID);

    if (
      !workflow.anchors.map((anchor: Anchor) => anchor.id).includes(anchor.id)
    ) {
      workflow.anchors.push(anchor);
    }

    this.updateWorkflow(workflowID, bus);
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
