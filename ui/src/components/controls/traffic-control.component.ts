import { LitElement, html, PropertyValueMap, TemplateResult } from "lit";
import { customElement, property, query, state } from "lit/decorators.js";
import trafficControlCss from "./traffic-control.css";
import {
  GetAllPathsCommand,
  GetWorkflows,
  MockBoard,
  MockBoardKey,
  PathsKey,
  StepMetadata,
  TrafficControlPath,
  TrafficControlStore,
  WorkflowMetadata,
} from "@/model/traffic-control";
import { GetBus } from "@pb33f/ranch";
import { WiretapReportChannel } from "@/model/constants";
import { GetBagManager } from "@pb33f/saddlebag";
import localforage from "localforage";
import { SlDrawer, SlMenuItem } from "@shoelace-style/shoelace";
import { Operation, PathItem } from "@/model/paths";
import {
  UpdateStepMetadataEvent,
  UpdateStepMetadataType,
  httpMethods,
  isObjectEmpty,
  normalizeMap,
} from "@/model/traffic-control-utils";
import { styleMap } from "lit/directives/style-map.js";

// fuck it, trafficControl overwrites everything
// let's fetch wiretap config. From the config, I want to see which paths are in mock mode
// we also need to see

// let's get every single path.
// every single path is proxy
//

@customElement("traffic-control")
export class TrafficControlComponent extends LitElement {
  static styles = [trafficControlCss];

  @state()
  mockBoard: MockBoard = new MockBoard();

  @state()
  pathItems: PathItem[] = [];

  @state()
  selectedWorkflow: WorkflowMetadata | null = null;

  @state()
  openNewVarsForm: string = "";

  @state()
  isWorkflowIslandOpened: boolean = true;

  @property()
  drawer: SlDrawer;

  @state()
  isEditingWorkflowName: { id: string; fromIsland: boolean } = {
    id: "",
    fromIsland: true,
  };

  @state()
  isEditingWorkflowDescription: boolean = false;

  @state()
  isEditingWorkflowSummary: boolean = false;

  @state()
  isDeletingWorkflow: boolean = false;

  @state()
  workflows: WorkflowMetadata[] = [];

  @state()
  steps: StepMetadata[] = [];

  @state()
  _bus: any;
  @state()
  _storeManager: any;
  @state()
  _controlsStore: any;
  @state()
  _filtersStore: any;
  @state()
  _wiretapControlsChannel: any;
  @state()
  _wiretapReportChannel: any;
  @state()
  _wiretapControlsSubscription: any;
  @state()
  _wiretapReportSubscription: any;

  @state()
  eventListeners: [name: string, listener: any];

  populateStateFromMockboard() {
    this.workflows = normalizeMap(this.mockBoard.workflowMetadatas).map(
      (value: WorkflowMetadata) => {
        return value;
      }
    );

    if (this.workflows.length > 0) {
      this.changeSelectedWorkflow(this.workflows[0]);
    }

    this.requestUpdate();
  }

  constructor() {
    super();
    // get bus.
    this._bus = GetBus();
    this._storeManager = GetBagManager();
    this._wiretapReportChannel = this._bus.getChannel(WiretapReportChannel);
    this._controlsStore = this._storeManager.getBag(TrafficControlStore);

    this._controlsStore.subscribe(MockBoardKey, (mb) => {
      this.mockBoard = mb;
      this.populateStateFromMockboard();
    });

    this._controlsStore.subscribe(PathsKey, (pathItems: PathItem[]) => {
      this.pathItems = pathItems;

      const stepMetadata = this.mockBoard.addNewStep(
        this.selectedWorkflow.workflowID,
        this.pathItems[0],
        "updatePet",
        this,
        this._bus
      );

      this.steps.push(stepMetadata);
    });

    this.loadTrafficControlFromStorage().then((mb: MockBoard) => {
      // this.allPaths =
      // TrafficControlPath.CreateTrafficControlPathsFromStorage(paths);
      // console.log("from storage", mb);

      this._bus.publish({
        destination: "/pub/queue/traffic-control",
        body: JSON.stringify({ request: GetWorkflows }),
      });

      // this.populateStateFromMockboard();
    });

    this.loadPathsFromStorage().then((pathItems: PathItem[]) => {
      // todo implement creating from storage

      this._bus.publish({
        destination: "/pub/queue/traffic-control",
        body: JSON.stringify({ request: GetAllPathsCommand }),
      });
    });

    document.addEventListener(
      UpdateStepMetadataEvent,
      this.listenToStepMetadataChanges.bind(this)
    );
  }

