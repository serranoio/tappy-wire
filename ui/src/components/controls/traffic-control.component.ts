import { LitElement, html, css } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import trafficControlCss from "./traffic-control.css";
import { TrafficControlPath, Variable } from "@/model/traffic-control";
import { GetBus, RanchUtils } from "@pb33f/ranch";
import {
  WiretapControlsStore,
  WiretapFiltersStore,
  WiretapControlsChannel,
  WiretapReportChannel,
  TrafficControlStore,
  SetPathToMockModeCommand,
  SetPathPreferenceExample,
  SetPathPolymorphicSchema,
  SetPathVariablesCommand,
  SetPathRQVariablesCommand,
  GetAllPathsCommand,
} from "@/model/constants";
import { GetBagManager } from "@pb33f/saddlebag";
import localforage from "localforage";

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
  selectedPath: TrafficControlPath | null = null;

  @state()
  allPaths: TrafficControlPath[] = [];

  @state()
  openNewVarsForm: string = "";

  _bus: any;
  _storeManager: any;
  _controlsStore: any;
  _filtersStore: any;
  _wiretapControlsChannel: any;
  _wiretapReportChannel: any;
  _wiretapControlsSubscription: any;
  _wiretapReportSubscription: any;

  constructor() {
    super();
    // get bus.
    this._bus = GetBus();
    this._storeManager = GetBagManager();
    this._wiretapReportChannel = this._bus.getChannel(WiretapReportChannel);
    this._controlsStore = this._storeManager.getBag(TrafficControlStore);

    this._controlsStore.subscribe(TrafficControlStore, (trafficControl) => {
      this.allPaths = trafficControl;
    });

    this.loadTrafficControlFromStorage().then((paths: TrafficControlPath[]) => {
      this.allPaths =
        TrafficControlPath.CreateTrafficControlPathsFromStorage(paths);

      this._bus.publish({
        destination: "/pub/queue/traffic-control",
        body: JSON.stringify({ request: GetAllPathsCommand }),
      });
    });

    // this._wiretapControlsSubscription = this._wiretapControlsChannel.subscribe(
    //   this.controlUpdateHandler()
    // );
    // this._wiretapReportSubscription = this._wiretapReportChannel.subscribe(
    //   this.reportHandler()
    // );
  }

  saveData() {
    // update the store
    this._controlsStore.set(TrafficControlStore, this.allPaths);
    localforage.setItem<TrafficControlPath[]>(
      TrafficControlStore,
      this.allPaths
    );
  }

  getPathsInMockMode() {
    return this.allPaths.filter(
      (path: TrafficControlPath) => path.isPathInMockMode
    );
  }

  getPathsInProxyMode() {
    return this.allPaths.filter(
      (path: TrafficControlPath) => !path.isPathInMockMode
    );
  }

  async loadTrafficControlFromStorage(): Promise<TrafficControlPath[]> {
    return localforage.getItem<TrafficControlPath[]>(TrafficControlStore);
  }

  controlUpdateHandler(): any {
    throw new Error("Method not implemented.");
  }
  reportHandler(): any {
    throw new Error("Method not implemented.");
  }

  renderWordsInTooltip(words: string) {
    return words.split(" ").map((word: string) => {
      return html`&nbsp;&nbsp;&nbsp;${word}`;
    });
  }

  sendVariableUpdate() {
    if (this._bus.getClient()?.connected) {
      this._bus.publish({
        destination: "/pub/queue/traffic-control",
        body: JSON.stringify({
          id: RanchUtils.genUUID(),
          request: SetPathVariablesCommand,
          payload: JSON.stringify({
            path_name: this.selectedPath.pathName,
            variables: this.selectedPath.variables,
          }),
        }),
      });
    }
  }
  sendRBVariableUpdate() {
    if (this._bus.getClient()?.connected) {
      this._bus.publish({
        destination: "/pub/queue/traffic-control",
        body: JSON.stringify({
          id: RanchUtils.genUUID(),
          request: SetPathRQVariablesCommand,
          payload: JSON.stringify({
            path_name: this.selectedPath.pathName,
            variables: this.selectedPath.requestBodyVariables,
          }),
        }),
      });
    }
  }

  renderSelectedMockModePath() {
    const availableVariables = html`
      <div class="available-variables">
        <label>Available Variables</label>
        <div>
          ${TrafficControlPath.MakeAllAvailableVariables(this.allPaths).map(
            (variable: string) => {
              return html`<sl-badge>${variable}</sl-badge>`;
            }
          )}
        </div>
      </div>
    `;
    if (!this.selectedPath) {
      return html`${availableVariables}`;
    }

    return html`
      ${availableVariables}
      <div>
        <h3>Make changes to ${this.selectedPath.pathName}</h3>
        <div class="label-div">
          <label>Set a Preferred Example</label>
          <sl-input
            value=${this.selectedPath.examplePreference}
            @sl-change=${(e) => {
              const val = e.target.value;
              this.selectedPath.setExamplePreference(val);

              if (this._bus.getClient()?.connected) {
                this._bus.publish({
                  destination: "/pub/queue/traffic-control",
                  body: JSON.stringify({
                    id: RanchUtils.genUUID(),
                    request: SetPathPreferenceExample,
                    payload: JSON.stringify({
                      path_name: this.selectedPath.pathName,
                      mock_mode: this.selectedPath.isPathInMockMode,
                      example_preference: this.selectedPath.examplePreference,
                      mock_type: this.selectedPath.mockType,
                    }),
                  }),
                });
              }

              this.saveData();
              this.requestUpdate();
            }}
            placeholder="Preferred Example"
          >
          </sl-input>
        </div>
        <div class="label-div">
          <label>Set a Mock Type</label>
          <sl-input
            value=${this.selectedPath.mockType}
            @sl-change=${(e) => {
              const val = e.target.value;
              this.selectedPath.setMockType(val);

              if (this._bus.getClient()?.connected) {
                this._bus.publish({
                  destination: "/pub/queue/traffic-control",
                  body: JSON.stringify({
                    id: RanchUtils.genUUID(),
                    request: SetPathPolymorphicSchema,
                    payload: JSON.stringify({
                      path_name: this.selectedPath.pathName,
                      mock_mode: this.selectedPath.isPathInMockMode,
                      example_preference: this.selectedPath.examplePreference,
                      mock_type: this.selectedPath.mockType,
                    }),
                  }),
                });
              }

              this.saveData();
              this.requestUpdate();
            }}
            placeholder="Mock Type"
          >
          </sl-input>
        </div>
        <div class="mock-variables">
          <h3>Set Mock varaibles</h3>
          <div class="set-variables">
            <label>Set Variables</label>
            <small
              >Access the first number in the query params by typing
              \${0}</small
            >
            <div class="all-vars">
              ${this.selectedPath.variables.map((variable: Variable) => {
                return html`
                  <div class="vars">
                    <sl-icon-button
                      @click=${() => {
                        this.selectedPath.removeVariables(variable);
                        this.sendVariableUpdate();
                        this.saveData();
                        this.requestUpdate();
                      }}
                      name="x-lg"
                    >
                    </sl-icon-button>
                    <div class="vars-input">
                      <sl-input
                        value=${variable.name}
                        @sl-change=${(e) => {
                          variable.name = e.target.value;
                          this.selectedPath.changeVariable(variable);
                          this.sendVariableUpdate();
                          this.saveData();
                          this.requestUpdate();
                        }}
                      ></sl-input>
                      <sl-input
                        value=${variable.value}
                        @sl-change=${(e) => {
                          variable.value = e.target.value;
                          this.selectedPath.changeVariable(variable);
                          this.saveData();
                          this.requestUpdate();
                          this.sendVariableUpdate();
                        }}
                      >
                      </sl-input>
                    </div>
                  </div>
                `;
              })}
            </div>
          </div>
          <sl-icon-button
            name="plus"
            @click=${() => {
              this.selectedPath.addVariables("", "");
              this.saveData();
              this.requestUpdate();
            }}
          ></sl-icon-button>
          <div class="set-variables">
            <label>Set Request Body</label>
            <div class="all-vars">
              ${this.selectedPath.requestBodyVariables.map(
                (variable: Variable) => {
                  return html`
                    <div class="vars">
                      <sl-icon-button
                        @click=${() => {
                          this.selectedPath.removeRBVariables(variable);
                          this.sendRBVariableUpdate();
                          this.saveData();
                          this.requestUpdate();
                        }}
                        name="x-lg"
                      >
                      </sl-icon-button>
                      <div class="vars-input">
                        <sl-input
                          value=${variable.name}
                          @sl-change=${(e) => {
                            variable.name = e.target.value;
                            this.selectedPath.changeRBVariable(variable);
                            this.sendRBVariableUpdate();
                            this.saveData();
                            this.requestUpdate();
                          }}
                        ></sl-input>
                        <sl-input
                          value=${variable.value}
                          @sl-change=${(e) => {
                            variable.value = e.target.value;
                            this.selectedPath.changeRBVariable(variable);
                            this.saveData();
                            this.requestUpdate();
                            this.sendRBVariableUpdate();
                          }}
                        >
                        </sl-input>
                      </div>
                    </div>
                  `;
                }
              )}
            </div>
          </div>
          <sl-icon-button
            name="plus"
            @click=${() => {
              this.selectedPath.addRBVariables("", "");
              this.saveData();
              this.requestUpdate();
            }}
          ></sl-icon-button>
        </div>
      </div>
    `;
  }

  renderMockHasPreferencesBadge(path: TrafficControlPath) {
    if (path.examplePreference.length > 0 || path.mockType.length > 0) {
      return html`
        <sl-badge class="preferences-badge" variant="primary" pill pulse>
          <sl-icon name="sliders"></sl-icon>
        </sl-badge>
      `;
    }

    return "";
  }

  render() {
    return html`
      <p>
        Traffic control overrides whichever paths that you set to mock mode in
        your config.
      </p>
      <div class="grid">
        <div>
          <h3>Mock Mode</h3>
          ${this.getPathsInMockMode().map((path: TrafficControlPath) => {
            return html`<div
              class="col mocked-path ${this.selectedPath?.pathName ===
              path.pathName
                ? "selected-path"
                : ""}"
              @click=${(e) => {
                if (!e.target.classList.contains("proxy")) {
                  this.selectedPath = path;
                }
              }}
            >
              ${this.renderMockHasPreferencesBadge(path)}
              <p>${path.pathName}</p>
              <!-- ${this.renderWordsInTooltip("Move to proxy mode")} -->
              <sl-icon-button
                name="arrow-right"
                class="proxy"
                @click=${(e) => {
                  e.preventDefault();
                  path.toggleMockMode();
                  this.selectedPath = null;
                  console.log(this.selectedPath);

                  if (this._bus.getClient()?.connected) {
                    this._bus.publish({
                      destination: "/pub/queue/traffic-control",
                      body: JSON.stringify({
                        id: RanchUtils.genUUID(),
                        request: SetPathToMockModeCommand,
                        payload: JSON.stringify({
                          path_name: path.pathName,
                          mock_mode: path.isPathInMockMode,
                          example_preference: path.examplePreference,
                          mock_type: path.mockType,
                        }),
                      }),
                    });
                  }

                  this.requestUpdate();
                  this.saveData();
                  e.preventDefault();
                }}
              ></sl-icon-button>
            </div>`;
          })}
        </div>

        <div>
          <h3>Proxy Mode</h3>
          ${this.getPathsInProxyMode().map((path: TrafficControlPath) => {
            return html`<div class="col proxied-path">
              <!-- ${this.renderWordsInTooltip("Move to mock mode")} -->
              <sl-icon-button
                name="arrow-left"
                @click=${() => {
                  path.toggleMockMode();

                  if (this._bus.getClient()?.connected) {
                    this._bus.publish({
                      destination: "/pub/queue/traffic-control",
                      body: JSON.stringify({
                        id: RanchUtils.genUUID(),
                        request: SetPathToMockModeCommand,
                        payload: JSON.stringify({
                          path_name: path.pathName,
                          mock_mode: path.isPathInMockMode,
                          example_preference: path.examplePreference,
                          mock_type: path.mockType,
                        }),
                      }),
                    });
                  }
                  this.saveData();
                  this.requestUpdate();
                }}
              ></sl-icon-button>
              <p>${path.pathName}</p>
            </div>`;
          })}
        </div>
      </div>
      ${this.renderSelectedMockModePath()}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "traffic-control.component": TrafficControlComponent;
  }
}
