import { insertSpaces } from "@/model/traffic-control-utils";
import { html } from "lit";
import { TrafficControlComponent } from "../traffic-control.component";

export const renderProxyMonitorIsland = (
  thisComponent: TrafficControlComponent
) => {
  return html`
    <aside class="monitor-island">
      <sl-tooltip content="">
        <p slot="content">${insertSpaces("Failed calls only")}</p>
        <h4 class="island-titles monitor-island-title">Proxy Monitor</h4>
      </sl-tooltip>
    </aside>
  `;
};
