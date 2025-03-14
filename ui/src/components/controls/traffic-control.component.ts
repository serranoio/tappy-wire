import {
  LitElement,
  html,
  PropertyValueMap,
  TemplateResult,
  getCompatibleStyle,
} from "lit";
import { customElement, property, query, state } from "lit/decorators.js";
import trafficControlCss from "./traffic-control.css";
import {
  GetAllPathsCommand,
  GetWorkflows,
  MockBoard,
  MockBoardKey,
  PathsKey,
  Pipe,
  Anchor,
  StepMetadata,
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
  SelectingPipeEvent,
  SelectingAnchorEvent,
  UpdateStepMetadataEvent,
  UpdateStepMetadataType,
  httpMethods,
  insertSpaces,
  isObjectEmpty,
  normalizeMap,
} from "@/model/traffic-control-utils";
import { styleMap } from "lit/directives/style-map.js";
import { ArazzoStep } from "./step/step.component";
import {
  drawPipeLine,
  getAllAnchorBadges,
  getIdsFromAnchorBadges,
  renderAllPipes,
} from "./pipe/anchor-badge";

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

  @state()
  selectedPipe: Pipe | null = null;

  @state()
  pipes: Pipe[] = [];

  @state()
  selectedAnchor: Anchor | null = null;

  @state()
  deletePipesMode: boolean = false;

  @state()
  createCustomPipeMode: boolean = false;

  @state()
  receiverPipe: Pipe | null = null;

  @state()
  selectedPipeCoords: null | { x: number; y: number } = null;

  @state()
  mouseCoords: null | { x: number; y: number } = null;

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
      // this.populateStateFromMockboard();
    });

    this._controlsStore.subscribe(PathsKey, (pathItems: PathItem[]) => {
      this.pathItems = pathItems;

      this.mockBoard.setOperationsInSteps(this.pathItems);
      this.populateStateFromMockboard();

      // let stepMetadata = this.mockBoard.addNewStep(
      //   this.selectedWorkflow.workflowID,
      //   this.pathItems[1],
      //   "findPetsByStatus",
      //   this,
      //   this._bus
      // );

      // this.steps.push(stepMetadata);

      // stepMetadata = this.mockBoard
      //   .addNewStep(
      //     this.selectedWorkflow.workflowID,
      //     this.pathItems[0],
      //     "updatePet",
      //     this,
      //     this._bus
      //   )
      //   .setPositionByCoords({ x: 350, y: 800 });

      // this.steps.push(stepMetadata);
    });
    document.addEventListener("mousemove", this.moveMouse.bind(this));

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

    document.addEventListener(
      SelectingAnchorEvent,
      this.listenToSelectedAnchor.bind(this)
    );
  }

  moveMouse(e) {
    this.mouseCoords = {
      x: e.clientX,
      y: e.clientY,
    };

    this.renderRoot.querySelectorAll(".pipe").forEach((pipe) => {
      // pipe.
    });
  }

  listenToSelectedAnchor(e: CustomEvent<Anchor>) {
    const a = e.detail;

    if (this.selectedPipe) {
      this.selectedPipe.addOutput(a);
    } else {
      this.selectedAnchor = a;
    }

    this.requestUpdate();
  }

  listenToSelectedPipe(e: CustomEvent<Pipe>) {
    const p = e.detail;

    this.selectedPipe = p;

    this.mockBoard.workflowMetadatas
      .get(this.selectedWorkflow.workflowID)
      .pipes.set(p.id, p);
    // we need to find the coords of the created badge. get the badge with the id.

    this.requestUpdate();
    this.mockBoard.updateWorkflow(this.selectedWorkflow.workflowID, this._bus);
  }
  // updateEventListeners() {
  //   this.eventListeners?.forEach((listener) => {
  //     document.removeEventListener(listener.name, listener.listener);
  //   });

  //   const listeners = [];

  //   listeners.push({
  //     name: UpdateStepMetadataEvent,
  //     listener: document.addEventListener(
  //       UpdateStepMetadataEvent,
  //       this.listenToStepMetadataChanges.bind(this)
  //     ),
  //   });

  //   return listeners;
  // }

  listenToStepMetadataChanges(e: CustomEvent<UpdateStepMetadataType>) {
    const type = e.detail;

    this.mockBoard.workflowMetadatas
      .get(type.workflowID)
      .updateStepMetadata(type.stepMetadata);

    this.mockBoard.updateWorkflow(type.workflowID, this._bus);
  }

  changeSelectedWorkflow(workflow: WorkflowMetadata) {
    this.selectedWorkflow = workflow;

    this.steps = [];
    // populate steps from workflow
    this.steps = normalizeMap(workflow?.stepMetadatas).map(
      (stepMetadata: StepMetadata) => {
        return stepMetadata;
      }
    );
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

  renderWorkflowNameOnEmpty(name: string, id: string) {
    return name?.length === 0 ? id : name;
  }

  renderWorkflowIsland() {
    const renderName = (name: string, key: string) => {
      if (
        this.isEditingWorkflowName.id !== key ||
        this.isEditingWorkflowName.id.length === 0 ||
        !this.isEditingWorkflowName.fromIsland
      )
        return html` <p>${this.renderWorkflowNameOnEmpty(name, key)}</p> `;

      return html`
        <sl-input
          name="name"
          size="small"
          value=${name}
          @sl-change=${(e) => {
            const workflow = this.mockBoard.workflowMetadatas.get(key);
            workflow.workflowName = e.target.value;

            this.mockBoard.updateWorkflow(workflow.workflowID, this._bus);

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
            this.workflows = this.workflows.filter(
              (workflow: WorkflowMetadata) => workflow.workflowID !== key
            );
            this.mockBoard.deleteWorkflow(key, this._bus);
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
              this.isDeletingWorkflow = !this.isDeletingWorkflow;
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
          <sl-tooltip>
            <p slot="content">${insertSpaces("List of workflows")}</p>
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
                ${renderName(workflow.workflowName, key)}
                ${renderStatusIndicator(key)}
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
        <sl-tooltip content="">
          <p slot="content">${insertSpaces("Failed calls only")}</p>
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
        <sl-tooltip>
          <p slot="content">${insertSpaces("Add a step to your workflow")}</p>
          <h4 class="island-titles monitor-island-title">steps</h4>
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

  renderAnchorBadge(reference: Anchor, placement: "right" | "left") {
    return html`
      <sl-tooltip placement=${placement}>
        <p
          slot="content"
          style=${styleMap({
            fontSize: ".75rem",
          })}
        >
          ${insertSpaces(reference.getFullProperty())}
        </p>
        <sl-badge
          @click=${() => {
            this.selectedAnchor = reference;
            this.selectedPipe = null;
            this.selectedPipeCoords = null;
          }}
        >
          ${reference.getProperty()}
        </sl-badge>
      </sl-tooltip>
    `;
  }

  renderPipeBankIsland() {
    let moveContainers = 0;
    let pipeTitle = {
      tooltip: "All pipes",
      title: "Pipes",
    };

    if (this.selectedAnchor) {
      moveContainers = 100;
      pipeTitle.tooltip =
        "Anchor a pipe on a reference or expose the reference outside of the workflow";
      pipeTitle.title = "Selecting a Anchor";
    }
    if (this.selectedPipe) {
      moveContainers = 200;
      pipeTitle.tooltip = "Feed references values";
      pipeTitle.title = "Selecting a Pipe";
    }

    let variableIslandControl = html`
      <div class="variable-island-control">
        <sl-icon-button
          name="trash"
          @click=${() => {
            this.deletePipesMode = !this.deletePipesMode;
          }}
        >
        </sl-icon-button>
        <sl-icon-button
          name="plus"
          @click=${() => {
            this.createCustomPipeMode = !this.createCustomPipeMode;
          }}
        >
        </sl-icon-button>
        <sl-icon-button
          name="deselect pipe"
          @click=${() => {
            this.selectedPipe = null;
            this.selectedPipeCoords = null;
            this.requestUpdate();
          }}
        >
        </sl-icon-button>
      </div>
    `;
    let selectedPipeContainer;
    if (this.selectedPipe) {
      selectedPipeContainer = html`
        <div
          class="pipe-bank-content"
          style=${styleMap({
            transform: `translateY(${-200 + moveContainers}%)`,
          })}
        >
          <div class="show-pipe">
            <div>
              ${this.renderAnchorBadge(this.selectedPipe.input, "right")}
            </div>
            <div><sl-icon name="chevron-double-right"></sl-icon></div>
            <div class="pipe-outputs">
              ${this.selectedPipe.outputs.map((output: Anchor) => {
                return this.renderAnchorBadge(output, "left");
              })}
            </div>
          </div>
        </div>
      `;
    }

    let selectedAnchorContainer;
    if (this.selectedAnchor) {
      let pipeButton;
      if (this.selectedAnchor.isInPipe()) {
        pipeButton = html`<sl-button
          @click=${() => {
            this.selectedPipe = this.selectedAnchor.lastSelectedPipe;

            this.requestUpdate();
          }}
          size="small"
          >Return to pipe</sl-button
        >`;
      } else {
        pipeButton = html`<sl-button
          @click=${() => {
            const newPipe = this.selectedAnchor.newPipe();
            this.selectedAnchor = null;
            this.pipes.push(newPipe);
            this.mockBoard.workflowMetadatas
              .get(this.selectedWorkflow.workflowID)
              .pipes.set(newPipe.id, newPipe);
            this.selectedPipeCoords = {
              x: 50,
              y: 50,
            };
            this.selectedPipe = newPipe;

            this.requestUpdate();
          }}
          size="small"
          >Create a pipe</sl-button
        >`;
      }

      selectedAnchorContainer = html`
        <div
          class="pipe-bank-content flex"
          style=${styleMap({
            transform: `translateY(${-100 + moveContainers}%)`,
          })}
        >
          <div class="column-flex">
            <h3 class="pipe-bank-property">
              ${this.renderAnchorBadge(this.selectedAnchor, "right")}
            </h3>
            <sl-button disabled size="small"
              >Expose as workflow input</sl-button
            >
            ${pipeButton}
          </div>
          <div class="column-flex">
            <h4>Set expression</h4>
            <small>use the $ syntax to refer to your property</small>
            <sl-input
              size="small"
              @sl-change=${(e) => {
                this.selectedAnchor.expression = e.target.value;
              }}
              value=${this.selectedAnchor.expression}
              placeholder="$path.orderId * 5"
            ></sl-input>
          </div>
        </div>
      `;
    }

    if (this.createCustomPipeMode) {
      return html`<aside class="pipe-bank-island">
        <sl-tooltip>
          <p slot="content">${insertSpaces(":P")}</p>
          <h4 class="island-titles monitor-island-title">
            Create a new variable
          </h4>
        </sl-tooltip>

        <div
          class="pipe-bank-content"
          style=${styleMap({
            transform: `translateY(${moveContainers}%)`,
          })}
        >
          <form
            @submit=${(e) => {
              e.preventDefault();

              const form = new FormData(e.target);
              const name = form.get("variable-name")!;
              const value = form.get("variable-value")!;

              const v = new Pipe(
                this.selectedWorkflow.workflowID,
                name as string
              );
              v.value = value as string;

              this.selectedPipe = v;
              this.mockBoard.workflowMetadatas
                .get(this.selectedWorkflow.workflowID)
                .variables.set(v.id, v);

              this.mockBoard.updateWorkflow(
                this.selectedWorkflow.workflowID,
                this._bus
              );

              this.createCustomPipeMode = false;
            }}
          >
            <div class="column-flex">
              <div class="content-div">
                <label>Pipe Name:</label>
                <sl-input
                  size="small"
                  name="variable-name"
                  type="text"
                ></sl-input>
              </div>
              <div class="content-div">
                <label>Pipe Value:</label>
                <sl-input
                  size="small"
                  name="variable-value"
                  type="text"
                ></sl-input>
              </div>
            </div>
            <div class="content-div">
              <sl-button type="submit" name="arrow-right-square"
                >submit</sl-button
              >
            </div>
          </form>
        </div>
        ${variableIslandControl}
      </aside>`;
    }

    return html`
      <aside class="pipe-bank-island">
        <sl-tooltip>
          <p slot="content">${insertSpaces(pipeTitle.tooltip)}</p>
          <h4 class="island-titles monitor-island-title">${pipeTitle.title}</h4>
        </sl-tooltip>
        <div class="pipe-island-overflow-container">
          ${selectedPipeContainer} ${selectedAnchorContainer}
          <div
            class="pipe-bank-content"
            style=${styleMap({
              transform: `translateY(${moveContainers}%)`,
            })}
          >
            ${normalizeMap(this.selectedWorkflow?.pipes).map((pipe: Pipe) => {
              return html`
                <div
                  @click=${() => {
                    this.selectedPipe = pipe;
                    this.requestUpdate();
                  }}
                >
                  ${pipe.renderPipeBadge()}
                </div>
              `;
            })}
          </div>
        </div>
        ${variableIslandControl}
      </aside>
    `;
  }

  renderMockMonitorIsland() {
    return html`
      <aside class="mock-monitor-island">
        <sl-tooltip>
          <p slot="content">${insertSpaces("All mocks")}</p>
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
          value=${this.renderWorkflowNameOnEmpty(
            this.selectedWorkflow.workflowName,
            this.selectedWorkflow.workflowID
          )}
          @sl-change=${(e) => {
            this.selectedWorkflow.workflowName = e.target.value;
            this.mockBoard.updateWorkflow(
              this.selectedWorkflow.workflowID,
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
        ${this.renderWorkflowNameOnEmpty(
          this.selectedWorkflow?.workflowName,
          this.selectedWorkflow?.workflowID
        )}
      </h2>`;
    }

    const arazzoWorkflow = this.mockBoard.workflowMetadatas.get(
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
          return html`
            <arazzo-step
              .anchors=${this.pipes.flatMap((pipe: Pipe) =>
                step.doesStepContainAnchors(pipe)
              )}
              .stepMetadata=${step}
              .workflowID=${this.selectedWorkflow.workflowID}
            ></arazzo-step>
          `;
        })}
      </div>
    `;
  }

  getAnchorInSelectedPipe() {
    const allAnchorBadges = getAllAnchorBadges(this.renderRoot);

    allAnchorBadges.forEach((anchorBadge: HTMLElement) => {
      const ids = getIdsFromAnchorBadges(anchorBadge);
      ids.forEach((id) => {
        if (id === this.selectedPipe.input.id) {
          console.log("found matching ID", id, anchorBadge);
          const rect = anchorBadge.getBoundingClientRect();
          this.selectedPipeCoords.x = rect.x;
          this.selectedPipeCoords.y = rect.y;
        }
      });
    });
  }

  // selectingPipeShadow() {
  // if (this.selectedPipe) {
  // console.log("change body style", this);
  // document.body.style.boxShadow = "5px 10px green inset;";
  // this.style.boxShadow = "5px 10px green inset;";
  // }
  // }

  renderSelectedPipe() {
    if (!this.selectedPipeCoords || !this.mouseCoords) return html``;

    this.getAnchorInSelectedPipe();

    // return drawPipeLine(
    //   this.selectedPipeCoords.x,
    //   this.selectedPipeCoords.y
    //   this.mouseCoords.x,
    //   this.mouseCoords.y,
    // );
  }

  render() {
    this.mockBoard.debug(false, false);
    console.log(this.mockBoard);
    // this.selectingPipeShadow();
    // this.drawPipes();

    return html`
      ${renderAllPipes(this.pipes, this.renderRoot)}
      ${this.renderSelectedPipe()} ${this.renderMockBoardSection()}
      ${this.renderWorkflowIsland()} ${this.renderProxyMonitorIsland()}
      ${this.renderPathsIsland()} ${this.renderSteps()}
      ${this.renderPipeBankIsland()} ${this.renderMockMonitorIsland()}
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
