// deduxit © Fabian Lukas Grubmüller 2026
// Licensed under the EUPL

/**
 * The views of a sequent beside its proofs (the guide's "+ view", boards D3, D13, D14, D19): what
 * each is called in the rail, what it is made from, the list "+ view" opens, a view brought up to
 * date, and the views that are drawn here: a translation with "Prove it in", the embedding into
 * linear logic, a proof's λ-term, a view out of date, and the graph of a sequent's views.
 */

import { createEffect, createResource, createSignal, For, type JSX, on, Show } from "solid-js";
import { produce, unwrap } from "solid-js/store";
import { failure, type Failure } from "../lib/deduxit";
import { ONE_WORLD } from "../lib/kripke";
import { isOrdinary, type OrdinarySession, type SequentForm, sequentText } from "../lib/ordinary";
import { blank, isFirstOrder, rootOf, signatureOf } from "../lib/structure";
import { intuitionistic, isNatural, linear, type Logic, ordinary, suite } from "../lib/suites";
import {
  agreementWords,
  type Comparison,
  logicName,
  TRANSLATIONS,
  translatedText,
  verdictWords,
} from "../lib/transforms";
import { displayed, noTerm } from "../lib/words";
import { ModelFigure } from "./Countermodel";
import { startPresses } from "./HandTableau";
import { cellName, netReady, started, tabText, tone } from "./Frame";
import { Sign } from "./Signs";
import type { Proof, Prover } from "./state";
import { answered, failureIn, given, Refused, Verdict } from "./Transforms";
import { useWorkspace } from "./Workspace";
import {
  type Added,
  counterOf,
  type Negative,
  setCounter,
  type Ui,
  type View,
  viewKey,
} from "./ui";

/** How a view is shown in the rail and named in full: its letters or sign, and what it is made from. */
interface ViewWords {
  readonly short: string;
  readonly name: string;
  /** Letters under the sign, in the interface's font (a translation's author: Gl). */
  readonly sub?: string;
  /** Whether its short name is a sign of the math font. */
  readonly math?: boolean;
  /** Made from the sequent, from a finished proof, or the visitor's own (never out of date). */
  readonly from: "sequent" | "proof" | "own";
}

/** Every view but a proof's own, as the rail and the list name it. */
export const VIEWS: Readonly<Record<Exclude<View, "tree">, ViewWords>> = {
  net: { short: "◇", name: "Proof net", math: true, from: "own" },
  graph: { short: "", name: "How the views hang together", from: "own" },
  table: { short: "TT", name: "Truth table", from: "sequent" },
  tableau: { short: "T", name: "Tableau", from: "sequent" },
  resolution: { short: "R", name: "Resolution", from: "sequent" },
  normal: { short: "NF", name: "Normal form", from: "sequent" },
  interpolant: { short: "I", name: "Interpolant", from: "sequent" },
  model: { short: "M", name: "A model of your own", from: "own" },
  countermodel: { short: "⊭", name: "Countermodel", math: true, from: "own" },
  glivenko: { short: "¬¬", sub: "Gl", name: "Glivenko's translation", math: true, from: "sequent" },
  kuroda: { short: "¬¬", sub: "Ku", name: "Kuroda's translation", math: true, from: "sequent" },
  "godel-gentzen": {
    short: "¬¬",
    sub: "GG",
    name: "Gödel and Gentzen's translation",
    math: true,
    from: "sequent",
  },
  kolmogorov: {
    short: "¬¬",
    sub: "Ko",
    name: "Kolmogorov's translation",
    math: true,
    from: "sequent",
  },
  embedding: { short: "!", name: "Into linear logic", math: true, from: "sequent" },
  elim: { short: "CE", name: "Cut elimination", from: "proof" },
  term: { short: "λ", name: "λ-term", math: true, from: "proof" },
};

/** Whether a view is one of the four negative translations. */
export const isNegative = (view: View): view is Negative =>
  view === "glivenko" || view === "kuroda" || view === "godel-gentzen" || view === "kolmogorov";

/** The sessions seen, numbered: a step replaces the session, so a new number says the proof changed. */
const sessionNumbers = new WeakMap<object, number>();
let lastNumber = 0;

