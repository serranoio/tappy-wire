import { html } from "lit";
import { httpMethods, normalizeMap } from "./traffic-control-utils";
import YAML from "yaml";
export class MediaType {
  name: string;
  schema: string;
  resolvedSchema: string;
  isOpened: boolean;

  constructor(value) {
    this.name = value.name;
    if (value.schema) {
      this.schema = YAML.parse(atob(value.schema));
    }
    if (value.resolvedSchema) {
      this.resolvedSchema = YAML.parse(atob(value.resolvedSchema));
    }
    this.isOpened = true;
  }

  debug() {
    return `name: ${this.name} schema: ${this.schema}`;
  }
}

export class RequestBody {
  description: string;
  required: boolean;
  content: Map<string, MediaType>;

  constructor(value) {
    if (!value) return undefined;
    this.description = value.description;
    this.required = value.required;
    this.content = new Map();

    if (value.content) {
      Object.values(value.content).map((content: MediaType) => {
        this.content.set(content.name, new MediaType(content));
      });
    }
  }

  debug() {
    const content = normalizeMap(this.content).map((mediatType: MediaType) => {
      return mediatType.debug();
    });

    return `description: ${this.description} required: ${this.required} content: ${content}`;
  }
}

export class Header {
  // No fields defined, but you can expand this class later
}

export class ResponseCode {
  name: string;
  description: string;
  headers: Map<string, Header>;
  content: Map<string, MediaType>;
  isOpened: boolean;

  constructor(value) {
    this.name = value.name;
    this.description = value.description;
    this.headers = new Map();
    this.isOpened = false;

    // Object.values(value.headers).map((key, code) => {
    // 	this.headers.set(key, new Header(code))
    // });
    this.content = new Map();

    if (value.content) {
      Object.values(value.content).map((content: MediaType) => {
        this.content.set(content.name, new MediaType(content));
      });
    }
  }

  debug() {
    const content = normalizeMap(this.content).map((mediatType: MediaType) => {
      return mediatType.debug();
    });

    return `name: ${this.name} description: ${this.description}
		headers: <not implemented>
		content: ${content}
		`;
  }
}

export class Responses {
  codes: Map<string, ResponseCode>;

  constructor(value) {
    if (!value) return undefined;
    this.codes = new Map();

    Object.values(value.codes).map((code: ResponseCode) => {
      this.codes.set(code.name, new ResponseCode(code));
    });
  }

  debug() {
    const codes = normalizeMap(this.codes).map((rc: ResponseCode) => {
      return rc.debug();
    });

    return `codes: ${codes}`;
  }
}

export class SecurityRequirement {
  // No fields defined, but you can expand this class later
}

export enum In {
  QUERY = "query",
  HEADER = "header",
  PATH = "path",
  COOKIE = "cookie",
}

// Class for Parameter
export class Parameter {
  name: string;
  in: In;
  description: string;
  required: boolean;
  allowEmptyValue: boolean;
  allowReserved: boolean;
  schema: string; // You could use 'Buffer' if you want to store binary data in Node.js
  resolvedSchema: string;

  constructor(value) {
    this.name = value.name;
    this.in = value.in;
    this.description = value.description;
    this.required = value.required;
    this.allowEmptyValue = value.allowEmptyValue;
    this.allowReserved = value.allowReserved;
    if (value.schema) {
      this.schema = atob(value.schema);
    }
    if (value.resolvedSchema) {
      this.resolvedSchema = atob(value.resolvedSchema);
    }
  }
}

export class Operation {
  tags: string[];
  summary: string;
  description: string;
  operationId: string;
  parameters?: Parameter[];
  requestBody?: RequestBody;
  responses: Responses;
  security?: SecurityRequirement;
  method: string;

  constructor(value: any, method: string) {
    if (!value) return undefined;

    this.tags = value.tags;
    this.summary = value.summary;
    this.description = value.description;
    this.operationId = value.operationId;
    this.parameters = value.parameters?.map(
      (parameter) => new Parameter(parameter)
    );
    this.requestBody = new RequestBody(value.requestBody);
    this.responses = new Responses(value.responses);
    this.security = value.security;
    this.method = method;
  }

  debug() {
    if (this.operationId === undefined) return `undefined`;

    const tags = this.tags?.map((tag: string) => tag).join(",");

    return `tags: ${tags} summary: ${this.summary} description: ${
      this.description
    } operationID: ${this.operationId}
		 parameters: <not implemented>
		 \n\trequestBody: ${this.requestBody?.debug()}
		 \n\tresposnes: ${this.responses?.debug()}
		 \n\tsecurity: <not implemented>
		 `;
  }
}

// Enum for In field

export class PathItem {
  name: string;
  description: string;
  summary: string;
  get?: Operation;
  put?: Operation;
  post?: Operation;
  delete?: Operation;
  patch?: Operation;
  options?: Operation;

  constructor(value: any) {
    this.name = value.name;
    this.description = value.description;
    this.summary = value.summary;
    this.get = new Operation(value.get, "get");
    this.put = new Operation(value.put, "put");
    this.post = new Operation(value.post, "post");
    this.delete = new Operation(value.delete, "delete");
    this.patch = new Operation(value.patch, "patch");
    this.options = new Operation(value.options, "options");
  }

  debug() {
    return `name: ${name} description: ${this.description} summary: ${
      this.summary
    } 
		 \n\tget: ${this.get.debug()}
		 \n\tput: ${this.put.debug()}
		 \n\tpost: ${this.post.debug()}
		 \n\tdelete: ${this.delete.debug()}
		 \n\tpatch: ${this.patch.debug()}
		 \n\toptions: ${this.options.debug()}
		 \n\t paremters: <not implemented>
		 `;
  }

  renderName() {
    if (this.name.length > 10) {
      return html`
      <sl-tooltip content=${this.name} >
        <p>${this.name.slice(0,10) + "..."}</p>
    </sl-tooltip>
      `;
    }

    return html`${this.name}`;
  }

  static GetOperation(pathItems: PathItem[], operationID: string): Operation {
    let operation: Operation;
    pathItems.forEach((pathItem: PathItem) => {
      httpMethods.forEach((method) => {
        const oi = (pathItem[method] as Operation).operationId;
        if (oi === operationID) {
          operation = pathItem[method];
          return operation;
        }
      });
    });

    return operation;
  }

  static NewPathItems(payload): PathItem[] {
    return Object.entries(payload).map(([_, value]) => {
      const pathItem = new PathItem(value);

      return pathItem;
    });
  }
}
