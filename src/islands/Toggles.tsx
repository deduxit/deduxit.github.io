// deduxit © Fabian Lukas Grubmüller 2026
// Licensed under the EUPL

/**
 * The toggles at the stage's top left, which say which calculus the view is in and change it.
 * Ordinary logic: "Sequent" or "Natural", and classical, intuitionistic or minimal logic (LK, LJ,
 * and LJ without ex falso). Linear logic: classical or intuitionistic, and the single toggles Mix
 * and Affine. Modal logic: its system, one of the fifteen from K to S5. Lambda-terms: how often a
 * term may use a variable. A session is one sequent in one calculus, so a change restarts the
 * proof, and the toggles say so first when the proof has steps.
 */

import { For, Show } from "solid-js";
import type { Mode } from "../lib/deduxit";
import { CALCULUS_WORDS, LAMBDA_CALCULI, type LambdaCalculus } from "../lib/lambda";
import { SYSTEMS, systemWords } from "../lib/modal";
import {
  type Calculus as Chosen,
  LOGICS,
  lambda,
  linear,
  modal,
  modeOf as linearMode,
  ordinary,
  sameCalculus,
} from "../lib/suites";
import type { Prover } from "./state";
import type { Ui } from "./ui";

/** The mode the linear switches make. */
export function modeOf(intuitionistic: boolean, mix: boolean, affine: boolean): Mode {
  if (intuitionistic) return affine ? "intuitionistic-affine" : "intuitionistic";
  if (affine) return mix ? "affine-mix" : "affine";
  return mix ? "mix" : "classical";
}

/** Each ordinary logic's name on its segment and what its tip says. */
const LOGIC_WORDS = {
  classical: { name: "Classical", tip: "Gentzen's LK: any number of formulas right of ⊢" },
  intuitionistic: { name: "Intuitionistic", tip: "Gentzen's LJ: one formula right of ⊢" },
  minimal: { name: "Minimal", tip: "LJ without ex falso: ⊥ is an atom like any other" },
} as const;

