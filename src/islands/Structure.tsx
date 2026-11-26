// deduxit © Fabian Lukas Grubmüller 2026
// Licensed under the EUPL

/**
 * The countermodel view `⊭` of a first-order sequent (board D9): the structure drawn as a grid,
 * its elements across the top, each predicate a row of dots and each constant or function a row
 * of the element it names. A press on a dot flips where the predicate holds, "+" adds an element
 * and "−" takes one away; deduxit checks the structure after each change (`ordinary_structure`),
 * and the sequent under the grid shows each formula's value and `⊭` while the structure refutes
 * the sequent, `⊨` when it does not. Undo and Redo are the view's tools.
 */

import { createEffect, createSignal, For, type JSX, on, Show } from "solid-js";
import { type Failure, failure as failureOf } from "../lib/deduxit";
import {
  addElement,
  applied,
  type Evaluated,
  flip,
  holds,
  MOST_ELEMENTS,
  MOST_ROWS,
  removeElement,
  setValue,
  type Structure,
  structureJson,
  tuples,
  elementOf,
} from "../lib/structure";
import { Sign } from "./Signs";
import type { Prover } from "./state";
import type { Counter, Ui } from "./ui";

/** The structure's state in the view. */
type Shown = Counter & { readonly kind: "structure" };

/** The view's state, where the countermodel shown is a structure. */
const shownIn = (ui: Ui): Shown | null => {
  const c = ui.ui.counter;
  return c?.kind === "structure" ? c : null;
};

/** Changes the structure, the change one step of the view's undo. */
export function changeStructure(ui: Ui, next: Structure) {
  const c = shownIn(ui);
  if (!c) return;
  ui.setUi("counter", { ...c, now: next, past: [...c.past, c.now], future: [] });
}

/** Takes the structure's last change back; false where there is none. */
export function undoStructure(ui: Ui): boolean {
  const c = shownIn(ui);
  const before = c?.past.at(-1);
  if (!c || !before) return false;
  ui.setUi("counter", {
    ...c,
    now: before,
    past: c.past.slice(0, -1),
    future: [...c.future, c.now],
  });
  return true;
}

/** Makes the structure's last change taken back again; false where there is none. */
export function redoStructure(ui: Ui): boolean {
  const c = shownIn(ui);
  const next = c?.future.at(-1);
  if (!c || !next) return false;
  ui.setUi("counter", {
    ...c,
    now: next,
    future: c.future.slice(0, -1),
    past: [...c.past, c.now],
  });
  return true;
}

/** deduxit's answer: the structure's values, or why it was not checked. */
type Answer = { readonly evaluated: Evaluated } | { readonly failure: Failure };

/** The last check of the structure shown, which the guide's sentence reads. */
const [lastEvaluated, setLastEvaluated] = createSignal<Evaluated | null>(null);
export { lastEvaluated };

/** What the guide says under a check: why the structure refutes the sequent or does not. */
export function structureWords(evaluated: Evaluated): string {
  if (evaluated.refutes)
    return "Every formula left of ⊢ is true here and every formula right of it is false, so this structure refutes the sequent. Press a dot to change it.";
  const left = evaluated.left.find((f) => !f.true);
  const right = evaluated.right.find((f) => f.true);
  return left
    ? `${left.formula} is false here, so this structure does not refute the sequent. Press dots until it is true.`
    : `${right?.formula ?? ""} is true here, so this structure does not refute the sequent. Press dots until it is false.`;
}

