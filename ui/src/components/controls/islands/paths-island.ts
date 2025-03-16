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

export const renderHttpMethods = (pathItem: PathItem) => {
  return html`
    ${httpMethods.map((method: string) => {
      if (isObjectEmpty(pathItem[method])) {
        return html``;
      }
      return html`
        <sl-menu-item value="${method}">
          <sl-badge size="small" class="${method}-color">${method}</sl-badge>
        </sl-menu-item>
      `;
    })}
  `;
};

export const renderPathsIsland = (thisComponent: TrafficControlComponent) => {
  return html`
    <aside class="paths-island">
      <sl-tooltip>
        <p slot="content">${insertSpaces("Add a step to your workflow")}</p>
        <h4 class="island-titles monitor-island-title">steps</h4>
      </sl-tooltip>
      <ul class="path-items-list">
        ${thisComponent.pathItems.map((pathItem: PathItem) => {
          return html`
            <li class="path-item">
              <sl-dropdown>
                <p slot="trigger">${pathItem.name}</p>
                <sl-menu
                  @sl-select=${(e: SlMenuItem) => {
                    if (!thisComponent.selectedWorkflow) {
                      notify(
                        "Please select a workflow!",
                        "warning",
                        "info-circle",
                        100000
                      );

                      return;
                    }

                    const operation = e.detail.item.value;

                    const operationSelected = pathItem[operation] as Operation;

                    const stepMetadata = thisComponent.mockBoard.addNewStep(
                      thisComponent.selectedWorkflow.workflowID,
                      pathItem,
                      operationSelected.operationId,
                      thisComponent,
                      thisComponent._bus
                    );

                    thisComponent.steps.push(stepMetadata);

                    thisComponent.requestUpdate();

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
};
