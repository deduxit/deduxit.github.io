// deduxit © Fabian Lukas Grubmüller 2026
// Licensed under the EUPL

/**
 * A classical sequent's interpolant, a view added from "+ view", and the parts the views of a
 * sequent share: deduxit's answer or refusal, a verdict's keyword and sentence. The interpolant
 * is the formula with its three checks.
 */

import { createEffect, createResource, createSignal, For, type JSX, on, Show } from "solid-js";
import { type Failure, failure as failureOf } from "../lib/deduxit";
import { formulaTexts, type SequentForm } from "../lib/ordinary";
import {
  type Half,
  halfText,
  hypotheses,
  type Interpolation,
  interpolantAtoms,
  listed,
  moved,
  type Partition,
} from "../lib/transforms";
import { ModelFigure } from "./Countermodel";
import type { Prover } from "./state";
import { Sign } from "./Signs";
import type { Ui } from "./ui";

/** deduxit's answer: what it gave, or what it refused. */
export type Answer<T> = { readonly value: T } | { readonly failure: Failure };

/** The answer's value, or undefined while it loads or where deduxit refused. */
export const given = <T,>(a: Answer<T> | undefined) => (a && "value" in a ? a.value : undefined);
/** What deduxit refused, or undefined. */
export const failureIn = <T,>(a: Answer<T> | undefined) =>
  a && "failure" in a ? a.failure : undefined;

/** Calls deduxit and keeps a refusal as the answer, so that the sheet can say it. */
export async function answered<T>(call: () => Promise<T>): Promise<Answer<T>> {
  try {
    return { value: await call() };
  } catch (thrown) {
    return { failure: failureOf(thrown) };
  }
}

/** The keyword and sentence that open an answer. */
export function Verdict(props: {
  keyword: string;
  tone: "ok" | "bad" | "warn";
  children: JSX.Element;
}) {
  return (
    <p class="method-verdict" role="status">
      <span class={`kw ${props.tone}`}>{props.keyword}</span> {props.children}
    </p>
  );
}

/** What deduxit refused, in its words: no wording of the page's covers these calls' refusals. */
export function Refused(props: { failure: Failure }) {
  return <p class="method-verdict said-why">{props.failure.message}</p>;
}

/**
 * The interpolant view: each formula carries the number of its part, a press moves it to the
 * other part, and the interpolant and its two sequents follow.
 */
export function InterpolantPanel(props: {
  prover: Prover;
  ui: Ui;
  sequent: { text: string; form: unknown };
}) {
  const sequent = () => ({
    text: props.sequent.text,
    form: props.sequent.form as SequentForm,
  });
  /** The first part chosen, or null for Craig's split, the formulas left of ⊢. */
  const [chosen, setChosen] = createSignal<Partition | null>(null);
  createEffect(
    on(
      () => props.sequent.text,
      () => setChosen(null),
      { defer: true },
    ),
  );
  const partition = (): Partition | undefined => {
    const s = sequent();
    return s ? (chosen() ?? hypotheses(s.form)) : undefined;
  };
  const [answer] = createResource(
    () => {
      const s = sequent();
      const p = partition();
      return s && p ? ([s.text, JSON.stringify(p)] as const) : undefined;
    },
    ([text, part]) =>
      answered(() => props.prover.api.ordinary.interpolate(text, "classical", part, "{}")),
  );
  const found = () => given<Interpolation>(answer());
  const texts = () => {
    const s = sequent();
    return s ? formulaTexts(s.form) : [];
  };
  const inFirst = (side: "left" | "right", k: number) => partition()?.[side].includes(k) ?? false;
  const move = (side: "left" | "right", k: number) => {
    const p = partition();
    if (p) setChosen(moved(p, side, k));
  };
  const Part = (part: { side: "left" | "right"; k: number; index: number }) => {
    const n = () => (inFirst(part.side, part.k) ? 1 : 2);
    return (
      <button
        type="button"
        class="tf-part m"
        aria-pressed={inFirst(part.side, part.k)}
        onClick={() => move(part.side, part.k)}
      >
        {/* Its name is "Part 1 a ∧ b": the visible number and formula, as words. */}
        <span class="tf-n">
          <span class="sr-only">Part </span>
          {n()}
        </span>{" "}
        {texts()[part.index]}
      </button>
    );
  };

  return (
    <>
      <fieldset class="tf-parts" aria-label="The sequent's two parts">
        <For each={sequent().form.left}>
          {(index, k) => <Part side="left" k={k()} index={index} />}
        </For>
        <span class="m tf-turnstile">⊢</span>
        <For each={sequent().form.right}>
          {(index, k) => <Part side="right" k={k()} index={index} />}
        </For>
      </fieldset>
      <section class="tf-answer" aria-busy={answer.loading} aria-label="The interpolant">
        <Show when={answer.loading}>
          <p class="sub">Deciding the sequent, and checking the interpolant…</p>
        </Show>
        <Show when={failureIn(answer())}>{(f) => <Refused failure={f()} />}</Show>
        <Show when={!answer.loading && found()}>
          {(i) => <InterpolantView found={i()} prover={props.prover} ui={props.ui} />}
        </Show>
      </section>
    </>
  );
}

