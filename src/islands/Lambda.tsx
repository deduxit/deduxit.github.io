// deduxit © Fabian Lukas Grubmüller 2026
// Licensed under the EUPL

/**
 * Lambda-terms in the stage's place. Before anything is typed: what a typed term is, and a term
 * and a type to try. A term typed is checked: its type and its typing derivation drawn, a
 * judgement per part, or why it is not well typed. A type typed gets a term found, which deduxit
 * reads back from a proof of the type's formula, or the news that it has none; its terms are
 * listed and counted on request. Nothing leaves the page: deduxit runs in its worker.
 */

import { createResource, For, Show } from "solid-js";
import {
  CALCULUS_SENTENCES,
  countWords,
  illTypedWords,
  inhabitationWords,
  LINEAR_EXAMPLE,
  TERM_EXAMPLE,
  TYPE_EXAMPLE,
  typedWords,
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
const calculusOf = (props: { prover: Prover }) => {
  const c = props.prover.current()?.calculus;
  return c?.suite === "lambda" ? c.calculus : "simple";
};

/** Before anything is read: what a typed term is, and a term and a type to try. */
function Setup(props: { prover: Prover }) {
  const proof = () => props.prover.current();
  const simple = () => calculusOf(props) === "simple";
  const example = () => (simple() ? TERM_EXAMPLE : LINEAR_EXAMPLE);
  const tryText = (text: string) => {
    const p = proof();
    if (!p) return;
    props.prover.setInput(p.id, text);
    void props.prover.submit(p.id);
  };
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
              {CALCULUS_SENTENCES[calculusOf(props)]}
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
        <button type="button" class="btn" onClick={() => tryText(example())}>
          Try {example()}
        </button>
        <Show when={simple()}>
          <button type="button" class="btn" onClick={() => tryText(TYPE_EXAMPLE)}>
            Try {TYPE_EXAMPLE}
          </button>
        </Show>
      </p>
    </>
  );
}

/** A text read: a term's verdict and derivation, or a type's term and its list. */
function Read(props: { prover: Prover }) {
  const proof = () => props.prover.current();
  const work = () => proof()?.lambda ?? null;
  const font = () => props.prover.settings().stageFont;
  const [drawing] = createResource(
    () => work()?.typing ?? undefined,
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
                  const said = typedWords({ calculus: calculusOf(props), judgement: judgement() });
                  return (
                    <>
                      <span class="kw ok">{said.keyword}</span> {said.sentence}
                    </>
                  );
                }}
              </Show>
            }
          >
            {(reason) => {
              const said = illTypedWords(reason());
              return (
                <>
                  <span class="kw bad">{said.keyword}</span> {said.sentence}
                </>
              );
            }}
          </Show>
        </p>
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
        when={work()?.typing && drawing()}
        fallback={
          <Show when={found()?.term?.judgement}>
            {(judgement) => <p class="method-verdict m">{judgement()}</p>}
          </Show>
        }
      >
        {(svg) => <div class="custom-drawing" innerHTML={svg()} />}
      </Show>
      <Show when={found()?.verdict === "inhabited"}>
        <Show
          when={listed()}
          fallback={
            <p class="row">
              <button
                type="button"
                class="btn"
                disabled={props.prover.busy()}
                onClick={() => {
                  const p = proof();
                  if (p) void props.prover.lambdaList(p.id);
                }}
              >
                List its terms
              </button>
            </p>
          }
        >
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
