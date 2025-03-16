import { css } from "lit";
export default css`
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

  .pipe-bank-island {
    position: absolute;
    left: 0%;
    bottom: 0%;
    background-color: var(--background-color);
    border-bottom-left-radius: 5px;
    border-top-left-radius: 5px;
    /* border-top-right-radius: 5px; */
    height: 11rem;
    width: 38rem;
  }

  .anchor-badge-id {
    cursor: pointer;
  }

  .pipe-badge::part(base) {
    background: linear-gradient(145deg, #777, #ccc); /* Metallic gradient */
    border: 3px solid #555; /* Darker border for depth */
    border-radius: 25px; /* Rounded corners for a pipe look */
    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.2); /* 3D shadow effect */
    cursor: pointer;
  }

  .pipe-island-overflow-container {
    height: 100%;
    width: 100%;
    overflow: hidden;
    position: absolute;
    /* transform: translateY(-25%); */
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
    height: 96vh;
    width: 96vw;
  }
  /* 
  .selected-pipe line:first-child {
    stroke: #111 !important;
  }

  .selected-pipe line:last-child {
    stroke: #ccc !important;
  }

  .pipe-line line:first-child {
    stroke-width: 7px;
    stroke: #888;
  }

  .pipe-line line:last-child {
    stroke-width: 3px;
    stroke: #333;
    animation: flow 20s linear infinite;
    stroke-dasharray: 30 30; 
    stroke-dashoffset: 0; 
  } */

  .pipe-line line {
    stroke-width: 8px;
  }

  @keyframes flow {
    0% {
      stroke-dashoffset: -600;
    }
    50% {
      stroke-dashoffset: 0;
    }
    100% {
      stroke-dashoffset: 600;
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
`;
