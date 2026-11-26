// deduxit © Fabian Lukas Grubmüller 2026
// Licensed under the EUPL

/**
 * Modal logic as the page shows it: a sequent of propositional logic with □ (necessarily) and
 * ◇ (possibly), decided in one of the fifteen normal systems by deduxit's `modal_…` calls. A
 * valid sequent comes with a derivation in the system's labelled calculus, one that is not valid
 * with a Kripke model: worlds, each forcing some atoms and seeing some worlds. The visitor can
 * change that model and have it checked again. Plain data and words, no Solid.
 */

import { prettyOrdinary } from "./ordinary";

export {
  addWorld,
  atomsOf,
  atomsText,
  MOST_WORLDS,
  removeWorld,
  setAtoms,
  toggleArrow,
} from "./kripke";

/** A sequent typed in the modal syntax, in signs: `[]` as □, `<>` as ◇, the rest as ordinary logic's. */
export const prettyModal = (input: string): string =>
  prettyOrdinary(input).replaceAll("<>", "◇").replaceAll("[]", "□");

/** A frame condition, as deduxit names it. */
export type Condition = "serial" | "reflexive" | "symmetric" | "transitive" | "euclidean";

/** A normal modal system, by its name, with the conditions its worlds' arrows meet. */
export interface System {
  readonly name: string;
  readonly conditions: readonly Condition[];
}

/** The fifteen systems deduxit decides, in `about`'s order, K the default. */
export const SYSTEMS: readonly System[] = [
  { name: "K", conditions: [] },
  { name: "D", conditions: ["serial"] },
  { name: "T", conditions: ["reflexive"] },
  { name: "KB", conditions: ["symmetric"] },
  { name: "KDB", conditions: ["serial", "symmetric"] },
  { name: "B", conditions: ["reflexive", "symmetric"] },
  { name: "K4", conditions: ["transitive"] },
  { name: "KD4", conditions: ["serial", "transitive"] },
  { name: "S4", conditions: ["reflexive", "transitive"] },
  { name: "K5", conditions: ["euclidean"] },
  { name: "KD5", conditions: ["serial", "euclidean"] },
  { name: "K45", conditions: ["transitive", "euclidean"] },
  { name: "KD45", conditions: ["serial", "transitive", "euclidean"] },
  { name: "KB5", conditions: ["symmetric", "transitive", "euclidean"] },
  { name: "S5", conditions: ["reflexive", "symmetric", "transitive", "euclidean"] },
];

/** The systems' names. */
export const SYSTEM_NAMES: readonly string[] = SYSTEMS.map((s) => s.name);

/** What each condition asks of every world, in a few words. */
export const CONDITION_WORDS: Readonly<Record<Condition, string>> = {
  serial: "sees some world",
  reflexive: "sees itself",
  symmetric: "is seen by every world it sees",
  transitive: "sees every world the worlds it sees see",
  euclidean: "sees only worlds that see each other",
};

/** The five conditions in the order the toggles show them. */
export const CONDITIONS: readonly Condition[] = [
  "serial",
  "reflexive",
  "symmetric",
  "transitive",
  "euclidean",
];

/** Every condition that follows from the ones given, in the toggles' order. */
export function closure(given: readonly Condition[]): Condition[] {
  const has = new Set(given);
  // Each rule adds what its conditions imply; four rounds reach every consequence.
  for (let round = 0; round < 4; round += 1) {
    if (has.has("reflexive")) has.add("serial");
    if (has.has("symmetric") && has.has("transitive")) has.add("euclidean");
    if (has.has("symmetric") && has.has("euclidean")) has.add("transitive");
    if (has.has("reflexive") && has.has("euclidean")) {
      has.add("symmetric");
      has.add("transitive");
    }
    if (
      has.has("serial") &&
      has.has("symmetric") &&
      (has.has("transitive") || has.has("euclidean"))
    )
      has.add("reflexive");
  }
  return CONDITIONS.filter((c) => has.has(c));
}

/** The system whose frames meet exactly the conditions given and what follows from them. */
export function systemOf(given: readonly Condition[]): string {
  const want = closure(given).join(" ");
  return SYSTEMS.find((s) => closure(s.conditions).join(" ") === want)?.name ?? "K";
}

/** A system as its option in the chooser reads: its name and its conditions. */
export function systemWords(name: string): string {
  const system = SYSTEMS.find((s) => s.name === name);
  if (!system || system.conditions.length === 0) return `${name}: no condition`;
  return `${name}: ${system.conditions.join(", ")}`;
}

/** A sequent to try in a new modal tab. */
export const EXAMPLE = "[]p -> [][]p";

/** A term of a derivation in a calculus given as data, as its JSON writes it. */
type Term = string | { readonly atom: string } | readonly [string, ...number[]];

/**
 * The root of a valid outcome's labelled derivation as the calculus reads it, every compound
 * operand in brackets (`w0 : (a ∧ b) ∧ c` as `w0 : ((a ∧ b) ∧ c)`), so that it reads back as the
 * same sequent whatever the calculus's precedences; null for no derivation.
 */
