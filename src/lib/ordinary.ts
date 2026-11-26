// deduxit © Fabian Lukas Grubmüller 2026
// Licensed under the EUPL

/**
 * The ordinary suite as the page reads it: deduxit's `ordinary_…` calls prove a sequent of
 * classical, intuitionistic or minimal propositional logic step by step in LK or LJ, and draw
 * the derivation itself, never its linear image. Their documents (the bindings' doc comments
 * on the calls `ordinary_…`) are read here into the shapes the stage, the dock and the bands already
 * show: a goal's formulas numbered left of ⊢ first, then right of it, as the drawing's
 * `i<n>-<p>` ids number them; a step's formula by its side and its position there.
 */

import type { Failure, GoalFormula, StepForm, View } from "./deduxit";
import { subtree } from "./steps";
import type { Structure } from "./structure";
import type { Logic } from "./suites";
import { type Said, type Tone, witnessFault } from "./words";

/** An inference of an ordinary session: a goal while it has no rule. */
export interface OrdinaryInference {
  readonly left: readonly number[];
  readonly right: readonly number[];
  readonly rule?: string;
  readonly principal?: readonly [Side, number];
  readonly premises?: readonly number[];
}

/** An ordinary session, deduxit's `ordinary::Interactive` at wire level 8. */
export interface OrdinarySession {
  readonly version: number;
  readonly logic: Logic;
  readonly sequent: { readonly [key: string]: unknown };
  readonly inferences: readonly OrdinaryInference[];
  readonly history: readonly number[];
}

/** A side of ⊢, as the ordinary calls name it. */
export type Side = "left" | "right";

/** What `ordinary_view` answers. */
export interface OrdinaryView {
  readonly logic: Logic;
  readonly calculus: string;
  readonly complete: boolean;
  readonly steps: number;
  readonly goals: readonly {
    readonly goal: number;
    readonly left: readonly string[];
    readonly right: readonly string[];
  }[];
  readonly inferences: readonly number[];
  /** The goals the steps closed by a rule invertible in the session's logic, in order. */
  readonly invertible: readonly number[];
  /**
   * Each quantifier step's inference and the term it took, as text the session's `witness`
   * reads (`null` for a witness left open); left out of a proof without one.
   */
  readonly opened?: readonly { readonly inference: number; readonly term: string | null }[];
}

/** The ordinary rules whose step takes a witness: the rest of the quantifier rules make one. */
export const WITNESSED_ORDINARY: ReadonlySet<string> = new Set(["∀L", "∃R"]);

/** A Kripke model as deduxit writes it: each world's atoms and arrows up, and the model's world. */
export interface KripkeModel {
  readonly worlds: readonly {
    readonly atoms: readonly string[];
    readonly falsity?: boolean;
    readonly arrows?: readonly number[];
  }[];
  readonly world: number;
}

/** An ordinary outcome: valid with its derivation, not valid, or unknown with its reason. */
export interface OrdinaryOutcome {
  readonly version: number;
  readonly verdict: "valid" | "not_valid" | "unknown";
  readonly logic: Logic;
  readonly reason?: { readonly kind: string; readonly [key: string]: unknown };
  /**
   * How it was decided: a goal of a session through the embedding, `{"method": "embedding",
   * "translation", "image"}`, `image` the translated sequent's outcome with its engine.
   */
  readonly search?: {
    readonly method: string;
    readonly translation?: string;
    readonly image?: { readonly engine?: string; readonly [key: string]: unknown };
    readonly [key: string]: unknown;
  };
  /** A `not_valid` goal's Kripke model, with the sequent it refutes, where deduxit found one. */
  readonly countermodel?: { readonly sequent: unknown; readonly model: KripkeModel };
  /** A `not_valid` first-order goal's finite structure, with the sequent it refutes. */
  readonly structure?: { readonly sequent: unknown; readonly structure: Structure };
  /**
   * A `not_valid` first-order goal's Kripke model with growing domains, in intuitionistic and
   * minimal logic, where no finite structure was found; the page does not draw it.
   */
  readonly kripke_structure?: unknown;
  readonly [key: string]: unknown;
}

