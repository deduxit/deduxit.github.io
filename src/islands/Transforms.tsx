// deduxit © Fabian Lukas Grubmüller 2026
// Licensed under the EUPL

/**
 * A classical proof's sequent translated into intuitionistic or minimal logic, and its
 * interpolant: two sheets over the stage, opened from the tab's Logic popover and nowhere else,
 * so that a visitor who does not ask sees nothing of them. Each says its verdict in one sentence
 * first: for a translation both verdicts and that they agree, for an interpolant the formula and
 * its three checks. The translated sequent opens as a proof of its own in its logic's tab.
 */

import { CircleCheck, CircleQuestionMark } from "lucide-solid";
import {
  createEffect,
  createResource,
  createSignal,
  For,
  type JSX,
  on,
  onMount,
  Show,
} from "solid-js";
import { type Failure, failure as failureOf } from "../lib/deduxit";
import { formulaTexts, isOrdinary, type SequentForm, sequentText } from "../lib/ordinary";
import { ordinary } from "../lib/suites";
import {
  agreementWords,
  type Comparison,
  type Half,
  halfText,
  hypotheses,
  type Interpolation,
  interpolantAtoms,
  joinWords,
  listed,
  logicName,
  moved,
  type Partition,
  TRANSLATIONS,
  type Translation,
  translatedText,
  verdictWords,
} from "../lib/transforms";
import { displayed } from "../lib/words";
import { ModelFigure } from "./Countermodel";
import type { Prover } from "./state";
import { useWorkspace } from "./Workspace";
import type { Ui } from "./ui";

/** deduxit's answer: what it gave, or what it refused. */
type Answer<T> = { readonly value: T } | { readonly failure: Failure };

/** The answer's value, or undefined while it loads or where deduxit refused. */
const given = <T,>(a: Answer<T> | undefined) => (a && "value" in a ? a.value : undefined);
/** What deduxit refused, or undefined. */
const failureIn = <T,>(a: Answer<T> | undefined) => (a && "failure" in a ? a.failure : undefined);

/** Calls deduxit and keeps a refusal as the answer, so that the sheet can say it. */
async function answered<T>(call: () => Promise<T>): Promise<Answer<T>> {
  try {
    return { value: await call() };
  } catch (thrown) {
    return { failure: failureOf(thrown) };
  }
}

/** The started classical proof's sequent: its text and its JSON, or undefined for any other proof. */
function classicalSequent(prover: Prover) {
  return () => {
    const p = prover.current();
    const session = p?.session;
    if (!session || !isOrdinary(session) || p.calculus.suite !== "ordinary") return undefined;
    if (p.calculus.logic !== "classical") return undefined;
    return { text: sequentText(session), form: session.sequent as unknown as SequentForm };
  };
}

/** A sheet over the stage with its title, which takes the focus when the sheet opens. */
function Sheet(props: { ui: Ui; title: string; intro: string; children: JSX.Element }) {
  let title: HTMLHeadingElement | undefined;
  onMount(() => title?.focus());
  return (
    <div class="cluster menu transform" role="dialog" aria-label={props.title}>
      <h2 class="pr-title" tabindex="-1" ref={title}>
        {props.title}
      </h2>
      <p class="sub tf-intro">{props.intro}</p>
      {props.children}
    </div>
  );
}

/** The keyword and sentence that open an answer. */
function Verdict(props: { keyword: string; tone: "ok" | "bad" | "warn"; children: JSX.Element }) {
  return (
    <p class="method-verdict" role="status">
      <span class={`kw ${props.tone}`}>{props.keyword}</span> {props.children}
    </p>
  );
}

/** What deduxit refused, in its words: no wording of the page's covers these calls' refusals. */
function Refused(props: { failure: Failure }) {
  return <p class="method-verdict said-why">{props.failure.message}</p>;
}

