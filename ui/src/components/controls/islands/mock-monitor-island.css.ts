import { css } from "lit";

export default css`
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

  #mock-monitor-list {
    display: flex;
    flex-direction: column;
    height: 100%;
    overflow-y: scroll;
    gap: 5px;
  }

  #mock-monitor-dialog::part(panel) {
    height: 80vh !important;
    width: 80vw !important;
  }
  #mock-monitor-dialog::part(base) {
  }

  .dialog-container {
    height: 80vh !important;
    width: 80vw !important;
  }

  .mock-transaction {
    border-bottom: 1px dashed var(--primary-color);
    padding: 10px;
    cursor: pointer;
  }
  .mock-transaction-header {
    font-size: 0.75rem;
    box-shadow: 0 -4px 5px 5px var(--primary-color);
    display: inline;
  }

  .mock-transaction-subheader {
    font-size: 0.75rem;
    box-shadow: 0 -4px 5px 5px var(--primary-color);
  }

  .titles-div {
    display: flex;
    gap: 16px;
  }

  .subtitles {
    display: flex;
    width: 100%;
    justify-content: space-between;
  }

  h5 {
    border-bottom: 1px dashed var(--secondary-color);
  }

  .icon-box {
    display: flex;
    justify-content: space-around;
    align-items: center;
  }
  sl-icon[name="bug"] {
    /* color: green; */
    color: var(--error-color);
  }

  sl-icon[name="chat-left"] {
    /* color: green; */
    color: var(--put);
  }
  sl-icon[name="link"] {
    /* color: green; */
    color: var(--patch);
  }
`;
