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

  .methods-container {
    padding-top: 6px;
  }

  .input-expressions {
    border: 1px dashed var(--primary-color);
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

  .island-titles {
    color: #666;
    opacity: 0.6;
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

  .content-div {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .column-flex {
    display: flex;
    flex-direction: column;
    gap: 6px;
    width: 100%;
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
`;
