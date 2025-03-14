import { css } from "lit";

export default css`
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
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

  sl-menu-item::part(base) {
    /* background-color: var(--background-color); */
  }

  .inputs sl-menu-item::part(prefix) {
    margin-right: 6px;
  }

  .params-menu sl-menu-item::part(prefix) {
    font-style: italic;
    opacity: 0.8;
  }

  .options-color::part(base) {
    background-color: var(--options);
  }

  :host {
    position: absolute;
    /* height: 200px; */
  }

  #grip {
    cursor: grab;
  }

  .step-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0px 2px;
    font-size: 16px;
    border-bottom: 1px dashed var(--secondary-color);
    gap: 16px;

    background-color: var(--background-color);
  }

  .step-header h4 {
    font-size: 12px;
    font-weight: 600;
  }

  .dash {
    position: relative;
  }

  .step-name {
    position: absolute;
    font-size: 10px;
    word-wrap: none;
    bottom: 101%;
  }

  .dash::after {
    content: "";
    right: -8px;
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

  .input-icon,
  .output-icon {
    position: absolute;
    top: 50%;
    font-size: 16px;
    opacity: 0.25;
  }

  .input-icon {
    left: 0%;
    transform: translateX(-105%);
  }

  .output-icon {
    right: 0%;
    transform: translateX(105%);
  }

  .step-body {
    display: grid;
    grid-template-columns: 1fr 1fr;
  }

  .no-outputs {
    grid-template-columns: 1fr !important;
  }

  .inputs,
  .outputs {
    display: flex;
    justify-content: start;
    align-items: center;
    flex-direction: column;
    width: 200px;
  }

  .inputs sl-icon-button {
    background-color: var(--background-color);
    width: 100%;
  }

  .inputs sl-icon-button::part(base) {
    background-color: var(--background-color);
    width: 100%;
    display: flex;
    justify-content: center;
  }

  .parameter-button {
    font-size: 16px;
  }

  .step-body {
    position: relative;
  }

  .question {
    margin-left: 4px;
  }

  .vertical-bar {
    position: absolute;
    left: 50%;
    transform: translateX(-50%);
    width: 1px;
    height: 100%;
    /* top: -10%; */
    /* background-color: green; */
    border: 1px dashed var(--primary-color);
  }

  .no-outputs .vertical-bar {
    display: none;
  }

  .inputs .label,
  .outputs .label {
    font-size: 10px;
    display: block;
    border-bottom: 1px dashed var(--primary-color);
    width: 100%;
    text-align: center;
    background-color: var(--background-color);
  }

  .response-code {
    height: 32px;
    display: flex;
    justify-content: center;
    align-items: center;
    width: 100%;
  }

  .outputs ul {
    width: 100%;
    background-color: var(--background-color);
  }

  .response-code:hover {
    box-shadow: 0 5px 20px rgba(0, 255, 255, 0.5);
    cursor: pointer;
  }

  .not-available {
    cursor: not-allowed;
    opacity: 0.5;
  }

  sl-menu {
    border: none;
    border-radius: 0;
    width: 100%;
  }
  sl-menu-item,
  sl-menu-item::part(base) {
    width: 100%;
  }

  sl-menu-item::part(base) {
    display: flex;
    justify-content: center;
  }

  .schema-container span {
    min-height: 20px;
    display: block;
    font-size: 12px;
  }

  .schema-container {
    color: black;
    max-width: 20rem;
  }

  .schema-container-overflow {
    overflow-y: scroll;
    max-height: 20rem;
    position: relative;
  }

  .schema-container-overflow::-webkit-scrollbar {
    width: 8px;
    direction: rtl;
  }

  .schema-container-overflow::-webkit-scrollbar-track {
    background-color: var(--invert-font-color);
  }

  .schema-container-overflow::-webkit-scrollbar-thumb {
    box-shadow: inset 0 0 6px rgba(0, 0, 0, 0.3);
    background: var(--secondary-color-lowalpha);
  }

  .hovered-property {
    width: 100%;
    background-color: var(--background-color);
    border-top: 1px solid var(--tertiary-color);
    font-size: 12px;
    word-break: wrap;
    word-wrap: break-word;
  }

  sl-menu-item::part(base) {
    font-size: 10px;
  }
  sl-menu-item::part(checked-icon) {
    width: 0;
  }

  sl-menu {
    overflow: hidden;
  }

  .indent {
    margin-left: 16px;
  }
`;
