import { insertSpaces } from "@/model/traffic-control-utils";
import { html } from "lit";
import { TrafficControlComponent } from "../traffic-control.component";
import { HttpRequest, HttpTransaction } from "@/model/http_transaction";

export function renderProxyMonitorIsland(this: TrafficControlComponent) {
  return html`
    <aside class="monitor-island">
      <sl-tooltip content="">
        <p slot="content">${insertSpaces("Failed calls only")}</p>
        <h4 class="island-titles monitor-island-title">Proxy Monitor</h4>
      </sl-tooltip>
      <ul class="proxy-list">
        ${this.proxies.map((proxy: HttpTransaction) => {
          return html`
            <li
              class="proxy-island-list-item"
              @click=${() => {
                const transaction = Object.assign(new HttpTransaction(), proxy);

                transaction.httpRequest = Object.assign(
                  new HttpRequest(),
                  transaction.httpRequest
                );
                transaction.httpResponse = Object.assign(
                  new HttpRequest(),
                  transaction.httpResponse
                );

                this.transactionViewComponent.httpTransaction = transaction;
                this.mockMonitorDialog.show();
                console.log(transaction);
                this.requestUpdate();
              }}
            >
              <span
                ><span style="margin-right: 3px">⛔</span>${proxy.httpRequest
                  .path}</span
              ><span>${proxy.httpResponse.statusCode}</span>
            </li>
          `;
        })}
      </ul>
    </aside>
  `;
}

export class Proxy {
  constructor() {}
}

export function constructProxyRequest(
  thisComponent: TrafficControlComponent,
  transaction: HttpTransaction
) {
  thisComponent.proxies.unshift(transaction);
  thisComponent.requestUpdate();
}