/** A key that changes whenever the proof's session does. */
export function sessionKey(session: object | null | undefined): string {
  if (!session) return "";
  const raw = unwrap(session);
  let n = sessionNumbers.get(raw);
  if (n === undefined) {
    lastNumber += 1;
    n = lastNumber;
    sessionNumbers.set(raw, n);
  }
  return `s${n}`;
}

/** A proof's sequent as text and as deduxit's JSON, where it is an ordinary one. */
export function sequentOf(p: Proof | undefined): Added["sequent"] {
  const session = p?.session;
  if (!session || !isOrdinary(session)) return null;
  return { text: sequentText(session), form: unwrap(session.sequent) };
}

/** What a view of a proof is made from now: its sequent as text, or its session's key. */
export function sourceOf(p: Proof, view: View): string {
  if (view !== "tree" && VIEWS[view].from === "proof") return sessionKey(p.session);
  return sequentOf(p)?.text ?? "";
}

/** Whether a view added to a proof is out of date: what it was made from has changed since. */
export function staleOf(p: Proof, added: Added): boolean {
  const from = added.view === "tree" ? "own" : VIEWS[added.view].from;
  if (from === "own") return false;
  // A view of a proof that is no longer finished waits for it, as one made from a changed proof.
  if (from === "proof" && !p.view?.complete) return true;
  return added.source !== sourceOf(p, added.view);
}

/** The view a proof has added, or undefined. */
export const addedOf = (ui: Ui, proof: string, view: View) =>
  (ui.ui.added[proof] ?? []).find((a) => a.view === view);

/** Adds a view to the active proof, or shows it where it is there already. */
export function addView(prover: Prover, ui: Ui, view: View) {
  const { setUi } = ui;
  const p = prover.current();
  if (!p) return;
  if (view === "net") {
    setUi({ tab: "net", menu: null });
    return;
  }
  if (view === "model") {
    const session = p.session;
    const c = p.calculus;
    // A first-order sequent's own model is a finite structure, from one element.
    if (session && isOrdinary(session) && c.suite === "ordinary" && isFirstOrder(session.sequent)) {
      const signature = signatureOf(session.sequent);
      if (counterOf(ui, p.id)?.kind !== "structure")
        setCounter(ui, p.id, {
          kind: "structure",
          proof: p.id,
          // The sequent as typed: its JSON's arena may hold the proof's eigenvariables.
          sequent: p.input,
          root: rootOf(session),
          logic: c.logic,
          signature,
          found: false,
          now: blank(signature),
          past: [],
          future: [],
        });
      setUi({ tab: "countermodel", menu: null });
      return;
    }
    if (session && isOrdinary(session) && c.suite === "ordinary")
      setUi("modelSeed", {
        model: ONE_WORLD,
        sequent: sequentText(session),
        logic: c.logic,
        found: false,
      });
  }
  const before = ui.ui.added[p.id] ?? [];
  const entry: Added = { view, source: sourceOf(p, view), sequent: sequentOf(p) };
  setUi({
    added: {
      ...ui.ui.added,
      [p.id]: before.some((a) => a.view === view) ? before : [...before, entry],
    },
    tab: view,
    menu: null,
  });
}

/** Brings a view of a proof up to date: made again from the proof's sequent or proof as it is now. */
export function updateView(prover: Prover, ui: Ui, proof: string, view: View) {
  const p = prover.store.proofs.find((q) => q.id === proof);
  if (!p) return;
  const fresh: Added = { view, source: sourceOf(p, view), sequent: sequentOf(p) };
  ui.setUi(
    "added",
    produce((all: Record<string, readonly Added[]>) => {
      all[proof] = (all[proof] ?? []).map((a) => (a.view === view ? fresh : a));
    }),
  );
  // A tableau by hand starts again from the sequent's lines; a stepped view at its last step.
  if (view === "tableau") startPresses(proof);
  ui.setUi(
    "stepAt",
    produce((all: Record<string, number>) => {
      delete all[viewKey(proof, view)];
    }),
  );
}

