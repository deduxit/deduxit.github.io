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
import { ORDINARY_LESSONS, type OrdinaryCourse, type OrdinaryLesson } from "../lib/content";
import type { OrdinarySession } from "../lib/ordinary";
import { prettyOrdinary } from "../lib/ordinary";
import { ordinary } from "../lib/suites";
import { Explain, Written } from "./Learn";
import type { Prover } from "./state";
import { type Ui, Words } from "./ui";

/** What a written lesson holds, under its name. */
const PARTS = "A worked proof, your turn, practice and a check";

export function OrdinaryCourseView(props: { course: OrdinaryCourse; prover: Prover; ui: Ui }) {
  const [open, setOpen] = createSignal<number | null>(null);
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
                      onClick={() => setOpen(n)}
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
  const api = () => props.prover.api.ordinary;
  const settings = () => JSON.stringify({ limits: { work: props.prover.settings().budget } });
  /** The worked proof's states, from its sequent (0) to the finished proof. */
  const [states] = createResource(
    () => props.lesson.session,
    async (text) => {
      let session = JSON.parse(text) as OrdinarySession;
      const out = [session];
      for (let i = 0; i < props.lesson.steps.length; i++) {
        session = (await api().undo(session, settings())).session;
        out.unshift(session);
      }
      return out;
    },
  );
  const [tab, setTab] = createSignal<string | null>(null);
  const [played, setPlayed] = createSignal(0);
  const [said, setSaid] = createSignal<Said | null>(null);
  const [compared, setCompared] = createSignal(false);
  const [chosen, setChosen] = createSignal<number | null>(null);
  const steps = props.lesson.steps;

  /** Opens the worked proof's state with `n` steps on a new tab; returns the tab. */
  async function openAt(n: number): Promise<string | null> {
    const state = states()?.[n];
    if (!state) return null;
    await props.prover.open(JSON.stringify(state), ordinary(props.lesson.logic));
    return props.prover.current()?.id ?? null;
  }

  async function begin() {
    setSaid(null);
    setPlayed(0);
    setCompared(false);
    setTab(await openAt(0));
  }

  async function reveal(guess: string | null) {
    const n = played();
    // The worked proof's tab may have been closed: the next step opens it again.
    let id = tab();
    if (id && !props.prover.store.proofs.some((p) => p.id === id)) {
      id = await openAt(n);
      setTab(id);
    }
    const step = steps[n];
    const next = states()?.[n + 1];
    if (!id || !step || !next) return;
    await props.prover.showOrdinarySession(id, next);
    setPlayed(n + 1);
    setSaid({ guess, rule: step.rule, reason: step.reason });
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
        <h3 id="part-worked">A worked proof</h3>
        <p class="m ex-seq">{prettyOrdinary(props.lesson.sequent)}</p>
        <Show
          when={tab()}
          fallback={
            <button
              type="button"
              class="btn btn-primary"
              disabled={states.loading || !states()}
              onClick={() => void begin()}
            >
              Start the worked proof
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
                        The step is <span class="m">{s().rule}</span>.
                      </>
                    }
                  >
                    <Show
                      when={s().guess === s().rule}
                      fallback={
                        <>
                          The step is <span class="m">{s().rule}</span>, not{" "}
                          <span class="m">{s().guess}</span>.
                        </>
                      }
                    >
                      <span class="kw ok">Right</span> The step is <span class="m">{s().rule}</span>
                      .
                    </Show>
                  </Show>{" "}
                  <Words text={s().reason} />
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
                <span class="kw ok">Proved</span>
                <button type="button" class="btn btn-s" onClick={() => void begin()}>
                  Play it again
                </button>
              </p>
            }
          >
            <fieldset class="predict">
              <legend>
                Step {played() + 1} of {steps.length}: predict the next rule.
              </legend>
              <div class="row">
                <For each={props.lesson.choices}>
                  {(rule) => (
                    <button
                      type="button"
                      class="btn outline rule-guess m"
                      aria-label={`Predict ${rule}`}
                      onClick={() => void reveal(rule)}
                    >
                      {rule}
                    </button>
                  )}
                </For>
              </div>
              <button type="button" class="btn btn-s outline" onClick={() => void reveal(null)}>
                Show the step
              </button>
            </fieldset>
          </Show>
        </Show>
      </section>

      <Written name={`ordinaryLessons/${props.lesson.id}`} part="after" class="after-worked" />

      <section class="part" aria-labelledby="part-faded">
        <h3 id="part-faded">Your turn</h3>
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
      </section>

      <Show when={practice().length > 0}>
        <section class="part" aria-labelledby="part-practice">
          <h3 id="part-practice">Practice</h3>
          <p class="sub">
            Each opens on a new tab in its logic: prove it, or find that it has none.
          </p>
          <ul class="prac">
            <For each={practice()}>
              {(p) => (
                <li>
                  <button
                    type="button"
                    class="btn outline m"
                    onClick={() => void props.prover.openProblem(p.sequent, ordinary(p.logic))}
                  >
                    {prettyOrdinary(p.sequent)}
                  </button>{" "}
                  <span class="sub">{LOGIC_NAMES[p.logic]}</span>
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
  /^[A-Z][a-z]/.test(text) ? text.charAt(0).toLowerCase() + text.slice(1) : text;

/** Each ordinary logic's name beside a practice problem. */
const LOGIC_NAMES = {
  classical: "Classical",
  intuitionistic: "Intuitionistic",
  minimal: "Minimal",
} as const;