/** The countermodel of an outcome, where it is an ordinary "not valid" that has one. */
export const countermodelOf = (outcome: unknown): KripkeModel | undefined => {
  const o = outcome as OrdinaryOutcome | undefined;
  return o?.verdict === "not_valid" && o.countermodel ? o.countermodel.model : undefined;
};

/** The finite structure of an outcome, where it is a first-order "not valid" that has one. */
export const structureOf = (outcome: unknown): OrdinaryOutcome["structure"] => {
  const o = outcome as OrdinaryOutcome | undefined;
  return o?.verdict === "not_valid" ? o.structure : undefined;
};

/**
 * A step as `ordinary_apply` takes it: the formula's side and position there, the rule, and for
 * ∃R or ∀L the witness as text (left out: open, `$1`).
 */
export interface OrdinaryStep {
  readonly side: Side;
  readonly position: number;
  readonly rule: string;
  readonly witness?: string;
}

/** Whether a document is an ordinary session: it names a logic, where a linear one names a mode. */
export const isOrdinary = (doc: unknown): doc is OrdinarySession =>
  typeof doc === "object" && doc !== null && "logic" in doc && "inferences" in doc;

/** Whether a document is an ordinary sequent's JSON: its formulas and its two sides. */
export const isOrdinarySequent = (doc: unknown): boolean =>
  typeof doc === "object" &&
  doc !== null &&
  !("inferences" in doc) &&
  ["formulas", "left", "right"].every((key) =>
    Array.isArray((doc as Record<string, unknown>)[key]),
  );