/** The countermodel view of a first-order sequent: the structure, and the sequent's values in it. */
export function StructureView(props: { prover: Prover; ui: Ui }) {
  const shown = () => shownIn(props.ui);
  const [answer, setAnswer] = createSignal<Answer | null>(null);
  // deduxit checks the structure at once after every change; an answer for a structure changed
  // since is dropped.
  createEffect(
    on(
      () => shown()?.now,
      async (now) => {
        const c = shown();
        if (!c || !now) return;
        const json = structureJson(now);
        let found: Answer;
        try {
          found = {
            evaluated: await props.prover.api.ordinary.structure(json, c.sequent, c.logic, "{}"),
          };
        } catch (thrown) {
          found = { failure: failureOf(thrown) };
        }
        const latest = shown()?.now;
        if (latest && structureJson(latest) === json) {
          setAnswer(found);
          setLastEvaluated("evaluated" in found ? found.evaluated : null);
        }
      },
    ),
  );
  const evaluated = () => {
    const a = answer();
    return a && "evaluated" in a ? a.evaluated : null;
  };
  const refused = () => {
    const a = answer();
    return a && "failure" in a ? a.failure : null;
  };
  const change = (next: Structure) => changeStructure(props.ui, next);

  return (
    <Show when={shown()}>
      {(c) => {
        const elements = () => Array.from({ length: c().now.size }, (_, e) => e);
        let grid!: HTMLFieldSetElement;
        // The grid's columns: the symbols, one per element, and "+".
        createEffect(() => grid.style.setProperty("--elements", String(c().now.size)));
        return (
          <section class="method structure-view" aria-label="Countermodel">
            <fieldset
              class="structure"
              aria-label="The structure: its elements, and what each symbol names or holds of"
              ref={grid}
            >
              <span />
              <For each={elements()}>
                {(e) => (
                  <div class="element">
                    <span class="element-name m">{e}</span>
                    <Show when={c().now.size > 1}>
                      <button
                        type="button"
                        class="element-remove"
                        aria-label={`Remove element ${String(e)}`}
                        data-tip={`Remove element ${String(e)}`}
                        onClick={() => change(removeElement(c().now, e, c().signature))}
                      >
                        <Sign name="minus" />
                      </button>
                    </Show>
                  </div>
                )}
              </For>
              <button
                type="button"
                class="element-add"
                aria-label="Add an element"
                data-tip="Add an element"
                aria-disabled={c().now.size >= MOST_ELEMENTS ? "true" : undefined}
                onClick={() =>
                  c().now.size < MOST_ELEMENTS && change(addElement(c().now, c().signature))
                }
              >
                <Sign name="plus" />
              </button>
              <For each={c().signature.predicates}>
                {(p) => (
                  <Rows
                    count={c().now.size ** Math.max(p.arity - 1, 0)}
                    name={p.name}
                    arity={p.arity}
                    elements={c().now.size}
                  >
                    {(prefix) => (
                      <Show
                        when={p.arity > 0}
                        fallback={
                          <div class="dot-cell span">
                            <Dot
                              on={holds(c().now, p.name, [])}
                              words={`${p.name} ${holds(c().now, p.name, []) ? "holds" : "does not hold"}`}
                              press={() => change(flip(c().now, p.name, []))}
                            />
                          </div>
                        }
                      >
                        <For each={elements()}>
                          {(e) => {
                            const tuple = () => [...prefix, e];
                            const on = () => holds(c().now, p.name, tuple());
                            return (
                              <div class="dot-cell">
                                <Dot
                                  on={on()}
                                  words={`${p.name} ${on() ? "holds" : "does not hold"} of ${tuple().join(", ")}`}
                                  press={() => change(flip(c().now, p.name, tuple()))}
                                />
                              </div>
                            );
                          }}
                        </For>
                      </Show>
                    )}
                  </Rows>
                )}
              </For>
              <For each={c().signature.functions}>
                {(f) => (
                  <Rows
                    count={c().now.size ** f.arity}
                    name={f.name}
                    arity={f.arity + 1}
                    elements={c().now.size}
                    named
                  >
                    {(args) => (
                      <For each={elements()}>
                        {(e) => {
                          const on = () => elementOf(c().now, f.name, args) === e;
                          const term = applied(f.name, args);
                          return (
                            <div class="dot-cell">
                              <Dot
                                on={on()}
                                named
                                words={`${term} is ${String(e)}`}
                                press={() => !on() && change(setValue(c().now, f.name, args, e))}
                              />
                            </div>
                          );
                        }}
                      </For>
                    )}
                  </Rows>
                )}
              </For>
            </fieldset>
            <Show when={evaluated()}>
              {(v) => (
                <p class="valued m" role="status">
                  <For each={v().left}>
                    {(f, i) => (
                      <>
                        <Valued formula={f.formula} holds={f.true} />
                        <Show when={i() < v().left.length - 1}>
                          <span class="comma">,</span>
                        </Show>
                      </>
                    )}
                  </For>
                  <span
                    class="turn"
                    role="img"
                    data-refutes={v().refutes ? "" : undefined}
                    aria-label={
                      v().refutes
                        ? "This structure refutes the sequent"
                        : "This structure does not refute the sequent"
                    }
                    data-tip={
                      v().refutes
                        ? "This structure refutes the sequent"
                        : "This structure does not refute the sequent"
                    }
                  >
                    {v().refutes ? "⊭" : "⊨"}
                  </span>
                  <For each={v().right}>
                    {(f, i) => (
                      <>
                        <Valued formula={f.formula} holds={f.true} />
                        <Show when={i() < v().right.length - 1}>
                          <span class="comma">,</span>
                        </Show>
                      </>
                    )}
                  </For>
                </p>
              )}
            </Show>
            <Show when={refused()}>
              {(f) => (
                <p class="said-why" role="status">
                  <span class="kw">Not checked.</span> {f().message}
                </p>
              )}
            </Show>
          </section>
        );
      }}
    </Show>
  );
}

