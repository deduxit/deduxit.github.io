// deduxit © Fabian Lukas Grubmüller 2026
// Licensed under the EUPL

/**
 * Lambda-terms in the stage's place. Before anything is typed: what a typed term is, and a term
 * and a type to try. A term typed is checked: its type and its typing derivation drawn, a
 * judgement per part, or why it is not well typed. A type typed gets a term found, which deduxit
 * reads back from a proof of the type's formula, or the news that it has none; its terms are
 * listed and counted on request. A term of System F is checked and drawn as a typed one is, its
 * types abstracted and applied as written. An untyped term is checked for how it uses its variables, given
 * its most general simple type, and reduced by β a step at a time with the tools, the part reduced
 * next marked. Nothing leaves the page: deduxit runs in its worker.
 */

import { createResource, For, Show } from "solid-js";
import {
  CALCULUS_SENTENCES,
  countWords,
  formedWords,
  illFormedWords,
  illTypedWords,
  inhabitationWords,
  isUntyped,
  LINEAR_EXAMPLE,
  type LambdaCalculus,
  principalWords,
  reductionWords,
  SYSTEM_F_EXAMPLE,
  TERM_EXAMPLE,
  TYPE_EXAMPLE,
  typedWords,
  typingOf,
  UNTYPED_EXAMPLE,
  UNTYPED_LINEAR_EXAMPLE,
  untypableWords,
  useOf,
} from "../lib/lambda";
import type { Prover } from "./state";
import { Why } from "./ui";

export function LambdaPanel(props: { prover: Prover }) {
  const work = () => props.prover.current()?.lambda ?? null;
  return (
    <section class="method lambda" aria-label="Lambda-terms">
      <Show when={work()?.kind} fallback={<Setup prover={props.prover} />}>
        <Read prover={props.prover} />
      </Show>
    </section>
  );
}

/** The tab's lambda calculus, `simple` before one is chosen. */
const calculusOf = (props: { prover: Prover }): LambdaCalculus => {
  const c = props.prover.current()?.calculus;
  return c?.suite === "lambda" ? c.calculus : "simple";
};

/** Before anything is read: what a term is, and a term (and a type) to try. */
function Setup(props: { prover: Prover }) {
  return (
    <Show
      when={typingOf(calculusOf(props)) !== "simple"}
      fallback={<TypedSetup prover={props.prover} />}
    >
      <Show when={isUntyped(calculusOf(props))} fallback={<SystemFSetup prover={props.prover} />}>
        <UntypedSetup prover={props.prover} />
      </Show>
    </Show>
  );
}

/** Before a term of System F is read: what its types add, and a term to try. */
function SystemFSetup(props: { prover: Prover }) {
  return (
    <>
      <p class="method-verdict">
        System F adds types that hold for every type: ΛX. M, written /\X. M, has the type ∀X. A when
        M has the type A, and M [a] uses it at the type a. So ΛX. λx:X. x is the identity of every
        type, and its type is ∀X. X → X.
      </p>
      <p class="method-verdict">
        Type a term in the field above, every \ with its variable's type and every type it is used
        at in brackets: System F infers no types. {CALCULUS_SENTENCES[useOf(calculusOf(props))]}
      </p>
      <Show when={props.prover.current()?.lambda?.problem}>
        {(said) => <Why said={said()} class="custom-problem" />}
      </Show>
      <p class="row">
        <button type="button" class="btn" onClick={() => tryText(props.prover, SYSTEM_F_EXAMPLE)}>
          Try {SYSTEM_F_EXAMPLE}
        </button>
      </p>
    </>
  );
}

/** Types an example into the field and reads it. */
const tryText = (prover: Prover, text: string) => {
  const p = prover.current();
  if (!p) return;
  prover.setInput(p.id, text);
  void prover.submit(p.id);
};

/** Before an untyped term is read: what reduction does, and a term to try. */
function UntypedSetup(props: { prover: Prover }) {
  const use = () => useOf(calculusOf(props));
  const example = () => (use() === "simple" ? UNTYPED_EXAMPLE : UNTYPED_LINEAR_EXAMPLE);
  return (
    <>
      <p class="method-verdict">
        An untyped λ-term is a program with no types. A step of β-reduction runs it: (λx. M) N
        becomes M with N in place of x.
      </p>
      <p class="method-verdict">
        Type a term in the field above, every λ written \ and with no type.{" "}
        {CALCULUS_SENTENCES[use()]}
      </p>
      <Show when={props.prover.current()?.lambda?.problem}>
        {(said) => <Why said={said()} class="custom-problem" />}
      </Show>
      <p class="row">
        <button type="button" class="btn" onClick={() => tryText(props.prover, example())}>
          Try {example()}
        </button>
      </p>
    </>
  );
}

