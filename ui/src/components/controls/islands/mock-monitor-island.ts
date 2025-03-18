import { insertSpaces, sendEvent } from "@/model/traffic-control-utils";
import { html } from "lit";
import { TrafficControlComponent } from "../traffic-control.component";
import { HttpTransaction } from "@/model/http_transaction";
import { Message } from "@/model/message";

export const renderMockMonitorIsland = (
  thisComponent: TrafficControlComponent
) => {
  return html`
    <aside class="mock-monitor-island">
      <sl-tooltip>
        <p slot="content">${insertSpaces("All mocks")}</p>
        <h4 class="island-titles mock-monitor-island-title">Mock Monitor</h4>
      </sl-tooltip>
      <div id="mock-monitor-list">
        ${thisComponent.mocks.map((mock) => {
          return html`
            <div class="mock-transaction">
              <div class="titles-div">
                <h4 class="mock-transaction-header">${mock?.path}</h4>
                <div class="subtitles">
                  <div class="title-section">
                    <h5>Messages</h5>
                    <div class="icon-box">
                      <span>5</span>
                      <sl-icon name="chat-left"></sl-icon>
                    </div>
                  </div>
                  <div class="title-section">
                    <h5>Anchors</h5>
                    <div class="icon-box">
                      <span>5</span>
                      <sl-icon name="link"></sl-icon>
                    </div>
                  </div>
                  <div class="title-section">
                    <h5>Errors</h5>
                    <div class="icon-box">
                      <span>5</span>
                      <sl-icon name="bug"></sl-icon>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          `;
        })}
      </div>
    </aside>
  `;
};

export const WiretapTypeHeader = "Wiretap-Type-Header";
export const WiretapMatchedPath = "Wiretap-Matched-Path";
export const Messages = "Messages";

const handleWiretapMatchedPath = (
  thisComponent: TrafficControlComponent,
  headers
) => {
  sendEvent(thisComponent, WiretapMatchedPath, headers[WiretapMatchedPath]);

  thisComponent.mocks.unshift({
    path: thisComponent.mockBoard.workflowMetadatas
      .get(thisComponent.selectedWorkflow.workflowID)
      .stepMetadatas.get(headers[WiretapMatchedPath]).pathName,
  });
  thisComponent.requestUpdate();
};

export interface MockError {}

export const constructMockRequest = (
  transaction: HttpTransaction,
  thisComponent: TrafficControlComponent
): { isMock: boolean; messages: Message[]; errors: MockError[] } => {
  const headers = transaction.httpResponse.headers;

  if (headers[WiretapTypeHeader] === "Proxy") {
    return { isMock: false, messages: [], errors: [] };
  }

  handleWiretapMatchedPath(thisComponent, headers);

  let messages: Message[] = [];
  const msg = JSON.parse(transaction.httpResponse.headers.Messages);
  if (msg) {
    messages = Message.ConstructMessages(msg);
    console.log(messages);
    const anchorMessages = Message.FindMessagesWithAnchors(messages);

    console.log(anchorMessages);
  }

  const errs = JSON.parse(transaction.httpResponse.headers.Messages);
  if (errs) {
  }

  // render the request as a div and have it dissappear after 100 seconds or some shit
  // make the step glow, also show the mock request in the panel.
  return { isMock: true, messages: messages, errors: [] };
};
