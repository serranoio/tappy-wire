import { html } from "lit";
import { StepMetadata } from "./traffic-control";

// Map<string, value> => [value]
export function normalizeMap<T>(map): T[] {
  if (!map) return [];

  return Array.from(map.values());
}

function snakeToCamel(snakeStr) {
  return snakeStr
    .toLowerCase() // Ensure the string is all lowercase.
    .replace(/_./g, (match) => match.charAt(1).toUpperCase()); // Capitalize letters following underscores.
}

export function deepSnakeToCamel(obj) {
  // If the value is an array, recursively apply the conversion to each element
  if (Array.isArray(obj)) {
    return obj.map(deepSnakeToCamel);
  }

  // If the value is an object, recursively apply the conversion to each key-value pair
  if (obj !== null && typeof obj === "object") {
    return Object.keys(obj).reduce((acc, key) => {
      // Convert the key to camelCase and recursively apply to the value
      acc[snakeToCamel(key)] = deepSnakeToCamel(obj[key]);
      return acc;
    }, {});
  }

  // If it's neither an object nor an array, return the value itself
  return obj;
}

export function isObjectEmpty(obj): boolean {
  if (!obj || Object.values(obj).length === 0) {
    return true;
  }

  return false;
}

export const httpMethods = ["get", "put", "post", "delete", "patch", "options"];

export const UpdateStepMetadataEvent = "update-step-metadata-event";
export interface UpdateStepMetadataType {
  workflowID: string;
  stepMetadata: StepMetadata;
}

export const UpdateStepEvent = "update-step-event";

export const SelectingPipeEvent = "selecting-pipe-event";
export const SelectingAnchorEvent = "selecting-anchor-event";
export const NewAnchorEvent = "new-anchor-event";

export type IO = "input" | "output";

export function sendEvent<Type>(
  element: Element,
  eventName: string,
  detail: Type
) {
  element.dispatchEvent(
    new CustomEvent(eventName, {
      composed: true,
      bubbles: true,
      detail: detail,
    })
  );
}

export const insertSpaces = (content: string) => {
  return content.split(" ").map((word) => {
    return html`${word}&nbsp;&nbsp;&nbsp;`;
  });
};

export const insertSpacesString = (content: string) => {
  return content
    .split(" ")
    .map((word) => {
      return `<span style="margin-right: 3px;">${word}</span>`;
    })
    .join("");
};

// Always escape HTML for text arguments!
function escapeHtml(html) {
  const div = document.createElement("div");
  div.textContent = html;
  return div.innerHTML;
}

// Custom function to emit toast notifications
export function notify(
  message: string,
  variant: "warning" | "primary" | "success" | "neutral" = "primary",
  icon = "info-circle",
  duration = 3000
) {
  const alert = Object.assign(document.createElement("sl-alert"), {
    variant,
    closable: true,
    duration: duration,
    innerHTML: `
        <sl-icon name="${icon}" slot="icon"></sl-icon>

        ${insertSpacesString(message)}
      `,
  });

  document.body.append(alert);
  return alert.toast();
}

export const SendTransactionToMockboard = "send-transaction-to-mockboard";