/** The toggles of the view shown, at the stage's top left: which calculus it is in, and a change of it. */
export function Toggles(props: { prover: Prover; ui: Ui }) {
  const proof = () => props.prover.current();
  const calculus = (): Chosen => proof()?.calculus ?? linear("classical");
  const logic = () => {
    const c = calculus();
    return c.suite === "ordinary" ? c.logic : undefined;
  };
  const method = () => calculus().method;
  const mode = () => linearMode(calculus());
  const intuitionistic = () => mode().startsWith("intuitionistic");
  const mix = () => mode().endsWith("mix");
  const affine = () => mode().includes("affine");
  const { ui, setUi } = props.ui;
  const system = () => {
    const c = calculus();
    return c.suite === "modal" ? c.system : "K";
  };

  function ask(next: Chosen) {
    const p = proof();
    if (!p || sameCalculus(next, p.calculus)) return;
    if ((p.view?.steps ?? p.custom?.view?.steps ?? 0) > 0) setUi("pendingCalculus", next);
    else void props.prover.setCalculus(p.id, next);
  }
  const askMode = (next: Mode) => ask(linear(next));

  /** Why the tab's calculus stays as it is: a course pack's problem, or null. */
  const fixed = () => {
    const p = proof();
    return p ? props.prover.limits().fixed(p.id) : null;
  };

  /** A toggle: a box of pressed buttons, one of which is chosen. */
  const Seg = (p: {
    label: string;
    items: readonly { name: string; tip: string; on: boolean; pick: () => void }[];
  }) => (
    <fieldset class="toggle" aria-label={p.label}>
      <For each={p.items}>
        {(item) => (
          <button
            type="button"
            class="toggle-cell"
            aria-pressed={item.on}
            data-tip={item.tip}
            onClick={() => item.pick()}
          >
            {item.name}
          </button>
        )}
      </For>
    </fieldset>
  );

  return (
    <Show when={!fixed()} fallback={<p class="note calc-fixed">{fixed()}</p>}>
      <fieldset class="toggles" aria-label="Calculus of this view">
        <Show when={calculus().suite === "ordinary"}>
          <Seg
            label="Proof method"
            items={[
              {
                name: "Sequent",
                tip: "The sequent calculus: rules on both sides of ⊢",
                on: method() !== "natural",
                pick: () => {
                  const l = logic();
                  if (l) ask(ordinary(l, "sequent"));
                },
              },
              {
                name: "Natural",
                tip: "Natural deduction (NK, NJ, NM): introduction and elimination rules",
                on: method() === "natural",
                pick: () => {
                  const l = logic();
                  if (l) ask(ordinary(l, "natural"));
                },
              },
            ]}
          />
          <Seg
            label="Logic"
            items={LOGICS.map((each) => ({
              name: LOGIC_WORDS[each].name,
              tip: LOGIC_WORDS[each].tip,
              on: logic() === each,
              pick: () => ask(ordinary(each, method())),
            }))}
          />
        </Show>
        <Show when={calculus().suite === "linear"}>
          <Seg
            label="Logic"
            items={[
              {
                name: "Classical",
                tip: "One-sided classical linear logic",
                on: !intuitionistic(),
                pick: () => askMode(modeOf(false, mix(), affine())),
              },
              {
                name: "Intuitionistic",
                tip: "Two-sided intuitionistic linear logic: one formula right of ⊢",
                on: intuitionistic(),
                pick: () => askMode(modeOf(true, false, affine())),
              },
            ]}
          />
          <fieldset class="toggle" aria-label="Rules">
            <button
              type="button"
              class="toggle-cell"
              aria-pressed={mix()}
              aria-disabled={intuitionistic() ? "true" : undefined}
              data-tip={
                intuitionistic() ? "Mix is a rule of classical linear logic" : "The Mix rule"
              }
              onClick={() => {
                if (intuitionistic())
                  setUi("notice", { text: "Mix is a rule of classical linear logic." });
                else askMode(modeOf(false, !mix(), affine()));
              }}
            >
              Mix
            </button>
          </fieldset>
          <fieldset class="toggle" aria-label="Weakening">
            <button
              type="button"
              class="toggle-cell"
              aria-pressed={affine()}
              data-tip="Affine weakening: any formula may be dropped"
              onClick={() => askMode(modeOf(intuitionistic(), mix(), !affine()))}
            >
              Affine
            </button>
          </fieldset>
        </Show>
        <Show when={calculus().suite === "modal"}>
          <label class="toggle-select" data-tip={systemWords(system())}>
            <span>System</span>
            <select
              class="select"
              aria-label="System"
              value={system()}
              onChange={(event) => ask(modal(event.currentTarget.value))}
            >
              <For each={SYSTEMS}>{(s) => <option value={s.name}>{s.name}</option>}</For>
            </select>
          </label>
        </Show>
        <Show when={calculus().suite === "lambda"}>
          <label class="toggle-select" data-tip="How often a term may use each variable">
            <span>Use</span>
            <select
              class="select"
              aria-label="Lambda calculus"
              value={(() => {
                const c = calculus();
                return c.suite === "lambda" ? c.calculus : "simple";
              })()}
              onChange={(event) => ask(lambda(event.currentTarget.value as LambdaCalculus))}
            >
              <For each={LAMBDA_CALCULI}>
                {(each) => <option value={each}>{CALCULUS_WORDS[each]}</option>}
              </For>
            </select>
          </label>
        </Show>
      </fieldset>
      <Show when={ui.pendingCalculus}>
        {(next) => (
          <div class="panel mode-warn" role="alertdialog" aria-label="Restart the proof">
            <p>Changing the logic restarts this proof: its steps are lost.</p>
            <p class="row">
              <button
                type="button"
                class="btn btn-primary"
                onClick={() => {
                  // Read before the warning closes: its accessor goes stale with it.
                  const chosen = next();
                  const p = proof();
                  setUi("pendingCalculus", null);
                  if (p) void props.prover.setCalculus(p.id, chosen);
                }}
              >
                Restart
              </button>
              <button type="button" class="btn" onClick={() => setUi("pendingCalculus", null)}>
                Keep the proof
              </button>
            </p>
          </div>
        )}
      </Show>
    </Show>
  );
}
