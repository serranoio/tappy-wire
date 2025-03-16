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
`;
