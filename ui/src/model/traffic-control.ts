import { RanchUtils } from "@pb33f/ranch";

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
