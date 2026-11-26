// deduxit © Fabian Lukas Grubmüller 2026
// Licensed under the EUPL

/**
 * deduxit's engines as the page names them: the name an outcome gives
 * (`engine`, and `classical` for the classical refuter, whose refutation an
 * outcome names by its kind), a short name for beside the work, what the
 * engine does in a line, and its source in the literature.
 */

import type { Outcome } from "./deduxit";

/** One engine. */
export interface Engine {
  /** Its name beside the work it did. */
  readonly name: string;
  /** What it does, in a line. */
  readonly does: string;
  /** Its source, as the hover gives it: authors and year. */
  readonly source: string;
}

/**
 * Every engine the page may name, in deduxit's order, then the finite model search (an ordinary
 * method, which a first-order goal's close takes) and the classical refuter.
 */
export const ENGINES: Readonly<Record<string, Engine>> = {
  focus: {
    name: "focused search",
    does: "searches backward from the goal, one focus at a time",
    source: "Andreoli 1992, focusing",
  },
  net: {
    name: "proof-net search",
    does: "links dual literals until the switching criterion accepts the net",
    source: "Girard 1987, proof nets; Danos and Regnier's criterion, as Gallier states it",
  },
  "two-sided": {
    name: "two-sided focused search",
    does: "the focused search on the intuitionistic sequent, one goal on the right",
    source: "Andreoli 1992, focusing",
  },
  additive: {
    name: "additive path",
    does: "decides two formulas of & and ⊕ by their pairs of subformulas",
    source: "the additive rules of the Handbook of linear logic, Table 1.4",
  },
  horn: {
    name: "Horn engine",
    does: "reads the goal as a Petri net and searches its markings",
    source: "Engberg and Winskel 1990, Petri nets; Abdulla et al. 1996",
  },
  essential: {
    name: "essential-net search",
    does: "links literals under the intuitionistic reading's directions",
    source: "Lamarche's essential nets, as Moot 2008 states them",
  },
  inverse: {
    name: "inverse method",
    does: "derives sequents forward from the axioms until the goal or nothing new comes",
    source: "Chaudhuri and Pfenning 2005, the focused inverse method",
  },
  models: {
    name: "finite model search",
    does: "looks for a structure of 1, 2, … elements that refutes a first-order goal, by a SAT solver",
    source:
      "McCune's MACE and Claessen and Sörensson's Paradox, as Reger, Suda and Voronkov 2016 state it",
  },
  classical: {
    name: "classical refuter",
    does: "finds an assignment under which the sequent read classically is false",
    source: "the Handbook of linear logic, the skeleton of a proof (Theorem 1.8.1)",
  },
};

/** deduxit's engines in its own order, by the names `search.engine` takes. */
export const ENGINE_ORDER = [
  "focus",
  "net",
  "two-sided",
  "additive",
  "horn",
  "essential",
  "inverse",
] as const;

/**
 * The engine whose work an outcome is: the classical refuter for its refutation, else the one it
 * names. An ordinary outcome decided through the embedding holds its image's outcome under
 * `search.image`, whose engine it is; one decided by another method names it as `search.method`.
 */
export function engineOf(outcome: Outcome | undefined | null): string | undefined {
  if (!outcome) return undefined;
  const search = (outcome as { search?: { image?: Outcome; method?: string } }).search;
  if (search?.image) return engineOf(search.image);
  if (outcome.refutation?.kind === "classical") return "classical";
  return outcome.engine ?? (search?.method === "embedding" ? undefined : search?.method);
}

/** The key under which the steps of a proof made apart are named, at the goal they close. */
export const APART = "apart";

/** The tab a key names, for a proof filled in from it, or null for an engine's. */
const tabOf = (key: string): string | null => (key.startsWith("tab:") ? key.slice(4) : null);

/** An engine's hover: its name, what it does and its source. */
export function engineTip(key: string): string {
  if (key === APART)
    return "The steps of the proof made apart of this goal, taken here again and checked in this proof.";
  const tab = tabOf(key);
  if (tab !== null)
    return `Filled in from the finished proof of ${tab}, in another tab, checked again in this proof's calculus.`;
  const engine = ENGINES[key];
  if (!engine) return `The engine ${key}`;
  return `The ${engine.name} ${engine.does}. Source: ${engine.source}.`;
}

/**
 * What a search closed, as the line over the bottom box says it, from the engine of each goal it
 * closed, in order: one goal by its number ("Goal 2 closed by the focused search."), or Close
 * all's goals ("Every goal closed by the focused search.", "3 goals closed: 2 by the focused
 * search, 1 by the Horn engine."). `every` says no goal is left open.
 */
export function closedBy(engines: readonly string[], goal: number | null, every: boolean): string {
  const [first] = engines;
  if (goal !== null && first !== undefined)
    return `Goal ${goal + 1} closed by the ${engineName(first)}.`;
  const counts = new Map<string, number>();
  for (const engine of engines) counts.set(engine, (counts.get(engine) ?? 0) + 1);
  const what = every ? "Every goal" : engines.length === 1 ? "1 goal" : `${engines.length} goals`;
  if (counts.size === 1 && first !== undefined)
    return `${what} closed by the ${engineName(first)}.`;
  const parts = [...counts].map(([engine, n]) => `${n} by the ${engineName(engine)}`);
  return `${what} closed: ${parts.join(", ")}.`;
}

/** An engine's name standing alone, as a label: in sentence case. */
export function engineLabel(key: string): string {
  const name = engineName(key);
  return `${name.charAt(0).toUpperCase()}${name.slice(1)}`;
}

/** An engine's name inside a sentence; for a filled-in proof, the tab it came from. */
export function engineName(key: string): string {
  if (key === APART) return "proof made apart";
  const tab = tabOf(key);
  if (tab !== null) return `proof from ${tab}`;
  return ENGINES[key]?.name ?? key;
}
