import { css } from "lit";

export default css`
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
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
`;
