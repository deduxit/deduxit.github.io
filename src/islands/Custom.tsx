// deduxit © Fabian Lukas Grubmüller 2026
// Licensed under the EUPL

/**
 * A calculus of the visitor's own, in the stage's place: before a derivation is started, one
 * sentence on what a rule file is, the built-in calculus it starts from (LJ or the tableau), the
 * file to read or change and the assumptions; once started, the derivation drawn by deduxit, the
 * open goals, the steps deduxit offers for the goal chosen (each checked against the rules before
 * the session takes it), a goal closed by a hypothesis, and the finished derivation's
 * verdict, "valid in the calculus given". Nothing leaves the page: deduxit runs in its worker.
 */

import { createEffect, createResource, createSignal, For, on, Show } from "solid-js";
import {
  type CustomOffered,
  type CustomStep,
  distinctSteps,
  EXAMPLES,
  membersOf,
  STARTERS,
  stepWords,
} from "../lib/custom";
import type { Prover } from "./state";
import { Why } from "./ui";

/** The two built-in calculi the panel offers to start from. */
const OFFERED = STARTERS.filter((s) => s.name === "LJ" || s.name === "tableau");

export function CustomPanel(props: { prover: Prover }) {
  const proof = () => props.prover.current();
  const work = () => proof()?.custom ?? null;
  const name = () => {
    const c = proof()?.calculus;
    return c?.suite === "rules" ? c.calculus : "";
  };
  // A built-in calculus's file is read when its proof is shown without one.
  createEffect(
    on(
      () => [proof()?.id, work()?.file.trim() === ""] as const,
      ([id, empty]) => {
        if (id && empty) void props.prover.customFile(id);
      },
    ),
  );
  return (
    <section class="method custom" aria-label="Your own calculus">
      <Show when={work()?.session && work()?.view} fallback={<Setup prover={props.prover} />}>
        <Building prover={props.prover} name={name()} />
      </Show>
    </section>
  );
}

/** The start: what a rule file is, the calculus to start from, the file and the assumptions. */
function Setup(props: { prover: Prover }) {
  const proof = () => props.prover.current();
  const work = () => proof()?.custom ?? null;
  const name = () => {
    const c = proof()?.calculus;
    return c?.suite === "rules" ? c.calculus : "";
  };
  return (
    <>
      <p class="method-verdict">
        A rule file is a calculus written down: its connectives, how a sequent is laid out, and each
        rule as premises over a conclusion.
      </p>
      <div class="custom-from">
        <span class="kw-label" id="custom-from">
          Start from
        </span>
        <fieldset class="seg" aria-labelledby="custom-from">
          <For each={OFFERED}>
            {(starter) => (
              <button
                type="button"
                class="seg-b"
                aria-pressed={name() === starter.name}
                data-tip={starter.words}
                onClick={() => {
                  const p = proof();
                  if (p)
                    void props.prover.customFrom(p.id, starter.name, EXAMPLES[starter.name] ?? "");
                }}
              >
                {starter.name === "tableau" ? "Tableau" : starter.name}
              </button>
            )}
          </For>
        </fieldset>
      </div>
      <p class="method-verdict">
        Type a sequent of {name() || "the calculus"} in the field above and press Enter. deduxit
        checks every step against the rules, so a derivation is valid in the calculus given.
      </p>
      <Show when={work()?.problem}>{(said) => <Why said={said()} class="custom-problem" />}</Show>
      <details class="custom-file">
        <summary>The rule file</summary>
        <textarea
          class="custom-text"
          aria-label="The rule file"
          spellcheck={false}
          rows={14}
          value={work()?.file ?? ""}
          onInput={(event) => {
            const p = proof();
            if (p) props.prover.setCustomFile(p.id, event.currentTarget.value);
          }}
        />
      </details>
      <details class="custom-file">
        <summary>Assumptions</summary>
        <textarea
          class="custom-text"
          aria-label="Assumptions, one sequent per line"
          placeholder="One sequent per line"
          spellcheck={false}
          rows={3}
          value={work()?.assumptions ?? ""}
          onInput={(event) => {
            const p = proof();
            if (p) props.prover.setCustomAssumptions(p.id, event.currentTarget.value);
          }}
        />
      </details>
    </>
  );
}

/** A step being given what it needs: the step, and a value per name. */
interface Giving {
  readonly step: CustomOffered;
  readonly values: Record<string, string>;
}

