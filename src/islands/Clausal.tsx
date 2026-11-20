// deduxit © Fabian Lukas Grubmüller 2026
// Licensed under the EUPL

/**
 * A classical proof's sequent rewritten into a normal form, and the clauses of its negation
 * refuted: two sheets over the stage, opened from the tab's Logic popover and nowhere else, so
 * that a visitor who does not ask sees nothing of them. Each says its verdict in one sentence
 * first. The normal form is stepped through one law at a time. A refutation is found by
 * saturation, traced by DPLL, or built by hand, one resolvent at a time; its clauses are listed
 * and drawn as a graph, the two in step: a clause chosen in one is chosen in the other.
 */

import {
  createEffect,
  createMemo,
  createResource,
  createSignal,
  For,
  Index,
  on,
  Show,
} from "solid-js";
import {
  allClauses,
  checkWords,
  clashes,
  clauseText,
  FORMS,
  type Form,
  type GraphNode,
  layout,
  type NormalForm,
  type Refutation,
  type Resolution,
  type Resolvent,
  resolutionWords,
  stepTexts,
  traceLines,
} from "../lib/clausal";
import { failure as failureOf } from "../lib/deduxit";
import { formText } from "../lib/ordinary";
import type { Prover } from "./state";
import {
  answered,
  classicalSequent,
  failureIn,
  given,
  Refused,
  Sheet,
  Verdict,
} from "./Transforms";
import type { Ui } from "./ui";

export function NormalizeSheet(props: { prover: Prover; ui: Ui }) {
  const { setUi } = props.ui;
  const sequent = classicalSequent(props.prover);
  createEffect(() => {
    if (!sequent()) setUi("menu", null);
  });
  const [chosen, setChosen] = createSignal<Form>("cnf");
  const words = () => FORMS.find((f) => f.key === chosen()) ?? FORMS[0];
  const [answer] = createResource(
    () => {
      const s = sequent();
      return s ? ([s.text, chosen()] as const) : undefined;
    },
    ([text, form]) =>
      answered(() => props.prover.api.ordinary.normalize(text, JSON.stringify({ form }), "{}")),
  );
  const made = () => given<NormalForm>(answer());
  const steps = createMemo(() => {
    const m = made();
    return m ? stepTexts(m) : [];
  });
  /** The step shown: 0 the sequent as typed, k the sequent after step k. */
  const [at, setAt] = createSignal(0);
  createEffect(on(made, () => setAt(0)));
  const shown = () => steps()[at() - 1];

  return (
    <Sheet
      ui={props.ui}
      title="Rewrite into a normal form"
      intro="A normal form writes a sequent in a fixed shape, one step at a time: CNF, NNF and DNF by laws that keep each formula's meaning, the two encodings by new atoms that keep whether the sequent is valid."
    >
      <fieldset class="seg tf-seg" aria-label="Normal form">
        <For each={FORMS}>
          {(f) => (
            <button
              type="button"
              class="seg-b"
              aria-pressed={chosen() === f.key}
              onClick={() => setChosen(f.key)}
            >
              {f.name}
            </button>
          )}
        </For>
      </fieldset>
      <p class="sub">{words()?.is}</p>
      <section class="tf-answer" aria-busy={answer.loading} aria-label="The normal form">
        <Show when={answer.loading}>
          <p class="sub">Rewriting, and checking the result…</p>
        </Show>
        <Show when={failureIn(answer())}>{(f) => <Refused failure={f()} />}</Show>
        <Show when={!answer.loading && made()}>
          {(m) => {
            const said = () => checkWords(m());
            return (
              <>
                <Verdict keyword={said().keyword} tone={said().tone}>
                  {said().sentence}
                </Verdict>
                <p class="tf-to">
                  <span class="m">{formText(m().result)}</span>
                </p>
                <fieldset class="cl-stepper" aria-label="The steps">
                  <p class="row">
                    <button
                      type="button"
                      class="btn btn-s"
                      disabled={at() === 0}
                      onClick={() => setAt(at() - 1)}
                    >
                      Previous step
                    </button>
                    <span class="sub cl-count">
                      {at() === 0
                        ? `${steps().length} step${steps().length === 1 ? "" : "s"}`
                        : `Step ${at()} of ${steps().length}`}
                    </span>
                    <button
                      type="button"
                      class="btn btn-s"
                      disabled={at() >= steps().length}
                      onClick={() => setAt(at() + 1)}
                    >
                      Next step
                    </button>
                  </p>
                  <div class="cl-step" aria-live="polite">
                    <Show
                      when={shown()}
                      fallback={
                        <p class="sub">
                          The sequent as typed: <span class="m">{formText(m().sequent)}</span>
                        </p>
                      }
                    >
                      {(s) => (
                        <>
                          <p class="cl-law">
                            <span class="m">{s().law}</span>
                          </p>
                          <p class="sub m cl-what">{s().what}</p>
                          <p class="sub">The sequent after this step:</p>
                          <p class="m cl-after">{s().sequent}</p>
                        </>
                      )}
                    </Show>
                  </div>
                </fieldset>
              </>
            );
          }}
        </Show>
      </section>
    </Sheet>
  );
}

