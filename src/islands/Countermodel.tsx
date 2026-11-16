// deduxit © Fabian Lukas Grubmüller 2026
// Licensed under the EUPL

import { createResource, Show } from "solid-js";
import type { OrdinaryOutcome } from "../lib/ordinary";
import type { Prover } from "./state";
import type { Ui } from "./ui";

/**
 * A "not valid" goal's countermodel, drawn by deduxit (a picture, its `<desc>` read by a screen
 * reader), with one sentence on what it shows, and a button that opens it in the stage's model
 * editor to change and check again.
 */
export function ModelFigure(props: { outcome: OrdinaryOutcome; prover: Prover; ui: Ui }) {
  const change = () => {
    const found = props.outcome.countermodel;
    if (!found) return;
    props.ui.setUi({
      modelSeed: {
        model: found.model,
        sequent: JSON.stringify(found.sequent),
        logic: props.outcome.logic,
        found: true,
      },
      tab: "model",
      menu: null,
    });
  };
  const [drawing] = createResource(
    () => props.outcome,
    (outcome) =>
      props.prover.api.ordinary
        .modelDrawing(
          outcome,
          JSON.stringify({ styles: { svg: { font: props.prover.settings().stageFont } } }),
        )
        .catch(() => null),
  );
  const world = () => props.outcome.countermodel?.model.world ?? 0;
  return (
    <Show when={drawing()}>
      {(svg) => (
        <figure class="countermodel">
          <div class="countermodel-drawing" innerHTML={svg()} />
          <figcaption class="said-why">
            {props.outcome.logic === "classical"
              ? "Its one world makes every formula left of ⊢ true and every formula right of it false."
              : `World ${String(world())}, outlined, forces every formula left of ⊢ and not the one right of it. A world forces what every world below it forces, and an arrow points up.`}
          </figcaption>
          <button type="button" class="btn btn-s" onClick={change}>
            Change this model and check it
          </button>
        </figure>
      )}
    </Show>
  );
}