/** Records whether a view has steps of its own, which bringing it up to date would lose. */
export function markSteps(ui: Ui, proof: string, view: View, steps: boolean) {
  const added = addedOf(ui, proof, view);
  if (!added || !!added.steps === steps) return;
  ui.setUi(
    "added",
    produce((all: Record<string, readonly Added[]>) => {
      all[proof] = (all[proof] ?? []).map((a) => (a.view === view ? { ...a, steps } : a));
    }),
  );
}

/** An entry of the list of views to add: its badge, its name, why it cannot be added, its action. */
export interface Entry {
  readonly group: string;
  readonly view: View | "copy";
  readonly badge: string;
  readonly sub?: string;
  readonly math?: boolean;
  readonly name: string;
  readonly there: boolean;
  readonly why: string | null;
}

/** Why a view of the classical sequent cannot be added, or null. */
function classicalWhy(p: Proof | undefined): string | null {
  const c = p?.calculus;
  if (c?.suite !== "ordinary")
    return "This needs a sequent of ordinary classical logic. Start one with + at the top.";
  if (c.logic !== "classical")
    return "This needs classical logic. Choose Classical at the top left.";
  if (isNatural(c)) return "This needs the sequent calculus. Choose Sequent at the top left.";
  return null;
}

/** The entries of the list of views to add for the active proof, in the guide's groups. */
export function entries(prover: Prover, ui: Ui): readonly Entry[] {
  const p = prover.current();
  const c = p?.calculus;
  const has = (view: View) =>
    view === "net" ? netReady(p) && !!p : !!p && !!addedOf(ui, p.id, view);
  const classical = classicalWhy(p);
  const decides = classical;
  const complete = !!p?.view?.complete;
  const cuts = p?.view?.cuts.length ?? 0;
  const termCall = c && c.suite !== "rules" ? suite(c.suite).term : null;
  const negative = (view: Negative, name: string, sub: string): Entry => ({
    group: "Translate",
    view,
    badge: "¬¬",
    sub,
    math: true,
    name,
    there: has(view),
    why: classical,
  });
  const ordinaryWhy =
    c?.suite === "ordinary" && !isNatural(c)
      ? null
      : "This needs a sequent of ordinary logic in the sequent calculus. Choose Sequent at the top left.";
  return [
    {
      group: "Prove",
      view: "tableau",
      badge: "T",
      name: "Tableau",
      there: has("tableau"),
      why: decides,
    },
    {
      group: "Prove",
      view: "resolution",
      badge: "R",
      name: "Resolution",
      there: has("resolution"),
      why: classical,
    },
    {
      group: "Prove",
      view: "copy",
      badge: cellName(c ?? linear("classical")),
      name: "A copy of this proof",
      there: false,
      why: p?.session || p?.modal?.outcome ? null : "Enter the sequent first.",
    },
    {
      group: "Prove",
      view: "net",
      badge: "◇",
      math: true,
      name: "Proof net",
      there: has("net"),
      why:
        c?.suite !== "linear"
          ? "This needs a proof of linear logic. Start one with + at the top."
          : p?.view?.net
            ? `This proof has no net: ${p.view.net.message.replace(/^not a proof net: /, "")}.`
            : complete
              ? null
              : "Finish the proof first: its net is drawn from it.",
    },
    {
      group: "Decide",
      view: "table",
      badge: "TT",
      name: "Truth table",
      there: has("table"),
      why: decides,
    },
    {
      group: "Decide",
      view: "model",
      badge: "M",
      name: "A model of your own",
      there: has("model") || (!!p && counterOf(ui, p.id)?.kind === "structure"),
      why: ordinaryWhy,
    },
    negative("glivenko", "Glivenko", "Gl"),
    negative("kuroda", "Kuroda", "Ku"),
    negative("godel-gentzen", "Gödel–Gentzen", "GG"),
    negative("kolmogorov", "Kolmogorov", "Ko"),
    {
      group: "Translate",
      view: "embedding",
      badge: "!",
      math: true,
      name: "Linear logic",
      there: has("embedding"),
      why: ordinaryWhy,
    },
    {
      group: "Read off",
      view: "interpolant",
      badge: "I",
      name: "Interpolant",
      there: has("interpolant"),
      why: classical,
    },
    {
      group: "Read off",
      view: "normal",
      badge: "NF",
      name: "Normal form",
      there: has("normal"),
      why: classical,
    },
    {
      group: "From this proof",
      view: "elim",
      badge: "CE",
      name: "Cut elimination",
      there: has("elim"),
      why: !complete
        ? "Finish the proof first: its cuts are taken out of the finished proof."
        : cuts === 0
          ? "This proof has no cuts."
          : null,
    },
    {
      group: "From this proof",
      view: "term",
      badge: "λ",
      math: true,
      name: "λ-term",
      there: has("term"),
      why: !termCall
        ? "Only a proof of ordinary or linear logic reads as a λ-term."
        : c?.suite === "ordinary" && c.logic === "classical"
          ? "A classical proof has no λ-term: it may conclude several formulas at once. Choose Intuitionistic at the top left."
          : complete
            ? null
            : "Finish the proof first: the term is read off the finished proof.",
    },
  ];
}