/** How the resolution sheet refutes: a search, DPLL's trace, or by hand. */
type Way = "search" | "dpll" | "hand";

/** The ways, the worked example first, building by hand last. */
const WAYS: readonly { key: Way; name: string; does: string }[] = [
  {
    key: "search",
    name: "Search",
    does: "deduxit resolves the shortest clause not yet used with every clause used, until □ appears.",
  },
  {
    key: "dpll",
    name: "DPLL",
    does: "deduxit makes atoms true or false one at a time, goes back at a clause made false, and reads the refutation off its steps.",
  },
  {
    key: "hand",
    name: "By hand",
    does: "Choose two clauses, one with an atom and one with its negation, and resolve them until you reach □.",
  },
];

export function ResolveSheet(props: { prover: Prover; ui: Ui }) {
  const { setUi } = props.ui;
  const sequent = classicalSequent(props.prover);
  createEffect(() => {
    if (!sequent()) setUi("menu", null);
  });
  const [way, setWay] = createSignal<Way>("search");
  const words = () => WAYS.find((w) => w.key === way()) ?? WAYS[0];

  return (
    <Sheet
      ui={props.ui}
      title="Refute by resolution"
      intro="A sequent is valid exactly when the clauses of its negation cannot all be true. Resolution takes a clause with an atom p and one with ¬p, and derives the rest of both; deriving the empty clause □ refutes the clauses."
    >
      <fieldset class="seg tf-seg" aria-label="How to refute">
        <For each={WAYS}>
          {(w) => (
            <button
              type="button"
              class="seg-b"
              aria-pressed={way() === w.key}
              onClick={() => setWay(w.key)}
            >
              {w.name}
            </button>
          )}
        </For>
      </fieldset>
      <p class="sub">{words()?.does}</p>
      <Show when={sequent()}>
        {(s) => (
          <Show
            when={way() === "hand"}
            fallback={<Found text={s().text} way={way()} prover={props.prover} ui={props.ui} />}
          >
            <ByHand text={s().text} prover={props.prover} />
          </Show>
        )}
      </Show>
    </Sheet>
  );
}

/** A refutation found by saturation or traced by DPLL, with its clauses and graph. */
function Found(props: { text: string; way: Way; prover: Prover; ui: Ui }) {
  const [answer] = createResource(
    () => [props.text, props.way] as const,
    ([text, way]) =>
      answered(() =>
        props.prover.api.ordinary.resolve(
          text,
          JSON.stringify({ method: way === "dpll" ? "dpll" : "saturation" }),
          "{}",
        ),
      ),
  );
  const found = () => given<Resolution>(answer());
  return (
    <section class="tf-answer" aria-busy={answer.loading} aria-label="The refutation">
      <Show when={answer.loading}>
        <p class="sub">Turning the sequent's negation into clauses, and refuting them…</p>
      </Show>
      <Show when={failureIn(answer())}>{(f) => <Refused failure={f()} />}</Show>
      <Show when={!answer.loading && found()}>
        {(r) => {
          const said = () => resolutionWords(r());
          const refutation = () => ({
            atoms: r().atoms,
            clauses: r().clauses,
            resolvents: r().resolvents ?? [],
          });
          return (
            <>
              <Verdict keyword={said().keyword} tone={said().tone}>
                {said().sentence}
              </Verdict>
              <Show when={(r().trace ?? []).length > 0}>
                <h3 class="cl-h">DPLL's steps</h3>
                <ol class="cl-trace">
                  <For each={traceLines(r().atoms, r().trace ?? [])}>
                    {(line) => <li data-depth={Math.min(line.depth, 6)}>{line.text}</li>}
                  </For>
                </ol>
              </Show>
              <Clauses refutation={refutation()} />
            </>
          );
        }}
      </Show>
    </section>
  );
}

