// deduxit © Fabian Lukas Grubmüller 2026
// Licensed under the EUPL

/**
 * The calculus's switches, in the popover a tab's calculus mark opens, at every width: a
 * segmented control for the suite (the registered suites, linear and ordinary logic), then the
 * suite's own switches. Linear logic: a segmented control for classical or intuitionistic logic
 * and labelled switches for Mix, affine weakening and, in classical mode alone, the two-sided
 * presentation (intuitionistic derivations are two-sided already). Ordinary logic: a segmented
 * control for classical, intuitionistic and minimal logic (LK, LJ, and LJ without ex falso) and a
 * switch that draws the weakenings and contractions. A session is one sequent in one calculus, so
 * a change of the calculus restarts the proof, and the switches say so first when the proof has
 * steps; the presentation and the structural rules are settings of the tab, kept with the
 * others, and change only how a derivation is drawn.
 */

import { For, Show } from "solid-js";
import type { Mode } from "../lib/deduxit";
import {
  type Calculus as Chosen,
  LOGICS,
  linear,
  modeOf as linearMode,
  ordinary,
  SUITES,
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

export function Calculus(props: { prover: Prover; ui: Ui }) {
  const proof = () => props.prover.current();
  const calculus = (): Chosen => proof()?.calculus ?? linear("classical");
  const logic = () => {
    const c = calculus();
    return c.suite === "ordinary" ? c.logic : undefined;
  };
  const mode = () => linearMode(calculus());
  const intuitionistic = () => mode().startsWith("intuitionistic");
  const mix = () => mode().endsWith("mix");
  const affine = () => mode().includes("affine");
  const { ui, setUi } = props.ui;

  function ask(next: Chosen) {
    const p = proof();
    if (!p || sameCalculus(next, p.calculus)) return;
    if ((p.view?.steps ?? 0) > 0) setUi("pendingCalculus", next);
    else void props.prover.setCalculus(p.id, next);
  }
  const askMode = (next: Mode) => ask(linear(next));

  return (
    <fieldset class="calc" aria-label="Calculus">
      <fieldset class="seg" aria-label="Suite">
        <For each={SUITES}>
          {(s) => (
            <button
              type="button"
              class="seg-b"
              aria-pressed={calculus().suite === s.key}
              data-tip={s.tip}
              onClick={() => ask(calculus().suite === s.key ? calculus() : s.start)}
            >
              {s.name}
            </button>
          )}
        </For>
      </fieldset>
      <Show
        when={calculus().suite === "linear"}
        fallback={
          <>
            <fieldset class="seg" aria-label="Logic">
              <For each={LOGICS}>
                {(each) => (
                  <button
                    type="button"
                    class="seg-b"
                    aria-pressed={logic() === each}
                    data-tip={LOGIC_WORDS[each].tip}
                    onClick={() => ask(ordinary(each))}
                  >
                    {LOGIC_WORDS[each].name}
                  </button>
                )}
              </For>
            </fieldset>
            <label
              class="sw"
              data-tip="Draw every weakening and contraction as an inference; off, they are left out where they are admissible, as in G3"
            >
              <input
                type="checkbox"
                checked={props.prover.settings().structural === "explicit"}
                onChange={(event) =>
                  void props.prover.setStructural(
                    event.currentTarget.checked ? "explicit" : "admissible",
                  )
                }
              />
              <span class="sw-t" aria-hidden="true" />
              Structural rules
            </label>
          </>
        }
      >
        <fieldset class="seg" aria-label="Logic">
          <button
            type="button"
            class="seg-b"
            aria-pressed={!intuitionistic()}
            data-tip="One-sided classical linear logic"
            onClick={() => askMode(modeOf(false, mix(), affine()))}
          >
            Classical
          </button>
          <button
            type="button"
            class="seg-b"
            aria-pressed={intuitionistic()}
            data-tip="Two-sided intuitionistic linear logic: one formula right of ⊢"
            onClick={() => askMode(modeOf(true, false, affine()))}
          >
            Intuitionistic
          </button>
        </fieldset>
        <label
          class="sw"
          data-tip={intuitionistic() ? "Mix is a rule of classical linear logic" : "The Mix rule"}
        >
          <input
            type="checkbox"
            checked={mix()}
            disabled={intuitionistic()}
            onChange={(event) => askMode(modeOf(false, event.currentTarget.checked, affine()))}
          />
          <span class="sw-t" aria-hidden="true" />
          Mix
        </label>
        <label class="sw" data-tip="Affine weakening: any formula may be dropped">
          <input
            type="checkbox"
            checked={affine()}
            onChange={(event) =>
              askMode(modeOf(intuitionistic(), mix(), event.currentTarget.checked))
            }
          />
          <span class="sw-t" aria-hidden="true" />
          Affine
        </label>
        <Show when={!intuitionistic()}>
          <label
            class="sw"
            data-tip="Draw the derivation two-sided, as the sequent was written: each formula on its side of ⊢, the rules named by side (⊗L, ⅋R, ⊸L), and a step ~L or ~R where a negation was written"
          >
            <input
              type="checkbox"
              checked={props.prover.settings().twoSided}
              onChange={(event) =>
                props.prover.setSettings({ twoSided: event.currentTarget.checked })
              }
            />
            <span class="sw-t" aria-hidden="true" />
            Two-sided
          </label>
        </Show>
      </Show>
      <Show when={ui.pendingCalculus}>
        {(next) => (
          <div class="cluster mode-warn" role="alertdialog" aria-label="Restart the proof">
            <p>Changing the calculus restarts this proof: its steps are lost.</p>
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
    </fieldset>
  );
}
