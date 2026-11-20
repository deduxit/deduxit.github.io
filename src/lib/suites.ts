// deduxit © Fabian Lukas Grubmüller 2026
// Licensed under the EUPL

/**
 * The suites a tab proves in: each a family of logics with its own sequent syntax, rules and
 * calls of deduxit's module, proved by a method (the sequent calculus, and for ordinary logic
 * natural deduction too), in one of its calculi, named by the suite's parameter. A tab's choice is a `Calculus`: its
 * suite, its method and the suite's parameter, as deduxit's `about` names them (`mode` for the
 * linear suite, `logic` for the ordinary one, `calculus` for a calculus given as a rule file,
 * `system` for modal logic, `calculus` for a lambda calculus);
 * `suites.test.ts` holds the registry to `about`.
 */

import { BUILT_IN } from "./custom";
import { MODES, type Mode } from "./deduxit";
import { CALCULUS_WORDS, LAMBDA_CALCULI, type LambdaCalculus } from "./lambda";
import { SYSTEM_NAMES, SYSTEMS } from "./modal";
import { modeWords } from "./words";

/** The suites the page offers, by deduxit's names. */
export type SuiteKey = "linear" | "ordinary" | "rules" | "modal" | "lambda";

/**
 * How a suite's proofs are built: the sequent calculus, a tree grown from the goal upward, or
 * natural deduction, built backwards from a goal and forwards from numbered lines; or, for a
 * lambda-term, its typing derivation, which deduxit draws from the term.
 */
export type Method = "sequent" | "natural" | "typing";

/** A logic of the ordinary suite, as deduxit names it. */
export type Logic = "classical" | "intuitionistic" | "minimal";

/** Every ordinary logic, in the order its segmented control shows them. */
export const LOGICS: readonly Logic[] = ["classical", "intuitionistic", "minimal"];

/** A tab's calculus: its suite, its method and the suite's parameter. */
export type Calculus =
  | { readonly suite: "linear"; readonly method: Method; readonly mode: Mode }
  | { readonly suite: "ordinary"; readonly method: Method; readonly logic: Logic }
  /** A calculus given as a rule file, named by the file's `name`: a built-in one or the visitor's. */
  | { readonly suite: "rules"; readonly method: Method; readonly calculus: string }
  /** Modal logic in a normal system, decided by deduxit in the system's labelled calculus. */
  | { readonly suite: "modal"; readonly method: Method; readonly system: string }
  /** Lambda-terms checked and a type's terms found, in a lambda calculus. */
  | { readonly suite: "lambda"; readonly method: Method; readonly calculus: LambdaCalculus };

/** A suite as the page offers it. */
export interface Suite {
  readonly key: SuiteKey;
  /** Its name on the calculus's segmented control, deduxit's. */
  readonly name: string;
  /** What its segment's tip says it is. */
  readonly tip: string;
  readonly methods: readonly Method[];
  /** The parameter that names a calculus of the suite, as `about` names it. */
  readonly parameter: "mode" | "logic" | "calculus" | "system";
  /**
   * The values the page reads, a part of deduxit's (the calculus's switches offer some of them).
   * A rule file's name is any name: the custom suite lists the built-in ones.
   */
  readonly values: readonly string[];
  /**
   * Whether the suite's segment stands on the calculus's segmented control. A calculus of one's
   * own is reached by its own button there, so a visitor who never opens one sees nothing new.
   */
  readonly segment: boolean;
  /** The calculus a new tab of the suite starts in. */
  readonly start: Calculus;
  /** The prefix of the suite's calls in deduxit's module, as `about` gives it. */
  readonly calls: string;
  /** Its call that reads a finished proof back as a λ-term, as `about` names it, or null. */
  readonly term: string | null;
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
    segment: true,
    start: { suite: "linear", method: "sequent", mode: "classical" },
    calls: "",
    term: "term",
  },
  {
    key: "ordinary",
    name: "Ordinary",
    tip: "Ordinary propositional logic, proved in Gentzen's LK and LJ",
    methods: ["sequent", "natural"],
    parameter: "logic",
    values: LOGICS,
    segment: true,
    start: { suite: "ordinary", method: "sequent", logic: "intuitionistic" },
    calls: "ordinary_",
    term: "ordinary_term",
  },
  {
    key: "rules",
    name: "Custom calculus",
    tip: "A calculus written as a rule file, built-in or your own: every step checked against its rules",
    methods: ["sequent"],
    parameter: "calculus",
    values: BUILT_IN,
    segment: false,
    start: { suite: "rules", method: "sequent", calculus: "LJ" },
    calls: "rules_",
    term: null,
  },
  {
    key: "modal",
    name: "Modal",
    tip: "Modal logic: □ necessarily, ◇ possibly, decided in a system from K to S5",
    methods: ["sequent"],
    parameter: "system",
    values: SYSTEM_NAMES,
    segment: false,
    start: { suite: "modal", method: "sequent", system: "K" },
    calls: "modal_",
    term: null,
  },
  {
    key: "lambda",
    name: "Lambda-terms",
    tip: "Lambda-terms: a term checked with its typing derivation, or a type's terms found",
    methods: ["typing"],
    parameter: "calculus",
    values: LAMBDA_CALCULI,
    segment: false,
    start: { suite: "lambda", method: "typing", calculus: "simple" },
    calls: "lambda_",
    term: null,
  },
];