/** A refutation built by hand: two clauses chosen, an atom, the resolvent added, until □. */
function ByHand(props: { text: string; prover: Prover }) {
  const [start] = createResource(
    () => props.text,
    (text) => answered(() => props.prover.api.ordinary.clauses(text, "", "{}")),
  );
  /** The refutations so far, the last the current one: each step adds one, undo drops it. */
  const [made, setMade] = createSignal<readonly Refutation[]>([]);
  createEffect(
    on(start, (s) => {
      const first = given<Refutation>(s);
      setMade(first ? [first] : []);
    }),
  );
  const current = () => made()[made().length - 1];
  const [chosen, setChosen] = createSignal<readonly number[]>([]);
  const [said, setSaid] = createSignal<string>("");
  const [busy, setBusy] = createSignal(false);
  /** Whether deduxit said the last step derived □. */
  const [derived, setDerived] = createSignal(false);
  /** Whether a given clause is □ already, so no step is needed. */
  const startsEmpty = () => (current()?.clauses ?? []).some((c) => c.length === 0);
  const finished = () => derived() || startsEmpty();
  let section!: HTMLElement;
  /** Puts the focus on a control of the sheet once Solid has drawn the change. */
  const focusOn = (selector: string) =>
    queueMicrotask(() => section.querySelector<HTMLElement>(selector)?.focus());
  const choose = (k: number) => {
    setSaid("");
    const now = chosen();
    setChosen(now.includes(k) ? now.filter((j) => j !== k) : [...now, k].slice(-2));
  };
  const atoms = () => {
    const r = current();
    const [a, b] = chosen();
    if (!r || a === undefined || b === undefined) return [];
    const all = allClauses(r);
    return clashes(all[a] ?? [], all[b] ?? []);
  };
  const resolve = async (atom: number) => {
    const r = current();
    const [a, b] = chosen();
    if (!r || a === undefined || b === undefined) return;
    setBusy(true);
    try {
      const stepped = await props.prover.api.ordinary.resolveStep(r, a, b, atom, "{}");
      setMade([...made(), stepped.refutation]);
      setChosen([stepped.added]);
      setDerived(stepped.finished);
      // The button pressed goes with the choice: the focus moves to the new clause.
      focusOn('.cl-list button[aria-pressed="true"]');
      const clause = stepped.refutation.resolvents[stepped.refutation.resolvents.length - 1];
      setSaid(`Clause ${stepped.added + 1}, ${clauseText(r.atoms, clause?.clause ?? [])}, added.`);
    } catch (thrown) {
      setSaid(failureOf(thrown).message);
    } finally {
      setBusy(false);
    }
  };
  const undo = () => {
    setMade(made().slice(0, -1));
    setChosen([]);
    setDerived(false);
    setSaid("The last resolvent taken back.");
    focusOn(made().length > 1 ? ".cl-undo" : ".cl-list button");
  };
  return (
    <section class="tf-answer" aria-label="The refutation" ref={section}>
      <Show when={start.loading}>
        <p class="sub">Turning the sequent's negation into clauses…</p>
      </Show>
      <Show when={failureIn(start())}>{(f) => <Refused failure={f()} />}</Show>
      <Show when={current()}>
        {(r) => (
          <>
            <Show
              when={finished()}
              fallback={
                <p class="method-verdict" role="status">
                  {chosen().length < 2
                    ? "Choose two clauses, in the list or the graph."
                    : atoms().length === 0
                      ? "These two clauses share no atom that one holds and the other negates: choose another."
                      : "Resolve them on an atom."}
                </p>
              }
            >
              <Show
                when={derived()}
                fallback={
                  <Verdict keyword="Valid" tone="ok">
                    A clause of its negation is □ already: the clauses cannot all be true, so the
                    sequent is valid, and there is nothing to resolve.
                  </Verdict>
                }
              >
                <Verdict keyword="Valid" tone="ok">
                  You derived □: the clauses of its negation cannot all be true, so the sequent is
                  valid. deduxit checked every step.
                </Verdict>
              </Show>
            </Show>
            <p class="row">
              <For each={atoms()}>
                {(atom) => (
                  <button
                    type="button"
                    class="btn btn-primary btn-s"
                    disabled={busy() || finished()}
                    onClick={() => void resolve(atom)}
                  >
                    Resolve on {r().atoms[atom - 1]}
                  </button>
                )}
              </For>
              <button
                type="button"
                class="btn btn-s cl-undo"
                disabled={busy() || made().length <= 1}
                onClick={undo}
              >
                Undo
              </button>
            </p>
            <p class="sub" aria-live="polite">
              {said()}
            </p>
            <Clauses refutation={r()} chosen={chosen()} onChoose={choose} />
          </>
        )}
      </Show>
    </section>
  );
}

/** Where a resolvent comes from, in words: `from 3 and 1 on a`. */
const fromWords = (atoms: readonly string[], s: Resolvent) =>
  `from ${s.first + 1} and ${s.second + 1} on ${atoms[s.atom - 1] ?? "?"}`;

/**
 * A refutation's clauses, numbered from 1, as a list and as a graph: the given clauses on top,
 * each resolvent below its two clauses with an edge from each. A clause is chosen by its button in
 * either; the choice shows in both, and its edges and its row of the list are marked.
 */
