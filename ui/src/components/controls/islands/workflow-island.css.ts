import { css } from "lit";

export default css`
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

  .delete-workflow-button {
    color: var(--error-color);
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
  .workflow-name {
    display: flex;
    border-bottom: 1px dashed var(--primary-color);
    padding-left: 2px;

    padding: 6px 6px 6px 6px;
    justify-content: space-between;
    align-items: center;
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
`;
