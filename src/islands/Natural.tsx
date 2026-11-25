// deduxit © Fabian Lukas Grubmüller 2026
// Licensed under the EUPL

/**
 * Natural deduction, a view of an ordinary proof that the visitor picks, in the drawing's place:
 * the proof's sequent becomes a goal of NK, NJ or NM (the tab's logic), its formulas left of ⊢
 * the assumptions. The visitor works backwards, a rule applied to a goal (an introduction rule
 * opens a subproof where it discharges), or forwards, a rule applied to numbered lines, which
 * makes a new line; a goal equal to a line in force closes by it. deduxit checks every step
 * against the calculus before the session takes it, and draws the proof as Gentzen's tree or as
 * Fitch's numbered lines, the same session in both. The ordinary proof stays as it was, and the
 * natural deduction proof is kept for the visit while the tab's sequent stays the same.
 */

import { createEffect, createMemo, createResource, createSignal, For, on, Show } from "solid-js";
import { createStore } from "solid-js/store";
import {
  type CustomGoal,
  type CustomOffered,
  type CustomPlayed,
  type CustomSession,
  type DeriveStep,
  distinctSteps,
  membersOf,
  stepWords,
} from "../lib/custom";
import { type Failure, failure as failureOf } from "../lib/deduxit";
import {
  citedLines,
  linesOf,
  listedLines,
  type Problem,
  problemOf,
  shownMessage,
  shownNumbers,
} from "../lib/natural";
import { isOrdinary, type SequentForm } from "../lib/ordinary";
import { download } from "./Panels";
import type { Proof, Prover } from "./state";

/** The two drawings of one proof. */
type Layout = "tree" | "fitch";

/** A natural deduction proof under way, for one tab's sequent: the store's record, which it writes. */
interface Work {
  problem: Problem;
  /** The session and its view, or null until deduxit started it. */
  played: CustomPlayed | null;
  /** The goal worked on, by its id: the one a step opened or a press chose. */
  goal: number | null;
  /** What deduxit said of the last step it refused, in its words. */
  said: string | null;
  /** Whether the finished proof was checked whole. */
  checked: boolean;
}

/** Every tab's proof, by the tab and its sequent: kept while the visitor looks at other views. */
const [works, setWorks] = createStore<Record<string, Work>>({});
/** The drawing the visitor chose, the same for every proof. */
const [layout, setLayout] = createSignal<Layout>("tree");

/** Sets the drawing of every natural deduction proof: a lesson's, whose reasons cite its lines. */
export const setNaturalLayout = (chosen: Layout) => setLayout(chosen);

/** The natural deduction problem of a proof's ordinary sequent, in its logic. */
function problemOfProof(p: Proof | undefined): Problem | undefined {
  const session = p?.session;
  if (!p || !session || !isOrdinary(session) || p.calculus.suite !== "ordinary") return undefined;
  return problemOf(session.sequent as unknown as SequentForm, p.calculus.logic);
}

/** A proof's key in the store: the tab and its natural deduction problem. */
const keyOf = (p: Proof, q: Problem) => [p.id, q.calculus, q.goal, ...q.assumptions].join("\n");

/**
 * Puts a session on a proof's natural deduction view, its steps those a lesson's worked proof
 * has played: the view shows it as if the visitor had taken them.
 */
export function putNatural(p: Proof, played: CustomPlayed) {
  const q = problemOfProof(p);
  if (!q) return;
  setWorks(keyOf(p, q), { problem: q, played, goal: null, said: null, checked: false });
}

/** What a step leaves open, asked for by name, and the values typed so far. */
interface Giving {
  readonly names: readonly string[];
  readonly values: Readonly<Record<string, string>>;
}

