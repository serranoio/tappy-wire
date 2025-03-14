import { html } from "lit";
import { StepMetadata } from "./traffic-control";

// Map<string, value> => [value]
export function normalizeMap(map) {
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
  if (Object.values(obj).length === 0) {
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
export const SelectingAnchorEvent = "selecting-reference-event";

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
