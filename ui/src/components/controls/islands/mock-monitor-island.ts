import {
  insertSpaces,
  isObjectEmpty,
  normalizeMap,
  sendEvent,
} from "@/model/traffic-control-utils";
import { html } from "lit";
import { TrafficControlComponent } from "../traffic-control.component";
import { HttpRequest, HttpTransaction } from "@/model/http_transaction";
import { Message } from "@/model/message";
import { StepMetadata, WorkflowMetadata } from "@/model/traffic-control";
import { normalize } from "path";

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
            <div
              class="mock-transaction"
              @click=${() => {
                const httpTransaction = Object.assign(
                  new HttpTransaction(),
                  mock.transaction
                );
                thisComponent.transactionViewComponent.httpTransaction =
                  httpTransaction;

                thisComponent.selectedMock = mock;
                thisComponent.mockMonitorDialog.show();
              }}
            >
              <div class="titles-div">
                <h4 class="mock-transaction-header">
                  <span style="margin-left: 4px;"> ${mock?.path} </span>
                  <span>
                    ${mock?.workflows?.map(
                      (name: string, num: number) => name + " "
                    )}
                  </span>
                </h4>
                <div class="subtitles">
                  <div class="title-section">
                    <h5>Messages</h5>
                    <div class="icon-box">
                      <span>${mock.messages?.length}</span>
                      <sl-icon name="chat-left"></sl-icon>
                    </div>
                  </div>
                  <div class="title-section">
                    <h5>Anchors</h5>
                    <div class="icon-box">
                      <span
                        >${mock.messages
                          ?.flatMap((message: Message) => {
                            let count = 0;
                            if (message.receiverAnchor) {
                              count++;
                            } else if (message.senderAnchor) {
                              count++;
                            }

                            return count;
                          })
                          .reduce((acc, cum) => acc + cum)}</span
                      >
                      <sl-icon name="link"></sl-icon>
                    </div>
                  </div>
                  <div class="title-section">
                    <h5>Errors</h5>
                    <div class="icon-box">
                      <span> ${mock?.errs?.length} </span>
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
  httpTransaction: HttpTransaction, 
  headers
): boolean => {
  sendEvent(thisComponent, WiretapMatchedPath, headers[WiretapMatchedPath]);
  if (!headers[WiretapMatchedPath]) {
    return false;
  }

  thisComponent.mocks.unshift({ transaction: httpTransaction });
  thisComponent.mocks[0].workflows = [];
  normalizeMap(thisComponent.mockBoard.workflowMetadatas).forEach(
    (workflow: WorkflowMetadata) => {
      if (!workflow.isActivated) return;

      normalizeMap(workflow.stepMetadatas).map((stepMetadata: StepMetadata) => {
        const obj = JSON.parse(headers[WiretapMatchedPath]);
        console.log("parsed path", obj, headers[WiretapMatchedPath]);

        if (obj.includes(stepMetadata.id)) {
          thisComponent.mocks[0].path = stepMetadata.pathName;
          thisComponent.mocks[0].workflows.push(workflow.getWorkflowName());
        }
      });
    }
  );

  thisComponent.requestUpdate();
  return true
};

export interface MockError {}

export const constructMockRequest = (
  transaction: HttpTransaction,
  thisComponent: TrafficControlComponent
): { isMock: boolean; messages: Message[]; errors: MockError[] } => {
  const httpTransaction = new HttpTransaction();

  httpTransaction.httpRequest = Object.assign(
    new HttpRequest(),
    transaction.httpRequest
  );
  httpTransaction.httpResponse = Object.assign(
    new HttpRequest(),
    transaction.httpResponse
  );
  
  if (httpTransaction.httpResponse.headers[WiretapTypeHeader] === "Proxy") {
    return { isMock: false, messages: [], errors: [] };
  }
  
  const isMatched = handleWiretapMatchedPath(thisComponent, httpTransaction, httpTransaction.httpResponse.headers);
  if (!isMatched) return { isMock: false, messages: null, errors: null};
  
  // only now can we pu this on the mock monitor
  
  let messages: Message[] = [];
  const msg = JSON.parse(httpTransaction.httpResponse.headers.Messages);
  if (msg) {
    messages = Message.ConstructMessages(msg);
    thisComponent.mocks[0].messages = messages;
    const anchorMessages = Message.FindMessagesWithAnchors(messages);
    thisComponent.mocks[0].anchorMessages = anchorMessages;
  }

  const errs = JSON.parse(
    httpTransaction.httpResponse.headers["Wiretap-Mock-Errors"]
  );

  if (!errs || isObjectEmpty(errs[0])) {
    thisComponent.mocks[0].errs = [];
  } else {
    thisComponent.mocks[0].errs = errs;
  }

  // render the request as a div and have it dissappear after 100 seconds or some shit
  // make the step glow, also show the mock request in the panel.
  return { isMock: true, messages: messages, errors: [] };
};