/** The groups of the list, in the guide's order. */
export const GROUPS = ["Prove", "Decide", "Translate", "Read off", "From this proof"] as const;

/** Adds an entry's view, or for a copy opens one beside the proof. */
export function addEntry(
  prover: Prover,
  ui: Ui,
  workspace: ReturnType<typeof useWorkspace>,
  entry: Entry,
) {
  if (entry.view !== "copy") {
    addView(prover, ui, entry.view);
    return;
  }
  const p = prover.current();
  ui.setUi("menu", null);
  if (!p || !workspace) return;
  void (async () => {
    await workspace.duplicate(p.id);
    const q = prover.current();
    if (q && q.id !== p.id) {
      prover.setBeside(q.id, p.id, "copy");
      ui.setUi("tab", "tree");
    }
  })();
}

/** A view's panel in the drawing's place: its contents, faint while it is out of date. */
export function ViewPanel(props: {
  label: string;
  stale?: boolean;
  class?: string;
  children: JSX.Element;
}) {
  return (
    <section
      class={`method view-panel${props.class ? ` ${props.class}` : ""}`}
      aria-label={props.label}
      data-stale={props.stale ? "" : undefined}
      // A long view scrolls: the keyboard reaches its contents by scrolling it.
      tabindex="0"
    >
      <h2 class="sr-only">{props.label}</h2>
      {props.children}
    </section>
  );
}

/**
 * What a view out of date shows over its contents: that its source changed, and one button,
 * "Update", or "Start again" where it has steps of its own.
 */
export function StaleBar(props: { prover: Prover; ui: Ui; proof: string; view: View }) {
  const added = () => addedOf(props.ui, props.proof, props.view);
  const fromProof = () => props.view !== "tree" && VIEWS[props.view].from === "proof";
  const p = () => props.prover.store.proofs.find((q) => q.id === props.proof);
  const waits = () => fromProof() && !p()?.view?.complete;
  const label = () => (added()?.steps ? "Start again" : "Update");
  return (
    <div class="stale-bar" role="status">
      <p>
        <span class="kw bad">Out of date.</span>{" "}
        {fromProof()
          ? waits()
            ? "The proof this view was made from has changed and is not finished. Finish it to update this view."
            : "The proof this view was made from has changed."
          : "The sequent this view was made from has changed."}
      </p>
      <Show when={!waits()}>
        <button
          type="button"
          class="btn btn-primary"
          onClick={() => {
            updateView(props.prover, props.ui, props.proof, props.view);
            if (label() === "Start again")
              props.ui.setUi("notice", { text: "Started again from the proof as it is now." });
          }}
        >
          <Sign name="update" />
          {label()}
        </button>
      </Show>
    </div>
  );
}

/** "Prove it in": the small outlined button at a translated sequent's end, with the sign of "Prove apart". */
function ProveIn(props: {
  prover: Prover;
  target: string;
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <button
      type="button"
      class="tool prove-in"
      aria-label={`Prove it in ${props.target}`}
      data-tip={`Prove it in ${props.target}`}
      disabled={props.disabled}
      onClick={() => props.onPress()}
    >
      <Sign name="apart" />
      <span class="tool-name" aria-hidden="true">
        Prove it in {props.target}
      </span>
    </button>
  );
}