/** The derivation under way: its drawing, its goals, the steps for the goal chosen. */
function Building(props: { prover: Prover; name: string }) {
  const proof = () => props.prover.current();
  const work = () => proof()?.custom ?? null;
  const view = () => work()?.view ?? null;
  const goals = () => view()?.goals ?? [];
  /** The goal chosen, by its id: the one a step opened or a press chose, else the first open one. */
  const goal = () => goals().find((g) => g.goal === work()?.goal) ?? goals()[0];
  const [giving, setGiving] = createSignal<Giving | null>(null);
  createEffect(
    on(
      () => work()?.session,
      () => setGiving(null),
    ),
  );

  const [drawing] = createResource(
    () => work()?.session ?? undefined,
    (session) =>
      props.prover.api.custom
        .draw(
          session,
          JSON.stringify({
            limits: { work: props.prover.settings().budget },
            styles: { svg: { font_size: 30, font: props.prover.settings().stageFont } },
          }),
        )
        .catch(() => null),
  );
  const [steps] = createResource(
    () => {
      const p = proof();
      const g = goal();
      return p && g && work()?.session ? ([p.id, g.goal, work()?.session] as const) : undefined;
    },
    async ([id, at]) => {
      const answer = await props.prover.customRules(id, at);
      return answer.ok ? answer.value : [];
    },
  );
  const members = () => {
    const g = goal();
    return g ? membersOf(g) : [];
  };
  const offered = () => distinctSteps(steps() ?? [], members());

  async function take(step: CustomStep) {
    const p = proof();
    const g = goal();
    if (!p || !g) return;
    const failed = await props.prover.customApply(p.id, g.goal, step);
    // What the step needs, asked for by name: the fields to fill appear under it.
    if (failed?.code === "step_needs") {
      const named = failed.details?.["needs"];
      const needs = Array.isArray(named) ? named.map(String) : [];
      setGiving({ step: { rule: step.rule, at: step.at, needs }, values: {} });
    }
  }

  return (
    <>
      <p class="method-verdict" role="status">
        <Show
          when={view()?.finished}
          fallback={
            <>
              <span class="kw acc">
                Open goal {String(goals().findIndex((g) => g.goal === goal()?.goal) + 1)} of{" "}
                {String(goals().length)}
              </span>{" "}
              in {props.name}: choose a step for it.
            </>
          }
        >
          <Show
            when={work()?.checked}
            fallback={<>Every goal is closed. Check the derivation whole to get its verdict.</>}
          >
            <span class="kw ok">Valid</span> in the calculus given: every step follows a rule of{" "}
            {props.name}. Nothing says the rules themselves are sound.
          </Show>
        </Show>
      </p>
      <Show when={work()?.problem}>{(said) => <Why said={said()} class="custom-problem" />}</Show>
      <p class="row">
        <Show when={view()?.finished && !work()?.checked}>
          <button
            type="button"
            class="btn btn-primary"
            onClick={() => {
              const p = proof();
              if (p) void props.prover.customCheck(p.id);
            }}
          >
            Check the derivation
          </button>
        </Show>
        <button
          type="button"
          class="btn"
          onClick={() => {
            const p = proof();
            if (p) props.prover.customRestart(p.id);
          }}
        >
          Change the rules
        </button>
      </p>
      <Show when={drawing()}>{(svg) => <div class="custom-drawing" innerHTML={svg()} />}</Show>
      <Show when={!view()?.finished}>
        <Show when={goals().length > 1}>
          <fieldset class="custom-goals" aria-label="Open goals">
            <For each={goals()}>
              {(g, at) => (
                <button
                  type="button"
                  class="btn"
                  aria-pressed={g.goal === goal()?.goal}
                  onClick={() => {
                    const p = proof();
                    if (p) props.prover.customChoose(p.id, g.goal);
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
            <div class="custom-steps">
              <p class="method-verdict">
                Steps for <span class="m">{g().sequent}</span>:
              </p>
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
                            onClick={() =>
                              step.needs.length
                                ? setGiving({ step, values: {} })
                                : void take({ rule: step.rule, at: step.at, given: {} })
                            }
                          >
                            {stepWords(step, members())}
                            <Show when={step.needs.length}> (give {step.needs.join(", ")})</Show>
                          </button>
                        </li>
                      )}
                    </For>
                    <Show when={g().hypotheses.length}>
                      <li>
                        <button
                          type="button"
                          class="btn outline"
                          onClick={() => {
                            const p = proof();
                            if (p) void props.prover.customAssume(p.id, g().goal);
                          }}
                        >
                          Close by a hypothesis
                        </button>
                      </li>
                    </Show>
                  </ul>
                }
              >
                {(asked) => (
                  <form
                    class="custom-give"
                    aria-label={`Give what ${asked().step.rule} needs`}
                    onSubmit={(event) => {
                      event.preventDefault();
                      void take({
                        rule: asked().step.rule,
                        at: asked().step.at,
                        given: asked().values,
                      });
                    }}
                  >
                    <p class="method-verdict">
                      {stepWords(asked().step, members())} leaves these open: give each in the
                      calculus's syntax, a context as members separated by commas.
                    </p>
                    <For each={asked().step.needs}>
                      {(needed) => (
                        <label class="custom-field">
                          <span class="m">{needed}</span>
                          <input
                            class="field"
                            spellcheck={false}
                            autocomplete="off"
                            onInput={(event) => {
                              const value = event.currentTarget.value;
                              setGiving((now) =>
                                now ? { ...now, values: { ...now.values, [needed]: value } } : now,
                              );
                            }}
                          />
                        </label>
                      )}
                    </For>
                    <p class="row">
                      <button type="submit" class="btn btn-primary">
                        Apply {asked().step.rule}
                      </button>
                      <button type="button" class="btn" onClick={() => setGiving(null)}>
                        Other steps
                      </button>
                    </p>
                  </form>
                )}
              </Show>
            </div>
          )}
        </Show>
      </Show>
    </>
  );
}