export function NaturalView(props: { prover: Prover }) {
  const proof = () => props.prover.current();
  const problem = createMemo(() => problemOfProof(proof()));
  const key = () => {
    const p = proof();
    const q = problem();
    return p && q ? keyOf(p, q) : undefined;
  };
  const work = () => {
    const k = key();
    return k ? works[k] : undefined;
  };
  const view = () => work()?.played?.view ?? null;
  const goals = () => view()?.goals ?? [];
  const goal = (): CustomGoal | undefined =>
    goals().find((g) => g.goal === work()?.goal) ?? goals()[0];
  const name = () => problem()?.calculus ?? "";
  const settings = (more: Record<string, unknown> = {}) =>
    JSON.stringify({ limits: { work: props.prover.settings().budget }, ...more });
  const api = () => props.prover.api.custom;
  const [busy, setBusy] = createSignal(false);

  // A sequent shown for the first time starts its proof.
  createEffect(
    on(key, (k) => {
      const q = problem();
      if (!k || !q || works[k]) return;
      setWorks(k, { problem: q, played: null, goal: null, said: null, checked: false });
      api()
        .start(q.calculus, q.goal, JSON.stringify(q.assumptions), settings())
        // A lesson may have put its worked proof here meanwhile: that stays.
        .then((played) => {
          if (!works[k]?.played) setWorks(k, "played", played);
        })
        .catch((thrown) => setWorks(k, "said", failureOf(thrown).message));
    }),
  );

  /** Runs a call on the session and keeps what it answered; answers deduxit's refusal, if any. */
  async function run<T extends CustomPlayed>(
    call: (session: CustomSession) => Promise<T>,
    next: (answer: T) => number | null = () => null,
    words: (message: string) => string = (message) => message,
  ): Promise<Failure | null> {
    const k = key();
    const session = k ? works[k]?.played?.session : undefined;
    if (!k || !session || busy()) return null;
    setBusy(true);
    try {
      const answer = await call(session);
      setWorks(k, {
        played: { session: answer.session, view: answer.view },
        goal: next(answer) ?? works[k]?.goal ?? null,
        said: null,
        checked: false,
      });
      return null;
    } catch (thrown) {
      const failed = failureOf(thrown);
      if (failed.code !== "step_needs") setWorks(k, "said", words(failed.message));
      return failed;
    } finally {
      setBusy(false);
    }
  }

  const [drawing] = createResource(
    () => {
      const session = work()?.played?.session;
      return session
        ? ([session, layout(), props.prover.settings().stageFont] as const)
        : undefined;
    },
    ([session, chosen, font]) =>
      api()
        .draw(
          session,
          settings({ view: { layout: chosen }, styles: { svg: { font_size: 30, font } } }),
        )
        .then((svg) => ({ svg }))
        .catch((thrown) => ({ refused: failureOf(thrown).message })),
  );

  async function save(format: "latex" | "typst" | "svg") {
    const session = work()?.played?.session;
    if (!session) return;
    const kinds = {
      latex: ["tex", "application/x-tex"],
      typst: ["typ", "text/plain"],
      svg: ["svg", "image/svg+xml"],
    } as const;
    const [ext, type] = kinds[format];
    try {
      const text = await api().exportAs(session, format, settings({ view: { layout: layout() } }));
      download(`natural-deduction.${ext}`, text, type);
    } catch (thrown) {
      const k = key();
      if (k) setWorks(k, "said", failureOf(thrown).message);
    }
  }

  async function check() {
    const k = key();
    const session = k ? works[k]?.played?.session : undefined;
    if (!k || !session) return;
    try {
      await api().check(session, settings());
      setWorks(k, "checked", true);
    } catch (thrown) {
      setWorks(k, "said", failureOf(thrown).message);
    }
  }

  return (
    <section class="method custom natural" aria-label="Natural deduction" aria-busy={busy()}>
      <p class="method-verdict">
        Natural deduction derives a formula from assumptions one rule at a time: an introduction
        rule builds a connective, an elimination rule uses one.
      </p>
      <Show when={problem()?.made}>
        {(made) => (
          <p class="method-verdict">
            {made() === "falsity"
              ? "Nothing stands right of ⊢, so the goal is ⊥."
              : "A natural deduction proof derives one formula, so the goal is the disjunction of the formulas right of ⊢."}
          </p>
        )}
      </Show>
      <Show when={view()}>
        {(v) => (
          <p class="method-verdict" role="status">
            <Show
              when={v().finished}
              fallback={
                <>
                  <span class="kw acc">
                    Open goal {String(goals().findIndex((g) => g.goal === goal()?.goal) + 1)} of{" "}
                    {String(goals().length)}
                  </span>{" "}
                  in {name()}: work backwards from it, or forwards from its lines.
                </>
              }
            >
              <Show
                when={work()?.checked}
                fallback={<>Every goal is closed. Check the proof whole to get its verdict.</>}
              >
                <span class="kw ok">Valid</span> in {name()}: deduxit checked every step against its
                rules.
              </Show>
            </Show>
          </p>
        )}
      </Show>
      <Show when={work()?.said}>
        {(said) => (
          <p class="method-verdict said-why" role="alert">
            {said()}
          </p>
        )}
      </Show>
      <Show when={view()}>
        {(v) => (
          <>
            <div class="nd-bar">
              <fieldset class="seg" aria-label="Drawing">
                <button
                  type="button"
                  class="seg-b"
                  aria-pressed={layout() === "tree"}
                  data-tip="Gentzen's tree: the conclusion at the root, assumptions at the leaves"
                  onClick={() => setLayout("tree")}
                >
                  Tree
                </button>
                <button
                  type="button"
                  class="seg-b"
                  aria-pressed={layout() === "fitch"}
                  data-tip="Fitch's lines: numbered, a subproof indented under its assumption"
                  onClick={() => setLayout("fitch")}
                >
                  Fitch
                </button>
              </fieldset>
              <button
                type="button"
                class="btn"
                disabled={busy() || v().steps === 0}
                onClick={() =>
                  void run(
                    (s) => api().undo(s, settings()),
                    (a) => a.reopened,
                  )
                }
              >
                Undo
              </button>
              <Show when={v().finished && !work()?.checked}>
                <button type="button" class="btn btn-primary" onClick={() => void check()}>
                  Check the proof
                </button>
              </Show>
            </div>
            <Show when={drawing()}>
              {(d) => (
                <Show
                  when={"svg" in d() ? (d() as { svg: string }).svg : undefined}
                  fallback={
                    <p class="method-verdict said-why">{(d() as { refused?: string }).refused}</p>
                  }
                >
                  {(svg) => <div class="custom-drawing" innerHTML={svg()} />}
                </Show>
              )}
            </Show>
            <Show when={!v().finished}>
              <Show when={goals().length > 1}>
                <fieldset class="custom-goals" aria-label="Open goals">
                  <For each={goals()}>
                    {(g, at) => (
                      <button
                        type="button"
                        class="btn"
                        aria-pressed={g.goal === goal()?.goal}
                        onClick={() => {
                          const k = key();
                          if (k) setWorks(k, "goal", g.goal);
                        }}
                      >
                        Goal {String(at() + 1)}: {g.sequent}
                      </button>
                    )}
                  </For>
                </fieldset>
              </Show>
              <Show when={goal()}>
                {(g) => (
                  <GoalSteps
                    goal={g()}
                    rules={v().calculus.rules}
                    session={work()?.played?.session ?? null}
                    busy={busy()}
                    prover={props.prover}
                    settings={settings}
                    run={run}
                  />
                )}
              </Show>
            </Show>
            <p class="row nd-save">
              <span class="kw-label">Save as</span>
              <button type="button" class="btn" onClick={() => void save("latex")}>
                LaTeX
              </button>
              <button type="button" class="btn" onClick={() => void save("typst")}>
                Typst
              </button>
              <button type="button" class="btn" onClick={() => void save("svg")}>
                SVG
              </button>
            </p>
          </>
        )}
      </Show>
    </section>
  );
}

