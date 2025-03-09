import { Bus, RanchUtils } from "@pb33f/ranch";
import { Arazzo, Workflow } from "./arazzo";
import {
  normalizeMap,
  deepSnakeToCamel,
  httpMethods,
} from "./traffic-control-utils";
import { Operation, PathItem } from "./paths";

export class StepMetadata {
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

  normalize() {
    return {
      operationID: this.operationID,
      position: this.position,
    };
  }

  static NewStepMetadata(stepMetadata): StepMetadata {
    const sm = new StepMetadata(stepMetadata.operationId);
    sm.position = stepMetadata.position;
    return sm;
  }
  // all other UI state goes here, like positioning of yadayada, if something is opened or not
}

export class WorkflowMetadata {
  stepMetadatas: Map<string, StepMetadata>;
  workflowID: string;
  isActivated: boolean;
  constructor(id: string) {
    this.workflowID = id;
    this.isActivated = true;
    this.stepMetadatas = new Map();
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

    this.stepMetadatas.set(stepMetadata.operationID, stepMetadata);

    return stepMetadata;
  }

  updateStepMetadata(stepMetadata: StepMetadata) {
    this.stepMetadatas.get(stepMetadata.operationID).update(stepMetadata);
  }

  static NewWorkflowMetadata(workflowMetadata): WorkflowMetadata {
    const wfm = new WorkflowMetadata(workflowMetadata.workflowId);

    wfm.isActivated = workflowMetadata.isActivated;

    Object.entries(workflowMetadata.stepMetadata).map(([_, value]) => {
      const sm = StepMetadata.NewStepMetadata(value);
      wfm.stepMetadatas.set(sm.operationID, sm);
    });

    return wfm;
  }

  normalize() {
    return {
      workflowID: this.workflowID,
      isActivated: this.isActivated,
      stepMetadatas: normalizeMap(this.stepMetadatas).map(
        (stepMetadata: StepMetadata) => {
          return stepMetadata.normalize();
        }
      ),
    };
  }
}

export class MockBoard {
  arazzo: Arazzo;
  workflowMetadatas: Map<string, WorkflowMetadata>;

  constructor() {
    this.arazzo = new Arazzo();
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

      console.log(workflowMetadataDeub);
    }
  }

  deleteWorkflow(workflowID: string) {
    this.arazzo.workflows.delete(workflowID);
    this.workflowMetadatas.delete(workflowID);
  }

  static NewMockBoard(payload: any): MockBoard {
    const mockboard = new MockBoard();

    // console.log("1. paylod", payload);
    payload = deepSnakeToCamel(payload);
    Object.entries(payload.workflowMetadata).map(([_, workflowMetadata]) => {
      const wfm = WorkflowMetadata.NewWorkflowMetadata(workflowMetadata);
      mockboard.workflowMetadatas.set(wfm.workflowID, wfm);
    });

    mockboard.arazzo = Arazzo.NewArazzo(payload.arazzo);
    // console.log("2. mockboard from payload", mockboard);

    return mockboard;
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

    this.arazzo.workflows.get(currentWorkflowID).addStep(operationID);

    return stepMetadata;
  }

  createNewWorkflow(bus: Bus): WorkflowMetadata {
    const arazzoWorkflow = this.arazzo.createNewWorkflow();
    const newWorkflowMetadata = new WorkflowMetadata(arazzoWorkflow.workflowID);
    this.workflowMetadatas.set(arazzoWorkflow.workflowID, newWorkflowMetadata);

    if (bus?.getClient()?.connected) {
      bus.publish({
        destination: "/pub/queue/traffic-control",
        body: JSON.stringify({
          id: RanchUtils.genUUID(),
          request: CreateNewWorkflow,
          payload: JSON.stringify({
            workflows: this.normalizeArazzoWorkflows(this.arazzo.workflows),
            workflowMetadatas: this.normalizeWorkflowMetadatas(
              this.workflowMetadatas
            ),
          }),
        }),
      });
    }

    return newWorkflowMetadata;
  }

  private normalizeArazzoWorkflows(arazzoWorkflow: Map<string, Workflow>) {
    return normalizeMap(arazzoWorkflow).map((workflow: Workflow) => {
      return workflow.normalize();
    });
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

  changeWorkflowName(oldID: string, newID: string, bus: Bus) {
    this.arazzo.changeWorkflowName(oldID, newID);

    const workflow = this.workflowMetadatas.get(oldID);
    workflow.workflowID = newID;
    this.workflowMetadatas.set(newID, workflow);
    this.workflowMetadatas.delete(oldID);

    if (bus?.getClient()?.connected) {
      bus.publish({
        destination: "/pub/queue/traffic-control",
        body: JSON.stringify({
          id: RanchUtils.genUUID(),
          request: ChangeWorkflowName,
          payload: JSON.stringify({
            oldID: oldID,
            newID: newID,
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
            workflow: this.arazzo.workflows.get(workflowID).normalize(),
            workflowMetadata: this.workflowMetadatas
              .get(workflowID)
              .normalize(),
          }),
        }),
      });
    }
  }
}

