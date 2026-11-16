// deduxit © Fabian Lukas Grubmüller 2026
// Licensed under the EUPL

/**
 * Practice's logic: which problems of a suite's store it offers (the linear
 * suite's provable ones, every one of the ordinary suite's), the filters by
 * category and level, a random problem within them, and what the browser
 * keeps of it (the filters and the problems proved), per suite.
 */

import type { Level, Problem } from "./content";
import type { Logic } from "./suites";

/** The levels' names, from 1. */
export const LEVEL_NAMES: Record<Level, string> = {
  1: "Easy",
  2: "Moderate",
  3: "Hard",
  4: "Very hard",
};

/**
 * The categories in groups: a problem passes a group when the group has
 * nothing chosen or the problem is under one of its chosen categories, and
 * passes the filters when it passes every group and its level is chosen (or
 * none is).
 */
export const GROUPS: readonly {
  readonly name: string;
  readonly categories: readonly (readonly [string, string])[];
}[] = [
  {
    name: "Connectives",
    categories: [
      ["multiplicatives", "Multiplicatives"],
      ["additives", "Additives"],
      ["units", "Units"],
      ["exponentials", "Exponentials"],
      ["quantifiers", "Quantifiers"],
    ],
  },
  {
    name: "Logic",
    categories: [
      ["classical", "Classical"],
      ["intuitionistic", "Intuitionistic"],
      ["structural", "Weakening or Mix"],
    ],
  },
  { name: "Source", categories: [["literature", "From the literature"]] },
];

/**
 * The ordinary suite's groups: the connectives a problem uses and the logic it is posed in. No
 * filter names a verdict, which the visitor is to find.
 */
export const ORDINARY_GROUPS: typeof GROUPS = [
  {
    name: "Connectives",
    categories: [
      ["conjunction", "And"],
      ["disjunction", "Or"],
      ["implication", "Implication"],
      ["equivalence", "Equivalence"],
      ["negation", "Negation"],
      ["constants", "⊤ and ⊥"],
    ],
  },
  {
    name: "Logic",
    categories: [
      ["classical", "Classical"],
      ["intuitionistic", "Intuitionistic"],
      ["minimal", "Minimal"],
    ],
  },
];

/** The suites with a store of problems. */
export type Store = "linear" | "ordinary";

/** A problem of the ordinary store, as Practice offers it: to decide in its logic. */
export interface OrdinaryProblem {
  readonly id: string;
  readonly title: string | null;
  /** In the ordinary syntax, as it is typed in the field. */
  readonly sequent: string;
  /** The logic it is posed in. */
  readonly logic: Logic;
  readonly level: Level;
  /** Its connectives and the logic it is posed in: what the filters read. */
  readonly categories: readonly string[];
}

/** A problem of either store. */
export type Offered = Problem | OrdinaryProblem;

/** Whether a problem is the ordinary store's. */
export const isOrdinaryProblem = (p: Offered): p is OrdinaryProblem => "logic" in p;

/** The connectives of an ordinary problem's categories, which its file names. */
const CONNECTIVES = new Set(ORDINARY_GROUPS[0]?.categories.map(([key]) => key));

/** An ordinary problem as the store holds it. */
export interface OrdinaryStored {
  readonly id: string;
  readonly data: {
    readonly title?: string | undefined;
    readonly sequent: string;
    readonly logic: Logic;
    readonly level: Level;
    readonly categories: readonly string[];
  };
}

/**
 * The problems Practice offers in the ordinary suite: every one, valid or not, easiest first,
 * filed under its connectives and the logic it is posed in.
 */
export function offeredOrdinary(store: readonly OrdinaryStored[]): OrdinaryProblem[] {
  return store
    .map(({ id, data }) => ({
      id,
      title: data.title ?? null,
      sequent: data.sequent,
      logic: data.logic,
      level: data.level,
      categories: [...data.categories.filter((c) => CONNECTIVES.has(c)), data.logic],
    }))
    .sort((a, b) => a.level - b.level || a.id.localeCompare(b.id));
}

