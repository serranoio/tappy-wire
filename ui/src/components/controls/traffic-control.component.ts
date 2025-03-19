import {
  LitElement,
  html,
  PropertyValueMap,
  TemplateResult,
  render,
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
import { WiretapChannel, WiretapReportChannel } from "@/model/constants";
import { GetBagManager } from "@pb33f/saddlebag";
import localforage from "localforage";
import { SlDrawer } from "@shoelace-style/shoelace";
import { PathItem } from "@/model/paths";
import {
  SelectingAnchorEvent,
  SendTransactionToMockboard,
  UpdateStepMetadataEvent,
  UpdateStepMetadataType,
  normalizeMap,
} from "@/model/traffic-control-utils";
import {
  drawPipeLineWithCoords,
  findMiddle,
  getAllAnchorBadges,
  getIdsFromAnchorBadges,
  renderAllPipes,
} from "./pipe/anchor-badge";
import { renderWorkflowIsland } from "./islands/workflow-island";
import workflowIslandCss from "./islands/workflow-island.css";
import { renderPathsIsland } from "./islands/paths-island";
import pathsIslandCss from "./islands/paths-island.css";
import {
  constructMockRequest,
  renderMockMonitorIsland,
} from "./islands/mock-monitor-island";
import { renderProxyMonitorIsland } from "./islands/proxy-monitor-island";
import { renderPipeBankIsland, selectPipe } from "./islands/pipe-bank-island";
import pipeBankIslandCss from "./islands/pipe-bank-island.css";
import mockMonitorIslandCss from "./islands/mock-monitor-island.css";
import { HttpTransaction } from "@/model/http_transaction";
import { Message } from "@/model/message";
import { styleMap } from "lit/directives/style-map.js";
import { HttpTransactionViewComponent } from "../transaction/transaction-view";

@customElement("traffic-control")
export class TrafficControlComponent extends LitElement {
  static styles = [
    trafficControlCss,
    workflowIslandCss,
    pathsIslandCss,
    pipeBankIslandCss,
    mockMonitorIslandCss,
  ];

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
  _wiretapChannel: any;
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

  @state()
  mouseMoveEventListener: null | Function = null;

  @query("#mock-monitor-list")
  mockMonitorList;

  @state()
  mocks: any = [];

  @state()
  selectedMock: any = null;

  @query("#mock-monitor-dialog")
  mockMonitorDialog;

  @state()
  transactionViewComponent: HttpTransactionViewComponent;

  @query("#fly-container") flyContainer;

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
    this._wiretapChannel = this._bus.getChannel(WiretapChannel);
    this._controlsStore = this._storeManager.getBag(TrafficControlStore);

    this.transactionViewComponent = new HttpTransactionViewComponent();

    this._controlsStore.subscribe(MockBoardKey, (mb) => {
      this.mockBoard = mb;
    });

    this._controlsStore.subscribe(PathsKey, (pathItems: PathItem[]) => {
      this.pathItems = pathItems;

      this.mockBoard.setOperationsInSteps(this.pathItems);
      this.populateStateFromMockboard();
    });

    this.loadTrafficControlFromStorage().then((mb: MockBoard) => {
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

    // this.mouseMoveEventListener = this.moveMouse.bind(this);
    document.addEventListener("mousemove", this.moveMouse.bind(this));

    document.addEventListener(
      SendTransactionToMockboard,
      this.listenToTransaction.bind(this)
    );
  }

  listenToTransaction(e: CustomEvent<HttpTransaction>) {
    const transaction = e.detail;

    const { isMock, messages, errors } = constructMockRequest(
      transaction,
      this
    );
    if (!isMock) {
      return;
    }

    const am = Message.FindMessagesWithAnchors(messages);
    let foundReceiver: HTMLElement[] = [];
    let foundSender: HTMLElement[] = [];
    am.forEach((anchorMessage: Message) => {
      getAllAnchorBadges(this.renderRoot).forEach(
        (anchorBadge: HTMLElement) => {
          const ids = getIdsFromAnchorBadges(anchorBadge);
          // find two anchors
          ids.forEach((id: string) => {
            if (id === anchorMessage.receiverAnchor.id) {
              foundReceiver.push(anchorBadge);
            }
            if (id === anchorMessage.senderAnchor.id) {
              foundSender.push(anchorBadge);
            }
          });
        }
      );
    });

    if (foundReceiver.length > 0) {
      foundReceiver.forEach((receiver: HTMLElement, num: number) => {
        const receiverRect = receiver.getBoundingClientRect();
        const senderRect = foundSender[num].getBoundingClientRect();
        const sl = senderRect.x + senderRect.width / 2;
        const st = senderRect.y + senderRect.height / 2;

        const rl = receiverRect.x + receiverRect.width / 2;
        const rt = receiverRect.y + receiverRect.height / 2;

        let styles = {
          left: `${sl}px`, // this is the starting position for both, then animate takes over and changes the position.
          top: `${st}px`,
        };

        const keyframes = [
          { left: `${sl}px`, top: `${st}px` }, // Starting position
          { left: `${rl}px`, top: `${rt}px` }, // Starting position
        ];

        const ANIMATION_DURATION = 5000;
        // Define the animation options
        const options = {
          duration: ANIMATION_DURATION, // Duration of 5 seconds
          easing: "ease-in-out", // Smooth easing for the animation
        };

        const span = document.createElement("span");
        span.classList.add("moving-data");
        span.textContent = am[num].senderAnchor.value;
        span.style.left = styles.left;
        span.style.top = styles.top;
        this.flyContainer.appendChild(span);
        span.animate(keyframes, options);

        setTimeout(() => {
          span.remove();
        }, ANIMATION_DURATION - 20);
      });
    }
  }

  moveMouse(e) {
    this.mouseCoords = {
      x: e.clientX,
      y: e.clientY,
    };
  }

  listenToSelectedAnchor(e: CustomEvent<Anchor>) {
    const a = e.detail;

    if (this.selectedPipe) {
      this.selectedPipe.addOutput(a);
      this.selectedPipe.updatePipe(this.selectedWorkflow.workflowID, this._bus);
    } else {
      this.selectedAnchor = a;
    }

    this.requestUpdate();
  }

  // ! not used
  listenToSelectedPipe(e: CustomEvent<Pipe>) {
    const p = e.detail;

    selectPipe(p, this);

    this.mockBoard.workflowMetadatas
      .get(this.selectedWorkflow.workflowID)
      .pipes.set(p.id, p);

    // we need to find the coords of the created badge. get the badge with the id.

    this.requestUpdate();
    this.mockBoard.updateWorkflow(this.selectedWorkflow.workflowID, this._bus);
  }

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

    this.pipes = normalizeMap(workflow?.pipes).map((pipe: Pipe) => {
      return pipe;
    });
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

  renderWorkflowNameOnEmpty(name: string, id: string) {
    return name?.length === 0 ? id : name;
  }

  protected firstUpdated(
    _changedProperties: PropertyValueMap<any> | Map<PropertyKey, unknown>
  ): void {
    this.requestUpdate();
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
          const rect = anchorBadge.getBoundingClientRect();
          this.selectedPipeCoords.x = rect.x - rect.width / 2;
          this.selectedPipeCoords.y = rect.y - rect.height / 2;
        }
      });
    });
  }

  renderSelectedPipe() {
    if (!this.selectedPipeCoords || !this.mouseCoords) return html``;

    this.getAnchorInSelectedPipe();

    return drawPipeLineWithCoords(
      this.mouseCoords.x - 30,
      this.mouseCoords.y - 30,
      this.selectedPipeCoords.x,
      this.selectedPipeCoords.y,
      "selected-pipe"
    );
  }

  // ! not working as of now, but don't need B)
  // & trying to remove event listener when we don't need it, but it is colliding with the mousemove on step.component
  // attachMouseMoveEventListener() {
  //   console.log(this.selectedPipe, this.mouseMoveEventListener);
  //   if (this.selectedPipe) {
  //     if (!this.mouseMoveEventListener) {
  //       this.mouseMoveEventListener = this.moveMouse.bind(this);
  //       document.addEventListener("mousemove", this.mouseMoveEventListener);
  //     }
  //   } else {
  //     if (this.mouseMoveEventListener) {
  //       console.log("remove");
  //       document.removeEventListener("mousemove", this.mouseMoveEventListener);
  //     }
  //   }
  // }

  render() {
    this.mockBoard.debug(false, false);

    // this.attachMouseMoveEventListener();

    return html`
      ${renderAllPipes(this.pipes, this.renderRoot)}
      ${this.renderSelectedPipe()} ${this.renderMockBoardSection()}
      ${renderWorkflowIsland(this)} ${renderProxyMonitorIsland(this)}
      ${renderPathsIsland(this)} ${this.renderSteps()}
      ${renderPipeBankIsland(this)} ${renderMockMonitorIsland(this)}
      <sl-dialog id="mock-monitor-dialog" class="dialog-overview">
        <div class="dialog-container">
          <div>${this.selectedMock?.path}</div>
          <div>
            ${this.selectedMock?.anchorMessages?.map((am) => {
              return html` <li>${am.message}</li> `;
            })}
          </div>
          <div>
            <h4>Messages</h4>
            ${this.selectedMock?.messages?.map((m) => {
              return html` <li>${m.message}</li> `;
            })}
          </div>
          <div>
            <h4>Errors</h4>
            ${this.selectedMock?.errs?.map((err) => {
              return html` <li>${err}</li> `;
            })}
          </div>
          </br>
          ${this.transactionViewComponent.render()}
        </div>
      </sl-dialog>
      <sl-icon-button
        name="x-lg"
        class="close-mock-board"
        @click=${() => {
          this.drawer.hide();
        }}
      >
      </sl-icon-button>
      <div id="fly-container"></div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "traffic-control.component": TrafficControlComponent;
  }
}
