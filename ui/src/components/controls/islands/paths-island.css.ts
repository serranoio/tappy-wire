import { css } from "lit";

export default css`
  .paths-island {
    position: absolute;
    right: 0%;
    bottom: 30%;
    max-height: 50vh;
    min-height: 50vh;
    background-color: var(--background-color);
    max-width: 13rem;
    width: auto;
    min-width: 10rem;
    border-bottom-left-radius: 5px;
    border-top-left-radius: 5px;
    box-shadow: 0 0 10px 0.2px var(--primary-color);
  }

  .path-items-list {
    list-style: none;
    display: flex;
    flex-direction: column;
    overflow-y: scroll;
    max-height: 50vh;
  }

  .path-item {
    border-bottom: 1px dashed var(--primary-color);
    padding-left: 2px;

    padding: 6px 6px 6px 6px;
    justify-content: space-between;
    align-items: center;
    cursor: pointer;
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

  .path-island-control {
    width: 100%;
    height: 50px;
    top: 100.5%;
    position: absolute;
    background-color: var(--background-color);
    display: none;
  }
  .path-island-control sl-icon-button::part(base) {
    width: 100%;
    height: 100%;
  }
`;