/** A negative translation of the classical sequent: the translated sequent, "Prove it in", and both verdicts. */
export function TranslationView(props: {
  prover: Prover;
  ui: Ui;
  proof: string;
  translation: Negative;
  sequent: { text: string; form: unknown };
  stale: boolean;
}) {
  const words = () => TRANSLATIONS.find((t) => t.key === props.translation) ?? TRANSLATIONS[0];
  const [answer] = createResource(
    () => [props.sequent.text, props.translation] as const,
    ([text, translation]) =>
      answered(() =>
        props.prover.api.ordinary.translate(text, JSON.stringify({ translation }), "{}"),
      ),
  );
  const comparison = () => given<Comparison>(answer());
  const workspace = useWorkspace();
  const prove = async (c: Comparison) => {
    const text = translatedText(c);
    // The new sequent is linked to this one: its graph and its line say how it was made.
    if (workspace) {
      await workspace.proveTranslation(props.proof, c.translation, c.target);
      return;
    }
    const opened = await props.prover.open(text, ordinary(c.target));
    if ("problem" in opened) return;
    props.ui.setUi("live", `${displayed(text)}: opened at the top, in ${logicName(c.target)}.`);
  };
  return (
    <ViewPanel label={VIEWS[props.translation].name} stale={props.stale}>
      <Show when={props.stale}>
        <StaleBar
          prover={props.prover}
          ui={props.ui}
          proof={props.proof}
          view={props.translation}
        />
      </Show>
      <Show when={answer.loading}>
        <p class="sub">Translating, and deciding both sequents…</p>
      </Show>
      <Show when={failureIn(answer())}>{(f) => <Refused failure={f()} />}</Show>
      <Show when={!answer.loading && comparison()}>
        {(c) => {
          const said = () => agreementWords(c());
          const target = () => cellName(ordinary(c().target));
          return (
            <>
              <p class="strip translated">
                <span class="m">{translatedText(c())}</span>
                <ProveIn
                  prover={props.prover}
                  target={target()}
                  disabled={props.stale || props.prover.busy()}
                  onPress={() => void prove(c())}
                />
              </p>
              <Verdict keyword={said().keyword} tone={said().tone}>
                {said().sentence}
              </Verdict>
              <dl class="tf-evidence">
                <dt>Classical logic</dt>
                <dd>{verdictWords(c().classical, c().sequent)}</dd>
                <dt>{logicName(c().target).replace(/^./, (x) => x.toUpperCase())}</dt>
                <dd>{verdictWords(c().decided, c().translated)}</dd>
              </dl>
              <Show when={c().decided.countermodel}>
                <ModelFigure outcome={c().decided} prover={props.prover} ui={props.ui} />
              </Show>
              <p class="sub">{words()?.does}</p>
            </>
          );
        }}
      </Show>
    </ViewPanel>
  );
}

/** What the embedding of an ordinary sequent into linear logic gives: its text and its document. */
interface Embedded {
  readonly text: string;
  readonly value: { readonly mode?: string } & Record<string, unknown>;
}

/**
 * The embedding of an ordinary sequent into linear logic, made by the library's workspace on a
 * document of its own (`ordinary.embed`, the logic's default embedding), which keeps the verdict.
 */
async function embed(prover: Prover, text: string, logic: Logic): Promise<Embedded> {
  const settings = prover.json();
  const api = prover.api.workspace;
  const statement = await api.statement("ordinary", text, logic, settings);
  const made = await api.edit(
    "",
    {
      name: "embedding",
      edits: [
        { add: { kind: "ordinary.sequent", value: statement } },
        { connect: { operation: "ordinary.embed", from: [{ made: 0 }] } },
      ],
    },
    "{}",
    settings,
  );
  const node = made.made[1] as number;
  const ran = await api.run(made.workspace, [node], "{}", settings);
  const view = await api.view(ran.workspace, "{}", settings);
  const image = view.nodes.find((n) => n.node === node);
  if (!image?.summary || !image.value) {
    const why = image?.end?.reason ?? image?.end?.end ?? "it stopped";
    throw new Error(
      JSON.stringify({
        code: "page",
        kind: "refused",
        message: `deduxit did not embed this sequent within the page's bounds: ${why}.`,
      }),
    );
  }
  return { text: image.summary, value: image.value as Embedded["value"] };
}

