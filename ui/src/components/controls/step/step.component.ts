import { LitElement, html, css, PropertyValueMap } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import stepCss from "./step.css";
import {
  MediaType,
  Parameter,
  PathItem,
  ResponseCode,
  Schema,
} from "@/model/paths";
import {
  ParameterProperty,
  Pipe,
  Anchor,
  RequestBodyProperty,
  ResponseBodyProperty,
} from "@/model/traffic-control";
import {
  IO,
  SelectingPipeEvent,
  SelectingAnchorEvent,
  UpdateStepMetadataEvent,
  UpdateStepMetadataType,
  insertSpaces,
  normalizeMap,
  sendEvent,
  isObjectEmpty,
} from "@/model/traffic-control-utils";
import { WiretapMatchedPath } from "../islands/mock-monitor-island";
import { StepMetadata } from "@/model/traffic-control/step-metadata";

const HIGLIGHT_CLASS = "highlight";

@customElement("arazzo-step")
export class ArazzoStep extends LitElement {
  static styles = [stepCss];

  @property()
  stepMetadata: StepMetadata;

  @property()
  workflowID: string;

  @state()
  isEditingStepName: boolean = false;

  @state()
  selectedAnchor: Anchor | null = null;

  @property()
  anchors: Anchor[] = [];

  @state()
  elements: HTMLElement[] = [];

  constructor() {
    super();

    document.addEventListener(
      WiretapMatchedPath,
      this.listenToMatchedPath.bind(this)
    );
  }

  listenToMatchedPath(e: CustomEvent<string>) {
    const paths: string[] = JSON.parse(e.detail);

    if (paths.includes(this.stepMetadata?.id)) {
      this.stepMetadata.glow();
      this.requestUpdate();
    }
  }

  getSLBadges() {
    if (!this.renderRoot) return [];

    return this.renderRoot.querySelectorAll(".anchor-badge");
  }

  private dragElement(elmnt) {
    var pos1 = 0,
      pos2 = 0,
      pos3 = 0,
      pos4 = 0;

    const grip = elmnt.shadowRoot.getElementById("grip");
    if (grip) {
      // if present, the header is where you move the DIV from:
      grip.onmousedown = dragMouseDown.bind(this);
    } else {
      // otherwise, move the DIV from anywhere inside the DIV:
      elmnt.onmousedown = dragMouseDown;
    }

    function dragMouseDown(e) {
      e = e || window.event;
      e.preventDefault();
      // get the mouse cursor position at startup:
      pos3 = e.clientX;
      pos4 = e.clientY;
      document.onmouseup = closeDragElement.bind(this);
      // call a function whenever the cursor moves:
      document.onmousemove = elementDrag.bind(this);
    }

    function elementDrag(e) {
      e = e || window.event;
      e.preventDefault();
      // calculate the new cursor position:
      pos1 = pos3 - e.clientX;
      pos2 = pos4 - e.clientY;
      pos3 = e.clientX;
      pos4 = e.clientY;
      // set the element's new position:
      const newPositionY = elmnt.offsetTop - pos2;
      const newPositionX = elmnt.offsetLeft - pos1;
      elmnt.style.top = newPositionY + "px";
      elmnt.style.left = newPositionX + "px";
      this.stepMetadata.position.x = newPositionX;
      this.stepMetadata.position.y = newPositionY;
    }

    function closeDragElement() {
      // stop moving when mouse button is released:
      sendEvent<UpdateStepMetadataType>(this, UpdateStepMetadataEvent, {
        workflowID: this.workflowID,
        stepMetadata: this.stepMetadata,
      });
      document.onmouseup = null;
      document.onmousemove = null;
    }
  }

  protected firstUpdated(
    _changedProperties: PropertyValueMap<any> | Map<PropertyKey, unknown>
  ): void {
    this.dragElement(this);
  }

  turnOnElements = () => {
    this.elements.forEach((el) => {
      const key = el.dataset.key;
      const value = el.dataset.value;

      if (!el.classList.contains(HIGLIGHT_CLASS)) {
        el.classList.add(HIGLIGHT_CLASS);
      }
    });
  };

  turnOffElements = () => {
    this.elements.forEach((el) => {
      if (el.classList.contains(HIGLIGHT_CLASS))
        el.classList.remove(HIGLIGHT_CLASS);
    });

    this.elements = [];
  };

