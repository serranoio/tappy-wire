import { html } from "lit";
import {
  httpMethods,
  isObjectEmpty,
  normalizeMap,
} from "./traffic-control-utils";
import YAML from "yaml";
import { SlMenuItem } from "@shoelace-style/shoelace";

export class Schema {
  schema: string;
  ref: string;
  oneOf: Schema[];

  constructor(value) {
    this.ref = value.ref;
    this.oneOf = value?.oneOf?.map((oneOfSchema: Schema) => {
      const newSchema = new Schema(oneOfSchema);
      return newSchema;
    });
    if (!this.oneOf) {
      this.schema = YAML.parse(atob(value.schema));
    } else {
      this.schema = "";
    }
    if (value.ref) {
      this.ref = value.ref;
    }
  }

  isPolymorphicSchema() {
    // @ts-ignore
    if (isObjectEmpty(this.oneOf) || this.oneOf.length === 0) {
      return false;
    }

    return true;
  }

  normalize() {
    return {
      schema: btoa(YAML.stringify(this.schema)),
      ref: this.ref,
      oneOf: this.oneOf?.map((oneOf: Schema) => oneOf.normalize()),
    };
  }

  static RenderRefWithoutComponentsSchemaPrefix(ref: string) {
    return ref.slice(21);
  }
}

export class MediaType {
  name: string;
  schema: Schema;
  isOpened: boolean;
  examples: string[];
  selectedExample: string;

  constructor(value) {
    this.name = value.name;

    this.schema = new Schema(value.schema);
    this.isOpened = true;
    this.examples = value.examples;
    this.selectedExample = value.selectedexample;
  }
  normalize() {
    return {
      name: this.name,
      schema: this.schema.normalize(),
      examples: this.examples,
      selectedExample: this.selectedExample,
    };
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

  normalize() {
    return {
      description: this.description,
      required: this.required,
      content: normalizeMap(this.content).map((content: MediaType) =>
        content.normalize()
      ),
    };
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

    this.content = new Map();

    if (value.content) {
      Object.values(value.content).map((content: MediaType) => {
        this.content.set(content.name, new MediaType(content));
      });
    }
  }

  normalize() {
    return {
      name: this.name,
      description: this.description,
      // headers: normali
      content: normalizeMap(this.content).map((content: MediaType) =>
        content.normalize()
      ),
    };
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

  normalize() {
    return {
      codes: normalizeMap(this.codes).map((code: ResponseCode) =>
        code.normalize()
      ),
    };
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
  schema: Schema;

  constructor(value) {
    this.name = value.name;
    this.in = value.in;
    this.description = value.description;
    this.required = value.required;
    this.allowEmptyValue = value.allowEmptyValue;
    this.allowReserved = value.allowReserved;
    this.schema = new Schema(value.schema);
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

  normalize() {
    return {
      tags: this.tags,
      summary: this.summary,
      description: this.description,
      operationId: this.operationId,
      parameters: this.parameters,
      requestBody: this.requestBody.normalize(),
      responses: this.responses.normalize(),
      security: null,
      method: this.method,
    };
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
    const length = 20;
    if (this.name.length > length) {
      return html`
        <sl-tooltip content=${this.name}>
          <p>${this.name.slice(0, length) + "..."}</p>
        </sl-tooltip>
      `;
    }

    return html`${this.name}`;
  }

  renderPathItemInPathsIsland(
    menuSelectCallback: (e: CustomEvent<SlMenuItem>) => void
  ) {
    return html`
      <li class="path-item">
        <sl-dropdown>
          <p slot="trigger">${this.renderName()}</p>
          <sl-menu @sl-select=${menuSelectCallback}>
            ${this.renderHttpMethods()}
          </sl-menu>
        </sl-dropdown>
      </li>
    `;
  }

  renderHttpMethods() {
    return html`
      ${httpMethods.map((method: string) => {
        if (isObjectEmpty(this[method])) {
          return html``;
        }
        return html`
          <sl-menu-item value="${method}">
            <sl-badge size="small" class="${method}-color">${method}</sl-badge>
          </sl-menu-item>
        `;
      })}
    `;
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