export interface Variable {
  name: string;
  value: string;
  id: string;
}

export class TrafficControlPath {
  mockType: string;
  examplePreference: string;
  isPathInMockMode: boolean;
  pathName: string;
  variables: Variable[];
  requestBodyVariables: Variable[];

  static MakeAllAvailableVariables = (tcps: TrafficControlPath[]) => {
    return tcps
      .flatMap((tcp: TrafficControlPath) =>
        tcp.variables.map((variable: Variable) => variable.name)
      )
      .filter((variable: string) => variable.length !== 0);
  };
  constructor(path: any) {
    this.mockType = path.mock_type;
    this.isPathInMockMode = path.mock_mode;
    this.examplePreference = path.example_preference;
    this.pathName = path.path_name;
    this.variables = path.variables;
    this.requestBodyVariables = path.request_body_variables;
  }

  toggleMockMode() {
    this.isPathInMockMode = !this.isPathInMockMode;
  }

  setMockType(mockType: string) {
    this.mockType = mockType;
  }

  addVariables(name: string, value: string): string {
    const id = RanchUtils.genShortId(6);
    this.variables.push({
      name,
      value,
      id,
    });

    return id;
  }

  removeVariables(removeMe: Variable) {
    this.variables = this.variables.filter((variable: Variable) => {
      return variable.id !== removeMe.id;
    });
  }

  changeVariable(variable: Variable) {
    this.variables.forEach((oldVariable) => {
      if (oldVariable.id === variable.id) {
        oldVariable = variable;
      }
    });
  }
  addRBVariables(name: string, value: string): string {
    const id = RanchUtils.genShortId(6);
    this.requestBodyVariables.push({
      name,
      value,
      id,
    });

    return id;
  }

  removeRBVariables(removeMe: Variable) {
    this.requestBodyVariables = this.requestBodyVariables.filter(
      (variable: Variable) => {
        return variable.id !== removeMe.id;
      }
    );
  }

  changeRBVariable(variable: Variable) {
    this.requestBodyVariables.forEach((oldVariable) => {
      if (oldVariable.id === variable.id) {
        oldVariable = variable;
      }
    });
  }

  setExamplePreference(examplePreference: string) {
    this.examplePreference = examplePreference;
  }

  FillPath(path: TrafficControlPath, newPath: TrafficControlPath) {}

  static CreateTrafficControlPaths(
    paths: TrafficControlPath[]
  ): TrafficControlPath[] {
    return paths.map((path: TrafficControlPath) => {
      let newPath = new TrafficControlPath(path);

      return newPath;
    });
  }
  static CreateTrafficControlPathsFromStorage(
    paths: TrafficControlPath[]
  ): TrafficControlPath[] {
    if (!paths) return [];

    return paths.map((path: TrafficControlPath) => {
      const tcp = new TrafficControlPath(path);
      return tcp;
    });
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

export const GetAllPathsCommand = "get-all-paths";

export const Test = "test";
