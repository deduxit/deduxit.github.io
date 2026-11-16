// deduxit © Fabian Lukas Grubmüller 2026
// Licensed under the EUPL

/**
 * The ordinary suite's course in Learn's tutorial, shown when the current tab is ordinary: its
 * lessons in their order, a lesson not written yet marked so, and a lesson's view in the form
 * the linear lessons have (a worked proof played on the stage with a rule to predict and a reason per step, a
 * self-explanation prompt, the same proof faded for the visitor to finish, practice from the
 * store, a hinge question). The worked proof is played from its finished session alone: the
 * session is taken back step by step to its sequent (`ordinary_undo`), and step `k` shows the
 * state with `k` steps on the lesson's tab, so the lesson needs no step format of its own.
 */

import { ArrowLeft } from "lucide-solid";
import { createResource, createSignal, For, Show } from "solid-js";
import {
  ORDINARY_LESSONS,
  type OrdinaryCourse,
  type OrdinaryExample,
  type OrdinaryLesson,
} from "../lib/content";
import type { CustomPlayed, CustomSession } from "../lib/custom";
import type { OrdinarySession } from "../lib/ordinary";
import { prettyOrdinary } from "../lib/ordinary";
import { problemOf } from "../lib/natural";
import type { SequentForm } from "../lib/ordinary";
import { rowWords, type TableForm, tableModel, tableOf } from "../lib/methods";
import { custom, type Logic, ordinary } from "../lib/suites";
import { putNatural, setNaturalLayout } from "./Natural";
import { Explain, Written } from "./Learn";
import type { Prover } from "./state";
import { type Ui, Words } from "./ui";

/** What a written lesson holds, under its name. */
const PARTS = "A worked proof, your turn, practice and a check";

/**
 * The ordinary lesson open, by its number, or null for the list: kept while the visitor works on
 * another tab, which a tableau's worked proof opens in a calculus of its own.
 */
const [open, setOpen] = createSignal<number | null>(null);

/**
 * Whether the ordinary course stays in Learn's tutorial whatever the current tab: from a lesson's
 * opening until the visitor goes to a linear tab. A tableau's worked proof and practice open in a
 * calculus of one's own, where the tutorial would otherwise leave the course.
 */
const [kept, setKept] = createSignal(false);

/** Whether the ordinary course is kept in Learn's tutorial. */
export const ordinaryCourseKept = kept;

/** Lets the tutorial follow the current tab's suite again. */
export const leaveOrdinaryCourse = () => {
  setKept(false);
  setOpen(null);
};

export function OrdinaryCourseView(props: { course: OrdinaryCourse; prover: Prover; ui: Ui }) {
  const lesson = () => props.course.lessons.find((l) => l.lesson === open());
  return (
    <Show
      when={lesson()}
      keyed
      fallback={
        <>
          <p>
            The course on ordinary logic: what makes a sequent valid, and how the truth table,
            tableaux, the sequent calculus and natural deduction show it.
          </p>
          <ol class="lessons">
            <For each={ORDINARY_LESSONS.map((name, i) => [name, i + 1] as const)}>
              {([name, n]) => (
                <li>
                  <Show
                    when={props.course.lessons.some((l) => l.lesson === n)}
                    fallback={
                      <>
                        <span>{name}</span>
                        <span class="sub">to come</span>
                      </>
                    }
                  >
                    <button
                      type="button"
                      class="lesson-open"
                      aria-label={`Lesson ${n}: ${name}. ${PARTS}`}
                      onClick={() => {
                        setKept(true);
                        setOpen(n);
                      }}
                    >
                      <span class="lesson-n" aria-hidden="true">
                        {n}
                      </span>{" "}
                      <span class="lesson-name">{name}</span> <span class="sub">{PARTS}</span>
                    </button>
                  </Show>
                </li>
              )}
            </For>
          </ol>
        </>
      }
    >
      {(l) => (
        <OrdinaryLessonView
          lesson={l}
          course={props.course}
          prover={props.prover}
          ui={props.ui}
          back={() => setOpen(null)}
        />
      )}
    </Show>
  );
}

/** A state of a worked proof: an ordinary session, a session with its view, or a table's row. */
type State = OrdinarySession | CustomPlayed | number;

/** The tab of a truth table's lesson, whose rows play in the lesson itself. */
const TABLE = "table";

/** How a step's rule reads where it is no rule's name: a goal closed by a line in force. */
const RULE_WORDS: Readonly<Record<string, string>> = {
  line: "a line in force",
  holds: "holds",
  falsifies: "falsifies",
};
const ruleLabel = (rule: string) => RULE_WORDS[rule] ?? rule;

/** What a reveal said: the visitor's guess (null for "Show the step") and the rule it was. */
interface Said {
  readonly guess: string | null;
  readonly rule: string;
  readonly reason: string;
}