export function rootSequent(derivation: unknown): string | null {
  const d = derivation as {
    readonly terms?: readonly Term[];
    readonly nodes?: readonly { readonly sequent: readonly (readonly number[])[] }[];
  } | null;
  const root = d?.nodes?.[d.nodes.length - 1];
  const terms = d?.terms;
  if (!root || !terms) return null;
  const shown = (at: number, outer: boolean): string => {
    const term = terms[at];
    if (term === undefined) return "?";
    if (typeof term === "string") return term;
    if (!Array.isArray(term)) return (term as { atom: string }).atom;
    const [connective, ...operands] = term as readonly [string, ...number[]];
    if (operands.length === 0) return connective;
    if (operands.length === 1) return `${connective}${shown(operands[0] as number, false)}`;
    const inner = operands.map((o) => shown(o, false)).join(` ${connective} `);
    return outer ? inner : `(${inner})`;
  };
  const [left = [], right = []] = root.sequent;
  const side = (members: readonly number[]) => members.map((m) => shown(m, true)).join(", ");
  return `${side(left)} ⊢ ${side(right)}`.trim();
}

/** A world of a Kripke model, as deduxit writes it. */
export interface World {
  readonly atoms: readonly string[];
  /** The worlds it sees, by their numbers. */
  readonly arrows?: readonly number[];
}

/** A Kripke model, as deduxit writes it (wire level 13). */
export interface Model {
  readonly version?: number;
  readonly worlds: readonly World[];
  /** The world the model is about: where the sequent fails, in a countermodel. */
  readonly world?: number;
}

/** Why a search stopped without a verdict, as deduxit writes it. */
export interface Reason {
  readonly kind: string;
  readonly [key: string]: unknown;
}

/** The outcome of deciding a modal sequent, as `modal_decide` answers it (wire level 20). */
export interface ModalOutcome {
  readonly version?: number;
  readonly verdict: "valid" | "not_valid" | "unknown";
  readonly reason?: Reason;
  readonly system: string;
  readonly statistics?: { readonly worlds: number; readonly inferences: number };
  readonly derivation?: unknown;
  readonly countermodel?: { readonly model: Model };
}

/** A formula's value at a world, as `modal_evaluate` answers it. */
export interface Value {
  readonly formula: string;
  readonly true: boolean;
  /** For a false □ or a true ◇, the world that shows it. */
  readonly witness?: number;
}

/** A model checked against a sequent, as `modal_evaluate` answers it. */
export interface Evaluation {
  readonly system: string;
  readonly world?: number;
  /** The condition the model's arrows fail, with the worlds that show it. */
  readonly frame?: { readonly condition: Condition; readonly worlds: readonly number[] };
  readonly holds?: boolean;
  /** The world where the sequent fails. */
  readonly failing?: number;
  readonly values?: readonly Value[];
}

/** The keyword and sentence of an outcome's verdict. */
export function verdictWords(outcome: ModalOutcome): { keyword: string; sentence: string } {
  const system = outcome.system;
  switch (outcome.verdict) {
    case "valid":
      return {
        keyword: "Valid",
        sentence: `in ${system}: it holds at every world of every model of ${system}. The derivation below is checked.`,
      };
    case "not_valid":
      return outcome.countermodel
        ? {
            keyword: "Not valid",
            sentence: `in ${system}: the model below is one of ${system} where it fails. The model is checked.`,
          }
        : {
            keyword: "Not valid",
            sentence: `in ${system}: deduxit found a model where it fails, too large to show.`,
          };
    default:
      return {
        keyword: "Not decided",
        sentence:
          outcome.reason?.kind === "work_limit"
            ? "The budget ran out before the search decided. Raise the budget in Settings."
            : "A bound stopped the search before it decided.",
      };
  }
}

/** The worlds a frame fault names, as words. */
export function frameWords(frame: NonNullable<Evaluation["frame"]>): string {
  const w = (i: number) => `world ${String(frame.worlds[i] ?? 0)}`;
  switch (frame.condition) {
    case "serial":
      return `Not serial: ${w(0)} sees no world.`;
    case "reflexive":
      return `Not reflexive: ${w(0)} does not see itself.`;
    case "symmetric":
      return `Not symmetric: ${w(0)} sees ${w(1)}, but ${w(1)} does not see ${w(0)}.`;
    case "transitive":
      return `Not transitive: ${w(0)} sees ${w(1)} and ${w(1)} sees ${w(2)}, but ${w(0)} does not see ${w(2)}.`;
    default:
      return frame.worlds[1] === frame.worlds[2]
        ? `Not euclidean: ${w(0)} sees ${w(1)}, but ${w(1)} does not see itself.`
        : `Not euclidean: ${w(0)} sees ${w(1)} and ${w(2)}, but ${w(1)} does not see ${w(2)}.`;
  }
}

/** The keyword and sentence of a model's check. */
export function evaluationWords(e: Evaluation): { keyword: string; sentence: string } {
  if (e.frame)
    return {
      keyword: `No model of ${e.system}`,
      sentence: frameWords(e.frame),
    };
  const at = e.world === undefined ? "at every world" : `at world ${String(e.world)}`;
  if (e.holds) return { keyword: "Holds", sentence: `The sequent holds ${at} of this model.` };
  return {
    keyword: "Fails",
    sentence: `At world ${String(e.failing ?? 0)} every formula left of ⊢ is true and every formula right of it false.`,
  };
}

/** A value as its line reads: the formula, true or false, and the world that shows it. */
export function valueWords(value: Value): string {
  const shown = value.witness === undefined ? "" : `: world ${String(value.witness)} shows it`;
  return `${value.formula} is ${value.true ? "true" : "false"}${shown}`;
}

/** A model as deduxit's calls read it: a document of level 13. */
export const modelJson = (model: Model): string => JSON.stringify({ ...model, version: 13 });
