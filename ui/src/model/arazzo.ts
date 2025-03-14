import { RanchUtils } from "@pb33f/ranch";
import { normalizeMap } from "./traffic-control-utils";

export class Info {
  title: string;
  summary: string;
  description: string;
  version: string;
  constructor() {
    this.title = "";
    this.summary = "";
    this.description = "";
    this.version = "";
  }

  static NewInfo(info: any): Info {
    const newInfo = new Info();

    newInfo.description = info.description;
    newInfo.summary = info.summary;

    newInfo.version = info.version;
    newInfo.title = info.title;

    return newInfo;
  }
}

export type In = "path" | "query" | "cookie" | "header";

export class Expression {
  name: string;
  value: string;
  constructor(name: string) {
    if (this.name[0] != "{" || this.name[this.name.length - 1] != "}") {
      throw new Error("Did not correctly evaluate an expression");
    }
    this.name = name;
    this.value = "";
  }
  normalize() {
    return {
      name: this.name,
      value: this.value,
    };
  }
}
