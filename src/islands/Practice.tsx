// deduxit © Fabian Lukas Grubmüller 2026
// Licensed under the EUPL

/**
 * Practice: a place of its own, opened from the bottom band, with the store
 * of the current tab's suite: the linear store's provable problems (in a
 * linear tab, and in a tab of a calculus of one's own, which has no store),
 * or the ordinary store's problems to decide, each in its logic. Filtered by
 * category and level, one at random within the filters, each opening as a
 * proof on a new tab. The browser keeps, per suite, the filters and which
 * problems the visitor has proved (a problem is proved when the tab it opened
 * on finishes its proof with no goal closed by the search).
 */

import { CircleCheck, Dice5 } from "lucide-solid";
import { createEffect, createResource, createSignal, For, Show } from "solid-js";
import {
  type Filters,
  groupsOf,
  isOrdinaryProblem,
  type Kept,
  LEVEL_NAMES,
  loadKept,
  NO_FILTERS,
  type Offered,
  passes,
  pick,
  type Store,
  saveKept,
} from "../lib/practice";
import { prettyOrdinary } from "../lib/ordinary";
import { ordinary } from "../lib/suites";
import { displayed } from "../lib/words";
import { Stairs, Written } from "./Learn";
import type { Prover } from "./state";
import type { Ui } from "./ui";

/** A problem's sequent in signs, in its suite's notation. */
const signs = (problem: Offered) =>
  isOrdinaryProblem(problem) ? prettyOrdinary(problem.sequent) : displayed(problem.sequent);

/** Each ordinary logic's name in a problem's line. */
const LOGIC_NAMES = {
  classical: "Classical",
  intuitionistic: "Intuitionistic",
  minimal: "Minimal",
};

const storage = (): Storage | null => {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
};

const keyOf = (parameter: string, sequent: string) => `${parameter}\n${sequent.trim()}`;

/** Each store's file of the problems Practice offers. */
const FILES: Record<Store, string> = {
  linear: "/problems.json",
  ordinary: "/ordinary-problems.json",
};

/** Practice's state, for the island's life: the problems once asked for, the filters, the problems proved. */
export function createPractice(prover: Prover) {
  /** The store of the current tab's suite. */
  const store = (): Store =>
    prover.current()?.calculus.suite === "ordinary" ? "ordinary" : "linear";
  const [wanted, setWanted] = createSignal(false);
  const [problems] = createResource(
    () => (wanted() ? store() : undefined),
    async (which) => {
      const response = await fetch(FILES[which]);
      if (!response.ok) throw new Error(`${response.status}`);
      return (await response.json()) as Offered[];
    },
  );
  const [kepts, setKepts] = createSignal<Record<Store, Kept>>({
    linear: loadKept(storage(), "linear"),
    ordinary: loadKept(storage(), "ordinary"),
  });
  const kept = () => kepts()[store()];
  const keep = (
    change: Partial<{ filters: Filters; proved: readonly string[] }>,
    which = store(),
  ) => {
    const next = { ...kepts()[which], ...change };
    setKepts({ ...kepts(), [which]: next });
    saveKept(storage(), next, which);
  };

  /** The problem each tab opened from Practice holds, by the tab's proof's id. */
  const opened = new Map<string, Offered>();

  // A problem is proved when its tab finishes the proof of its sequent in its calculus
  // by the visitor's own steps: a goal the search closed (Close, Close all) is in `engines`.
  createEffect(() => {
    for (const which of ["linear", "ordinary"] as const) {
      const proved = new Set(kepts()[which].proved);
      let added = false;
      for (const proof of prover.store.proofs) {
        if (!proof.view?.complete || Object.keys(proof.engines).length > 0) continue;
        const problem = opened.get(proof.id);
        const c = proof.calculus;
        const same =
          problem &&
          (isOrdinaryProblem(problem)
            ? which === "ordinary" &&
              c.suite === "ordinary" &&
              c.method === "sequent" &&
              keyOf(problem.logic, problem.sequent) === keyOf(c.logic, proof.input)
            : which === "linear" &&
              c.suite === "linear" &&
              keyOf(problem.mode, problem.sequent) === keyOf(c.mode, proof.input));
        if (!problem || !same) continue;
        if (!proved.has(problem.id)) {
          proved.add(problem.id);
          added = true;
        }
      }
      if (added) keep({ proved: [...proved] }, which);
    }
  });

  return {
    /** Asks for the problems, once. */
    want: () => setWanted(true),
    /** Notes that a tab's proof holds a problem opened from Practice. */
    opened: (proof: string, problem: Offered) => opened.set(proof, problem),
    /** The store of the current tab's suite. */
    store,
    problems,
    kept,
    keep,
  };
}

/** Practice's state's type. */
export type Practice = ReturnType<typeof createPractice>;