/** A goal's lines in force and its steps: backwards from the goal, or forwards from lines. */
function GoalSteps(props: {
  goal: CustomGoal;
  rules: readonly string[];
  session: CustomSession | null;
  busy: boolean;
  prover: Prover;
  settings: (more?: Record<string, unknown>) => string;
  run: <T extends CustomPlayed>(
    call: (session: CustomSession) => Promise<T>,
    next?: (answer: T) => number | null,
    words?: (message: string) => string,
  ) => Promise<Failure | null>;
}) {
  const api = () => props.prover.api.custom;
  const [way, setWay] = createSignal<"backwards" | "forwards">("backwards");
  const [giving, setGiving] = createSignal<(Giving & { step: CustomOffered }) | null>(null);
  const [rule, setRule] = createSignal("");
  const [cited, setCited] = createSignal("");
  const [forwardGiving, setForwardGiving] = createSignal<Giving | null>(null);
  const [typo, setTypo] = createSignal<string | null>(null);
  createEffect(
    on(
      () => [props.session, props.goal.goal] as const,
      () => {
        setGiving(null);
        setForwardGiving(null);
      },
    ),
  );
  const [steps] = createResource(
    () => (props.session ? ([props.session, props.goal.goal] as const) : undefined),
    ([session, at]) =>
      api()
        .rules(session, at, props.settings())
        .catch(() => [] as CustomOffered[]),
  );
  const members = () => membersOf(props.goal);
  const offered = () => distinctSteps(steps() ?? [], members());
  /** The number each line in force is shown by, the Fitch drawing's where it has them all. */
  const shown = () => shownNumbers(props.goal.lines);
  /** The first line equal to the goal, which closes it, with the number it is shown by. */
  const closing = () => {
    const at = props.goal.lines.findIndex((l) => l.sequent === props.goal.sequent);
    const line = props.goal.lines[at];
    return line ? { line: line.line, shown: shown()[at] ?? line.line } : undefined;
  };

  async function backwards(step: CustomOffered, given: Record<string, string>) {
    const failed = await props.run(
      (s) =>
        api().apply(s, props.goal.goal, { rule: step.rule, at: step.at, given }, props.settings()),
      (a) => a.opened[0] ?? null,
    );
    if (failed?.code === "step_needs") setGiving({ step, names: needsOf(failed), values: {} });
    else if (!failed) setGiving(null);
  }

  async function forwards(event: SubmitEvent) {
    event.preventDefault();
    const typed = linesOf(cited());
    if (!rule()) {
      setTypo("Choose the rule first.");
      return;
    }
    if (typed === null) {
      setTypo("Give the lines as numbers, such as 2, 3.");
      return;
    }
    const found = citedLines(props.goal.lines, typed);
    if ("unknown" in found) {
      setTypo(
        `Line ${found.unknown} is not in force here: cite the lines listed above, which a closed subproof's lines are not.`,
      );
      return;
    }
    const lines = found.lines;
    setTypo(null);
    const step: DeriveStep = { rule: rule(), lines, given: forwardGiving()?.values ?? {} };
    // deduxit names lines by the session's numbers; the visitor reads the page's.
    const inForce = props.goal.lines;
    const sent = cited();
    const failed = await props.run(
      (s) => api().derive(s, props.goal.goal, step, props.settings()),
      undefined,
      (message) => shownMessage(inForce, message),
    );
    if (failed?.code === "step_needs")
      setForwardGiving({ names: needsOf(failed), values: forwardGiving()?.values ?? {} });
    else if (!failed) {
      // Lines typed while the step ran are the next step's: they stay.
      if (cited() === sent) setCited("");
      setForwardGiving(null);
    }
  }

  return (
    <div class="custom-steps">
      <p class="method-verdict">
        Goal <span class="m">{props.goal.sequent}</span>
        <Show when={props.goal.lines.length} fallback={<>, no lines in force yet.</>}>
          , with these lines in force:
        </Show>
      </p>
      <Show when={props.goal.lines.length}>
        <ol class="nd-lines" aria-label="Lines in force">
          <For each={listedLines(props.goal.lines)}>
            {(listed) => (
              <li>
                <span class="tb-n">{listed.shown}</span>
                <span class="m">{listed.line.sequent}</span>
              </li>
            )}
          </For>
        </ol>
      </Show>
      <Show when={closing()}>
        {(line) => (
          <button
            type="button"
            class="btn btn-primary"
            disabled={props.busy}
            onClick={() =>
              void props.run((s) => api().cite(s, props.goal.goal, line().line, props.settings()))
            }
          >
            Close the goal by line {line().shown}
          </button>
        )}
      </Show>
      <fieldset class="seg" aria-label="Direction">
        <button
          type="button"
          class="seg-b"
          aria-pressed={way() === "backwards"}
          data-tip="Apply a rule to the goal: its premises become goals"
          onClick={() => setWay("backwards")}
        >
          From the goal
        </button>
        <button
          type="button"
          class="seg-b"
          aria-pressed={way() === "forwards"}
          data-tip="Apply a rule to lines in force: its conclusion becomes a new line"
          onClick={() => setWay("forwards")}
        >
          From lines
        </button>
      </fieldset>
      <Show
        when={way() === "forwards"}
        fallback={
          <Show
            when={giving()}
            fallback={
              <ul class="custom-list" aria-label="Steps that apply">
                <For each={offered()}>
                  {(step) => (
                    <li>
                      <button
                        type="button"
                        class="btn outline"
                        disabled={props.busy}
                        onClick={() =>
                          step.needs.length
                            ? setGiving({ step, names: step.needs, values: {} })
                            : void backwards(step, {})
                        }
                      >
                        {stepWords(step, members())}
                        <Show when={step.needs.length}> (give {step.needs.join(", ")})</Show>
                      </button>
                    </li>
                  )}
                </For>
              </ul>
            }
          >
            {(asked) => (
              <Give
                label={`Give what ${asked().step.rule} needs`}
                words={`${asked().step.rule} leaves these open: give each as a formula.`}
                giving={asked()}
                set={(values) => setGiving({ ...asked(), values })}
                submit={`Apply ${asked().step.rule}`}
                onSubmit={() => void backwards(asked().step, { ...asked().values })}
                onCancel={() => setGiving(null)}
              />
            )}
          </Show>
        }
      >
        <form class="custom-give" aria-label="A step from lines" onSubmit={(e) => void forwards(e)}>
          <label class="custom-field">
            <span>Rule</span>
            <select
              class="field"
              value={rule()}
              onChange={(event) => {
                setRule(event.currentTarget.value);
                setForwardGiving(null);
              }}
            >
              <option value="">Choose…</option>
              <For each={props.rules}>{(r) => <option value={r}>{r}</option>}</For>
            </select>
          </label>
          <label class="custom-field">
            <span>From lines</span>
            <input
              class="field"
              inputmode="numeric"
              autocomplete="off"
              spellcheck={false}
              placeholder="2, 3"
              value={cited()}
              onInput={(event) => setCited(event.currentTarget.value)}
            />
          </label>
          <Show when={forwardGiving()}>
            {(asked) => (
              <>
                <p class="method-verdict">{rule()} leaves these open: give each as a formula.</p>
                <For each={asked().names}>
                  {(needed) => (
                    <label class="custom-field">
                      <span class="m">{needed}</span>
                      <input
                        class="field"
                        spellcheck={false}
                        autocomplete="off"
                        onInput={(event) => {
                          const value = event.currentTarget.value;
                          setForwardGiving((now) =>
                            now ? { ...now, values: { ...now.values, [needed]: value } } : now,
                          );
                        }}
                      />
                    </label>
                  )}
                </For>
              </>
            )}
          </Show>
          <Show when={typo()}>
            {(t) => (
              <p class="method-verdict said-why" role="alert">
                {t()}
              </p>
            )}
          </Show>
          <p class="row">
            <button type="submit" class="btn btn-primary" disabled={props.busy}>
              Derive a line
            </button>
          </p>
        </form>
      </Show>
    </div>
  );
}

