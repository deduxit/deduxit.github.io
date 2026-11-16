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

/** A system as its option in the chooser reads: its name and its conditions. */
export function systemWords(name: string): string {
  const system = SYSTEMS.find((s) => s.name === name);
  if (!system || system.conditions.length === 0) return `${name}: no condition`;
  return `${name}: ${system.conditions.join(", ")}`;
}

/** A sequent to try in a new modal tab. */
export const EXAMPLE = "[]p -> [][]p";

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

/** The atoms of a world as the editor shows them: their names, comma-separated. */
export const atomsText = (world: World): string => world.atoms.join(", ");

/** The atoms typed in the editor: names separated by commas or spaces, each once. */
export function atomsOf(text: string): string[] {
  const names = text
    .split(/[\s,]+/)
    .map((name) => name.trim())
    .filter((name) => name !== "");
  return Array.from(new Set(names));
}

/** The model with a world added, forcing nothing and seeing nothing. */
export const addWorld = (model: Model): Model => ({
  ...model,
  worlds: [...model.worlds, { atoms: [], arrows: [] }],
});

/** The model with world `at` taken out: the arrows to it gone, the later worlds renumbered. */
export function removeWorld(model: Model, at: number): Model {
  const renumber = (w: number) => (w > at ? w - 1 : w);
  const worlds = model.worlds
    .filter((_, i) => i !== at)
    .map((w) => ({
      atoms: w.atoms,
      arrows: (w.arrows ?? []).filter((t) => t !== at).map(renumber),
    }));
  const world = model.world === undefined || model.world === at ? 0 : renumber(model.world);
  return { ...model, worlds, world: Math.min(world, Math.max(worlds.length - 1, 0)) };
}

/** The model with the arrow from world `from` to world `to` added or taken out. */
export function toggleArrow(model: Model, from: number, to: number): Model {
  return {
    ...model,
    worlds: model.worlds.map((w, i) => {
      if (i !== from) return w;
      const arrows = w.arrows ?? [];
      const next = arrows.includes(to)
        ? arrows.filter((t) => t !== to)
        : [...arrows, to].sort((a, b) => a - b);
      return { atoms: w.atoms, arrows: next };
    }),
  };
}

/** The model with world `at`'s atoms set from the editor's text. */
export function setAtoms(model: Model, at: number, text: string): Model {
  return {
    ...model,
    worlds: model.worlds.map((w, i) => (i === at ? { ...w, atoms: atomsOf(text) } : w)),
  };
}

/** A model as deduxit's calls read it: a document of level 13. */
export const modelJson = (model: Model): string => JSON.stringify({ ...model, version: 13 });

/** The most worlds the editor holds: enough to try a frame, few enough to read. */
export const MOST_WORLDS = 8;