function Clauses(props: {
  refutation: Pick<Refutation, "atoms" | "clauses" | "resolvents">;
  chosen?: readonly number[];
  onChoose?: (k: number) => void;
}) {
  const [own, setOwn] = createSignal<readonly number[]>([]);
  const chosen = () => props.chosen ?? own();
  const choose = (k: number) => {
    if (props.onChoose) props.onChoose(k);
    else setOwn(own().includes(k) ? [] : [k]);
  };
  const all = () => allClauses(props.refutation);
  const from = (k: number) => {
    const s = props.refutation.resolvents[k - props.refutation.clauses.length];
    return s ? fromWords(props.refutation.atoms, s) : "given";
  };
  return (
    <>
      <h3 class="cl-h">The clauses</h3>
      <ol class="cl-list">
        <Index each={all()}>
          {(clause, k) => (
            <li>
              <button
                type="button"
                class="cl-item"
                aria-pressed={chosen().includes(k)}
                onClick={() => choose(k)}
              >
                <span class="sr-only">Clause </span>
                <span class="cl-n">{k + 1}.</span>{" "}
                <span class="m">{clauseText(props.refutation.atoms, clause())}</span>{" "}
                <span class="sub">{from(k)}</span>
              </button>
            </li>
          )}
        </Index>
      </ol>
      <Show when={props.refutation.resolvents.length > 0}>
        <h3 class="cl-h">The graph</h3>
        <Graph refutation={props.refutation} chosen={chosen()} onChoose={choose} from={from} />
      </Show>
    </>
  );
}

/** A node's width and height and a row's height, in pixels: a node is a target of 44 pixels. */
const NODE_W = 120;
const NODE_H = 44;
const ROW_H = 76;

/** A refutation drawn as a graph: the lines in an SVG, the clauses buttons over it. */
function Graph(props: {
  refutation: Pick<Refutation, "atoms" | "clauses" | "resolvents">;
  chosen: readonly number[];
  onChoose: (k: number) => void;
  /** Where a clause comes from, in words. */
  from: (k: number) => string;
}) {
  const graph = createMemo(() => layout(props.refutation));
  const width = () => Math.max(1, ...graph().widths) * NODE_W;
  const height = () => graph().widths.length * ROW_H;
  const x = (n: GraphNode) => {
    const row = graph().widths[n.row] ?? 1;
    return (width() - row * NODE_W) / 2 + n.column * NODE_W + NODE_W / 2;
  };
  const y = (n: GraphNode) => n.row * ROW_H + ROW_H / 2;
  const node = (k: number) => graph().nodes[k];
  let box!: HTMLFieldSetElement;
  createEffect(() => {
    box.style.width = `${width()}px`;
    box.style.height = `${height()}px`;
  });
  return (
    <div class="cl-scroll">
      <fieldset class="cl-graph" ref={box} aria-label="The refutation as a graph">
        <svg
          aria-hidden="true"
          class="cl-edges"
          width={width()}
          height={height()}
          viewBox={`0 0 ${width()} ${height()}`}
        >
          <For each={graph().edges}>
            {([parent, child]) => {
              const p = () => node(parent);
              const c = () => node(child);
              return (
                <Show when={p() && c()}>
                  <line
                    x1={x(p() as GraphNode)}
                    y1={y(p() as GraphNode) + NODE_H / 2}
                    x2={x(c() as GraphNode)}
                    y2={y(c() as GraphNode) - NODE_H / 2}
                    data-on={props.chosen.includes(child) ? "" : undefined}
                  />
                </Show>
              );
            }}
          </For>
        </svg>
        <For each={graph().nodes}>
          {(n) => (
            <button
              type="button"
              class="cl-node m"
              aria-pressed={props.chosen.includes(n.k)}
              data-empty={(allClauses(props.refutation)[n.k] ?? []).length === 0 ? "" : undefined}
              ref={(el) =>
                createEffect(() => {
                  el.style.left = `${x(n) - NODE_W / 2 + 4}px`;
                  el.style.top = `${y(n) - NODE_H / 2}px`;
                  el.style.width = `${NODE_W - 8}px`;
                  el.style.height = `${NODE_H}px`;
                })
              }
              onClick={() => props.onChoose(n.k)}
            >
              <span class="sr-only">Clause </span>
              <span class="cl-n">{n.k + 1}</span>{" "}
              <span class="cl-text">
                {clauseText(props.refutation.atoms, allClauses(props.refutation)[n.k] ?? [])}
              </span>
              <span class="sr-only">, {props.from(n.k)}</span>
            </button>
          )}
        </For>
      </fieldset>
    </div>
  );
}