/** The sequent embedded into linear logic, and "Prove it in" its linear logic. */
export function EmbeddingView(props: {
  prover: Prover;
  ui: Ui;
  proof: string;
  logic: Logic;
  sequent: { text: string; form: unknown };
  stale: boolean;
}) {
  const workspace = useWorkspace();
  const [answer] = createResource(
    () => [props.sequent.text, props.logic] as const,
    ([text, logic]) => answered(() => embed(props.prover, text, logic)),
  );
  const made = () => given<Embedded>(answer());
  const mode = () => (made()?.value.mode === "intuitionistic" ? "intuitionistic" : "classical");
  return (
    <ViewPanel label={VIEWS.embedding.name} stale={props.stale}>
      <Show when={props.stale}>
        <StaleBar prover={props.prover} ui={props.ui} proof={props.proof} view="embedding" />
      </Show>
      <Show when={answer.loading}>
        <p class="sub">Embedding…</p>
      </Show>
      <Show when={failureIn(answer())}>{(f) => <Refused failure={f()} />}</Show>
      <Show when={!answer.loading && made()}>
        {(m) => (
          <>
            <p class="strip translated">
              <span class="m">{m().text}</span>
              <ProveIn
                prover={props.prover}
                target={cellName(linear(mode()))}
                disabled={props.stale || props.prover.busy()}
                onPress={() =>
                  void (async () => {
                    // The new sequent is linked to this one, so that the graph shows it.
                    if (workspace) {
                      if (!(await workspace.proveEmbedding(props.proof, mode()))) return;
                    } else {
                      const opened = await props.prover.open(
                        JSON.stringify(m().value),
                        linear(mode()),
                      );
                      if ("problem" in opened) return;
                    }
                    props.ui.setUi({ tab: "tree", live: `${m().text}: opened at the top.` });
                  })()
                }
              />
            </p>
            <p class="sub">
              Each formula is translated so that linear logic proves the image exactly when{" "}
              {logicName(props.logic)} proves the sequent. A <span class="m">!</span> marks a
              formula that may be used again or not at all.
            </p>
          </>
        )}
      </Show>
    </ViewPanel>
  );
}

/** The finished proof's λ-term, by its suite's call, and "Copy as text" among the tools. */
export function TermView(props: { prover: Prover; ui: Ui; proof: Proof; stale: boolean }) {
  const [term] = createResource(
    () => (props.proof.view?.complete ? props.proof.session : undefined),
    async (session) => {
      const call = suite(isOrdinary(session) ? "ordinary" : "linear").term ?? "term";
      try {
        return await props.prover.api.term(call, session, "");
      } catch (thrown) {
        return { error: failure(thrown instanceof Error ? thrown.message : thrown) };
      }
    },
  );
  // The term shown while the view is out of date is the one read before the proof changed.
  const [kept, setKept] = createSignal<string | null>(null);
  const [problem, setProblem] = createSignal<Failure | null>(null);
  createEffect(
    on(
      () => [term(), props.stale] as const,
      ([t, stale]) => {
        if (stale || !t) return;
        if ("error" in t) {
          setProblem(t.error ?? null);
          setKept(null);
        } else {
          setProblem(null);
          setKept(t.judgement);
        }
      },
    ),
  );
  // The tools' Copy reads the term of the proof shown, which may change under the same view.
  createEffect(() => termShown.set(props.proof.id, kept));
  return (
    <ViewPanel label="λ-term" stale={props.stale}>
      <Show when={props.stale}>
        <StaleBar prover={props.prover} ui={props.ui} proof={props.proof.id} view="term" />
      </Show>
      <Show when={problem()}>
        {(f) => (
          <p class="method-verdict said-why">
            <span class="kw warn">No λ-term:</span> {noTerm(f())}.
          </p>
        )}
      </Show>
      <Show
        when={kept()}
        fallback={
          <Show when={!problem()}>
            <p class="sub">Reading the term…</p>
          </Show>
        }
      >
        {(judgement) => (
          <p class="strip term-strip">
            <span class="m">{judgement()}</span>
          </p>
        )}
      </Show>
    </ViewPanel>
  );
}

