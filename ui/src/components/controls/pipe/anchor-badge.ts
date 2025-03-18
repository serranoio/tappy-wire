import { Anchor, Pipe } from "@/model/traffic-control";
import { ArazzoStep } from "../step/step.component";
import { html } from "lit";

export const getIdsFromAnchorBadges = (anchorBadge: HTMLElement): string[] => {
  const pl = anchorBadge.dataset.propertyList;
  const plArray = pl.slice(1, pl.length - 1);
  const ids = plArray.split(",");

  return ids;
};

export const findMiddle = (rect, value, measure) => {
  return rect[value] - rect[measure] / 2;
};

export const drawPipeLineWithCoords = (
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  classes: string = ""
) => {
  return html`
    <svg
      class="pipe-line ${classes}"
      height="1000"
      width="1000"
      xmlns="http://www.w3.org/2000/svg"
    >
    <linearGradient id="flowGradient" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#b0b0b0">
        <animate
          attributeName="stop-color"
          values="#b0b0b0;#808080;#b0b0b0" 
          dur="4s"
          keyTimes="0; 0.5; 1"
          repeatCount="indefinite"
        />
      </stop>
      <stop offset="100%" stop-color="#808080">
        <animate
          attributeName="stop-color"
          values="#808080;#b0b0b0;#808080"
          dur="4s"
          keyTimes="0; 0.5; 1"
          repeatCount="indefinite"
        />
      </stop>
    </linearGradient>
  </defs>

        <line
          x1="${x1}"
          y1="${y1}"
          x2="${x2}"
          y2="${y2}"
          stroke="url(#flowGradient)"
        />
        <line
        x1="${x1}"
        y1="${y1}"
        x2="${x2}"
        y2="${y2}"
      />
      </svg>
  `;
};

export const drawPipeLine = (rect1: DOMRect, rect2: DOMRect) => {
  const x1 = findMiddle(rect1, "x", "width");
  const y1 = findMiddle(rect1, "y", "height");

  const x2 = findMiddle(rect2, "x", "width");
  const y2 = findMiddle(rect2, "y", "height");

  return drawPipeLineWithCoords(x1, y1, x2, y2);
};
export const renderAllPipes = (pipes: Pipe[], renderRoot: any) => {
  return pipes.map((pipe: Pipe) => {
    let inputAnchorBadge: HTMLElement;
    let outputAnchorBadges: HTMLElement[] = [];
    getAllAnchorBadges(renderRoot).forEach((anchorBadge: HTMLElement) => {
      const ids = getIdsFromAnchorBadges(anchorBadge);
      ids.forEach((id: string) => {
        // get input, get array of outputs
        if (id === pipe.input.id) {
          inputAnchorBadge = anchorBadge;
        }
        if (pipe.outputs.map((output: Anchor) => output.id).includes(id)) {
          outputAnchorBadges.push(anchorBadge);
        }
      });
    });
    if (!inputAnchorBadge) return html``;

    const inputRect = inputAnchorBadge.getBoundingClientRect();

    return outputAnchorBadges.map((outputAnchorBadge) => {
      const outputRect = outputAnchorBadge.getBoundingClientRect();

      return drawPipeLine(outputRect, inputRect);
    });
  });
};

export const getAllAnchorBadges = (renderRoot) => {
  return Array.from(renderRoot.querySelectorAll("arazzo-step")!).flatMap(
    (step: ArazzoStep) => {
      return Array.from(step.getSLBadges()).flatMap((badge) => badge);
    }
  );
};
