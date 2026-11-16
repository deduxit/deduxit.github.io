// deduxit © Fabian Lukas Grubmüller 2026
// Licensed under the EUPL

/**
 * The calculus's switches, in the popover a tab's calculus mark opens, at every width: a
 * segmented control for the suite (the registered suites, linear and ordinary logic), then the
 * suite's own switches. Linear logic: a segmented control for classical or intuitionistic logic
 * and labelled switches for Mix, affine weakening and, in classical mode alone, the two-sided
 * presentation (intuitionistic derivations are two-sided already). Ordinary logic: a segmented
 * control for classical, intuitionistic and minimal logic (LK, LJ, and LJ without ex falso), a
 * button that proves the sequent by natural deduction instead (NK, NJ, NM: a method of its own,
 * which the stage then shows), and a switch that draws the weakenings and contractions. A session is one sequent in one calculus, so
 * a change of the calculus restarts the proof, and the switches say so first when the proof has
 * steps; the presentation and the structural rules are settings of the tab, kept with the
 * others, and change only how a derivation is drawn. Under the suites, one button opens a
 * calculus of one's own, a rule file, which the stage's panel then holds: it has no segment, so
 * a visitor who never presses it sees nothing else of it.
 */

import { For, Show } from "solid-js";
import type { Mode } from "../lib/deduxit";
import {
  type Calculus as Chosen,
  custom,
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
  const method = () => calculus().method;
  const mode = () => linearMode(calculus());
  const intuitionistic = () => mode().startsWith("intuitionistic");
  const mix = () => mode().endsWith("mix");
  const affine = () => mode().includes("affine");
  const { ui, setUi } = props.ui;

  function ask(next: Chosen) {
    const p = proof();
    if (!p || sameCalculus(next, p.calculus)) return;
    if ((p.view?.steps ?? p.custom?.view?.steps ?? 0) > 0) setUi("pendingCalculus", next);
    else void props.prover.setCalculus(p.id, next);
  }
  const askMode = (next: Mode) => ask(linear(next));

  return (
    <fieldset class="calc" aria-label="Calculus">
      <fieldset class="seg" aria-label="Suite">
        <For each={SUITES.filter((s) => s.segment)}>
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
      <button
        type="button"
        class="btn btn-s"
        aria-pressed={calculus().suite === "rules"}
        data-tip="A calculus written as a rule file: start from LJ or the tableau, or write your own rules"
        onClick={() => {
          if (calculus().suite !== "rules") ask(custom("LJ"));
        }}
      >
        Your own calculus
      </button>
      <Show when={calculus().suite !== "rules"}>
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
                      onClick={() => ask(ordinary(each, method()))}
                    >
                      {LOGIC_WORDS[each].name}
                    </button>
                  )}
                </For>
              </fieldset>
              {/* Natural deduction, a method of its own: one button, pressed where it is wanted. */}
              <button
                type="button"
                class="btn btn-s"
                aria-pressed={method() === "natural"}
                data-tip="Prove the sequent by natural deduction (NK, NJ, NM): introduction and elimination rules, drawn as a tree or as Fitch's lines"
                onClick={() => {
                  const l = logic();
                  if (l) ask(ordinary(l, method() === "natural" ? "sequent" : "natural"));
                }}
              >
                Natural deduction
              </button>
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
              {/* A started classical sequent's translations and interpolants, each asked for. */}
              <Show when={logic() === "classical" && proof()?.session}>
                <div class="calc-more">
                  <button
                    type="button"
                    class="btn btn-s"
                    onClick={() => setUi("menu", "translate")}
                  >
                    Translate into intuitionistic logic
                  </button>
                  <button
                    type="button"
                    class="btn btn-s"
                    onClick={() => setUi("menu", "interpolate")}
                  >
                    Find an interpolant
                  </button>
                </div>
              </Show>
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
          {/* Why the switch is greyed, in view: a tip follows no touch. */}
          <Show when={intuitionistic()}>
            <p class="said-why">Mix is a rule of classical linear logic.</p>
          </Show>
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
      </Show>
      <Show when={ui.pendingCalculus}>
        {(next) => (
          <div class="cluster mode-warn" role="alertdialog" aria-label="Restart the proof">
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
    </fieldset>
  );
}