/** Before a typed term or a type is read: what a typed term is, and a term and a type to try. */
function TypedSetup(props: { prover: Prover }) {
  const proof = () => props.prover.current();
  const simple = () => calculusOf(props) === "simple";
  const example = () => (simple() ? TERM_EXAMPLE : LINEAR_EXAMPLE);
  return (
    <>
      <p class="method-verdict">
        A λ-term is a small program, and its type says what it takes and what it gives: λx:a. x
        takes an a and gives it back, so its type is a → a.
      </p>
      <p class="method-verdict">
        <Show
          when={simple()}
          fallback={
            <>
              Type a term in the field above, every \ with its variable's type.{" "}
              {CALCULUS_SENTENCES[useOf(calculusOf(props))]}
            </>
          }
        >
          Type a term in the field above to check it, every \ with its variable's type. Or type a
          type, such as a → a → a, to find its terms.
        </Show>
      </p>
      <Show when={proof()?.lambda?.problem}>
        {(said) => <Why said={said()} class="custom-problem" />}
      </Show>
      <p class="row">
        <button type="button" class="btn" onClick={() => tryText(props.prover, example())}>
          Try {example()}
        </button>
        <Show when={simple()}>
          <button type="button" class="btn" onClick={() => tryText(props.prover, TYPE_EXAMPLE)}>
            Try {TYPE_EXAMPLE}
          </button>
        </Show>
      </p>
    </>
  );
}

/**
 * An untyped term's most general simple type, or that none fits, then the term reached by the
 * steps taken with the part the next step reduces marked, and where the reduction stands.
 */
function Reduced(props: { prover: Prover }) {
  const work = () => props.prover.current()?.lambda ?? null;
  return (
    <div class="lambda-reduction">
      <Show
        when={work()?.principal}
        fallback={
          <Show when={work()?.untypable}>
            {(reason) => <p class="method-verdict">{untypableWords(reason())}</p>}
          </Show>
        }
      >
        {(judgement) => <p class="method-verdict">{principalWords(judgement())}</p>}
      </Show>
      <Show when={work()?.reached}>
        {(reached) => {
          const text = () => reached().term.text;
          const next = () => reached().next;
          return (
            <>
              <p class="lambda-term m">
                <Show when={next()} fallback={text()}>
                  {(span) => (
                    <>
                      {text().slice(0, span().start)}
                      <mark class="redex">{text().slice(span().start, span().end)}</mark>
                      {text().slice(span().end)}
                    </>
                  )}
                </Show>
              </p>
              <p class="method-verdict" role="status">
                {reductionWords(reached(), work()?.taken ?? 0, work()?.bounded ?? false)}
              </p>
            </>
          );
        }}
      </Show>
    </div>
  );
}

/** A text read: a term's verdict and derivation, or a type's term and its list. */
function Read(props: { prover: Prover }) {
  const proof = () => props.prover.current();
  const work = () => proof()?.lambda ?? null;
  const font = () => props.prover.settings().stageFont;
  const untyped = () => !!work()?.untyped;
  // An untyped term has no typing derivation to draw.
  const [drawing] = createResource(
    () => (untyped() ? undefined : (work()?.typing ?? undefined)),
    (typing) =>
      props.prover.api.lambda
        .draw(
          typing,
          JSON.stringify({
            limits: { work: props.prover.settings().budget },
            styles: { svg: { font_size: 30, font: font() } },
          }),
        )
        .catch(() => null),
  );
  const found = () => work()?.found ?? null;
  const listed = () => work()?.listed ?? null;
  return (
    <>
      <Show when={work()?.kind === "term"}>
        <p class="method-verdict" role="status">
          <Show
            when={work()?.illTyped}
            fallback={
              <Show when={work()?.typing && work()?.judgement} fallback={<>Checking…</>}>
                {(judgement) => {
                  // Read again on every change: another tab's term may take this one's place
                  // while the condition stays true.
                  const said = () =>
                    untyped()
                      ? formedWords(useOf(calculusOf(props)))
                      : typedWords({ calculus: calculusOf(props), judgement: judgement() });
                  return (
                    <>
                      <span class="kw ok">{said().keyword}</span> {said().sentence}
                    </>
                  );
                }}
              </Show>
            }
          >
            {(reason) => {
              const said = () => (untyped() ? illFormedWords(reason()) : illTypedWords(reason()));
              return (
                <>
                  <span class="kw bad">{said().keyword}</span> {said().sentence}
                </>
              );
            }}
          </Show>
        </p>
      </Show>
      <Show when={untyped() && work()?.typing}>
        <Reduced prover={props.prover} />
      </Show>
      <Show when={work()?.kind === "type"}>
        <p class="method-verdict" role="status">
          <Show when={found()} fallback={<>Looking for a term…</>}>
            {(f) => {
              const said = inhabitationWords(f());
              const tone =
                f().verdict === "inhabited" ? "ok" : f().verdict === "empty" ? "bad" : "warn";
              return (
                <>
                  <span class={`kw ${tone}`}>{said.keyword}</span> {said.sentence}
                </>
              );
            }}
          </Show>
        </p>
      </Show>
      <Show when={work()?.problem}>{(said) => <Why said={said()} class="custom-problem" />}</Show>
      <Show
        when={!untyped() && work()?.typing && drawing()}
        fallback={
          <Show when={found()?.term?.judgement}>
            {(judgement) => <p class="method-verdict m">{judgement()}</p>}
          </Show>
        }
      >
        {(svg) => <div class="custom-drawing" innerHTML={svg()} />}
      </Show>
      <Show when={found()?.verdict === "inhabited"}>
        <Show when={listed()}>
          {(l) => (
            <div class="lambda-terms">
              <p class="method-verdict">{countWords(l().count, l().terms.length)}</p>
              <ol>
                <For each={l().terms}>{(t) => <li class="m">{t.text}</li>}</For>
              </ol>
            </div>
          )}
        </Show>
      </Show>
    </>
  );
}