/** The λ-term each proof's view shows, by the proof, for the tools' "Copy as text". */
const [termsShown, setTermsShown] = createSignal<ReadonlyMap<string, () => string | null>>(
  new Map(),
);
/** The λ-term each proof's view shows: read where it is set, so the tools follow it. */
export const termShown = {
  get: (id: string) => termsShown().get(id),
  set: (id: string, term: () => string | null) =>
    setTermsShown((shown) => new Map(shown).set(id, term)),
};

/** A node of the graph of views: a view of a proof, or a sequent made from one. */
interface GraphNode {
  readonly key: string;
  readonly short: string;
  readonly sub?: string;
  readonly math?: boolean;
  readonly name: string;
  readonly state: string;
  readonly bad?: boolean;
  readonly stale?: boolean;
  /** A sequent made by a translation, drawn as a chip. */
  readonly chip?: boolean;
  /** The node it hangs from, or none for one made from the sequent. */
  readonly from: string | null;
  readonly open: () => void;
}

/** A proof's state in a few words, as a node of the graph shows it. */
function proofState(p: Proof): { state: string; bad: boolean } {
  const t = tone(p);
  if (t === "ok") return { state: "proved", bad: false };
  if (t === "bad") return { state: "no proof", bad: true };
  if (t === "warn") return { state: "unknown", bad: false };
  const n = p.view?.goals.length ?? 0;
  return { state: `${n} ${n === 1 ? "goal" : "goals"} open`, bad: false };
}

/**
 * The graph of a sequent's views: the sequent at the top, each view under the one it was made
 * from, joined by a line with a round elbow and an arrow head; a sequent made by a translation is
 * a node in the shape of a chip. A press opens the view.
 */