  updateEventListeners() {
    this.eventListeners?.forEach((listener) => {
      document.removeEventListener(listener.name, listener.listener);
    });

    const listeners = [];

    listeners.push({
      name: UpdateStepMetadataEvent,
      listener: document.addEventListener(
        UpdateStepMetadataEvent,
        this.listenToStepMetadataChanges.bind(this)
      ),
    });

    return listeners;
  }

  listenToStepMetadataChanges(e: CustomEvent<UpdateStepMetadataType>) {
    const type = e.detail;

    this.mockBoard.workflowMetadatas
      .get(type.workflowID)
      .updateStepMetadata(type.stepMetadata);
  }

  changeSelectedWorkflow(workflow: WorkflowMetadata) {
    this.selectedWorkflow = workflow;

    this.steps = [];
    // populate steps from workflow
    this.steps = normalizeMap(workflow?.stepMetadatas).map(
      (stepMetadata: StepMetadata) => {
        console.log(stepMetadata);
        return stepMetadata;
      }
    );

    // this.updateEventListeners();
  }

  saveData() {
    // update the store
    // this._controlsStore.set(TrafficControlStore, this.allPaths);
    // localforage.setItem<TrafficControlPath[]>(
    //   TrafficControlStore,
    //   this.allPaths
    // );
  }
  async loadTrafficControlFromStorage(): Promise<MockBoard> {
    return localforage.getItem<MockBoard>(MockBoardKey);
  }

  async loadPathsFromStorage(): Promise<PathItem[]> {
    return localforage.getItem<PathItem[]>(PathsKey);
  }

  controlUpdateHandler(): any {
    throw new Error("Method not implemented.");
  }
  reportHandler(): any {
    throw new Error("Method not implemented.");
  }

  renderWorkflowIsland() {
    const renderName = (key: string) => {
      if (
        this.isEditingWorkflowName.id !== key ||
        this.isEditingWorkflowName.id.length === 0 ||
        !this.isEditingWorkflowName.fromIsland
      )
        return html` <p>${key}</p> `;

      return html`
        <sl-input
          name="name"
          size="small"
          value=${key}
          @sl-change=${(e) => {
            this.mockBoard.changeWorkflowName(key, e.target.value, this._bus);
            this.isEditingWorkflowName.id = "";
            this.requestUpdate();
          }}
        >
        </sl-input>
      `;
    };

    const renderStatusIndicator = (key: string) => {
      if (!this.isDeletingWorkflow) {
        return html`<span
          class="status-indicator"
          @click=${(e: any) => {
            this.mockBoard.workflowMetadatas.get(key).isActivated =
              !this.mockBoard.workflowMetadatas.get(key).isActivated;
            this.requestUpdate();
            e.stopPropagation();
          }}
        >
        </span>`;
      }

      return html`
        <sl-icon-button
          name="x-square"
          class="delete-workflow-button"
          @click=${() => {
            this.mockBoard.deleteWorkflow(key);
            this.workflows = this.workflows.filter(
              (workflow: WorkflowMetadata) => workflow.workflowID !== key
            );
            this.requestUpdate();
          }}
        >
        </sl-icon-button>
      `;
    };

    return html`
      <aside
        class="workflow-island ${this.isWorkflowIslandOpened ? "" : "closed"}"
      >
        <div class="workflow-island-control">
          <sl-icon-button
            class="delete-workflow"
            name="trash"
            @click=${() => {
              this.isDeletingWorkflow = true;
            }}
          ></sl-icon-button>
          <sl-icon-button
            class="add-new-workflow"
            name="plus"
            @click=${() => {
              const workflow = this.mockBoard.createNewWorkflow(this._bus);
              this.workflows.push(workflow);
              this.changeSelectedWorkflow(workflow);
              this.requestUpdate();
            }}
          >
          </sl-icon-button>
          <sl-icon-button
            class="close-workflow-island"
            name="${this.isWorkflowIslandOpened ? "caret-left" : "caret-right"}"
            @click=${() => {
              this.isWorkflowIslandOpened = !this.isWorkflowIslandOpened;
            }}
          ></sl-icon-button>
        </div>
        <div class="overflow-container">
          <sl-tooltip content="List of workflows">
            <h4 class="workflow-island-title island-titles">workflows</h4>
          </sl-tooltip>

          <ul class="workflow-list">
            ${this.workflows.map((workflow: WorkflowMetadata) => {
              const key = workflow.workflowID;

              return html`<li
                class="workflow-name ${this.selectedWorkflow.workflowID === key
                  ? "selected-workflow"
                  : ""}
                  ${this.mockBoard.workflowMetadatas.get(key).isActivated
                  ? "activated"
                  : ""}
                  
