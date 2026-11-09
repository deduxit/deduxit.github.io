// linlog © Fabian Lukas Grubmüller 2026
// Licensed under the EUPL

/**
 * The suites a tab proves in: each a family of logics with its own sequent syntax, rules and
 * calls of deduxit's module, proved by a method (the sequent calculus, the only one today), in
 * one of its calculi, named by the suite's parameter. A tab's choice is a `Calculus`: its
 * suite, its method and the suite's parameter, as deduxit's `about` names them (`mode` for the
 * linear suite, `logic` for the ordinary one); `suites.test.ts` holds the registry to `about`.
 */

import { MODES, type Mode } from "./deduxit";
import { modeWords } from "./words";

/** The suites the page offers, by deduxit's names. */
export type SuiteKey = "linear" | "ordinary";

/** How a suite's proofs are built: the sequent calculus, a tree grown from the goal upward. */
export type Method = "sequent";

/** A logic of the ordinary suite, as deduxit names it. */
export type Logic = "classical" | "intuitionistic" | "minimal";

/** Every ordinary logic, in the order its segmented control shows them. */
export const LOGICS: readonly Logic[] = ["classical", "intuitionistic", "minimal"];

/** A tab's calculus: its suite, its method and the suite's parameter. */
export type Calculus =
  | { readonly suite: "linear"; readonly method: Method; readonly mode: Mode }
  | { readonly suite: "ordinary"; readonly method: Method; readonly logic: Logic };

/** A suite as the page offers it. */
export interface Suite {
  readonly key: SuiteKey;
  /** Its name on the calculus's segmented control, deduxit's. */
  readonly name: string;
  /** What its segment's tip says it is. */
  readonly tip: string;
  readonly methods: readonly Method[];
  /** The parameter that names a calculus of the suite, as `about` names it. */
  readonly parameter: "mode" | "logic";
  /** The values the page reads, a part of deduxit's (the calculus's switches offer some of them). */
  readonly values: readonly string[];
  /** The calculus a new tab of the suite starts in. */
  readonly start: Calculus;
  /** The prefix of the suite's calls in deduxit's module, as `about` gives it. */
  readonly calls: string;
  /** Its call that reads a finished proof back as a λ-term, as `about` names it. */
  readonly term: string;
}

/** The registered suites, in the order the segmented control shows them. */
export const SUITES: readonly Suite[] = [
  {
    key: "linear",
    name: "Linear",
    tip: "Linear logic: every formula used exactly once, unless an exponential allows more",
    methods: ["sequent"],
    parameter: "mode",
    // Every mode a session the page reads can be in, the switches' and the ordered ones.
    values: [...MODES, "cyclic", "lambek", "lambek-star"],
    start: { suite: "linear", method: "sequent", mode: "classical" },
    calls: "",
    term: "term",
  },
  {
    key: "ordinary",
    name: "Ordinary",
    tip: "Ordinary propositional logic, proved in Gentzen's LK and LJ",
    methods: ["sequent"],
    parameter: "logic",
    values: LOGICS,
    start: { suite: "ordinary", method: "sequent", logic: "intuitionistic" },
    calls: "ordinary_",
    term: "ordinary_term",
  },
];

/** The registry's entry of a suite. */
export const suite = (key: SuiteKey): Suite => SUITES.find((s) => s.key === key) as Suite;

/** The calculus of a linear mode. */
export const linear = (mode: Mode): Calculus => ({ suite: "linear", method: "sequent", mode });

/** The calculus of an ordinary logic. */
export const ordinary = (logic: Logic): Calculus => ({
  suite: "ordinary",
  method: "sequent",
  logic,
});

/** The suite's parameter of a calculus: its mode, or its logic. */
export const parameterOf = (c: Calculus): string => (c.suite === "linear" ? c.mode : c.logic);

/** The linear mode of a calculus; the default mode for a calculus of another suite. */
export const modeOf = (c: Calculus): Mode => (c.suite === "linear" ? c.mode : "classical");

/** Whether two calculi are the same. */
export const sameCalculus = (a: Calculus, b: Calculus) =>
  a.suite === b.suite && a.method === b.method && parameterOf(a) === parameterOf(b);

/**
 * The calculus a suite's name, method and parameter make, or undefined where the registry has
 * none of them: what a link and a stored proof are read back by.
 */
export function calculusOf(
  key: string | null | undefined,
  method: string | null | undefined,
  parameter: string | null | undefined,
): Calculus | undefined {
  const s = SUITES.find((x) => x.key === key);
  if (!s?.methods.includes((method ?? "sequent") as Method)) return undefined;
  if (!parameter || !s.values.includes(parameter)) return undefined;
  return s.key === "linear" ? linear(parameter as Mode) : ordinary(parameter as Logic);
}

/** The calculus's short mark on its tab. */
export function markOf(c: Calculus): string {
  if (c.suite === "ordinary")
    return { classical: "LK", intuitionistic: "LJ", minimal: "LM" }[c.logic];
  const names: Record<Mode, string> = {
    classical: "LL",
    affine: "LL+aff",
    mix: "LL+mix",
    "affine-mix": "LL+aff+mix",
    intuitionistic: "ILL",
    "intuitionistic-affine": "ILL+aff",
    cyclic: "CyLL",
    lambek: "L",
    "lambek-star": "L*",
  };
  return names[c.mode];
}

/** The calculus in the switches' words, for the status and the mark's name. */
export function calculusWords(c: Calculus): string {
  if (c.suite === "ordinary")
    return {
      classical: "Ordinary, classical (LK)",
      intuitionistic: "Ordinary, intuitionistic (LJ)",
      minimal: "Ordinary, minimal (LM, LJ without ex falso)",
    }[c.logic];
  return modeWords(c.mode);
}

/** Whether a calculus's goals are two-sided with one formula right of ⊢ (LJ, LM, ILL). */
export const intuitionistic = (c: Calculus) =>
  c.suite === "linear" ? c.mode.startsWith("intuitionistic") : c.logic !== "classical";