/** A suite's filter groups. */
export const groupsOf = (store: Store) => (store === "ordinary" ? ORDINARY_GROUPS : GROUPS);

/** What the visitor chose: categories and levels, none chosen meaning all. */
export interface Filters {
  readonly categories: readonly string[];
  readonly levels: readonly Level[];
}

export const NO_FILTERS: Filters = { categories: [], levels: [] };

/** Whether a problem passes the filters of its suite's groups. */
export function passes(problem: Offered, filters: Filters): boolean {
  if (filters.levels.length > 0 && !filters.levels.includes(problem.level)) return false;
  return groupsOf(isOrdinaryProblem(problem) ? "ordinary" : "linear").every((group) => {
    const chosen = group.categories
      .map(([key]) => key)
      .filter((key) => filters.categories.includes(key));
    return chosen.length === 0 || chosen.some((key) => problem.categories.includes(key));
  });
}

/** One of the problems, drawn with `random` (a number in [0, 1)), or null when there is none. */
export function pick<T>(problems: readonly T[], random: () => number): T | null {
  if (problems.length === 0) return null;
  return problems[Math.min(problems.length - 1, Math.floor(random() * problems.length))] ?? null;
}

/** A problem as the store holds it, by its collection entry's id and data. */
export interface Stored {
  readonly id: string;
  readonly data: {
    readonly title?: string | undefined;
    readonly sequent: string;
    readonly mode: Problem["mode"];
    readonly verdict: "provable" | "unprovable";
    readonly level: Level;
    readonly categories: readonly string[];
    readonly fragment: string;
    readonly source?: string | undefined;
    readonly url?: string | undefined;
  };
}

/** The problems Practice offers: the store's provable ones, easiest first. */
export function offered(store: readonly Stored[]): Problem[] {
  return store
    .filter((entry) => entry.data.verdict === "provable")
    .map(({ id, data }) => ({
      id,
      title: data.title ?? null,
      sequent: data.sequent,
      mode: data.mode,
      level: data.level,
      categories: data.categories,
      fragment: data.fragment,
      source: data.source && data.url ? { text: data.source, url: data.url } : null,
    }))
    .sort((a, b) => a.level - b.level || a.id.localeCompare(b.id));
}

/** The browser's key for Practice: the filters and the problems proved, the linear suite's. */
export const PRACTICE_KEY = "deduxit-practice";

/** A suite's key for Practice: the linear suite's is the one Practice always had. */
export const practiceKey = (store: Store) =>
  store === "linear" ? PRACTICE_KEY : `${PRACTICE_KEY}-${store}`;

/** What the browser keeps of Practice. */
export interface Kept {
  readonly filters: Filters;
  /** The ids of the problems the visitor has proved. */
  readonly proved: readonly string[];
}

/** What the browser keeps of Practice, or nothing chosen and nothing proved. */
export function loadKept(storage: Pick<Storage, "getItem"> | null, store: Store = "linear"): Kept {
  try {
    const kept = JSON.parse(storage?.getItem(practiceKey(store)) ?? "null") as Partial<Kept> | null;
    return {
      filters: {
        categories: kept?.filters?.categories?.filter((c) => typeof c === "string") ?? [],
        levels: kept?.filters?.levels?.filter((l): l is Level => [1, 2, 3, 4].includes(l)) ?? [],
      },
      proved: kept?.proved?.filter((id) => typeof id === "string") ?? [],
    };
  } catch {
    return { filters: NO_FILTERS, proved: [] };
  }
}

/** Keeps Practice's state in the browser, quietly doing nothing where storage is refused. */
export function saveKept(
  storage: Pick<Storage, "setItem"> | null,
  kept: Kept,
  store: Store = "linear",
): void {
  try {
    storage?.setItem(practiceKey(store), JSON.stringify(kept));
  } catch {
    // Storage refused (a private window, a full quota): Practice forgets.
  }
}
