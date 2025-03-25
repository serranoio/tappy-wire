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
import { MockBoard } from "@/model/traffic-control/mockboard";

export class Mock {
  transaction: HttpTransaction;
  messages: Message[];
  anchorMessages: Message[];
  errs: string[];
  workflows: string[];
  path: string;
  headers: any;
  constructor(
    transaction: HttpTransaction,
    element: Element,
    mockboard: MockBoard
  ) {
    this.transaction = transaction;
    this.headers = this.transaction.httpResponse.headers;

    if (
      this.headers[WiretapTypeHeader] === "Proxy" ||
      this.headers[WiretapTypeHeader] !== "mock"
    ) {
      throw new Error("this is a proxy");
    }
    if (!this.matchedPath(element)) {
      return;
    }

    this.matchedWorkflows(mockboard);

    this.constructMessages();
    this.constructErrors();
  }

  constructErrors() {
    const errs = JSON.parse(this.headers["Wiretap-Mock-Errors"]);

    if (!errs || isObjectEmpty(errs[0])) {
      this.errs = [];
    } else {
      this.errs = errs;
    }
  }

  constructMessages() {
    let messages: Message[] = [];
    const msg = JSON.parse(this.headers.Messages);
    if (msg) {
      messages = Message.ConstructMessages(msg);
      this.messages = messages;
      const anchorMessages = Message.FindMessagesWithAnchors(messages);
      this.anchorMessages = anchorMessages;
    }
  }

  // matches workflows that contain this step.
  matchedWorkflows(mockboard: MockBoard) {
    this.workflows = [];

    normalizeMap(mockboard.workflowMetadatas).forEach(
      (workflow: WorkflowMetadata) => {
        if (!workflow.isActivated) return;

        normalizeMap(workflow.stepMetadatas).map(
          (stepMetadata: StepMetadata) => {
            const obj = JSON.parse(
              this.transaction.httpResponse.headers[WiretapMatchedPath]
            );
            console.log("parsed path", obj, this.headers[WiretapMatchedPath]);

            if (obj.includes(stepMetadata.id)) {
              this.path = stepMetadata.pathName;
              this.workflows.push(workflow.getWorkflowName());
            }
          }
        );
      }
    );
  }

  matchedPath(element: Element) {
    if (!this.headers[WiretapMatchedPath]) {
      return false;
    }

    sendEvent(
      element,
      WiretapMatchedPath,
      this.transaction.httpResponse.headers[WiretapMatchedPath]
    );
    return true;
  }
}

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
        ${thisComponent.mocks.map((mock: Mock) => {
          return html`
            <div
              class="mock-transaction"
              @click=${() => {
                const transaction = Object.assign(
                  new HttpTransaction(),
                  mock.transaction
                );

                transaction.httpRequest = Object.assign(
                  new HttpRequest(),
                  transaction.httpRequest
                );
                transaction.httpResponse = Object.assign(
                  new HttpRequest(),
                  transaction.httpResponse
                );

                thisComponent.transactionViewComponent.httpTransaction =
                  transaction;

                thisComponent.selectedMock = mock;
                thisComponent.mockMonitorDialog.show();
              }}
            >
              <div class="titles-div">
                <h4 class="mock-transaction-header">
                  <span style="margin-left: 4px;"> ${mock?.path} </span>
                  <span>
                    ${mock?.workflows.map(
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

export interface MockError {}

export function constructMockRequest(
  thisComponent: TrafficControlComponent,
  transaction: HttpTransaction
): { isMock: boolean; messages: Message[]; errors: MockError[] } {
  let mock: Mock;
  try {
    mock = new Mock(transaction, thisComponent, thisComponent.mockBoard);
  } catch (e) {
    return { isMock: false, messages: [], errors: [] };
  }

  thisComponent.mocks.unshift(mock);
  thisComponent.requestUpdate();
  // render the request as a div and have it dissappear after 100 seconds or some shit
  // make the step glow, also show the mock request in the panel.
  return { isMock: true, messages: mock.messages, errors: mock.errs };
}
