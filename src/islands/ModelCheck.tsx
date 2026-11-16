// deduxit © Fabian Lukas Grubmüller 2026
// Licensed under the EUPL

/**
 * A Kripke model of ordinary logic to change and check, in the drawing's place: a countermodel
 * deduxit found, opened from its figure, or a model of the visitor's own, from "Check a model"
 * in the More menu. deduxit checks it against the sequent (`ordinary_model`): that it is a model
 * of the logic, then where the sequent fails, with what that world forces of each formula.
 */

import { createEffect, createResource, createSignal, For, on, Show } from "solid-js";
import { type Failure, failure as failureOf } from "../lib/deduxit";
import {
  type Forcing,
  forcedWords,
  forcingWords,
  type Kripke,
  kripkeJson,
  type Marks,
  type Reading,
  refusalWords,
} from "../lib/kripke";
import { KripkeEditor } from "./KripkeEditor";
import type { Prover } from "./state";
import type { ModelSeed } from "./ui";

/** deduxit's answer to a check: what it found, or why the model is none of the logic. */
type Answer = { readonly checked: Forcing } | { readonly failure: Failure };

/** The logic's name in a sentence. */
const LOGIC: Readonly<Record<string, string>> = {
  classical: "classical logic",
  intuitionistic: "intuitionistic logic",
  minimal: "minimal logic",
};

/** What an arrow means in the logic, said once above the model. */
const MEANING: Readonly<Record<string, string>> = {
  classical: "",
  intuitionistic:
    "An arrow points up to a world directly above. A world forces what every world below it forces.",
  minimal:
    "An arrow points up to a world directly above. A world forces what every world below it forces; in minimal logic a world may force ⊥.",
};

export function ModelView(props: { prover: Prover; seed: ModelSeed }) {
  const reading = (): Reading => props.seed.logic;
  const [model, setModel] = createSignal<Kripke>(props.seed.model);
  const [world, setWorld] = createSignal<number | null>(null);
  const [answer, setAnswer] = createSignal<Answer | null>(null);
  const [busy, setBusy] = createSignal(false);
  createEffect(
    on(
      () => props.seed,
      (seed) => {
        setModel(seed.model);
        setWorld(null);
        setAnswer(null);
      },
      { defer: true },
    ),
  );
  const [text] = createResource(
    () => [props.seed.sequent, props.seed.logic] as const,
    ([sequent, logic]) =>
      props.prover.api.ordinary
        .read(sequent, logic, "{}")
        .then((read) => read.text)
        .catch(() => null),
  );
  const check = async () => {
    const json = kripkeJson(model(), reading());
    const at = world();
    setBusy(true);
    let found: Answer;
    try {
      found = {
        checked: await props.prover.api.ordinary.model(
          json,
          props.seed.sequent,
          props.seed.logic,
          at ?? undefined,
          "{}",
        ),
      };
    } catch (thrown) {
      found = { failure: failureOf(thrown) };
    } finally {
      setBusy(false);
    }
    // A model changed while deduxit checked it keeps no answer of the one before.
    if (kripkeJson(model(), reading()) === json && world() === at) setAnswer(found);
  };
  const checked = () => {
    const a = answer();
    return a && "checked" in a ? a.checked : null;
  };
  const refused = () => {
    const a = answer();
    return a && "failure" in a ? a.failure : null;
  };
  const marks = (): Marks | undefined => {
    const failing = checked()?.failing?.world;
    return failing === undefined ? undefined : { failing };
  };

  return (
    <section class="method model-view" aria-label="Model">
      <p class="method-verdict">
        {props.seed.found
          ? "The countermodel deduxit found, to change and check again against"
          : `A model of ${LOGIC[props.seed.logic] ?? ""}, checked against`}{" "}
        <span class="m">{text() ?? "the sequent"}</span>.
        {/* The countermodel's caption said what an arrow means just before; a model of one's
            own is told here. */}
        {props.seed.found ? "" : ` ${MEANING[props.seed.logic] ?? ""}`}
      </p>
      <KripkeEditor
        model={model()}
        reading={reading()}
        onChange={(next) => {
          setModel(next);
          setAnswer(null);
        }}
        marks={marks()}
        world={world()}
        onWorld={(w) => {
          setWorld(w);
          setAnswer(null);
        }}
        onCheck={() => void check()}
        busy={busy()}
      >
        <Show when={checked()}>
          {(c) => (
            <div class="modal-check" role="status">
              <p class="method-verdict">
                <span class={`kw ${c().holds ? "ok" : "bad"}`}>
                  {forcingWords(c(), world(), reading()).keyword}
                </span>{" "}
                {forcingWords(c(), world(), reading()).sentence}
              </p>
              <Show when={c().failing?.forcing.length}>
                <ul class="modal-values">
                  <For each={c().failing?.forcing}>
                    {(f) => <li class="m">{forcedWords(f)}</li>}
                  </For>
                </ul>
              </Show>
            </div>
          )}
        </Show>
        <Show when={refused()}>
          {(f) => (
            <div class="modal-check" role="status">
              <p class="method-verdict">
                <span class="kw warn">
                  {f().code === "invalid_model"
                    ? `No model of ${LOGIC[props.seed.logic] ?? ""}`
                    : "Not checked"}
                </span>{" "}
                {f().code === "invalid_model" ? refusalWords(f()) : f().message}
              </p>
            </div>
          )}
        </Show>
      </KripkeEditor>
    </section>
  );
}