                  "
                @click=${() => {
                  this.changeSelectedWorkflow(workflow);
                }}
                @dblclick=${() => {
                  this.isEditingWorkflowName.id = key;
                  this.isEditingWorkflowName.fromIsland = true;
                  this.requestUpdate();
                }}
              >
                ${renderName(key)} ${renderStatusIndicator(key)}
              </li> `;
            })}
          </ul>
        </div>
      </aside>
    `;
  }
  protected firstUpdated(
    _changedProperties: PropertyValueMap<any> | Map<PropertyKey, unknown>
  ): void {
    // const workflow = this.mockBoard.createNewWorkflow(this._bus);
    // this.workflows.push(workflow);
    // this.selectedWorkflow = workflow;
    this.requestUpdate();
  }

  renderProxyMonitorIsland() {
    return html`
      <aside class="monitor-island">
        <sl-tooltip content="400 level failed calls">
          <h4 class="island-titles monitor-island-title">Proxy Monitor</h4>
        </sl-tooltip>
      </aside>
    `;
  }

  renderPathsIsland() {
    const renderHttpMethods = (pathItem: PathItem) => {
      return html`
        ${httpMethods.map((method: string) => {
          if (isObjectEmpty(pathItem[method])) {
            return html``;
          }
          return html`
            <sl-menu-item value="${method}">
              <sl-badge size="small" class="${method}-color"
                >${method}</sl-badge
              >
            </sl-menu-item>
          `;
        })}
      `;
    };

    return html`
      <aside class="paths-island">
        <sl-tooltip content="Available paths to mock">
          <h4 class="island-titles monitor-island-title">select a path</h4>
        </sl-tooltip>
        <ul class="path-items-list">
          ${this.pathItems.map((pathItem: PathItem) => {
            return html`
              <li class="path-item">
                <sl-dropdown>
                  <p slot="trigger">${pathItem.name}</p>
                  <sl-menu
                    @sl-select=${(e: SlMenuItem) => {
                      const operation = e.detail.item.value;

                      const operationSelected = pathItem[
                        operation
                      ] as Operation;

                      const stepMetadata = this.mockBoard.addNewStep(
                        this.selectedWorkflow.workflowID,
                        pathItem,
                        operationSelected.operationId,
                        this,
                        this._bus
                      );

                      this.steps.push(stepMetadata);

                      this.requestUpdate();

                      // we are going to construct the step here and add it to the steps
                    }}
                  >
                    ${renderHttpMethods(pathItem)}
                  </sl-menu>
                </sl-dropdown>
              </li>
            `;
          })}
        </ul>
        <div class="path-island-control">
          <sl-icon-button name="plus-lg"> </sl-icon-button>
        </div>
      </aside>
    `;
  }

  renderVariableBankIsland() {
    return html`
      <aside class="variable-bank-island">
        <sl-tooltip content="All of the variables">
          <h4 class="island-titles monitor-island-title">Variable Bank</h4>
        </sl-tooltip>
      </aside>
    `;
  }

  renderMockMonitorIsland() {
    return html`
      <aside class="mock-monitor-island">
        <sl-tooltip content="all mocks">
          <h4 class="island-titles mock-monitor-island-title">Mock Monitor</h4>
        </sl-tooltip>
      </aside>
    `;
  }

  renderMockBoardSection() {
    let workflowName: TemplateResult;
    if (!this.isEditingWorkflowName.fromIsland) {
      workflowName = html`
        <sl-input
          class="mock-board-name"
          value=${this.selectedWorkflow.workflowID}
          @sl-change=${(e) => {
            this.mockBoard.changeWorkflowName(
              this.selectedWorkflow.workflowID,
              e.target.value,
              this._bus
            );
            this.isEditingWorkflowName.id = "";
            this.isEditingWorkflowName.fromIsland = true;
            this.requestUpdate();
          }}
        >
        </sl-input>
      `;
    } else {
      workflowName = html`<h2
        class="mock-board-name"
        @dblclick=${() => {
          this.isEditingWorkflowName.id = this.selectedWorkflow.workflowID;
          this.isEditingWorkflowName.fromIsland = false;
          this.requestUpdate();
        }}
      >
        ${this.selectedWorkflow?.workflowID}
      </h2>`;
    }

    const arazzoWorkflow = this.mockBoard.arazzo.workflows.get(
      this.selectedWorkflow?.workflowID
    );

    let workflowSummary: TemplateResult;
    if (this.isEditingWorkflowSummary) {
      workflowSummary = html`
        <sl-input
          class="workflow-summary-input"
          size="small"
          value=${arazzoWorkflow?.summary}
          @sl-change=${(e) => {
            this.isEditingWorkflowSummary = false;
            arazzoWorkflow.summary = e.target.value;
            this.mockBoard.updateWorkflow(arazzoWorkflow.workflowID, this._bus);
            this.requestUpdate();
          }}
        >
        </sl-input>
      `;
    } else {
      workflowSummary = html`
        <p
          @dblclick=${() => {
            this.isEditingWorkflowSummary = true;
          }}
        >
          ${arazzoWorkflow?.summary
            ? arazzoWorkflow.summary
            : html`<span class="dash">Define objective of workflow</span>`}
        </p>
      `;
    }

    let workflowDescription: TemplateResult;
    if (this.isEditingWorkflowDescription) {
      workflowDescription = html`
        <sl-input
          class="workflow-summary-input"
          size="small"
          value=${arazzoWorkflow?.description}
          @sl-change=${(e) => {
            this.isEditingWorkflowDescription = false;
            arazzoWorkflow.description = e.target.value;
            this.mockBoard.updateWorkflow(arazzoWorkflow.workflowID, this._bus);
            this.requestUpdate();
          }}
        >
        </sl-input>
      `;
    } else {
      workflowDescription = html`
        <p
          @dblclick=${() => {
            this.isEditingWorkflowDescription = true;
          }}
        >
          ${arazzoWorkflow?.description
            ? arazzoWorkflow.description
            : html`<span class="dash">Describe the workflow</span>`}
        </p>
      `;
    }

    return html`
      <div class="mock-board-section">
        ${workflowName} ${workflowSummary} ${workflowDescription}
      </div>
    `;
  }

  renderSteps() {
    return html`
      <div id="step-fence">
        ${this.steps.map((step: StepMetadata) => {
          const arazzoStep = this.mockBoard.arazzo.workflows
            .get(this.selectedWorkflow.workflowID)
            .steps.get(step.operationID);

          // todo send arazzo in here as well
          return html`
            <arazzo-step
              .stepMetadata=${step}
              .step=${arazzoStep}
              .workflowID=${this.selectedWorkflow.workflowID}
            ></arazzo-step>
          `;
        })}
      </div>
    `;
  }

  render() {
    this.mockBoard.debug(false, false);
    console.log(this.mockBoard);
    return html`
      ${this.renderMockBoardSection()} ${this.renderWorkflowIsland()}
      ${this.renderProxyMonitorIsland()} ${this.renderPathsIsland()}
      ${this.renderSteps()} ${this.renderVariableBankIsland()}
      ${this.renderMockMonitorIsland()}
      <sl-icon-button
        name="x-lg"
        class="close-mock-board"
        @click=${() => {
          this.drawer.hide();
        }}
      >
      </sl-icon-button>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "traffic-control.component": TrafficControlComponent;
  }
}