/** A text's JSON, or undefined where it is none: a sequent typed is not JSON. */
export function json(text: string): unknown {
  if (!text.trim().startsWith("{")) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

/** A formula of an ordinary sequent's JSON: an atom by its index, a constant, or a connective over earlier formulas. */
type Node = string | { readonly [tag: string]: number | readonly number[] };

/** An ordinary sequent's JSON: its formulas, operands first, its atoms and its two sides. */
export interface SequentForm {
  readonly formulas: readonly Node[];
  readonly atoms: readonly string[];
  readonly left: readonly number[];
  readonly right: readonly number[];
}

/**
 * Every formula of an ordinary sequent's JSON written in signs, by its index, each compound part
 * parenthesised, as the ordinary parser reads it back.
 */
export function formulaTexts(form: SequentForm): string[] {
  const { formulas, atoms } = form;
  const written: string[] = [];
  // Every subformula precedes the formulas built from it, so one pass in order writes them all.
  formulas.forEach((node, i) => {
    const part = (k: number) => {
      const text = written[k] ?? "";
      return typeof formulas[k] === "object" &&
        !("V" in (formulas[k] as object)) &&
        !("¬" in (formulas[k] as object))
        ? `(${text})`
        : text;
    };
    if (typeof node === "string") written[i] = node;
    else {
      const [tag, args] = Object.entries(node)[0] as [string, number | readonly number[]];
      if (tag === "V") written[i] = atoms[args as number] ?? "?";
      else if (tag === "¬") written[i] = `¬${part(args as number)}`;
      else {
        const [a, b] = args as readonly number[];
        written[i] = `${part(a as number)} ${tag} ${part(b as number)}`;
      }
    }
  });
  return written;
}

/** An ordinary sequent's JSON written in signs: `Γ ⊢ Δ`. */
export function formText(form: SequentForm): string {
  const written = formulaTexts(form);
  const side = (list: readonly number[]) => list.map((k) => written[k] ?? "").join(", ");
  return `${side(form.left)}${form.left.length ? " " : ""}⊢ ${side(form.right)}`.trimEnd();
}

/**
 * An ordinary session's sequent as the field reads it, each compound part parenthesised and
 * written in signs, which the ordinary parser reads back.
 */
export const sequentText = (session: OrdinarySession): string =>
  formText(session.sequent as unknown as SequentForm);

/**
 * Undo on a branch: the session without the step that opened `goal` and
 * every step since in that step's premises, or without its last step where `goal` is left
 * out (a finished proof). A step is an entry of the history, the goal it expanded, and its
 * inferences are that goal's subtree: its own (a structural run below its rule, or a search's
 * derivation) and every later step's above them. deduxit appends a step's inferences after the
 * goal's, so taking the subtree out and numbering the rest anew in their order leaves the session
 * the other steps would have made; deduxit's reader checks it again on the next call. Undefined
 * where the branch has no step.
 *
 * With `invertible`, the goals an invertible rule closed (the view's), as when the page applies
 * those rules by itself: the step taken back is the nearest on the branch that is not one, so
 * that undo takes back the visitor's last choice with the invertible steps after it. Undefined
 * when every step on the branch is one.
 */
export function retract(
  doc: OrdinarySession,
  goal: number | undefined,
  invertible?: ReadonlySet<number>,
): { session: OrdinarySession; reopened: number } | undefined {
  const steps = new Set(doc.history);
  const parent = new Map<number, number>();
  doc.inferences.forEach((inference, i) => {
    for (const premise of inference.premises ?? []) parent.set(premise, i);
  });
  // The step whose run holds inference `at`: up through the contractions below a shared rule,
  // or a graft.
  const below = (at: number | undefined) => {
    let step = at;
    while (step !== undefined && !steps.has(step)) step = parent.get(step);
    return step;
  };
  let step: number | undefined;
  if (goal === undefined) step = doc.history.findLast((g) => !invertible?.has(g));
  else {
    step = below(parent.get(goal));
    while (step !== undefined && invertible?.has(step)) step = below(parent.get(step));
  }
  if (step === undefined) return undefined;
  return reopen(doc, step);
}

/**
 * The session with a step taken back: the goal it expanded open again, every inference above
 * it gone and the rest numbered anew in their order, and that goal's new number.
 */
function reopen(
  doc: OrdinarySession,
  step: number,
): { session: OrdinarySession; reopened: number } {
  const gone = new Set(subtree(doc, step));
  gone.delete(step);
  const kept = doc.inferences.flatMap((_, i) => (gone.has(i) ? [] : [i]));
  const index = new Map(kept.map((old, i) => [old, i]));
  const at = (old: number) => index.get(old) as number;
  const inferences = kept.map((old): OrdinaryInference => {
    const inference = doc.inferences[old] as OrdinaryInference;
    if (old === step) return { left: inference.left, right: inference.right };
    return inference.premises ? { ...inference, premises: inference.premises.map(at) } : inference;
  });
  const history = doc.history.filter((g) => g !== step && !gone.has(g)).map(at);
  return { session: { ...doc, inferences, history }, reopened: at(step) };
}

/**
 * Each step of an ordinary session, in the order taken: the goal it expanded and its rule, the
 * rule above the structural run deduxit makes below a step (the contractions of a shared rule,
 * the weakenings of an axiom with a context).
 */
export function stepsOf(doc: OrdinarySession): { goal: number; rule: string }[] {
  const steps = new Set(doc.history);
  const structural = new Set(["WL", "WR", "CL", "CR"]);
  return doc.history.map((goal) => {
    let at = goal;
    for (;;) {
      const inference = doc.inferences[at];
      const next = inference?.premises?.[0];
      if (
        !inference?.rule ||
        !structural.has(inference.rule) ||
        next === undefined ||
        steps.has(next) ||
        doc.inferences[next]?.rule === undefined
      )
        return { goal, rule: inference?.rule ?? "" };
      at = next;
    }
  });
}

/**
 * Each step of an ordinary session as `ordinary_apply` takes it again on the goal it expanded:
 * the rule above the structural run (`stepsOf`) and its principal, found in the goal's own lists
 * by the formula it is (a run's contractions copy formulas, its weakenings drop them). An axiom
 * names no principal: its formula is the one on both sides of ⊢. Each step comes with its formula
 * in the sequent document (the same in every session started from that document, whatever the
 * logic: LK and LJ keep different formulas in a goal, so a position does not carry over) and the
 * premises it made above its run, the goals the next steps expand.
 */
export function replaySteps(
  doc: OrdinarySession,
): { goal: number; step: OrdinaryStep; formula: number; premises: readonly number[] }[] {
  const steps = stepsOf(doc);
  return doc.history.flatMap((goal, k) => {
    const taken = takenAt(doc, goal, steps[k]?.rule ?? "");
    return taken ? [{ goal, ...taken }] : [];
  });
}

/**
 * A step on `goal` as `ordinary_apply` takes it again, by the rule above its structural run;
 * undefined where the goal holds no such step.
 */
function takenAt(
  doc: OrdinarySession,
  goal: number,
  rule: string,
): { step: OrdinaryStep; formula: number; premises: readonly number[] } | undefined {
  // The inference that holds the rule: the top of the goal's structural run.
  let at = goal;
  while (doc.inferences[at]?.rule !== rule) {
    const next = doc.inferences[at]?.premises?.[0];
    if (next === undefined) return undefined;
    at = next;
  }
  const top = doc.inferences[at];
  const below = doc.inferences[goal];
  if (!top || !below) return undefined;
  const [side, position] = top.principal ?? [
    "right" as Side,
    top.right.findIndex((f) => top.left.includes(f)),
  ];
  const formula = top[side][position];
  const at_ = formula === undefined ? -1 : below[side].indexOf(formula);
  // The premises the step made, above its run: what the next steps act on.
  return at_ < 0 || formula === undefined
    ? undefined
    : { step: { side, position: at_, rule }, formula, premises: top.premises ?? [] };
}

/**
 * The formula each step of an ordinary session acted on, by its entry in the history, as
 * deduxit's view writes it (`view` is `ordinary_view` on a session's JSON): a rule's principal
 * formula, an axiom's formula, null where none is found. The document numbers formulas and has
 * no text of its own, so each step's goal is opened again and read from the view.
 */
export function principalTexts(
  doc: OrdinarySession,
  view: (session: string) => string,
): (string | null)[] {
  const steps = stepsOf(doc);
  return doc.history.map((goal, k) => {
    const taken = takenAt(doc, goal, steps[k]?.rule ?? "");
    if (!taken) return null;
    try {
      const { session, reopened } = reopen(doc, goal);
      const shown = (JSON.parse(view(JSON.stringify(session))) as OrdinaryView).goals.find(
        (g) => g.goal === reopened,
      );
      return shown?.[taken.step.side][taken.step.position] ?? null;
    } catch {
      return null;
    }
  });
}

/** A formula of the sequent document by its place in a goal's side, or -1 where it is not there. */
export function placeOf(doc: OrdinarySession, goal: number, side: Side, formula: number): number {
  return doc.inferences[goal]?.[side].indexOf(formula) ?? -1;
}

/** Why an ordinary proof has no net to show. */
const NO_NET: Failure = {
  code: "page",
  kind: "ordinary",
  message: "proof nets are drawn for linear logic; an ordinary proof is its LK or LJ derivation",
};

/**
 * An ordinary view as the page shows a view: each goal's formulas left of ⊢ first, as inputs,
 * then right of it, the position of each its place in that order, which the drawing's ids use.
 */
export function asView(v: OrdinaryView): View {
  return {
    fragment: v.calculus,
    complete: v.complete,
    steps: v.steps,
    goals: v.goals.map((g) => ({
      goal: g.goal,
      formulas: [
        ...g.left.map(
          (text, i): GoalFormula => ({ text, occurrence: i, side: "input", reading: text }),
        ),
        ...g.right.map(
          (text, i): GoalFormula => ({
            text,
            occurrence: g.left.length + i,
            side: "output",
            reading: text,
          }),
        ),
      ],
    })),
    inferences: v.inferences,
    invertible: v.invertible,
    ...(v.opened ? { opened: v.opened } : {}),
    net: NO_NET,
    cuts: [],
  };
}

/** A goal's formula by its place on the page, as the side and position the ordinary calls take. */
export function sided(
  formulas: readonly GoalFormula[],
  position: number,
): { side: Side; position: number } {
  const left = formulas.filter((f) => f.side === "input").length;
  return position < left
    ? { side: "left", position }
    : { side: "right", position: position - left };
}

/** A step of the page's (a place, or a side and position given) as `ordinary_apply` takes it. */
export function ordinaryStep(formulas: readonly GoalFormula[], step: StepForm): OrdinaryStep {
  const witness = step.witness === undefined ? {} : { witness: step.witness };
  if (step.side) return { side: step.side, position: step.position, rule: step.rule, ...witness };
  return { ...sided(formulas, step.position), rule: step.rule, ...witness };
}

/**
 * A hint's steps as the page's: the first by its place in the goal (the ladder points at that
 * formula), every one with its side, since each acts on the goal the one before opened.
 */
export function hintSteps(
  formulas: readonly GoalFormula[],
  steps: readonly OrdinaryStep[],
): StepForm[] {
  const left = formulas.filter((f) => f.side === "input").length;
  return steps.map((s, i) =>
    i === 0
      ? { position: s.side === "left" ? s.position : left + s.position, rule: s.rule }
      : { side: s.side, position: s.position, rule: s.rule },
  );
}

/** The ordinary sequent as the tab shows it: the ASCII connectives as their signs. */
export function prettyOrdinary(input: string): string {
  return input
    .replaceAll("|-", "⊢")
    .replaceAll("<->", "↔")
    .replaceAll("->", "→")
    .replaceAll("/\\", "∧")
    .replaceAll("\\/", "∨")
    .replaceAll("~", "¬")
    .replace(/\btrue\b/g, "⊤")
    .replace(/\bfalse\b/g, "⊥");
}

/** A logic's name in a sentence. */
const named = (logic: Logic) => `${logic} logic`;

/** An ordinary outcome in the page's words: the verdict's keyword, its reason and its tone. */
export function ordinaryVerdict(outcome: OrdinaryOutcome): Said & { tone: Tone } {
  if (outcome.verdict === "valid") {
    return {
      keyword: "Valid",
      sentence: `The search found a derivation, and deduxit's checker accepted it in ${named(outcome.logic)}.`,
      tone: "ok",
    };
  }
  if (outcome.verdict === "not_valid" && outcome.structure) {
    return {
      keyword: "Not valid",
      sentence: `The sequent has no derivation in ${named(outcome.logic)}. deduxit found a finite structure that makes every formula left of ⊢ true and every formula right of it false.`,
      tone: "bad",
    };
  }
  if (outcome.verdict === "not_valid" && outcome.countermodel) {
    return {
      keyword: "Not valid",
      sentence: `The sequent has no derivation in ${named(outcome.logic)}. deduxit found a Kripke model that shows it: a sequent with a derivation holds at every world of every model, and this one fails at world ${String(outcome.countermodel.model.world)}.`,
      tone: "bad",
    };
  }
  if (outcome.verdict === "not_valid" && outcome.kripke_structure) {
    return {
      keyword: "Not valid",
      sentence: `The sequent has no derivation in ${named(outcome.logic)}. deduxit found a Kripke model whose worlds have growing domains of elements, at one of which the sequent fails.`,
      tone: "bad",
    };
  }
  if (outcome.verdict === "not_valid" && outcome.search?.method === "embedding") {
    return {
      keyword: "Not valid",
      sentence: `The sequent has no derivation in ${named(outcome.logic)}. deduxit decided this by translating it into linear logic, where a translation has a proof exactly when the sequent is valid, and this one has none.`,
      tone: "bad",
    };
  }
  if (outcome.verdict === "not_valid") {
    return {
      keyword: "Not valid",
      sentence: `The sequent has no derivation in ${named(outcome.logic)}, as deduxit's check of its countermodel showed.`,
      tone: "bad",
    };
  }
  const reason = outcome.reason as
    | { kind?: string; limit?: number; copies?: number; depth?: number }
    | undefined;
  const why: Record<string, string> = {
    work_limit: `it used its whole budget of ${String(reason?.limit)} units of work`,
    copy_bound: `every level up to ${String(reason?.copies)} copies of a hypothesis hit the bound`,
    recursion_limit: `it reached the depth of ${String(reason?.depth)} a tab allows`,
    memory_limit: "it reached the memory a tab allows",
    stopped: "it was stopped",
    incomplete:
      "at first order it finds proofs but cannot show that none exists, and it found no finite countermodel",
  };
  return {
    keyword: "Unknown: gave up",
    sentence: `The search gave up because ${why[reason?.kind ?? ""] ?? "it reached a bound"}. That says nothing about validity: try a larger budget.`,
    tone: "warn",
  };
}

/** An ordinary step's refusal in the page's words, the goal's formulas to name. */
export function ordinaryRefusal(
  failed: Failure,
  formulas: readonly GoalFormula[],
  rule: string,
): Said {
  const d = failed.details ?? {};
  const left = formulas.filter((f) => f.side === "input");
  const right = formulas.filter((f) => f.side === "output");
  const at = () => {
    const list = d["side"] === "left" ? left : right;
    const p = typeof d["position"] === "number" ? d["position"] : -1;
    return list[p]?.text ?? "the formula";
  };
  switch (d.kind) {
    case "rule":
      return {
        keyword: `${rule} refused: another connective`,
        sentence: `${rule} does not act on ${at()} ${d["side"] === "left" ? "left" : "right"} of ⊢. Choose one of the rules the list offers.`,
      };
    case "logic":
      return {
        keyword: `${rule} refused: not a rule of this logic`,
        sentence: `${failed.message.charAt(0).toUpperCase()}${failed.message.slice(1)}.`,
      };
    case "no_partner":
      return {
        keyword: "ax refused: no partner",
        sentence: `The axiom needs ${at()} on both sides of ⊢. Choose another rule.`,
      };
    case "size":
    case "terms":
      return {
        keyword: `${rule} refused: too large`,
        sentence: `${failed.message.charAt(0).toUpperCase()}${failed.message.slice(1)}.`,
      };
    case "witness":
      return {
        keyword: `${rule} refused: no such term`,
        sentence: `A witness is built from the sequent's constants and function symbols and the eigenvariables made below this goal, and ${witnessFault(failed)}.`,
      };
    case "binding":
      return {
        keyword: `${rule} refused: the eigenvariable condition`,
        sentence: `The axiom would give an open witness a term it may not take: ${
          d["fault"] === "eigenvariable"
            ? `the eigenvariable ${String(d["name"] ?? "")}, which a ∀R or ∃L made after the witness was left open or on another branch`
            : failed.message.replace(/^.*?: /, "")
        }. Choose another rule, or undo the step that left the witness open.`,
      };
    case "no_witness":
      return {
        keyword: `${rule} refused: no witness here`,
        sentence: `${rule} takes no witness; only ∃R and ∀L do.`,
      };
    default:
      return {
        keyword: `${rule} refused`,
        sentence: `${failed.message.charAt(0).toUpperCase()}${failed.message.slice(1)}.`,
      };
  }
}
