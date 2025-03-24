import { html } from "lit";
import { TrafficControlComponent } from "../traffic-control.component";
import { insertSpaces } from "@/model/traffic-control-utils";
import { WorkflowMetadata } from "@/model/traffic-control/workflow-metadata";

export function renderName(
  this: TrafficControlComponent,
  name: string,
  key: string
) {
  if (
    this.isEditingWorkflowName.id !== key ||
    this.isEditingWorkflowName.id.length === 0 ||
    !this.isEditingWorkflowName.fromIsland
  )
    return html`${this.selectedWorkflow.getWorkflowName()}`;

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
}

export function renderStatusIndicator(
  this: TrafficControlComponent,
  key: string
) {
  if (!this.isDeletingWorkflow) {
    return html`<span
      class="status-indicator"
      @click=${(e: any) => {
        this.mockBoard.workflowMetadatas.get(key).isActivated =
          !this.mockBoard.workflowMetadatas.get(key).isActivated;
        this.mockBoard.updateWorkflow(
          this.selectedWorkflow.workflowID,
          this._bus
        );
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
        // if we are deleting this workflow, swithc selected workflow to the first one
        if (this.selectedWorkflow.workflowID === key) {
          this.selectedWorkflow = this.workflows[0];
        }

        this.workflows = this.workflows.filter(
          (workflow: WorkflowMetadata) => workflow.workflowID !== key
        );
        this.mockBoard.deleteWorkflow(key, this._bus);
        this.requestUpdate();
      }}
    >
    </sl-icon-button>
  `;
}

export function renderWorkflowIsland() {
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
              ${renderName.bind(this)(workflow.workflowName, key)}
              ${renderStatusIndicator.bind(this)(key)}
            </li> `;
          })}
        </ul>
      </div>
    </aside>
  `;
}