export function PracticePlace(props: { prover: Prover; ui: Ui; practice: Practice }) {
  const { setUi } = props.ui;
  props.practice.want();
  const filters = () => props.practice.kept().filters;
  const all = () => props.practice.problems() ?? [];
  const shown = () => all().filter((p) => passes(p, filters()));
  const proved = () => new Set(props.practice.kept().proved);
  const toggle = <T,>(list: readonly T[], item: T) =>
    list.includes(item) ? list.filter((x) => x !== item) : [...list, item];

  const open = async (problem: Offered) => {
    setUi("menu", null);
    if (isOrdinaryProblem(problem))
      await props.prover.openProblem(problem.sequent, ordinary(problem.logic));
    else
      await props.prover.example(
        { sequent: problem.sequent, mode: problem.mode, session: null },
        false,
      );
    const tab = props.prover.current();
    if (tab) props.practice.opened(tab.id, problem);
    setUi("live", `${signs(problem)}: opened on a new tab.`);
  };

  return (
    <div class="cluster menu practice" role="dialog" aria-label="Practice">
      <div class="pr-head">
        <h2 class="pr-title">Practice</h2>
        <Show when={props.practice.problems()}>
          <span class="sub" aria-live="polite">
            {shown().length} of {all().length} problems
          </span>
        </Show>
        <span class="grow" />
        <button
          type="button"
          class="btn btn-primary"
          disabled={shown().length === 0 || props.prover.busy()}
          data-tip="One of the problems the filters show, on a new tab"
          onClick={() => {
            const chosen = pick(shown(), Math.random);
            if (chosen) void open(chosen);
          }}
        >
          <Dice5 aria-hidden="true" />A random problem
        </button>
      </div>
      <Show
        when={props.practice.store() === "ordinary"}
        fallback={<Written name="texts/practice" class="sub pr-intro" />}
      >
        <Written name="texts/practice-ordinary" class="sub pr-intro" />
      </Show>
      <div class="pr-filters">
        <For each={groupsOf(props.practice.store())}>
          {(group) => (
            <fieldset class="pr-group">
              <legend class="kw-label">{group.name}</legend>
              <For each={group.categories}>
                {([key, label]) => (
                  <label class="chip">
                    <input
                      type="checkbox"
                      checked={filters().categories.includes(key)}
                      onChange={() =>
                        props.practice.keep({
                          filters: { ...filters(), categories: toggle(filters().categories, key) },
                        })
                      }
                    />
                    {label}
                  </label>
                )}
              </For>
            </fieldset>
          )}
        </For>
        <fieldset class="pr-group">
          <legend class="kw-label">Difficulty</legend>
          <For each={[1, 2, 3, 4] as const}>
            {(level) => (
              <label class="chip">
                <input
                  type="checkbox"
                  checked={filters().levels.includes(level)}
                  onChange={() =>
                    props.practice.keep({
                      filters: { ...filters(), levels: toggle(filters().levels, level) },
                    })
                  }
                />
                <Stairs level={level} />
                {LEVEL_NAMES[level]}
              </label>
            )}
          </For>
        </fieldset>
        <button
          type="button"
          class="btn btn-s"
          disabled={filters().categories.length === 0 && filters().levels.length === 0}
          onClick={() => props.practice.keep({ filters: NO_FILTERS })}
        >
          Show every problem
        </button>
      </div>
      <Show when={props.practice.problems.error}>
        <p class="kw bad">The problems did not load; open Practice again to retry.</p>
      </Show>
      <Show when={props.practice.problems.loading}>
        <p class="sub">Loading the problems…</p>
      </Show>
      <Show when={props.practice.problems() && shown().length === 0}>
        <p class="sub">No problem passes these filters: choose fewer, or show every problem.</p>
      </Show>
      <ul class="pr-list">
        <For each={shown()}>
          {(problem) => (
            <li class="pr-row" data-problem={problem.id}>
              <button
                type="button"
                class="pr-item"
                disabled={props.prover.busy()}
                aria-label={`${isOrdinaryProblem(problem) ? "Decide" : "Prove"} ${signs(problem)}, ${LEVEL_NAMES[problem.level]}, ${isOrdinaryProblem(problem) ? LOGIC_NAMES[problem.logic] : problem.fragment}${proved().has(problem.id) ? ", proved before" : ""}`}
                onClick={() => void open(problem)}
              >
                {/* Spaces between the parts, so that their text reads as words. */}
                <span class="m pr-seq">{signs(problem)}</span>{" "}
                <span class="pr-meta">
                  <Stairs level={problem.level} />
                  <span>{LEVEL_NAMES[problem.level]}</span>{" "}
                  <span class="pr-frag">
                    {isOrdinaryProblem(problem) ? LOGIC_NAMES[problem.logic] : problem.fragment}
                  </span>{" "}
                  <Show when={proved().has(problem.id)}>
                    <span class="kw ok pr-done">
                      <CircleCheck aria-hidden="true" />
                      Proved
                    </span>
                  </Show>
                </span>
              </button>
              <Show when={!isOrdinaryProblem(problem) && problem.source}>
                {(source) => (
                  <p class="pr-source sub">
                    <Show when={problem.title}>{(title) => <span>{title()}: </span>}</Show>
                    <a href={source().url} rel="noopener" target="_blank">
                      {source().text}
                    </a>
                  </p>
                )}
              </Show>
            </li>
          )}
        </For>
      </ul>
      <Written name="licence" class="frame-licence" />
    </div>
  );
}