  moveOverSchema(e) {
    let currentElement = e.target;

    if (currentElement !== this.elements[0]) {
      this.turnOffElements();
    }

    while (!currentElement.classList.contains("schema-container-overflow")) {
      const value = currentElement.dataset.value;
      const key = currentElement.dataset.key;

      if (key === undefined && value === undefined) {
        currentElement = currentElement.previousElementSibling;
      } else {
        if (!this.elements.includes(currentElement)) {
          this.elements.push(currentElement);
        }

        currentElement = currentElement.parentElement;
      }
    }

    this.turnOnElements();
  }
  renderSchema(schema: any) {
    if (Array.isArray(schema)) {
      return html`${schema.map((v) => {
        return html`<span class="indent" data-value=${v}>- ${v}</span>`;
      })}`;
    }
    if (typeof schema === "object") {
      return html`
        ${Object.entries(schema).map(([k, v]) => {
          if (
            typeof v === "string" ||
            typeof v === "number" ||
            typeof v === "boolean"
          ) {
            return html`<span data-key=${k} data-value=${v}>${k}: ${v}</span>`;
          }

          return html`<span data-key=${k}>${k}:</span>
            <span class="indent"> ${this.renderSchema(v)} </span> `;
        })}
      `;
    }

    return html`${schema}`;
  }

  constructProperty() {
    return this.elements
      .slice()
      .reverse()
      .map((element: HTMLElement, index: number) => {
        return `${element.dataset.key}${
          index !== this.elements.length - 1 ? "." : ""
        }`;
      })
      .join("");
  }

  getSelectedRef(mediaType: MediaType, input: IO, code?: string) {
    if (input === "output") {
      return this.stepMetadata.operation.responses.codes
        .get(code)
        .content.get(mediaType.name).schema.ref;
    } else {
      return this.stepMetadata.operation.requestBody.content.get(mediaType.name)
        .schema.ref;
    }
  }

  getSelectedMediaType(mediaType: MediaType, input: IO, code?: string) {
    if (input === "output") {
      return this.stepMetadata.operation.responses.codes
        .get(code)
        .content.get(mediaType.name).selectedExample;
    } else {
      return this.stepMetadata.operation.requestBody.content.get(mediaType.name)
        .selectedExample;
    }
  }

  renderSchemaContainer(
    schema: Schema,
    mediaType: MediaType,
    input: IO,
    code?: string
  ) {
    const constructHoveredProperty = () => {
      if (!this.elements) return html``;

      return html`${this.constructProperty()}`;
    };

    const schemaContainer = [];
    if (!schema.isPolymorphicSchema()) {
      schemaContainer.push(html`
        <div class="schema-container">
          <div
            class="schema-container-overflow"
            @mousemove="${this.moveOverSchema}"
            @mouseleave="${this.turnOffElements}"
          >
            ${this.renderSchema(schema.schema)}
          </div>
          <div class="hovered-property">${constructHoveredProperty()}</div>
        </div>
      `);
    }

    if (
      mediaType.examples &&
      mediaType.examples.length > 0 &&
      !schema.isPolymorphicSchema()
    ) {
      // ! how tf do we handle nested & nested types? Hopefully it doesn't blow this up
      schemaContainer.push(html` <h6 class="polymorphic-ref-title">
          ${insertSpaces("Examples")}
        </h6>
        ${mediaType.examples.map((example: string) => {
          return html`
            <sl-menu-item
              class="${this.getSelectedMediaType(mediaType, input, code) ===
              example
                ? "selected-media-type"
                : ""}"
              @click=${(e: any) => {
                if (input === "output") {
                  this.stepMetadata.operation.responses.codes
                    .get(code)
                    .content.get(mediaType.name).selectedExample = example;
                } else {
                  this.stepMetadata.operation.requestBody.content.get(
                    mediaType.name
                  ).selectedExample = example;
                }
                sendEvent<UpdateStepMetadataType>(
                  this,
                  UpdateStepMetadataEvent,
                  {
                    workflowID: this.workflowID,
                    stepMetadata: this.stepMetadata,
                  }
                );
                this.requestUpdate();
                e.stopPropagation();
              }}
            >
              ${example}
            </sl-menu-item>
          `;
        })}`);
    }