/** The names a refused step needs given, from deduxit's `step_needs`. */
function needsOf(failed: Failure): string[] {
  const named = failed.details?.["needs"];
  return Array.isArray(named) ? named.map(String) : [];
}

/** The fields of what a backward step leaves open, one per name. */
function Give(props: {
  label: string;
  words: string;
  giving: Giving;
  set: (values: Record<string, string>) => void;
  submit: string;
  onSubmit: () => void;
  onCancel: () => void;
}) {
  return (
    <form
      class="custom-give"
      aria-label={props.label}
      onSubmit={(event) => {
        event.preventDefault();
        props.onSubmit();
      }}
    >
      <p class="method-verdict">{props.words}</p>
      <For each={props.giving.names}>
        {(needed) => (
          <label class="custom-field">
            <span class="m">{needed}</span>
            <input
              class="field"
              spellcheck={false}
              autocomplete="off"
              onInput={(event) =>
                props.set({ ...props.giving.values, [needed]: event.currentTarget.value })
              }
            />
          </label>
        )}
      </For>
      <p class="row">
        <button type="submit" class="btn btn-primary">
          {props.submit}
        </button>
        <button type="button" class="btn" onClick={() => props.onCancel()}>
          Other steps
        </button>
      </p>
    </form>
  );
}