function OrdinaryLessonView(props: {
  lesson: OrdinaryLesson;
  course: OrdinaryCourse;
  prover: Prover;
  ui: Ui;
  back: () => void;
}) {
  const settings = () => JSON.stringify({ limits: { work: props.prover.settings().budget } });
  const method = props.lesson.method;
  /**
   * The worked proof's states, from its sequent (0) to the finished proof: ordinary sessions
   * for the sequent calculus, sessions with their views for natural deduction and tableaux,
   * and for a truth table its rows' places alone.
   */
  const [states] = createResource(
    () => props.lesson,
    async (l): Promise<readonly State[]> => {
      if (method === "table") return Array.from({ length: l.steps.length + 1 }, (_, k) => k);
      if (method === "sequent") {
        let session = JSON.parse(l.session) as OrdinarySession;
        const out: State[] = [session];
        for (let i = 0; i < l.steps.length; i++) {
          session = (await props.prover.api.ordinary.undo(session, settings())).session;
          out.unshift(session);
        }
        return out;
      }
      const custom = props.prover.api.custom;
      const session = JSON.parse(l.session) as CustomSession;
      let played: CustomPlayed = { session, view: await custom.view(session, settings()) };
      const out: State[] = [played];
      for (let i = 0; i < l.steps.length; i++) {
        const back = await custom.undo(played.session, settings());
        played = { session: back.session, view: back.view };
        out.unshift(played);
      }
      return out;
    },
  );
  /** A truth table's rows in words, `a true, b false`, as deduxit's table lists them. */
  const [rows] = createResource(
    () => (method === "table" ? props.lesson.sequent : undefined),
    async (sequent) => {
      const model = tableModel(
        tableOf(await props.prover.api.ordinary.table(sequent, settings())) as TableForm,
      );
      return model.rows.map((_, k) => rowWords(model, k));
    },
  );
  const [tab, setTab] = createSignal<string | null>(null);
  const [played, setPlayed] = createSignal(0);
  const [said, setSaid] = createSignal<Said | null>(null);
  const [compared, setCompared] = createSignal(false);
  const [chosen, setChosen] = createSignal<number | null>(null);
  /** Whether the visitor predicts the table's last rows alone: right or wrong, no reason. */
  const [fading, setFading] = createSignal(false);
  const steps = props.lesson.steps;

  /** Opens the worked proof's state with `n` steps on a new tab; returns the tab. */
  async function openAt(n: number): Promise<string | null> {
    const state = states()?.[n];
    if (state === undefined) return null;
    if (method === "table") return TABLE;
    if (method === "sequent")
      await props.prover.open(JSON.stringify(state), ordinary(props.lesson.logic));
    else if (method === "tableau")
      await props.prover.open(JSON.stringify((state as CustomPlayed).session));
    else {
      await props.prover.openProblem(props.lesson.sequent, ordinary(props.lesson.logic, "natural"));
      const p = props.prover.current();
      if (p) putNatural(p, state as CustomPlayed);
      if (props.lesson.layout) setNaturalLayout(props.lesson.layout);
    }
    return props.prover.current()?.id ?? null;
  }

  /** Shows the worked proof's state with `n` steps on its tab. */
  async function showAt(id: string, n: number) {
    const state = states()?.[n];
    if (state === undefined || method === "table") return;
    if (method === "sequent") await props.prover.showOrdinarySession(id, state as OrdinarySession);
    else if (method === "tableau") props.prover.showCustomSession(id, state as CustomPlayed);
    else {
      const p = props.prover.store.proofs.find((q) => q.id === id);
      if (p) putNatural(p, state as CustomPlayed);
    }
  }

  async function begin() {
    setSaid(null);
    setPlayed(0);
    setCompared(false);
    setFading(false);
    setTab(await openAt(0));
  }

  /** The table's last rows, from the faded place on, predicted by the visitor alone. */
  function fadeRows() {
    setSaid(null);
    setPlayed(props.lesson.faded);
    setFading(true);
    setTab(TABLE);
  }

  async function reveal(guess: string | null) {
    const n = played();
    // The worked proof's tab may have been closed: the next step opens it again.
    let id = tab();
    if (id && id !== TABLE && !props.prover.store.proofs.some((p) => p.id === id)) {
      id = await openAt(n);
      setTab(id);
    }
    const step = steps[n];
    if (!id || !step) return;
    await showAt(id, n + 1);
    setPlayed(n + 1);
    setSaid({ guess, rule: step.rule, reason: fading() ? "" : step.reason });
  }

  /** Opens a practice problem on a new tab in the lesson's method. */
  async function openPractice(p: OrdinaryExample) {
    if (method === "table") await props.prover.openProblem(p.sequent, ordinary("classical"));
    else if (method === "tableau") {
      // The tableau to build: each formula left of ⊢ true, the one right of it false.
      const started = await props.prover.api.ordinary.start(p.sequent, "classical", "{}");
      const q = problemOf(started.session.sequent as unknown as SequentForm, "classical");
      const signed = [...q.assumptions.map((a) => `T (${a})`), `F (${q.goal})`].join(", ");
      await props.prover.open(signed, custom("tableau"));
    } else
      await props.prover.openProblem(
        p.sequent,
        ordinary(p.logic, method === "natural" ? "natural" : "sequent"),
      );
  }

  /** Opens the worked sequent's whole truth table on a new tab. */
  async function wholeTable() {
    await props.prover.openProblem(props.lesson.sequent, ordinary("classical"));
    props.ui.setUi("tab", "table");
  }

  /** Opens the sequent the lesson's countermodel refutes, and lets deduxit decide it. */
  async function countermodel(model: { sequent: string; logic: Logic }) {
    await props.prover.openProblem(model.sequent, ordinary(model.logic));
    await props.prover.close(0);
  }

  const option = () => {
    const i = chosen();
    return i === null ? undefined : props.lesson.hinge.options[i];
  };
  const practice = () => props.course.problems.filter((p) => p.lesson === props.lesson.lesson);

  return (
    <article class="lesson-view" aria-labelledby="lesson-title">
      <button type="button" class="btn btn-s" onClick={() => props.back()}>
        <ArrowLeft aria-hidden="true" />
        All lessons
      </button>
      <h2 id="lesson-title" class="lesson-title">
        <span class="lesson-n" aria-hidden="true">
          {props.lesson.lesson}
        </span>
        {props.lesson.title}
      </h2>
      <Written name={`ordinaryLessons/${props.lesson.id}`} part="before" />

      <section class="part" aria-labelledby="part-worked">
        <h3 id="part-worked">{method === "table" ? "The table, row by row" : "A worked proof"}</h3>
        <p class="m ex-seq">{prettyOrdinary(props.lesson.sequent)}</p>
        <Show
          when={tab()}
          fallback={
            <button
              type="button"
              class="btn btn-primary"
              disabled={states.loading || !states() || (method === "table" && !rows())}
              onClick={() => void begin()}
            >
              {method === "table" ? "Start with the first row" : "Start the worked proof"}
            </button>
          }
        >
          <Show when={said()}>
            {(s) => (
              <div class="said" role="note" aria-label="Why this step">
                <p>
                  <Show
                    when={s().guess !== null}
                    fallback={
                      <>
                        {method === "table" ? "The row " : "The step is "}
                        <span class="m">{ruleLabel(s().rule)}</span>.
                      </>
                    }
                  >
                    <Show
                      when={s().guess === s().rule}
                      fallback={
                        <>
                          {method === "table" ? "The row " : "The step is "}
                          <span class="m">{ruleLabel(s().rule)}</span>, not{" "}
                          <span class="m">{ruleLabel(s().guess ?? "")}</span>.
                        </>
                      }
                    >
                      <span class="kw ok">Right</span>{" "}
                      {method === "table" ? "The row " : "The step is "}
                      <span class="m">{ruleLabel(s().rule)}</span>.
                    </Show>
                  </Show>{" "}
                  <Show when={s().reason}>{(reason) => <Words text={reason()} />}</Show>
                </p>
              </div>
            )}
          </Show>
          <Show when={played() > props.lesson.explain.after}>
            <Explain explain={props.lesson.explain} compared={compared()} compare={setCompared} />
          </Show>
          <Show
            when={played() < steps.length}
            fallback={
              <p class="row">
                <span class="kw ok">{method === "table" ? "Every row read" : "Proved"}</span>
                <button type="button" class="btn btn-s" onClick={() => void begin()}>
                  Play it again
                </button>
                <Show when={method === "table"}>
                  <button type="button" class="btn btn-s outline" onClick={() => void wholeTable()}>
                    See the whole table
                  </button>
                </Show>
              </p>
            }
          >
            <fieldset class="predict">
              <legend>
                {method === "table"
                  ? `Row ${played() + 1} of ${steps.length}, ${rows()?.[played()] ?? ""}: does it falsify the sequent?`
                  : `Step ${played() + 1} of ${steps.length}: predict the next rule.`}
              </legend>
              <div class="row">
                <For each={props.lesson.choices}>
                  {(rule) => (
                    <button
                      type="button"
                      class="btn outline rule-guess m"
                      aria-label={`Predict ${ruleLabel(rule)}`}
                      onClick={() => void reveal(rule)}
                    >
                      {ruleLabel(rule)}
                    </button>
                  )}
                </For>
              </div>
              <button type="button" class="btn btn-s outline" onClick={() => void reveal(null)}>
                {method === "table" ? "Show the answer" : "Show the step"}
              </button>
            </fieldset>
          </Show>
        </Show>
      </section>

      <Written name={`ordinaryLessons/${props.lesson.id}`} part="after" class="after-worked" />

      <section class="part" aria-labelledby="part-faded">
        <h3 id="part-faded">Your turn</h3>
        <Show
          when={method === "table"}
          fallback={
            <>
              <p class="sub">
                {props.lesson.faded === 0
                  ? "The same proof, from its sequent: every step is yours."
                  : `The same proof with its first ${props.lesson.faded === 1 ? "step" : `${props.lesson.faded} steps`} played: the rest is yours.`}
              </p>
              <button
                type="button"
                class="btn outline"
                disabled={!states()}
                onClick={() => void openAt(props.lesson.faded)}
              >
                Finish the proof yourself
              </button>
            </>
          }
        >
          <p class="sub">
            The same table from row {props.lesson.faded + 1}: say of each row whether it falsifies
            the sequent, with no reason given.
          </p>
          <button type="button" class="btn outline" onClick={() => fadeRows()}>
            Read the rows yourself
          </button>
        </Show>
      </section>

      <Show when={props.lesson.model}>
        {(model) => (
          <section class="part" aria-labelledby="part-model">
            <h3 id="part-model">A countermodel</h3>
            <p>
              <span class="m">{prettyOrdinary(model().sequent)}</span> in{" "}
              {LOGIC_NAMES[model().logic].toLowerCase()} logic: let deduxit decide it, and read the
              model it draws.
            </p>
            <button type="button" class="btn outline" onClick={() => void countermodel(model())}>
              Decide it and draw its countermodel
            </button>
          </section>
        )}
      </Show>

      <Show when={practice().length > 0}>
        <section class="part" aria-labelledby="part-practice">
          <h3 id="part-practice">Practice</h3>
          <p class="sub">{PRACTICE_WORDS[method]}</p>
          <ul class="prac">
            <For each={practice()}>
              {(p) => (
                <li>
                  <button type="button" class="btn outline m" onClick={() => void openPractice(p)}>
                    {prettyOrdinary(p.sequent)}
                  </button>{" "}
                  <Show when={method === "sequent" || method === "natural"}>
                    <span class="sub">{LOGIC_NAMES[p.logic]}</span>
                  </Show>
                </li>
              )}
            </For>
          </ul>
        </section>
      </Show>

      <section class="part" aria-labelledby="part-check">
        <h3 id="part-check">Check</h3>
        <fieldset class="hinge">
          <legend>
            <Words text={props.lesson.hinge.question} />
          </legend>
          <For each={props.lesson.hinge.options}>
            {(o, i) => (
              <label class="hinge-option">
                <input
                  type="radio"
                  name={`hinge-${props.lesson.id}`}
                  checked={chosen() === i()}
                  onChange={() => setChosen(i())}
                />
                <span class="hinge-dot" aria-hidden="true" />
                <span>
                  <Words text={o.text} />
                </span>
              </label>
            )}
          </For>
        </fieldset>
        <Show when={option()}>
          {(o) => (
            <div class="hinge-said" role="status" data-right={o().misconception ? undefined : ""}>
              <Show
                when={o().misconception}
                fallback={
                  <p>
                    <span class="kw ok">Right</span> <Words text={o().why} />
                  </p>
                }
              >
                {(m) => (
                  <>
                    <p>
                      <span class="kw bad">Not quite</span> This answer comes from the idea that{" "}
                      <Words text={lowered(m())} />
                    </p>
                    <p>
                      <Words text={o().why} />
                    </p>
                  </>
                )}
              </Show>
            </div>
          )}
        </Show>
      </section>
    </article>
  );
}

/** A sentence lowered to follow "the idea that", an acronym (LJ's) kept as it is. */
const lowered = (text: string) =>
  /^[A-Z](?![A-Z])/.test(text) ? text.charAt(0).toLowerCase() + text.slice(1) : text;

/** What a lesson's practice asks, by its method. */
const PRACTICE_WORDS = {
  table:
    "Each opens on a new tab. Decide it row by row, on paper or in your head, then compare with deduxit's in the Table view.",
  tableau:
    "Each opens on a new tab as a tableau to build: close every branch, or find one that stays open.",
  sequent: "Each opens on a new tab in its logic: prove it, or find that it has none.",
  natural: "Each opens on a new tab by natural deduction, in its logic: prove it.",
} as const;

/** Each ordinary logic's name beside a practice problem. */
const LOGIC_NAMES = {
  classical: "Classical",
  intuitionistic: "Intuitionistic",
  minimal: "Minimal",
} as const;
