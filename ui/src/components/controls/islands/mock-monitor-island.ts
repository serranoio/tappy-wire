import { insertSpaces } from "@/model/traffic-control-utils";
import { html } from "lit";
import { TrafficControlComponent } from "../traffic-control.component";

export const renderMockMonitorIsland = (
  thisComponent: TrafficControlComponent
) => {
  return html`
    <aside class="mock-monitor-island">
      <sl-tooltip>
        <p slot="content">${insertSpaces("All mocks")}</p>
        <h4 class="island-titles mock-monitor-island-title">Mock Monitor</h4>
      </sl-tooltip>
    </aside>
  `;
};
