// deduxit © Fabian Lukas Grubmüller 2026
// Licensed under the EUPL

/**
 * Natural deduction, a view of an ordinary proof that the visitor picks, in the drawing's place:
 * the proof's sequent becomes a goal of NK, NJ or NM (the tab's logic), its formulas left of ⊢
 * the assumptions. The visitor works backwards, a rule applied to a goal (an introduction rule
 * opens a subproof where it discharges), or forwards, a rule applied to numbered lines, which
 * makes a new line; a goal equal to a line in force closes by it. The goal's `?` lets deduxit's
 * search close the goal or give a hint, and goes back to a goal that still has a proof; goals
 * with no proof are marked as the other calculi's are. deduxit checks every step
 * against the calculus before the session takes it, and draws the proof as Gentzen's tree or as
 * Fitch's numbered lines, the same session in both. The ordinary proof stays as it was, and the
 * natural deduction proof is kept for the visit while the tab's sequent stays the same.
 */

import { createEffect, createMemo, createResource, createSignal, For, on, Show } from "solid-js";
import { createStore } from "solid-js/store";
import {
  type CustomGoal,
  type CustomHinted,
  type CustomJudged,
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
import { isOrdinary, ordinaryVerdict, type SequentForm } from "../lib/ordinary";
import type { Tone } from "../lib/words";
import { Sign } from "./Signs";
import { MARK_BUDGET, type Proof, type Prover } from "./state";

/** The two drawings of one proof. */
export type Layout = "tree" | "fitch";

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
  /** What the search last said of a goal, by its id. */
  note?: { goal: number; keyword: string; sentence: string; tone: Tone } | null;
  /** The search's hint on a goal, in words, with the step it names. */
  hint?: { goal: number; words: string; step: CustomHinted | null } | null;
  /** The steps each close by the search took, as the step counts before and after it. */
  closes?: { from: number; to: number }[];
}

/** What the marking's search said of each goal, by its calculus, lines and formula. */
const [marks, setMarks] = createStore<Record<string, "proof" | "none" | "unknown">>({});

/** A goal's key for the marking: its calculus, its lines in force and its formula. */
const markKey = (calculus: string, g: CustomGoal) =>
  [calculus, g.sequent, ...g.lines.map((l) => l.sequent)].join("\n");

/** A hint's step in words. */
function hintWords(step: CustomHinted | undefined): string {
  if (!step) return "The search found no proof of this goal, so there is no hint.";
  if (step.rule === null) return "Close the goal by the line in force equal to it.";
  const given = Object.entries(step.given).map(([name, text]) => `${name} = ${text}`);
  return `Apply ${step.rule}${given.length ? ` with ${given.join(" and ")}` : ""}.`;
}

/** Every tab's proof, by the tab and its sequent: kept while the visitor looks at other views. */
const [works, setWorks] = createStore<Record<string, Work>>({});
/** The drawing the visitor chose, the same for every proof: the toggles' "Natural" or "Fitch". */
export const [layout, setLayout] = createSignal<Layout>("tree");

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

/** How many steps a proof's natural deduction view holds in its calculus now: 0 for none. */
export function naturalSteps(p: Proof): number {
  const q = problemOfProof(p);
  return q ? (works[keyOf(p, q)]?.played?.view.steps ?? 0) : 0;
}

/**
 * Puts a session on a proof's natural deduction view, its steps those a lesson's worked proof
 * has played: the view shows it as if the visitor had taken them.
 */
export function putNatural(p: Proof, played: CustomPlayed) {
  const q = problemOfProof(p);
  if (!q) return;
  setWorks(keyOf(p, q), {
    problem: q,
    played,
    goal: null,
    said: null,
    checked: false,
    note: null,
    hint: null,
    closes: [],
  });
}

