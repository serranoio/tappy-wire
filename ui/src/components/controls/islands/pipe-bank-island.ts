import { Anchor, Pipe } from "@/model/traffic-control";
import { insertSpaces, normalizeMap } from "@/model/traffic-control-utils";
import { html } from "lit";
import { TrafficControlComponent } from "../traffic-control.component";
import { styleMap } from "lit/directives/style-map.js";

export const selectPipe = (p: Pipe, thisComponent: TrafficControlComponent) => {
  thisComponent.selectedPipe = p;

  thisComponent.selectedPipeCoords = { x: 0, y: 0 };
};

export const renderAnchorBadge = (
  reference: Anchor,
  placement: "right" | "left",
  thisComponent: TrafficControlComponent
) => {
  return html`
    <sl-tooltip placement=${placement}>
      <p
        slot="content"
        style=${styleMap({
          fontSize: ".75rem",
        })}
      >
        ${insertSpaces(reference.pathName)}
      </p>
      <sl-badge
        @click=${() => {
          thisComponent.selectedAnchor = reference;
          thisComponent.selectedAnchor.lastSelectedPipe =
            thisComponent.selectedPipe;
          thisComponent.selectedPipe = null;
          thisComponent.selectedPipeCoords = null;
        }}
        class="anchor-badge-id"
      >
        ${reference.getFullProperty()}
      </sl-badge>
    </sl-tooltip>
  `;
};

export const renderPipeBankIsland = (
  thisComponent: TrafficControlComponent
) => {
  let moveContainers = 0;
  let pipeTitle = {
    tooltip: "All pipes",
    title: "Pipes",
  };

  if (thisComponent.selectedAnchor) {
    moveContainers = 100;
    pipeTitle.tooltip =
      "Anchor a pipe on a reference or expose the reference outside of the workflow";
    pipeTitle.title = "Selecting a Anchor";
  }
  if (thisComponent.selectedPipe) {
    moveContainers = 200;
    pipeTitle.tooltip = "Feed references values";
    pipeTitle.title = "Selecting a Pipe";
  }

  let variableIslandControl = html`
    <div class="variable-island-control">
      <sl-icon-button
        name="trash"
        @click=${() => {
          thisComponent.deletePipesMode = !thisComponent.deletePipesMode;
        }}
      >
      </sl-icon-button>
      <sl-tooltip>
        <p slot="content">
          ${insertSpaces(
            `Deselect ${thisComponent.selectedPipe ? "pipe" : ""} ${
              thisComponent.selectedAnchor ? "anchor" : ""
            }`
          )}
        </p>

        <sl-icon-button
          name="arrow-left"
          @click=${() => {
            thisComponent.selectedPipe = null;
            thisComponent.selectedPipeCoords = null;
            thisComponent.selectedAnchor = null;
            thisComponent.requestUpdate();
          }}
        >
        </sl-icon-button>
      </sl-tooltip>
    </div>
  `;
  let selectedPipeContainer;
  if (thisComponent.selectedPipe) {
    selectedPipeContainer = html`
      <div
        class="pipe-bank-content"
        style=${styleMap({
          transform: `translateY(${-200 + moveContainers}%)`,
        })}
      >
        <div class="show-pipe">
          <div>
            ${renderAnchorBadge(
              thisComponent.selectedPipe.input,
              "right",
              thisComponent
            )}
          </div>
          <div><sl-icon name="chevron-double-right"></sl-icon></div>
          <div class="pipe-outputs">
            ${thisComponent.selectedPipe.outputs.map((output: Anchor) => {
              return renderAnchorBadge(output, "left", thisComponent);
            })}
          </div>
        </div>
      </div>
    `;
  }

  let selectedAnchorContainer;
  if (thisComponent.selectedAnchor) {
    let pipeButton = [];
    if (thisComponent.selectedAnchor.isInPipe()) {
      pipeButton.push(html`<sl-button
        @click=${() => {
          selectPipe(
            thisComponent.selectedAnchor.lastSelectedPipe,
            thisComponent
          );
          thisComponent.selectedAnchor = null;

          thisComponent.requestUpdate();
        }}
        size="small"
        >Return to pipe</sl-button
      >`);
    }
    if (!thisComponent.selectedAnchor.isASender()) {
      pipeButton.push(html`<sl-button
        @click=${() => {
          const newPipe = thisComponent.selectedAnchor.newPipe();
          thisComponent.selectedAnchor = null;
          thisComponent.pipes.push(newPipe);
          thisComponent.mockBoard.addNewPipe(
            thisComponent.selectedWorkflow.workflowID,
            newPipe,
            thisComponent._bus
          );

          selectPipe(newPipe, thisComponent);

          thisComponent.requestUpdate();
        }}
        size="small"
        >Create a pipe</sl-button
      >`);
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
            ${renderAnchorBadge(
              thisComponent.selectedAnchor,
              "right",
              thisComponent
            )}
          </h3>
          <sl-button disabled size="small">Expose as workflow input</sl-button>
          <div class="flex">${pipeButton.map((btn) => btn)}</div>
        </div>
        <div class="column-flex">
          <h4>Set expression</h4>
          <small>use the $ syntax to refer to your property</small>
          <div class="input-expressions">
            ${thisComponent.selectedAnchor.renderInputExpressionBox()}
          </div>
          <sl-input
            size="small"
            @sl-change=${(e) => {
              thisComponent.selectedAnchor.expression = e.target.value;
              thisComponent.selectedAnchor.updateAnchor(
                thisComponent.selectedWorkflow.workflowID,
                thisComponent._bus
              );
            }}
            value=${thisComponent.selectedAnchor.expression}
            placeholder="$path.orderId * 5"
          ></sl-input>
        </div>
      </div>
    `;
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
          ${normalizeMap(thisComponent.selectedWorkflow?.pipes).map(
            (pipe: Pipe) => {
              return html`
                <div
                  @click=${() => {
                    selectPipe(pipe, thisComponent);
                    thisComponent.requestUpdate();
                  }}
                >
                  ${pipe.renderPipeBadge()}
                </div>
              `;
            }
          )}
        </div>
      </div>
      ${variableIslandControl}
    </aside>
  `;
};
