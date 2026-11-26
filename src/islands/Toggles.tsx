// deduxit © Fabian Lukas Grubmüller 2026
// Licensed under the EUPL

/**
 * The toggles at the stage's top left, which say which calculus the view is in and change it.
 * Ordinary logic: "Sequent" or "Natural", and classical, intuitionistic or minimal logic (LK, LJ,
 * and LJ without ex falso). Linear logic: classical or intuitionistic, and the single toggles Mix
 * and Affine, and on a net's view how the net is drawn. Modal logic: its system, one of the
 * fifteen from K to S5. Lambda-terms: how often a term may use a variable. A change keeps the
 * proof where its steps hold in the new calculus; where one does not, the new calculus opens
 * beside the proof, which keeps its own.
 */

import { For, Show } from "solid-js";
import type { Mode } from "../lib/deduxit";
import { CALCULUS_WORDS, LAMBDA_CALCULI, type LambdaCalculus } from "../lib/lambda";
import { SYSTEMS, systemWords } from "../lib/modal";
import {
  type Calculus as Chosen,
  isNatural,
  LOGICS,
  lambda,
  linear,
  modal,
  modeOf as linearMode,
  ordinary,
  sameCalculus,
} from "../lib/suites";
import { cellName } from "./Frame";
import { layout, naturalSteps, setLayout } from "./Natural";
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
  const { setUi } = props.ui;
  const system = () => {
    const c = calculus();
    return c.suite === "modal" ? c.system : "K";
  };

  /** Changes the calculus: the proof stays where its steps hold, else the new one opens beside. */
  async function ask(next: Chosen) {
    const p = proof();
    if (!p || sameCalculus(next, p.calculus)) return;
    const before = cellName(p.calculus);
    // Natural deduction's steps are kept by its view, by calculus: a change of logic with steps
    // opens the new logic beside, whose own proof starts afresh.
    if (isNatural(p.calculus) && naturalSteps(p) > 0 && next.suite === "ordinary") {
      if (p.calculus.suite === "ordinary" && next.logic === p.calculus.logic) {
        void props.prover.setCalculus(p.id, next);
        return;
      }
      const after = cellName(next);
      await props.prover.open(p.input, next);
      setUi("notice", {
        text: `${before} keeps your proof, so ${after} opened beside.`,
      });
      return;
    }
    const done = await props.prover.setCalculus(p.id, next);
    if (done && "beside" in done) {
      const after = cellName(next);
      setUi("notice", {
        text:
          done.beside > 0
            ? `Step ${done.beside} does not hold in ${after}, so ${after} opened beside. ${before} keeps your proof.`
            : `A goal the search closed stays open in ${after}, so ${after} opened beside. ${before} keeps your proof.`,
      });
    }
  }
  const askMode = (next: Mode) => void ask(linear(next));

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
                  if (l) void ask(ordinary(l, "sequent"));
                },
              },
              {
                name: "Natural",
                tip: "Natural deduction (NK, NJ, NM), drawn as Gentzen's tree",
                on: method() === "natural" && layout() === "tree",
                pick: () => {
                  const l = logic();
                  setLayout("tree");
                  if (l) void ask(ordinary(l, "natural"));
                },
              },
              {
                name: "Fitch",
                tip: "Natural deduction, drawn as Fitch's numbered lines",
                on: method() === "natural" && layout() === "fitch",
                pick: () => {
                  const l = logic();
                  setLayout("fitch");
                  if (l) void ask(ordinary(l, "natural"));
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
              pick: () => void ask(ordinary(each, method())),
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
          <Show when={props.ui.ui.tab === "net"}>
            <Seg
              label="Net drawing"
              items={(["formulas", "compact"] as const).map((net) => ({
                name: net === "formulas" ? "Formulas" : "Compact",
                tip:
                  net === "formulas"
                    ? "The net with every formula written"
                    : "The net compact: only its literals and conclusions written",
                on: props.prover.settings().net === net,
                pick: () => props.prover.setSettings({ net }),
              }))}
            />
          </Show>
        </Show>
        <Show when={calculus().suite === "modal"}>
          <label class="toggle-select" data-tip={systemWords(system())}>
            <span>System</span>
            <select
              class="select"
              aria-label="System"
              value={system()}
              onChange={(event) => void ask(modal(event.currentTarget.value))}
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
              onChange={(event) => void ask(lambda(event.currentTarget.value as LambdaCalculus))}
            >
              <For each={LAMBDA_CALCULI}>
                {(each) => <option value={each}>{CALCULUS_WORDS[each]}</option>}
              </For>
            </select>
          </label>
        </Show>
      </fieldset>
    </Show>
  );
}