export function GraphView(props: {
  prover: Prover;
  ui: Ui;
  chip: string;
  cells: readonly {
    proof: string;
    view: View;
    short: string;
    sub?: string;
    math?: boolean;
    name: string;
    stale?: boolean;
    from?: string | null;
  }[];
}) {
  const workspace = useWorkspace();
  const nodes = (): GraphNode[] => {
    const list: GraphNode[] = [];
    for (const cell of props.cells) {
      if (cell.view === "graph") continue;
      const p = props.prover.store.proofs.find((q) => q.id === cell.proof);
      if (!p) continue;
      const key = `${cell.proof}:${cell.view}`;
      const own = cell.view === "tree" ? proofState(p) : null;
      list.push({
        key,
        short: cell.short,
        ...(cell.sub ? { sub: cell.sub } : {}),
        ...(cell.math ? { math: true } : {}),
        // The name without the letters the badge shows already.
        name: cell.name.replace(/, [^,]*$/, (end) => (end.includes(cell.short) ? "" : end)),
        state: cell.stale ? "out of date" : (own?.state ?? viewState(props.ui, p, cell.view)),
        bad: !!own?.bad,
        stale: !!cell.stale,
        from: cell.from ?? null,
        open: () => {
          props.prover.activate(cell.proof);
          props.ui.setUi({ tab: cell.view, menu: null });
        },
      });
      // The sequents the workspace made from this proof's sequent by a translation, as chips.
      if (cell.view === "tree" && workspace) {
        for (const row of workspace.rows()) {
          if (row.line?.kind !== "made") continue;
          const fromTab = workspace.rows().find((r) => r.node === row.line?.from)?.tab;
          if (fromTab !== cell.proof) continue;
          const made = props.prover.store.proofs.find((q) => q.id === row.tab);
          // A view beside a sequent made so (a copy of its proof) is a cell of that chip.
          if (!made || props.prover.chipOf(made.id) !== made.id) continue;
          list.push({
            key: `sequent:${row.tab}`,
            short: "",
            name: made.input ? tabText(made) : row.now,
            state: row.line.label,
            chip: true,
            stale: row.state === "out_of_date",
            from: key,
            open: () => {
              props.prover.activate(row.tab);
              props.ui.setUi({ tab: "tree", menu: null });
            },
          });
        }
      }
    }
    return list;
  };
  const chip = () => props.prover.store.proofs.find((q) => q.id === props.chip);
  const depth = (n: GraphNode, all: readonly GraphNode[]): number => {
    let d = 1;
    let at: GraphNode | undefined = n;
    while (at?.from) {
      const from: string = at.from;
      at = all.find((m) => m.key === from);
      d += 1;
      if (d > 8) break;
    }
    return d;
  };
  return (
    <ViewPanel label="How the views hang together" class="graph-view">
      <ol class="graph">
        <li class="graph-sequent m">{chip() ? tabText(chip() as Proof) : ""}</li>
        <For each={nodes()}>
          {(n) => (
            <li
              class="graph-node"
              data-depth={String(Math.min(depth(n, nodes()), 6))}
              data-stale={n.stale ? "" : undefined}
              data-chip={n.chip ? "" : undefined}
            >
              <span class="graph-elbow" aria-hidden="true" />
              <button
                type="button"
                class="graph-button"
                // The name starts with what the node shows, the badge's letters first (WCAG 2.5.3).
                aria-label={`${n.chip ? "" : `${n.short}${n.sub ? ` ${n.sub}` : ""} `}${n.name}, ${n.state}`}
                onClick={() => n.open()}
              >
                <Show when={!n.chip}>
                  <span class={`graph-badge${n.math ? " m" : ""}`}>
                    <span>{n.short}</span>
                    <Show when={n.sub}>
                      {" "}
                      <span class="cell-sub">{n.sub}</span>
                    </Show>
                  </span>{" "}
                </Show>
                <span class="graph-words">
                  <span class={`graph-name${n.chip ? " m" : ""}`}>{n.name}</span>
                  {/* A space between the two lines: the name's words stay apart (WCAG 2.5.3). */}{" "}
                  <span class="graph-state" data-bad={n.bad ? "" : undefined}>
                    {n.state}
                  </span>
                </span>
              </button>
            </li>
          )}
        </For>
      </ol>
    </ViewPanel>
  );
}

/** A view's state in a few words, for its node in the graph. */
function viewState(ui: Ui, p: Proof, view: View): string {
  switch (view) {
    case "net":
      return "drawn from the finished proof";
    case "elim": {
      const e = p.elim.tree;
      if (!e) return "not started";
      const left = e.reached.cuts.length;
      return left === 0 ? "cut-free" : `${left} ${left === 1 ? "cut" : "cuts"} left`;
    }
    case "term":
      return termShown.get(p.id)?.() ?? "read off the proof";
    case "countermodel":
      return "refutes the sequent";
    case "model":
      return "a model of your own";
    default:
      if (isNegative(view)) {
        const to = TRANSLATIONS.find((t) => t.key === view)?.target;
        return to ? `into ${logicName(to)}` : "a translation";
      }
      if (view === "embedding") return "into linear logic";
      return wayWords(ui, p.id, view) ?? "of the sequent";
  }
}

/** The way a view with a toggle works, in words for the graph, or null. */
function wayWords(ui: Ui, proof: string, view: View): string | null {
  const way = ui.ui.ways[viewKey(proof, view)];
  if (view === "tableau") return way === "hand" ? "by hand" : "by search";
  if (view === "resolution")
    return way === "hand" ? "by hand" : way === "dpll" ? "DPLL" : "by search";
  if (view === "normal") return way ? way.toUpperCase() : "CNF";
  return null;
}

/** Whether a proof's calculus is intuitionistic linear logic, which the embedding may open in. */
export const linearIntuitionistic = (p: Proof) => intuitionistic(p.calculus);

/** Re-exported for the rail: a proof's session as an ordinary one, or null. */
export const ordinaryOf = (p: Proof | undefined): OrdinarySession | null =>
  p?.session && isOrdinary(p.session) ? p.session : null;

/** The started state, re-exported for the stage. */
export { started };

/** The sequent form of a view's snapshot. */
export const formOf = (s: { form: unknown }) => s.form as SequentForm;
