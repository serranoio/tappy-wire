import { send } from "process";
import { isObjectEmpty } from "./traffic-control-utils";

export class MessageAnchor {
  id?: string;
  value?: any;

  constructor(id?: string, value?: any) {
    this.id = id;
    this.value = value;
  }
}

export class Message {
  message?: string;
  receiverAnchor?: MessageAnchor;
  senderAnchor?: MessageAnchor;

  constructor(
    message?: string,
    receiverAnchor?: MessageAnchor,
    senderAnchor?: MessageAnchor
  ) {
    this.message = message;
    if (!isObjectEmpty(receiverAnchor)) {
      this.receiverAnchor = new MessageAnchor(
        receiverAnchor.id,
        receiverAnchor.value
      );
    }
    if (!isObjectEmpty(senderAnchor)) {
      this.senderAnchor = new MessageAnchor(
        senderAnchor.id,
        senderAnchor.value
      );
    }
  }

  static ConstructMessages(messages: Message[]): Message[] {
    return messages.map(
      (message: Message) =>
        new Message(
          message.message,
          message.receiverAnchor,
          message.senderAnchor
        )
    );
  }

  static FindMessagesWithAnchors(messages: Message[]): Message[] {
    return messages.filter((message: Message) => {
      if (message.receiverAnchor && message.senderAnchor) {
        return true;
      }
      return false;
    });
  }
}

export const classifyTransaction = () => {};