export function TranslateSheet(props: { prover: Prover; ui: Ui }) {
  const { setUi } = props.ui;
  const sequent = classicalSequent(props.prover);
  createEffect(() => {
    if (!sequent()) setUi("menu", null);
  });
  const [chosen, setChosen] = createSignal<Translation>("glivenko");
  const words = () => TRANSLATIONS.find((t) => t.key === chosen()) ?? TRANSLATIONS[0];
  const [answer] = createResource(
    () => {
      const s = sequent();
      return s ? ([s.text, chosen()] as const) : undefined;
    },
    ([text, translation]) =>
      answered(() =>
        props.prover.api.ordinary.translate(text, JSON.stringify({ translation }), "{}"),
      ),
  );
  const comparison = () => given<Comparison>(answer());

  const workspace = useWorkspace();
  const prove = async (c: Comparison) => {
    const text = translatedText(c);
    setUi("menu", null);
    const tab = props.prover.current()?.id;
    // The new tab is linked to this one: the line above it says how it was made.
    if (workspace && tab) {
      await workspace.proveTranslation(tab, c.translation, c.target);
      return;
    }
    const opened = await props.prover.open(text, ordinary(c.target));
    if ("problem" in opened) return;
    setUi("live", `${displayed(text)}: opened on a new tab in ${logicName(c.target)}.`);
  };

  return (
    <Sheet
      ui={props.ui}
      title="Translate into intuitionistic logic"
      intro="A negative translation adds double negations, so that intuitionistic or minimal logic proves the translated sequent exactly when classical logic proves the sequent."
    >
      <fieldset class="seg tf-seg" aria-label="Translation">
        <For each={TRANSLATIONS}>
          {(t) => (
            <button
              type="button"
              class="seg-b"
              aria-pressed={chosen() === t.key}
              onClick={() => setChosen(t.key)}
            >
              {t.name}
            </button>
          )}
        </For>
      </fieldset>
      <p class="sub">
        {words()?.does} {joinWords(sequent()?.form.right.length ?? 0)} It translates into{" "}
        {logicName(words()?.target ?? "intuitionistic")}.
      </p>
      <section class="tf-answer" aria-busy={answer.loading} aria-label="The translation">
        <Show when={answer.loading}>
          <p class="sub">Translating, and deciding both sequents…</p>
        </Show>
        <Show when={failureIn(answer())}>{(f) => <Refused failure={f()} />}</Show>
        <Show when={!answer.loading && comparison()}>
          {(c) => {
            const said = () => agreementWords(c());
            return (
              <>
                <Verdict keyword={said().keyword} tone={said().tone}>
                  {said().sentence}
                </Verdict>
                <p class="tf-to">
                  <span class="m">{translatedText(c())}</span>
                </p>
                <p class="row">
                  <button
                    type="button"
                    class="btn btn-primary"
                    disabled={props.prover.busy()}
                    onClick={() => void prove(c())}
                  >
                    Prove it in {logicName(c().target)}
                  </button>
                </p>
                <dl class="tf-evidence">
                  <dt>Classical logic</dt>
                  <dd>{verdictWords(c().classical, c().sequent)}</dd>
                  <dt>{logicName(c().target).replace(/^./, (x) => x.toUpperCase())}</dt>
                  <dd>{verdictWords(c().decided, c().translated)}</dd>
                </dl>
                <Show when={c().decided.countermodel}>
                  <ModelFigure outcome={c().decided} prover={props.prover} />
                </Show>
              </>
            );
          }}
        </Show>
      </section>
    </Sheet>
  );
}

export function InterpolateSheet(props: { prover: Prover; ui: Ui }) {
  const { setUi } = props.ui;
  const sequent = classicalSequent(props.prover);
  createEffect(() => {
    if (!sequent()) setUi("menu", null);
  });
  /** The first part chosen, or null for Craig's split, the formulas left of ⊢. */
  const [chosen, setChosen] = createSignal<Partition | null>(null);
  createEffect(
    on(
      () => sequent()?.text,
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
    <Sheet
      ui={props.ui}
      title="Find an interpolant"
      intro="An interpolant is a formula between the two parts of a valid sequent: the first part proves it, it proves the rest with the second part, and it uses only atoms both parts share."
    >
      <p class="sub">Press a formula to move it to the other part.</p>
      <fieldset class="tf-parts" aria-label="The sequent's two parts">
        <For each={sequent()?.form.left ?? []}>
          {(index, k) => <Part side="left" k={k()} index={index} />}
        </For>
        <span class="m tf-turnstile">⊢</span>
        <For each={sequent()?.form.right ?? []}>
          {(index, k) => <Part side="right" k={k()} index={index} />}
        </For>
      </fieldset>
      <section class="tf-answer" aria-busy={answer.loading} aria-label="The interpolant">
        <Show when={answer.loading}>
          <p class="sub">Deciding the sequent, and checking the interpolant…</p>
        </Show>
        <Show when={failureIn(answer())}>{(f) => <Refused failure={f()} />}</Show>
        <Show when={!answer.loading && found()}>
          {(i) => <InterpolantView found={i()} prover={props.prover} />}
        </Show>
      </section>
    </Sheet>
  );
}

/** An interpolation's answer: the interpolant and its checks, or why there is none. */
function InterpolantView(props: { found: Interpolation; prover: Prover }) {
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
              <ModelFigure outcome={outcome()} prover={props.prover} />
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
      <Show when={props.ok} fallback={<CircleQuestionMark aria-hidden="true" />}>
        <CircleCheck aria-hidden="true" />
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
