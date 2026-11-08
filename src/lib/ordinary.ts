// linlog © Fabian Lukas Grubmüller 2026
// Licensed under the EUPL

/**
 * The ordinary suite as the page reads it: linlog's `ordinary_…` calls prove a sequent of
 * classical, intuitionistic or minimal propositional logic step by step in LK or LJ, and draw
 * the derivation itself, never its linear image. Their documents (linlog's `plan/web/README.md`,
 * the rows `ordinary_…`) are read here into the shapes the stage, the dock and the bands already
 * show: a goal's formulas numbered left of ⊢ first, then right of it, as the drawing's
 * `i<n>-<p>` ids number them; a step's formula by its side and its position there.
 */

import type { Failure, GoalFormula, StepForm, View } from "./linlog";
import { subtree } from "./steps";
import type { Logic } from "./suites";
import type { Said, Tone } from "./words";

/** An inference of an ordinary session: a goal while it has no rule. */
export interface OrdinaryInference {
  readonly left: readonly number[];
  readonly right: readonly number[];
  readonly rule?: string;
  readonly principal?: readonly [Side, number];
  readonly premises?: readonly number[];
}

/** An ordinary session, linlog's `ordinary::Interactive` at wire level 8. */
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
}

/** An ordinary outcome: valid with its derivation, not valid, or unknown with its reason. */
export interface OrdinaryOutcome {
  readonly version: number;
  readonly verdict: "valid" | "not_valid" | "unknown";
  readonly logic: Logic;
  readonly translation?: string;
  readonly reason?: { readonly kind: string; readonly [key: string]: unknown };
  readonly engine?: string;
  readonly statistics?: { readonly work?: number; readonly [key: string]: unknown };
  readonly [key: string]: unknown;
}

/** A step as `ordinary_apply` takes it: the formula's side and position there, and the rule. */
export interface OrdinaryStep {
  readonly side: Side;
  readonly position: number;
  readonly rule: string;
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

/**
 * An ordinary session's sequent as the field reads it, each compound part parenthesised and
 * written in signs, which the ordinary parser reads back.
 */
export function sequentText(session: OrdinarySession): string {
  const { formulas, atoms, left, right } = session.sequent as {
    formulas: readonly Node[];
    atoms: readonly string[];
    left: readonly number[];
    right: readonly number[];
  };
  const written = new Map<number, string>();
  // Every subformula precedes the formulas built from it, so one pass in order writes them all.
  formulas.forEach((node, i) => {
    const part = (k: number) => {
      const text = written.get(k) ?? "";
      return typeof formulas[k] === "object" &&
        !("V" in (formulas[k] as object)) &&
        !("¬" in (formulas[k] as object))
        ? `(${text})`
        : text;
    };
    if (typeof node === "string") written.set(i, node);
    else {
      const [tag, args] = Object.entries(node)[0] as [string, number | readonly number[]];
      if (tag === "V") written.set(i, atoms[args as number] ?? "?");
      else if (tag === "¬") written.set(i, `¬${part(args as number)}`);
      else {
        const [a, b] = args as readonly number[];
        written.set(i, `${part(a as number)} ${tag} ${part(b as number)}`);
      }
    }
  });
  const side = (list: readonly number[]) => list.map((k) => written.get(k) ?? "").join(", ");
  return `${side(left)}${left.length ? " " : ""}⊢ ${side(right)}`.trimEnd();
}

/**
 * Undo on a branch (the author's D13): the session without the step that opened `goal` and
 * every step since in that step's premises, or without its last step where `goal` is left
 * out (a finished proof). A step is an entry of the history, the goal it expanded, and its
 * inferences are that goal's subtree: its own (a structural run below its rule, or a search's
 * derivation) and every later step's above them. linlog appends a step's inferences after the
 * goal's, so taking the subtree out and numbering the rest anew in their order leaves the session
 * the other steps would have made; linlog's reader checks it again on the next call. Undefined
 * where the branch has no step.
 */
export function retract(
  doc: OrdinarySession,
  goal: number | undefined,
): { session: OrdinarySession; reopened: number } | undefined {
  const steps = new Set(doc.history);
  const parent = new Map<number, number>();
  doc.inferences.forEach((inference, i) => {
    for (const premise of inference.premises ?? []) parent.set(premise, i);
  });
  let step: number | undefined;
  if (goal === undefined) step = doc.history.at(-1);
  else {
    step = parent.get(goal);
    // Up through the step's own run (the contractions below a shared rule, or a graft).
    while (step !== undefined && !steps.has(step)) step = parent.get(step);
  }
  if (step === undefined) return undefined;
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
 * rule above the structural run linlog makes below a step (the contractions of a shared rule,
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
    invertible: [],
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
  if (step.side) return { side: step.side, position: step.position, rule: step.rule };
  return { ...sided(formulas, step.position), rule: step.rule };
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
      sentence: `The search found a derivation, and linlog's checker accepted it in ${named(outcome.logic)}.`,
      tone: "ok",
    };
  }
  if (outcome.verdict === "not_valid") {
    return {
      keyword: "Not valid",
      sentence: `The sequent has no derivation in ${named(outcome.logic)}: linlog decided it through its translation into linear logic, which proves exactly the translations of valid sequents, and the translated sequent has no proof.`,
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
  };
  return {
    keyword: "Unknown: gave up",
    sentence: `The search gave up because ${why[reason?.kind ?? ""] ?? "it reached a bound"}. That says nothing about validity.`,
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
        sentence: `${rule} does not act on ${at()} ${d["side"] === "left" ? "left" : "right"} of ⊢.`,
      };
    case "logic":
      return {
        keyword: `${rule} refused: not a rule of this logic`,
        sentence: `${failed.message.charAt(0).toUpperCase()}${failed.message.slice(1)}.`,
      };
    case "no_partner":
      return {
        keyword: "ax refused: no partner",
        sentence: `The axiom needs ${at()} on both sides of ⊢.`,
      };
    case "size":
      return {
        keyword: `${rule} refused: too large`,
        sentence: `${failed.message.charAt(0).toUpperCase()}${failed.message.slice(1)}.`,
      };
    default:
      return {
        keyword: `${rule} refused`,
        sentence: `${failed.message.charAt(0).toUpperCase()}${failed.message.slice(1)}.`,
      };
  }
}
