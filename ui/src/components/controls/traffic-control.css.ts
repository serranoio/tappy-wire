import { css } from "lit";

export default css`
  .close-mock-board {
    right: 2%;
    top: 2%;
    position: absolute;
  }
  :host {
    box-shadow: inset 5px 10px green;
  }
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;

    --get: #4caf50; /* Green */
    --post: #2196f3; /* Blue */
    --put: #ff9800; /* Orange */
    --delete: #f44336; /* Red */
    --patch: #9c27b0; /* Purple */
    --options: #607d8b; /* Blue-grey */
  }

  .grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    margin-bottom: 1.25rem;
  }

  h3 {
    margin-bottom: 1rem;
  }

  small {
    display: block;
  }
  .available-variables div {
    border: 1px dashed var(--secondary-color-dimmer);
    padding: 5px;
    min-height: 40px;
    margin-top: 20px;
  }

  .available-variables {
    margin-bottom: 0.75rem;
  }

  label {
    margin-bottom: 0.25rem;
    display: inline-block;
    /* min-height: 40px; */
  }

  .col {
    padding: 0.5rem 0;
    /* margin-bottom: 0.5rem; */
    border-bottom: 1px dashed var(--secondary-color);
    /* overflow: hidden; */
    display: flex;
    align-items: center;
    position: relative;
  }

  .mocked-path {
    cursor: pointer;
  }

  .label-div {
    margin-bottom: 1rem;
  }

  .selected-path,
  .col:hover {
    transform: scale(1.05);
    box-shadow: 0 0 20px rgba(0, 255, 255, 0.5);
  }

  sl-tooltip {
    width: 100%;
  }

  .preferences-badge {
    position: absolute;
    left: -10px;
    top: -10px;
  }

  .all-vars {
    margin-top: 0.75rem;
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 0.5rem;
    flex-direction: column;
  }

  .vars {
    display: flex;
    justify-content: space-between;
    gap: 20px;
    align-items: center;
  }
  .vars sl-icon-button {
    /* position: absolute; */
    /* left: 0; */
  }

  .vars-input {
    display: flex;
    justify-content: space-between;
    gap: 20px;
    align-items: center;
  }
  .vars-input input {
    width: 100%;
  }

  .workflow-island {
    position: absolute;
    left: 0%;
    top: 20%;
    height: 25rem;
    background-color: var(--background-color);
    width: 125px;
    border-top-right-radius: 5px;
    border-top-left-radius: 5px;
    /* overflow-y: hidden; */

    transition: all 0.2s;
  }

  .closed {
    transform: translateX(-80%);
  }

  .overflow-container {
    height: 100%;
    overflow-y: scroll;
  }

  .monitor-island {
    position: absolute;
    right: 0%;
    bottom: 0%;
    height: 10rem;
    background-color: var(--background-color);
    width: 30rem;
    border-top-right-radius: 5px;
    border-top-left-radius: 5px;
  }

  .paths-island {
    position: absolute;
    right: 0%;
    bottom: 30%;
    max-height: 50vh;
    min-height: 50vh;
    background-color: var(--background-color);
    width: auto;
    min-width: 10rem;
    border-bottom-left-radius: 5px;
    border-top-left-radius: 5px;
  }

  .path-items-list {
    list-style: none;
    display: flex;
    flex-direction: column;
  }

  .path-item {
    border-bottom: 1px dashed var(--primary-color);
    padding-left: 2px;

    padding: 6px 6px 6px 6px;
    justify-content: space-between;
    align-items: center;
    cursor: pointer;
  }

  .path-item sl-menu-item::part(base) {
    padding: 2px 0;
  }

  .get-color::part(base) {
    background-color: var(--get);
  }

  .post-color::part(base) {
    background-color: var(--post);
  }

  .put-color::part(base) {
    background-color: var(--put);
  }

  .delete-color::part(base) {
    background-color: var(--delete);
  }

  .patch-color::part(base) {
    background-color: var(--patch);
  }

  .options-color::part(base) {
    background-color: var(--options);
  }

  .methods-container {
    padding-top: 6px;
  }

  .pipe-bank-island {
    position: absolute;
    left: 0%;
    bottom: 0%;
    background-color: var(--background-color);
    border-bottom-left-radius: 5px;
    border-top-left-radius: 5px;
    /* border-top-right-radius: 5px; */
    height: 7rem;
    width: 30rem;
  }

  .pipe-island-overflow-container {
    height: 100%;
    width: 100%;
    overflow: hidden;
    position: absolute;
    /* transform: translateY(-25%); */
  }

  .variable-island-control {
    position: absolute;
    right: -0.5%;
    transform: translateX(100%);
    height: 100%;
    width: 32px;
    top: 0;
    border-top-right-radius: 20px;
    border-bottom-right-radius: 20px;
    background-color: var(--background-color);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-direction: column;
  }

  .flex {
    display: flex;
    gap: 0.5rem;
  }

  .pipe-bank-property {
    font-size: 16px;
    margin-bottom: 6px;
  }

  .pipe-line {
    position: absolute;
    z-index: 99;
    pointer-events: none;
    stroke-linecap: round;
    height: 100vh;
    width: 100vw;
  }

  .pipe-line line:first-child {
    stroke-width: 7px;
    stroke: #888;
  }
  .pipe-line line:last-child {
    stroke-width: 3px;
    stroke: #333;
    animation: flow 20s linear infinite;
    stroke-dasharray: 30 30; /* Length of the line, adjust according to your line */
    stroke-dashoffset: 0; /* Initially hides the stroke */
  }

  @keyframes flow {
    0% {
      stroke-dashoffset: 0;
    }
    100% {
      stroke-dashoffset: 600; /* The "data" is flowing fully through the pipe */
    }
  }

  .variable-island-control sl-icon-button::part(base),
  .variable-island-control sl-icon-button {
    width: 100%;
  }
  .variable-island-control sl-icon-button::part(base) {
    display: flex;
    justify-content: center;
    align-items: center;
  }

  .pipe-bank-content {
    overflow-y: scroll;
    height: 100%;
    padding: 2px;

    position: absolute;
    width: 100%;
    transition: all 0.5s;
  }

  .pipe {
    position: absolute;
    width: 30px;
    height: 30px;
    background-color: green;
  }

  .show-pipe {
    display: grid;
    grid-template-columns: 1fr 0.5fr 1fr;
    font-size: 2rem;
    align-items: center;
    justify-items: center;
    justify-content: center;
    align-content: center;
    height: 100%;
  }

  .pipe-outputs {
    font-size: 1rem;
    overflow-y: scroll;
    height: 100%;
  }
  *::-webkit-scrollbar {
    width: 8px;
    direction: rtl;
  }
  *::-webkit-scrollbar-track {
    background-color: var(--invert-font-color);
  }
  *::-webkit-scrollbar-thumb {
    box-shadow: inset 0 0 6px rgba(0, 0, 0, 0.3);
    background: var(--secondary-color-lowalpha);
  }
  .pipe-bank-content::-webkit-scrollbar {
    width: 8px;
    direction: rtl;
  }

  .pipe-bank-content::-webkit-scrollbar-track {
    background-color: var(--invert-font-color);
  }

  .pipe-bank-content::-webkit-scrollbar-thumb {
    box-shadow: inset 0 0 6px rgba(0, 0, 0, 0.3);
    background: var(--secondary-color-lowalpha);
  }

  .selected-variable-title {
    color: var(--secondary-color) !important;
    font-style: italic;
    font-size: 24px;
    position: absolute;
    top: 0;
    transform: translateY(-100%);
    left: 5px;
    white-space: nowrap;
  }

  .mock-monitor-island {
    position: absolute;
    left: 50%;
    transform: translateX(-50%);
    top: 0%;
    height: 5rem;
    background-color: var(--background-color);
    width: 30rem;
    border-bottom-left-radius: 5px;
    /* border-top-left-radius: 5px; */
    /* border-top-right-radius: 5px; */
    border-bottom-right-radius: 5px;
  }

  .mock-monitor-island-title {
    position: absolute;
    bottom: 0;
    transform: translateY(100%);
  }

  .monitor-island-title {
    position: absolute;
    top: 0;
    transform: translateY(-100%);
    left: 5px;
  }

  .island-titles {
    color: #666;
    opacity: 0.6;
  }

  .add-new-workflow {
    background-color: var(--background-color);

    /* clip-path: polygon(20% 0%, 80% 0%, 100% 100%, 0% 100%); */
    /* transform: translateX(-50%); */
    transform: scaleX(0.95);
    /* left: 50%; */
    /* position: absolute; */
  }

  .add-new-workflow::part(base) {
    height: 100%;
    width: 100%;
    justify-content: center;
  }

  .delete-workflow {
    /* position: absolute; */
    /* bottom: 0%; */
    background-color: var(--background-color);
    /* left: 0%;  */
    border-bottom-left-radius: 20px;
  }

  .delete-workflow::part(base) {
    height: 100%;
    width: 100%;
    justify-content: center;
  }

  .delete-workflow-button::part(base) {
    font-size: 16px;
    padding: 0 !important;
  }

  .close-workflow-island {
    background-color: var(--background-color);
    border-bottom-right-radius: 20px;
  }

  .close-workflow-island::part(base) {
    height: 100%;
    width: 100%;
    justify-content: center;
  }

  .workflow-island-control {
    position: absolute;
    top: 100.5%;
    display: grid;

    grid-template-columns: 1fr 3fr 1fr;
    height: 50px;
    width: 100%;
    border-bottom-right-radius: 20px;
    border-bottom-right-radius: 20px;
  }

  .workflow-island-title {
    position: absolute;
    top: 0;
    transform: translateY(-100%);
    left: 5px;
  }

  .workflow-list {
    list-style: none;
    display: flex;
    flex-direction: column;
    /* overflow-y: scroll; */
  }

  .overflow-container::-webkit-scrollbar {
    width: 8px;
    direction: rtl;
  }

  .overflow-container::-webkit-scrollbar-track {
    background-color: var(--invert-font-color);
  }

  .overflow-container::-webkit-scrollbar-thumb {
    box-shadow: inset 0 0 6px rgba(0, 0, 0, 0.3);
    background: var(--secondary-color-lowalpha);
  }

  .workflow-name {
    display: flex;
    border-bottom: 1px dashed var(--primary-color);
    padding-left: 2px;

    padding: 6px 6px 6px 6px;
    justify-content: space-between;
    align-items: center;
  }

  .content-div {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .pipe-bank-content form {
    display: flex;
  }

  .pipe-bank-content form sl-icon-button {
    height: 100%;
  }
  .pipe-bank-content form sl-icon-button::part(base) {
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .column-flex {
    display: flex;
    flex-direction: column;
    gap: 6px;
    width: 100%;
  }

  .workflow-name sl-input {
    width: 100%;
    height: 100%;
  }

  .workflow-name:hover {
    cursor: pointer;
  }
  .selected-workflow {
    /* box-shadow: 2px 2px 2px 2px #000; */
    /* transform: scale(1.05); */
    box-shadow: 0 5px 20px rgba(0, 255, 255, 0.5);
  }

  .status-indicator {
    background-color: var(--error-color);
    width: 10px;
    display: block;
    height: 10px;
    border-radius: 50%;
  }
  .activated .status-indicator {
    background-color: var(--ok-color) !important;
  }

  .mock-board-section {
    position: absolute;
    top: 2%;
    left: 2%;
  }

  .mock-board-name {
    margin-bottom: 0.2rem;
    width: calc(300 / 16) rem;
  }

  .mock-board-section p {
    font-style: italic;
    margin-bottom: 0.1rem;
  }

  .dash {
    position: relative;
  }

  .dash::after {
    content: "";
    right: -10px;
    width: 2px;
    height: 100%;
    background-color: #222;
    position: absolute;
    animation: fadeIn 1s infinite alternate;
    transform: rotate(20deg);
  }

  @keyframes fadeIn {
    0% {
      opacity: 0;
    }
    100% {
      opacity: 1;
    }
  }

  .delete-workflow-button {
    color: var(--error-color);
  }

  #step-fence {
    /* position: absolute; */
    transform: translate(-50%, -50%);
    left: 47%;
    top: 50%;
    height: 80vh;
    width: 10px;
    /* visibility: hidden;
    user-select: none; */
  }

  .path-item sl-dropdown {
    width: 100%;
  }

  .path-item p {
    width: 100%;
  }

  .path-island-control {
    width: 100%;
    height: 50px;
    top: 100.5%;
    position: absolute;
    background-color: var(--background-color);
  }
  .path-island-control sl-icon-button::part(base) {
    width: 100%;
    height: 100%;
  }

  .pipe-bank-island {
  }
`;