/** An interpolation's answer: the interpolant and its checks, or why there is none. */
function InterpolantView(props: { found: Interpolation; prover: Prover; ui: Ui }) {
  const outcome = () => props.found.outcome;
  return (
    <Show
      when={props.found.interpolant}
      fallback={
        <>
          <Show when={outcome().verdict === "not_valid"}>
            <Verdict keyword="No interpolant" tone="bad">
              The sequent is not valid, and only a valid sequent has one.
            </Verdict>
            <Show when={outcome().countermodel}>
              <ModelFigure outcome={outcome()} prover={props.prover} ui={props.ui} />
            </Show>
          </Show>
          <Show when={outcome().verdict === "unknown"}>
            <Verdict keyword="Not decided" tone="warn">
              deduxit did not decide the sequent within the page's bounds.
            </Verdict>
          </Show>
          <Show when={outcome().verdict === "valid"}>
            <Verdict keyword="Not found" tone="warn">
              The sequent is valid, but deduxit found no derivation without cuts within the page's
              bounds, and an interpolant is read off one.
            </Verdict>
          </Show>
        </>
      }
    >
      {(found) => {
        const atoms = () => interpolantAtoms(props.found);
        const checked = () =>
          found().first.outcome.verdict === "valid" && found().second.outcome.verdict === "valid";
        return (
          <>
            <Show
              when={checked()}
              fallback={
                <Verdict keyword="Not checked" tone="warn">
                  deduxit found this interpolant, but did not decide both of its checks within the
                  page's bounds.
                </Verdict>
              }
            >
              <Verdict keyword="Interpolant" tone="ok">
                All three of its checks pass.
              </Verdict>
            </Show>
            <p class="tf-to">
              <span class="m">{found().text}</span>
            </p>
            <ul class="tf-checks">
              <Check ok>
                {atoms().length === 0
                  ? "It has no atoms, so it needs none from either part."
                  : atoms().length === 1
                    ? `Its one atom, ${atoms()[0]}, occurs in both parts.`
                    : `Its atoms, ${listed(atoms())}, occur in both parts.`}
              </Check>
              <HalfCheck half={found().first} what="the first part proves it" />
              <HalfCheck half={found().second} what="with it, the second part proves the rest" />
            </ul>
          </>
        );
      }}
    </Show>
  );
}

/** A check of an interpolant: its mark, a check or a question mark, and its words. */
function Check(props: { ok: boolean; children: JSX.Element }) {
  return (
    <li class="tf-check" data-ok={props.ok ? "" : undefined}>
      <Show when={props.ok} fallback={<Sign name="unknown" />}>
        <Sign name="holds" />
      </Show>
      <span>{props.children}</span>
    </li>
  );
}

/** A half's check: its sequent valid, which says what the interpolant does there. */
function HalfCheck(props: { half: Half; what: string }) {
  const valid = () => props.half.outcome.verdict === "valid";
  return (
    <Check ok={valid()}>
      <span class="m">{halfText(props.half)}</span>{" "}
      {valid() ? `is valid: ${props.what}.` : "was not decided within the page's bounds."}
    </Check>
  );
}