/**
 * The rows of one symbol: a predicate of arity k has a row for each tuple of its first k − 1
 * arguments, a function of arity k a row for each tuple of its arguments (`named`), each row
 * headed by the symbol with those arguments. Past `MOST_ROWS` rows the symbol is said, not drawn.
 */
function Rows(props: {
  count: number;
  name: string;
  /** The arity of what a row's cells complete: a predicate's, or a function's plus its value. */
  arity: number;
  /** The domain's number of elements. */
  elements: number;
  named?: boolean;
  children: (prefix: number[]) => JSX.Element;
}) {
  const prefixes = () => tuples(props.elements, Math.max(props.arity - 1, 0));
  const head = (prefix: readonly number[]) =>
    props.named
      ? prefix.length
        ? `${applied(props.name, prefix)} =`
        : `${props.name} =`
      : props.arity > 1
        ? `${props.name}(${[...prefix, "·"].join(", ")})`
        : props.name;
  return (
    <Show
      when={props.count <= MOST_ROWS}
      fallback={
        <p class="rows-past said-why">
          <span class="m">{props.name}</span> has {props.count} rows of {props.elements} elements,
          too many to show here.
        </p>
      }
    >
      <For each={prefixes()}>
        {(prefix) => (
          <>
            <span class="symbol m">{head(prefix)}</span>
            {props.children(prefix)}
            <span />
          </>
        )}
      </For>
    </Show>
  );
}

/** A dot: pressed, it flips where a predicate holds, or names the element a term is. */
function Dot(props: { on: boolean; words: string; named?: boolean; press: () => void }) {
  return (
    <button
      type="button"
      class="dot"
      data-named={props.named ? "" : undefined}
      aria-pressed={props.on}
      aria-label={props.words}
      data-tip={props.words}
      onClick={() => props.press()}
    >
      <span class="dot-mark" aria-hidden="true" />
    </button>
  );
}

/** A formula with its value: a check where it is true, a cross where false. */
function Valued(props: { formula: string; holds: boolean }) {
  return (
    <span class="valued-formula" data-holds={props.holds ? "" : undefined}>
      {props.formula}
      <span class="value" role="img" aria-label={props.holds ? "true here" : "false here"}>
        <Sign name={props.holds ? "close" : "cross"} />
      </span>
    </span>
  );
}