/** The registry's entry of a suite. */
export const suite = (key: SuiteKey): Suite => SUITES.find((s) => s.key === key) as Suite;

/** The calculus of a linear mode. */
export const linear = (mode: Mode): Calculus => ({ suite: "linear", method: "sequent", mode });

/** The calculus of an ordinary logic, by the sequent calculus unless another method is named. */
export const ordinary = (logic: Logic, method: Method = "sequent"): Calculus => ({
  suite: "ordinary",
  method,
  logic,
});

/** Whether a calculus proves its sequent by natural deduction. */
export const isNatural = (c: Calculus): boolean => c.method === "natural";

/** The calculus of a rule file, by its name. */
export const custom = (calculus: string): Calculus => ({
  suite: "rules",
  method: "sequent",
  calculus,
});

/** The calculus of a modal system. */
export const modal = (system: string): Calculus => ({ suite: "modal", method: "sequent", system });

/** A lambda calculus. */
export const lambda = (calculus: LambdaCalculus): Calculus => ({
  suite: "lambda",
  method: "typing",
  calculus,
});

/** The longest rule file's name a link or the shelf reads. */
const LONGEST_NAME = 64;

/** The suite's parameter of a calculus: its mode, its logic, its rule file's name or its system. */
export const parameterOf = (c: Calculus): string =>
  c.suite === "linear"
    ? c.mode
    : c.suite === "ordinary"
      ? c.logic
      : c.suite === "modal"
        ? c.system
        : c.calculus;

/** The linear mode of a calculus; the default mode for a calculus of another suite. */
export const modeOf = (c: Calculus): Mode => (c.suite === "linear" ? c.mode : "classical");

/** Whether two calculi are the same. */
export const sameCalculus = (a: Calculus, b: Calculus) =>
  a.suite === b.suite && a.method === b.method && parameterOf(a) === parameterOf(b);

/**
 * The calculus a suite's name, method and parameter make, or undefined where the registry has
 * none of them: what a link and a stored proof are read back by. No method is the suite's first.
 */
export function calculusOf(
  key: string | null | undefined,
  method: string | null | undefined,
  parameter: string | null | undefined,
): Calculus | undefined {
  const s = SUITES.find((x) => x.key === key);
  if (!s) return undefined;
  const how = (method ?? s.methods[0]) as Method;
  if (!s.methods.includes(how)) return undefined;
  if (s.key === "rules")
    return parameter?.trim() && parameter.length <= LONGEST_NAME ? custom(parameter) : undefined;
  if (!parameter || !s.values.includes(parameter)) return undefined;
  if (s.key === "modal") return modal(parameter);
  if (s.key === "lambda") return lambda(parameter as LambdaCalculus);
  return s.key === "linear" ? linear(parameter as Mode) : ordinary(parameter as Logic, how);
}

/** The calculus's short mark on its tab. */
export function markOf(c: Calculus): string {
  if (c.suite === "rules") return c.calculus;
  if (c.suite === "modal") return c.system;
  if (c.suite === "lambda") return { simple: "λ→", linear: "λ⊸", affine: "λ⊸+aff" }[c.calculus];
  if (c.suite === "ordinary")
    return isNatural(c)
      ? { classical: "NK", intuitionistic: "NJ", minimal: "NM" }[c.logic]
      : { classical: "LK", intuitionistic: "LJ", minimal: "LM" }[c.logic];
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

/** The tab's mark on a wide screen: the suite's name with the calculus's short mark, "Linear (LL)". */
export function markLabel(c: Calculus): string {
  return `${suite(c.suite).name} (${markOf(c)})`;
}

/** The calculus in the switches' words, for the status and the mark's name. */
export function calculusWords(c: Calculus): string {
  if (c.suite === "rules") return `Custom calculus, ${c.calculus}`;
  if (c.suite === "lambda") return `Lambda-terms, ${CALCULUS_WORDS[c.calculus].toLowerCase()}`;
  if (c.suite === "modal") {
    const conditions = SYSTEMS.find((s) => s.name === c.system)?.conditions ?? [];
    return conditions.length
      ? `Modal, ${c.system} (${conditions.join(", ")})`
      : `Modal, ${c.system} (no condition)`;
  }
  if (c.suite === "ordinary")
    return isNatural(c)
      ? {
          classical: "Ordinary, classical, natural deduction (NK)",
          intuitionistic: "Ordinary, intuitionistic, natural deduction (NJ)",
          minimal: "Ordinary, minimal, natural deduction (NM)",
        }[c.logic]
      : {
          classical: "Ordinary, classical (LK)",
          intuitionistic: "Ordinary, intuitionistic (LJ)",
          minimal: "Ordinary, minimal (LM, LJ without ex falso)",
        }[c.logic];
  return modeWords(c.mode);
}

/** Whether a calculus's goals are two-sided with one formula right of ⊢ (LJ, LM, ILL). */
export const intuitionistic = (c: Calculus) =>
  c.suite === "linear"
    ? c.mode.startsWith("intuitionistic")
    : c.suite === "ordinary" && c.logic !== "classical";