/** A proof's natural deduction session as it stands, for Export; undefined before deduxit started it. */
export function naturalSession(p: Proof): CustomSession | undefined {
  const q = problemOfProof(p);
  return q ? works[keyOf(p, q)]?.played?.session : undefined;
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

  /** Undoes the last step, or a close by the search whole, which took several. */
  async function undo() {
    const k = key();
    const w = k ? works[k] : undefined;
    if (!k || !w?.played) return;
    const last = w.closes?.at(-1);
    const steps = w.played.view.steps;
    const target = last && last.to === steps ? last.from : steps - 1;
    let reopened: number | null = null;
    while ((works[k]?.played?.view.steps ?? 0) > target) {
      const failed = await run(
        (s) => api().undo(s, settings()),
        (a) => {
          reopened = a.reopened ?? reopened;
          return a.reopened;
        },
      );
      if (failed) return;
    }
    setWorks(k, "closes", (c) => (c ?? []).filter((x) => x.to <= target));
    setWorks(k, { goal: reopened ?? works[k]?.goal ?? null, note: null, hint: null });
  }

  /** Lets the search close a goal; what it found, when it did not, stays said at the goal. */
  async function searchClose(at: number) {
    const k = key();
    const w = k ? works[k] : undefined;
    const session = w?.played?.session;
    if (!k || !session || busy()) return;
    const before = w.played?.view.steps ?? 0;
    setBusy(true);
    try {
      const answer = await api().close(session, at, settings());
      if (!answer.view.goals.some((g) => g.goal === at)) {
        setWorks(k, {
          played: { session: answer.session, view: answer.view },
          goal: answer.view.goals[0]?.goal ?? null,
          said: null,
          checked: false,
          hint: null,
          note: {
            goal: at,
            keyword: "Closed by the search",
            sentence: `deduxit found a proof and took it in ${String(answer.view.steps - before)} steps, each checked against ${name()}. Undo takes them back together.`,
            tone: "ok",
          },
          closes: [...(w.closes ?? []), { from: before, to: answer.view.steps }],
        });
      } else {
        const said = answer.refused
          ? {
              keyword: "Proved, but not added to the derivation",
              sentence: answer.refused.message,
              tone: "warn" as Tone,
            }
          : ordinaryVerdict(answer.outcome);
        setWorks(k, { note: { goal: at, ...said }, hint: null });
      }
    } catch (thrown) {
      setWorks(k, "said", failureOf(thrown).message);
    } finally {
      setBusy(false);
    }
  }

  /** Asks the search for a hint on a goal: the first step of the proof it finds. */
  async function hint(at: number) {
    const k = key();
    const session = k ? works[k]?.played?.session : undefined;
    if (!k || !session || busy()) return;
    setBusy(true);
    try {
      const answer = await api().hint(session, at, settings());
      const step = answer.steps[0];
      setWorks(k, {
        hint: {
          goal: at,
          words: step ? hintWords(step) : ordinaryVerdict(answer.outcome).sentence,
          step: step ?? null,
        },
      });
    } catch (thrown) {
      setWorks(k, "said", failureOf(thrown).message);
    } finally {
      setBusy(false);
    }
  }

  /** Takes the hinted step. */
  async function takeHint(at: number, step: CustomHinted) {
    const rule = step.rule;
    const failed = await run(
      (s) =>
        rule === null
          ? api().assume(s, at, settings())
          : api().apply(s, at, { rule, at: [], given: step.given }, settings()),
      (a) => ("opened" in a ? ((a.opened as number[])[0] ?? null) : null),
    );
    const k = key();
    if (!failed && k) setWorks(k, { hint: null, note: null });
  }

  /**
   * Goes back from a goal with no proof: undoes steps, nearest first (a close by the search
   * whole, as Undo does), until the goal they reopen has a proof by the search within the budget,
   * or no step is left. The view is busy throughout, so no step of the visitor's comes between.
   */
  async function goBack() {
    const k = key();
    if (!k || busy()) return;
    setBusy(true);
    let found: number | null = null;
    let taken = 0;
    try {
      while ((works[k]?.played?.view.steps ?? 0) > 0) {
        const w = works[k];
        const session = w?.played?.session;
        if (!w?.played || !session) break;
        const steps = w.played.view.steps;
        const last = w.closes?.at(-1);
        const target = last && last.to === steps ? last.from : steps - 1;
        let now = session;
        let reopened: number | null = null;
        let answer: Awaited<ReturnType<ReturnType<typeof api>["undo"]>> | null = null;
        for (let at = steps; at > target; at -= 1) {
          answer = await api().undo(now, settings());
          now = answer.session;
          reopened = answer.reopened ?? reopened;
        }
        if (!answer) break;
        taken += steps - target;
        setWorks(k, {
          played: { session: answer.session, view: answer.view },
          closes: (w.closes ?? []).filter((x) => x.to <= target),
        });
        if (reopened === null) continue;
        const asked = await api()
          .hint(answer.session, reopened, settings())
          .catch(() => null);
        if (asked?.outcome.verdict === "valid") {
          found = reopened;
          break;
        }
      }
    } catch (thrown) {
      setWorks(k, "said", failureOf(thrown).message);
    } finally {
      setBusy(false);
    }
    setWorks(k, {
      goal: found ?? works[k]?.goal ?? null,
      hint: null,
      checked: false,
      note:
        found === null
          ? {
              goal: works[k]?.goal ?? 0,
              keyword: "No goal with a proof",
              sentence: `Every step is undone, and the search found no proof of the sequent itself in ${name()}.`,
              tone: "bad",
            }
          : {
              goal: found,
              keyword: "Went back",
              sentence: `${String(taken)} ${taken === 1 ? "step" : "steps"} undone: this goal still has a proof.`,
              tone: "ok",
            },
    });
  }

  // The marking: each open goal asked of the search within a small budget, once per its lines
  // and formula; a goal with no proof is marked.
  createEffect(
    on(
      () => [work()?.played?.session, props.prover.settings().marking] as const,
      async ([session, marking]) => {
        if (!session || !marking) return;
        for (const g of goals()) {
          const at = markKey(name(), g);
          if (marks[at] !== undefined) continue;
          setMarks(at, "unknown");
          const asked = await api()
            .hint(session, g.goal, JSON.stringify({ limits: { work: MARK_BUDGET } }))
            .catch(() => null);
          const verdict = asked?.outcome.verdict;
          setMarks(
            at,
            verdict === "valid" ? "proof" : verdict === "not_valid" ? "none" : "unknown",
          );
        }
      },
    ),
  );
  /** Whether the marking found that a goal has no proof. */
  const unprovable = (g: CustomGoal) => marks[markKey(name(), g)] === "none";

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
              <button
                type="button"
                class="btn"
                disabled={busy() || v().steps === 0}
                onClick={() => void undo()}
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
                        <Show when={unprovable(g)}>
                          {" "}
                          <span class="kw bad">no proof</span>
                        </Show>
                      </button>
                    )}
                  </For>
                </fieldset>
              </Show>
              <Show when={goal()}>
                {(g) => (
                  <>
                    <GoalSteps
                      goal={g()}
                      rules={v().calculus.rules}
                      session={work()?.played?.session ?? null}
                      busy={busy()}
                      prover={props.prover}
                      settings={settings}
                      run={run}
                      unprovable={unprovable(g())}
                      onClose={() => void searchClose(g().goal)}
                      onHint={() => void hint(g().goal)}
                      onBack={() => void goBack()}
                    />
                    <Show when={work()?.note?.goal === g().goal ? work()?.note : undefined}>
                      {(n) => (
                        <p class="method-verdict goal-note" role="status">
                          <span class={`kw ${n().tone}`}>{n().keyword}.</span> {n().sentence}
                          <Show when={n().tone === "bad" && n().keyword !== "No goal with a proof"}>
                            {" "}
                            <button type="button" class="btn" onClick={() => void goBack()}>
                              Go back
                            </button>
                          </Show>
                        </p>
                      )}
                    </Show>
                    <Show when={work()?.hint?.goal === g().goal ? work()?.hint : undefined}>
                      {(h) => (
                        <p class="method-verdict hint-line" role="status">
                          <span class="kw acc">Hint.</span> {h().words}
                          <Show when={h().step}>
                            {(step) => (
                              <>
                                {" "}
                                <button
                                  type="button"
                                  class="btn"
                                  disabled={busy()}
                                  onClick={() => void takeHint(g().goal, step())}
                                >
                                  Take it
                                </button>
                              </>
                            )}
                          </Show>
                        </p>
                      )}
                    </Show>
                  </>
                )}
              </Show>
            </Show>
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
  /** Whether the marking found that the goal has no proof. */
  unprovable: boolean;
  onClose: () => void;
  onHint: () => void;
  onBack: () => void;
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
  const [judged] = createResource(
    () => (props.session ? ([props.session, props.goal.goal] as const) : undefined),
    ([session, at]) =>
      api()
        .candidates(session, at, props.settings())
        .catch(() => [] as CustomJudged[]),
  );
  const members = () => membersOf(props.goal);
  const offered = () =>
    distinctSteps(
      (judged() ?? [])
        .filter((j) => j.status !== "refused")
        .map((j): CustomOffered => ({ rule: j.rule, at: j.at, needs: j.needs ?? [] })),
      members(),
    );
  /** The rules that do not apply, each once with deduxit's reason. */
  const refused = () => (judged() ?? []).filter((j) => j.status === "refused");
  /** The greyed rule pressed, whose reason is shown. */
  const [why, setWhy] = createSignal<CustomJudged | null>(null);
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

  const [menu, setMenu] = createSignal(false);
  /** The goal as a sequent of its own: the lines in force left of ⊢, the goal right of it. */
  const apart = () =>
    `${props.goal.lines.map((l) => l.sequent).join(", ")} ⊢ ${props.goal.sequent}`.trim();
  return (
    <div class="custom-steps">
      <div class="method-verdict nd-goal">
        <button
          type="button"
          class="goal-act nd-q"
          aria-label="?, this goal: its actions"
          aria-expanded={menu()}
          onClick={() => setMenu(!menu())}
        >
          ?
        </button>
        <Show when={menu()}>
          <fieldset class="nd-menu" aria-label="This goal">
            <button
              type="button"
              class="goal-act"
              aria-label="Close goal"
              data-tip="Let the search close this goal"
              disabled={props.busy}
              onClick={() => {
                setMenu(false);
                props.onClose();
              }}
            >
              <Sign name="close" />
              <span class="tool-name" aria-hidden="true">
                Close goal
              </span>
            </button>
            <button
              type="button"
              class="goal-act"
              aria-label="Hint"
              data-tip="The search's first step on this goal"
              disabled={props.busy}
              onClick={() => {
                setMenu(false);
                props.onHint();
              }}
            >
              <Sign name="help" />
              <span class="tool-name" aria-hidden="true">
                Hint
              </span>
            </button>
            <Show when={props.unprovable}>
              <button
                type="button"
                class="goal-act"
                aria-label="Go back"
                data-tip="Undo steps until a goal has a proof again"
                disabled={props.busy}
                onClick={() => {
                  setMenu(false);
                  props.onBack();
                }}
              >
                <Sign name="back" />
                <span class="tool-name" aria-hidden="true">
                  Go back
                </span>
              </button>
            </Show>
            <button
              type="button"
              class="goal-act"
              aria-label="Prove apart"
              data-tip="Prove this goal apart, as a sequent of its own at the top"
              onClick={() => {
                setMenu(false);
                const c = props.prover.current()?.calculus;
                if (c) void props.prover.open(apart(), c);
              }}
            >
              <Sign name="apart" />
              <span class="tool-name" aria-hidden="true">
                Prove apart
              </span>
            </button>
          </fieldset>
        </Show>{" "}
        Goal <span class="m">{props.goal.sequent}</span>
        <Show when={props.unprovable}>
          {" "}
          (<span class="kw bad">no proof</span>)
        </Show>
        <Show when={props.goal.lines.length} fallback={<>, no lines in force yet.</>}>
          , with these lines in force:
        </Show>
      </div>
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
                <For each={refused()}>
                  {(step) => (
                    <li>
                      <button
                        type="button"
                        class="btn outline off"
                        aria-disabled="true"
                        onClick={() => setWhy(step)}
                      >
                        {step.rule}
                      </button>
                    </li>
                  )}
                </For>
                <Show when={why()}>
                  {(w) => (
                    <li class="said-why" role="note">
                      <span class="kw">{w().rule} does not apply.</span>{" "}
                      {w().refusal?.message ?? ""}
                    </li>
                  )}
                </Show>
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
