import { Operation, PathItem } from "@/model/paths";
import {
  httpMethods,
  insertSpaces,
  isObjectEmpty,
  notify,
} from "@/model/traffic-control-utils";
import { SlMenuItem } from "@shoelace-style/shoelace";
import { html } from "lit";
import { TrafficControlComponent } from "../traffic-control.component";

export function renderPathsIsland(this: TrafficControlComponent) {
  return html`
    <aside class="paths-island">
      <sl-tooltip>
        <p slot="content">${insertSpaces("Add a step to your workflow")}</p>
        <h4 class="island-titles monitor-island-title">steps</h4>
      </sl-tooltip>
      <ul class="path-items-list">
        ${this.pathItems.map((pathItem: PathItem) => {
          return pathItem.renderPathItemInPathsIsland(
            (e: CustomEvent<SlMenuItem>) => {
              if (!this.selectedWorkflow) {
                notify(
                  "Please select a workflow!",
                  "warning",
                  "info-circle",
                  3000
                );

                return;
              }

              const operation = e.detail.item.value;

              const operationSelected = pathItem[operation] as Operation;

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
            }
          );
        })}
      </ul>
      <div class="path-island-control">
        <sl-icon-button name="plus-lg"> </sl-icon-button>
      </div>
    </aside>
  `;
}
