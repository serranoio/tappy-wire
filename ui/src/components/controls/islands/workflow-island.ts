import { MockBoard, WorkflowMetadata } from "@/model/traffic-control";
import { html } from "lit";
import { TrafficControlComponent } from "../traffic-control.component";
import { insertSpaces } from "@/model/traffic-control-utils";

export const renderWorkflowNameOnEmpty = (name: string, id: string) => {
  return name?.length === 0 ? id : name;
};
export const renderName = (
  name: string,
  key: string,
  thisComponent: TrafficControlComponent
) => {
  if (
    thisComponent.isEditingWorkflowName.id !== key ||
    thisComponent.isEditingWorkflowName.id.length === 0 ||
    !thisComponent.isEditingWorkflowName.fromIsland
  )
    return html` <p>${renderWorkflowNameOnEmpty(name, key)}</p> `;

  return html`
    <sl-input
      name="name"
      size="small"
      value=${name}
      @sl-change=${(e) => {
        const workflow = thisComponent.mockBoard.workflowMetadatas.get(key);
        workflow.workflowName = e.target.value;

        thisComponent.mockBoard.updateWorkflow(
          workflow.workflowID,
          thisComponent._bus
        );

        thisComponent.isEditingWorkflowName.id = "";
        thisComponent.requestUpdate();
      }}
    >
    </sl-input>
  `;
};

export const renderStatusIndicator = (
  key: string,
  thisComponent: TrafficControlComponent
) => {
  if (!thisComponent.isDeletingWorkflow) {
    return html`<span
      class="status-indicator"
      @click=${(e: any) => {
        thisComponent.mockBoard.workflowMetadatas.get(key).isActivated =
          !thisComponent.mockBoard.workflowMetadatas.get(key).isActivated;
        thisComponent.requestUpdate();
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
        // if we are deleting this workflow, swithc selected workflow to the first one
        if (thisComponent.selectedWorkflow.workflowID === key) {
          thisComponent.selectedWorkflow = thisComponent.workflows[0];
        }

        thisComponent.workflows = thisComponent.workflows.filter(
          (workflow: WorkflowMetadata) => workflow.workflowID !== key
        );
        thisComponent.mockBoard.deleteWorkflow(key, thisComponent._bus);
        thisComponent.requestUpdate();
      }}
    >
    </sl-icon-button>
  `;
};

export const renderWorkflowIsland = (thisComponent) => {
  return html`
    <aside
      class="workflow-island ${thisComponent.isWorkflowIslandOpened
        ? ""
        : "closed"}"
    >
      <div class="workflow-island-control">
        <sl-icon-button
          class="delete-workflow"
          name="trash"
          @click=${() => {
            thisComponent.isDeletingWorkflow =
              !thisComponent.isDeletingWorkflow;
          }}
        ></sl-icon-button>
        <sl-icon-button
          class="add-new-workflow"
          name="plus"
          @click=${() => {
            const workflow = thisComponent.mockBoard.createNewWorkflow(
              thisComponent._bus
            );
            thisComponent.workflows.push(workflow);
            thisComponent.changeSelectedWorkflow(workflow);
            thisComponent.requestUpdate();
          }}
        >
        </sl-icon-button>
        <sl-icon-button
          class="close-workflow-island"
          name="${thisComponent.isWorkflowIslandOpened
            ? "caret-left"
            : "caret-right"}"
          @click=${() => {
            thisComponent.isWorkflowIslandOpened =
              !thisComponent.isWorkflowIslandOpened;
          }}
        ></sl-icon-button>
      </div>
      <div class="overflow-container">
        <sl-tooltip>
          <p slot="content">${insertSpaces("List of workflows")}</p>
          <h4 class="workflow-island-title island-titles">workflows</h4>
        </sl-tooltip>

        <ul class="workflow-list">
          ${thisComponent.workflows.map((workflow: WorkflowMetadata) => {
            const key = workflow.workflowID;

            return html`<li
              class="workflow-name ${thisComponent.selectedWorkflow
                .workflowID === key
                ? "selected-workflow"
                : ""}
                  ${thisComponent.mockBoard.workflowMetadatas.get(key)
                .isActivated
                ? "activated"
                : ""}
                  
                  "
              @click=${() => {
                thisComponent.changeSelectedWorkflow(workflow);
              }}
              @dblclick=${() => {
                thisComponent.isEditingWorkflowName.id = key;
                thisComponent.isEditingWorkflowName.fromIsland = true;
                thisComponent.requestUpdate();
              }}
            >
              ${renderName(workflow.workflowName, key, thisComponent)}
              ${renderStatusIndicator(key, thisComponent)}
            </li> `;
          })}
        </ul>
      </div>
    </aside>
  `;
};
