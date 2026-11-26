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

import { createEffect, createSignal, For, onCleanup, Show } from "solid-js";
import { produce } from "solid-js/store";
import { FORMS } from "../lib/clausal";
import type { Mode } from "../lib/deduxit";
import { CALCULUS_WORDS, LAMBDA_CALCULI } from "../lib/lambda";
import { CONDITION_WORDS, CONDITIONS, closure, SYSTEMS, systemOf, systemWords } from "../lib/modal";
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
import { WAYS } from "./Clausal";
import { cellName, netReady } from "./Frame";
import { layout, naturalSteps, setLayout } from "./Natural";
import type { Prover } from "./state";
import { Sign } from "./Signs";
import { type Ui, viewKey, wayOf } from "./ui";

/** How often a term may use each variable, as the toggle names it. */
const USE_WORDS = { simple: "Unrestricted", linear: "Linear", affine: "Affine" } as const;

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
      const opened = await props.prover.open(p.input, next);
      const q = props.prover.current();
      if (!("problem" in opened) && q && q.id !== p.id)
        props.prover.setBeside(q.id, p.id, "calculus");
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

  const tab = () => props.ui.ui.tab;
  // A view other than the proof's has no calculus but its own toggle; a modal countermodel keeps
  // the system, whose conditions it must meet.
  const shown = () =>
    tab() === "tree" ||
    tab() === "net" ||
    (tab() === "countermodel" && calculus().suite === "modal");
  /** A view's own toggle: how it works, kept per proof and view. */
  const Way = (w: {
    label: string;
    items: readonly { key: string; name: string; tip: string }[];
  }) => {
    // Read at each use: the same toggle serves the same view of another proof of the chip.
    const now = () => {
      const p = proof();
      return p ? wayOf(props.ui, p.id, tab(), w.items[0]?.key ?? "") : "";
    };
    return (
      <Seg
        label={w.label}
        items={w.items.map((item) => ({
          name: item.name,
          tip: item.tip,
          on: now() === item.key,
          pick: () => {
            const p = proof();
            const view = tab();
            if (!p) return;
            props.ui.setUi(
              "ways",
              produce((all: Record<string, string>) => {
                all[viewKey(p.id, view)] = item.key;
              }),
            );
            if (view === "normal")
              props.ui.setUi(
                "stepAt",
                produce((all: Record<string, number>) => {
                  delete all[viewKey(p.id, "normal")];
                }),
              );
          },
        }))}
      />
    );
  };
  /** The conditions the system is made of, and those that follow from them. */
  const own = () => SYSTEMS.find((s) => s.name === system())?.conditions ?? [];
  const holds = () => closure(own());
  const [listing, setListing] = createSignal(false);
  // The list closes on Escape and on a press outside it, as every list of the page does.
  createEffect(() => {
    if (!listing()) return;
    const outside = (event: PointerEvent) => {
      if (!(event.target as Element).closest(".system-pick")) setListing(false);
    };
    document.addEventListener("pointerdown", outside, true);
    onCleanup(() => document.removeEventListener("pointerdown", outside, true));
  });
  /** Escape in the list or on its button closes the list and gives the button the focus. */
  const closeOnEscape = (event: KeyboardEvent) => {
    if (event.key !== "Escape" || !listing()) return;
    event.stopPropagation();
    setListing(false);
    (
      (event.currentTarget as HTMLElement)
        .closest(".system-pick")
        ?.querySelector(".system-name") as HTMLElement | null
    )?.focus();
  };
  return (
    <Show when={!fixed()} fallback={<p class="note calc-fixed">{fixed()}</p>}>
      <Show when={tab() === "tableau"}>
        <fieldset class="toggles" aria-label="This view">
          <Way
            label="Tableau"
            items={[
              { key: "search", name: "Search", tip: "deduxit's tableau, every branch expanded" },
              { key: "hand", name: "By hand", tip: "A tableau you write, checked by deduxit" },
            ]}
          />
        </fieldset>
      </Show>
      <Show when={tab() === "resolution"}>
        <fieldset class="toggles" aria-label="This view">
          <Way
            label="Resolution"
            items={WAYS.map((w) => ({ key: w.key, name: w.name, tip: w.does }))}
          />
        </fieldset>
      </Show>
      <Show when={tab() === "normal"}>
        <fieldset class="toggles" aria-label="This view">
          <Way
            label="Normal form"
            items={FORMS.map((f) => ({ key: f.key, name: f.name, tip: f.is }))}
          />
        </fieldset>
      </Show>
      <Show when={tab() === "elim" && netReady(proof())}>
        <fieldset class="toggles" aria-label="This view">
          <Way
            label="Eliminate the cuts of"
            items={[
              { key: "tree", name: "Derivation", tip: "The cuts of the derivation, step by step" },
              { key: "net", name: "Net", tip: "The cut links of the proof net, step by step" },
            ]}
          />
        </fieldset>
      </Show>
      <fieldset class="toggles" aria-label="Calculus of this view" hidden={!shown()}>
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
          <div class="toggle system-pick">
            <button
              type="button"
              class="toggle-cell system-name"
              aria-label={`${system()} system`}
              aria-expanded={listing()}
              aria-haspopup="listbox"
              onKeyDown={closeOnEscape}
              data-tip={systemWords(system())}
              onClick={() => setListing(!listing())}
            >
              {system()}
              <Sign name="caret" />
            </button>
            <Show when={listing()}>
              <div
                class="system-list menu"
                role="listbox"
                aria-label="Systems"
                onKeyDown={closeOnEscape}
              >
                <For each={SYSTEMS}>
                  {(s) => (
                    <button
                      type="button"
                      role="option"
                      class="mi"
                      aria-selected={s.name === system()}
                      onClick={() => {
                        setListing(false);
                        void ask(modal(s.name));
                      }}
                    >
                      <span class="system-short">{s.name}</span>{" "}
                      <span class="sub">
                        {s.conditions.length === 0 ? "no condition" : s.conditions.join(", ")}
                      </span>
                    </button>
                  )}
                </For>
              </div>
            </Show>
          </div>
          <fieldset class="toggle" aria-label="Conditions on what a world sees">
            <For each={CONDITIONS}>
              {(c) => {
                const mine = () => own().includes(c);
                const follows = () => holds().includes(c) && !mine();
                return (
                  <button
                    type="button"
                    class="toggle-cell"
                    aria-pressed={holds().includes(c)}
                    data-own={mine() ? "" : undefined}
                    data-tip={`Every world ${CONDITION_WORDS[c]}.${follows() ? " It follows from the others." : ""}`}
                    onClick={() => {
                      if (follows()) {
                        setUi("notice", {
                          text: `In ${system()} every world ${CONDITION_WORDS[c]}: it follows from the others.`,
                        });
                        return;
                      }
                      const next = mine() ? own().filter((x) => x !== c) : [...own(), c];
                      void ask(modal(systemOf(next)));
                    }}
                  >
                    {c[0]?.toUpperCase()}
                    {c.slice(1)}
                  </button>
                );
              }}
            </For>
          </fieldset>
        </Show>
        <Show when={calculus().suite === "lambda"}>
          <fieldset class="toggle" aria-label="Typing">
            <button
              type="button"
              class="toggle-cell"
              aria-pressed={true}
              data-tip="Simply typed terms"
            >
              Typed
            </button>
            <button
              type="button"
              class="toggle-cell"
              aria-pressed={false}
              aria-disabled="true"
              data-tip="Coming soon"
              onClick={() => setUi("notice", { text: "Untyped lambda-terms are coming soon." })}
            >
              Untyped
            </button>
          </fieldset>
          <Seg
            label="How often a term may use each variable"
            items={LAMBDA_CALCULI.map((each) => ({
              name: USE_WORDS[each],
              tip: CALCULUS_WORDS[each],
              on: (() => {
                const c = calculus();
                return c.suite === "lambda" && c.calculus === each;
              })(),
              pick: () => void ask(lambda(each)),
            }))}
          />
        </Show>
      </fieldset>
    </Show>
  );
}