    if (schema.isPolymorphicSchema()) {
      schemaContainer.push(html`<h6 class="polymorphic-ref-title">
          ${insertSpaces("Refs")}
        </h6>
        ${schema.oneOf?.map((schema: Schema) => {
          return html`
            <sl-menu-item
              class="${this.getSelectedRef(mediaType, input, code) ===
              schema.ref
                ? "selected-ref"
                : ""}"
              @click=${() => {
                if (input === "output") {
                  this.stepMetadata.operation.responses.codes
                    .get(code)
                    .content.get(mediaType.name).schema.ref = schema.ref;
                } else {
                  this.stepMetadata.operation.requestBody.content.get(
                    mediaType.name
                  ).schema.ref = schema.ref;
                }

                sendEvent<UpdateStepMetadataType>(
                  this,
                  UpdateStepMetadataEvent,
                  {
                    workflowID: this.workflowID,
                    stepMetadata: this.stepMetadata,
                  }
                );
                this.requestUpdate();
              }}
            >
              ${schema.ref}
              <sl-menu slot="submenu">
                ${this.renderSchemaContainer(schema, mediaType, input, code)}
              </sl-menu>
            </sl-menu-item>
          `;
        })} `);
    }

    return schemaContainer;
  }

  renderHeader() {
    return html`
      <div class="step-header">
        <sl-icon-button id="grip" name="grip-horizontal"></sl-icon-button>
        <h4>${this.stepMetadata.pathName}</h4>

        <sl-badge class="${this.stepMetadata.operation?.method}-color"
          >${this.stepMetadata.operation?.method}</sl-badge
        >
      </div>
    `;
  }

  renderStepName() {
    if (this.isEditingStepName) {
      return html`
        <div class="step-name">
          <sl-input
            name="name"
            size="small"
            value=${this.stepMetadata.stepName}
            @sl-change=${(e) => {
              const nameChange = e.target.value;
              this.stepMetadata.stepName = nameChange;

              sendEvent<UpdateStepMetadataType>(this, UpdateStepMetadataEvent, {
                workflowID: this.workflowID,
                stepMetadata: this.stepMetadata,
              });
              this.isEditingStepName = false;
              this.requestUpdate();
            }}
          >
          </sl-input>
        </div>
      `;
    }

    return html`
      <div
        class="step-name"
        @dblclick=${() => {
          this.isEditingStepName = true;
        }}
      >
        ${this.stepMetadata?.stepName === ""
          ? html`<span class="dash">Name the step</span>`
          : this.stepMetadata?.stepName}
      </div>
    `;
  }

  setPosition() {
    this.style.left = `${this.stepMetadata.position.x}px`;
    this.style.top = `${this.stepMetadata.position.y}px`;
  }

  hasPipeInputAnchor(property) {
    const anchors = this.anchors.filter((anchor: Anchor) => anchor[property]);
    if (anchors.length === 0) return;

    return html`
      <sl-badge
        slot="suffix"
        variant="primary"
        pill
        ?pulse=${anchors
          .map((anchor: Anchor) => anchor.expressionValue != "")
          .includes(true)}
        class="anchor-badge ${anchors
          .map((anchor: Anchor) => anchor.id)
          .includes(this.selectedAnchor?.id)
          ? "selected-anchor"
          : ""}"
        data-property-list=${`[${anchors
          .map((anchor: Anchor, num: number) => {
            return `${anchor.id}${num !== anchors.length - 1 ? "," : ""}`;
          })
          .join("")}]`}
      >
        ${anchors.length}
      </sl-badge>
    `;
  }

  renderOneOfRefsFromMediaContent(content: Map<string, MediaType>) {
    const oneOfRefs = normalizeMap(content)
      .map((content: MediaType) => {
        if (content.schema.oneOf?.length > 0) {
          return content.schema.ref;
        }
        return undefined;
      })
      .filter((val: string) => {
        return val !== undefined && val !== "";
      });

    return oneOfRefs.length > 0
      ? html`
          <p slot="suffix">
            ${oneOfRefs
              .map((ref: string) =>
                Schema.RenderRefWithoutComponentsSchemaPrefix(ref)
              )
              .join(",")}
          </p>
        `
      : "";
  }

  renderBody() {
    const renderParameters = () => {
      const params: Parameter[] = this.stepMetadata.operation?.parameters;
      if (!params) return html``;

      return html`
        <sl-menu-item>
          <sl-icon class="request-body-button" name="sliders" slot="prefix">
          </sl-icon>
          <sl-menu
            class="params-menu"
            slot="submenu"
            @sl-select=${(e) => {
              const selected = e.detail.item;
              const dataIn = selected.dataset.in;
              const property = selected.dataset.property;

              const newAnchor = new Anchor(
                "parameter",
                new ParameterProperty(dataIn, property)
              );
              newAnchor.addPathAnchor(
                this.stepMetadata.pathName,
                this.stepMetadata.operation.method,
                this.stepMetadata.id
              );

              sendEvent<Anchor>(this, SelectingAnchorEvent, newAnchor);
            }}
          >
            ${params.map((param: Parameter) => {
              return html`
                <sl-menu-item data-in=${param.in} data-property=${param.name}>
                  <p slot="prefix">${param.in}</p>
                  <p>${param.name}</p>
                </sl-menu-item>
              `;
            })}
          </sl-menu>
          Parameters ${this.hasPipeInputAnchor("parameterProperty")}
        </sl-menu-item>
      `;
    };

    const renderMediaTypeMenu = (
      content: Map<string, MediaType>,
      code?: string,
      input?: IO
    ) => {
      return html`<sl-menu slot="submenu">
        ${normalizeMap(content).map((mediaType: MediaType) => {
          return html`
            <sl-menu-item
              ?disabled=${mediaType.name !== "application/json"}
              value=${mediaType.name}
              @click=${() => {
                mediaType.isOpened = !mediaType.isOpened;
              }}
            >
              ${mediaType.name}
              <sl-menu
                slot="submenu"
                @click=${() => {
                  console.log("clicked mediatype");
                  let newAnchor: Anchor;
                  if (input === "input") {
                    newAnchor = new Anchor(
                      "request-body",
                      new RequestBodyProperty(
                        mediaType.name,
                        this.constructProperty()
                      )
                    );
                  } else {
                    newAnchor = new Anchor(
                      "response-body",
                      new ResponseBodyProperty(
                        mediaType.name,
                        code,
                        this.constructProperty()
                      )
                    );
                  }
                  newAnchor.addPathAnchor(
                    this.stepMetadata.pathName,
                    this.stepMetadata.operation.method,
                    this.stepMetadata.id
                  );

                  sendEvent<Anchor>(this, SelectingAnchorEvent, newAnchor);
                }}
              >
                ${this.renderSchemaContainer(
                  mediaType.schema,
                  mediaType,
                  input,
                  code
                )}
              </sl-menu>
            </sl-menu-item>
          `;
        })}
      </sl-menu>`;
    };

    const renderRequestBody = () => {
      const requestBody = this.stepMetadata.operation?.requestBody;

      if (!requestBody || !requestBody.content) return html``;
      if (requestBody?.content.size === 0) return html``;

      const renderOneOfRefs = this.renderOneOfRefsFromMediaContent(
        requestBody.content
      );

      return html`
        <sl-menu-item>
          <sl-icon
            class="request-body-button"
            name="box-arrow-in-right"
            slot="prefix"
          >
          </sl-icon>
          <p>Request Body</p>
          ${renderOneOfRefs} ${this.hasPipeInputAnchor("requestBodyProperty")}
          ${renderMediaTypeMenu(requestBody?.content, "", "input")}
        </sl-menu-item>
      `;
    };

    const renderInputSection = () => {
      const requestBody = renderRequestBody();
      const parameters = renderParameters();
      if (
        requestBody.values.join("").length === 0 &&
        parameters.values.join("").length === 0
      ) {
        return html``;
      }

      return html`
        <div class="inputs">
          <p class="label">inputs</p>
          <sl-menu> ${parameters} ${requestBody} </sl-menu>
        </div>
      `;
    };

    const codes = normalizeMap(this.stepMetadata.operation?.responses.codes)
      .map((code: ResponseCode) => {
        return code;
      })
      .filter((code: ResponseCode) => code.content.size > 0);

    // only handle oneOf

    const renderOutputSection = () => {
      const renderResponeBody = () => {
        return html`
          <sl-menu>
            ${codes.map((code: ResponseCode) => {
              const renderOneOfRefs = this.renderOneOfRefsFromMediaContent(
                code.content
              );

              return html`
                <sl-menu-item
                  class="response-code ${this.stepMetadata.selectedCode ===
                  code.name
                    ? "selected-code"
                    : ""}"
                  @click=${() => {
                    this.stepMetadata.selectedCode = code.name;

                    sendEvent<UpdateStepMetadataType>(
                      this,
                      UpdateStepMetadataEvent,
                      {
                        workflowID: this.workflowID,
                        stepMetadata: this.stepMetadata,
                      }
                    );

                    this.requestUpdate();
                  }}
                >
                  <sl-badge>${code.name}</sl-badge>
                  ${renderOneOfRefs}
                  ${renderMediaTypeMenu(code.content, code.name, "output")}
                  ${this.hasPipeInputAnchor("responseBodyProperty")}
                </sl-menu-item>
              `;
            })}
          </sl-menu>
        `;
      };

      if (codes.length === 0) {
        return html``;
      }

      return html`
        <div class="outputs">
          <p class="label">
            outputs
            <span class="question">
              <sl-tooltip>
                <span slot="content">
                  ${insertSpaces("All responses with available schemas.")}
                </span>
                <span>?</span>
              </sl-tooltip>
            </span>
          </p>
          ${renderResponeBody()}
        </div>
      `;
    };

    return html`
      <div class="step-body ${codes.length === 0 ? "no-outputs" : ""}">
        <div class="vertical-bar"></div>

        ${renderInputSection()} ${renderOutputSection()}
      </div>
    `;
  }

  handleGlow() {
    if (this.stepMetadata.isGlowing) {
      return "glow";
    }
  }

  render() {
    this.setPosition();

    return html`
      <figure class="arazzo-step-container ${this.handleGlow()}">
        ${this.renderHeader()} ${this.renderStepName()} ${this.renderBody()}
      </figure>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "arazzo-step": ArazzoStep;
  }
}
