import { css } from "lit";
export default css`
  .proxy-list {
    list-style: none;
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-direction: column;
    overflow-y: scroll;
    height: 100%;
  }

  .proxy-island-list-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
    margin-bottom: 4px;
    border-bottom: 1px dashed var(--primary-color);
    cursor: pointer;
  }
`;
