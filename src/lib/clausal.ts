// deduxit © Fabian Lukas Grubmüller 2026
// Licensed under the EUPL

/**
 * A classical sequent's normal forms and its clauses refuted, as deduxit's `ordinary_normalize`,
 * `ordinary_resolve` and the calls of a refutation by hand answer them (wire levels 21 and 22),
 * and what the page's two sheets say of them: the forms in the order the page offers them, each
 * step's law and the sequent after it, the clauses written in signs, the refutation laid out as a
 * graph, and the atoms two clauses can be resolved on.
 */

import { formulaTexts, type SequentForm } from "./ordinary";

/** A normal form, as deduxit names it. */
export type Form = "nnf" | "cnf" | "dnf" | "tseitin" | "plaisted-greenbaum";

/** A form as the page offers it: its name, what it is, and what it keeps. */
export interface FormWords {
  readonly key: Form;
  readonly name: string;
  /** What the form is, in one sentence. */
  readonly is: string;
}

/**
 * The forms, the equivalent ones first, conjunctive normal form (a first course's) first of all,
 * then negation and disjunctive normal form, then the two encodings. deduxit's `about` lists the
 * same names (`clausal.test.ts` holds them equal).
 */
export const FORMS: readonly FormWords[] = [
  {
    key: "cnf",
    name: "CNF",
    is: "Conjunctive normal form: a conjunction of clauses, each a disjunction of atoms and negated atoms.",
  },
  {
    key: "nnf",
    name: "NNF",
    is: "Negation normal form: no → or ↔, and ¬ only before an atom.",
  },
  {
    key: "dnf",
    name: "DNF",
    is: "Disjunctive normal form: a disjunction of conjunctions of atoms and negated atoms.",
  },
  {
    key: "tseitin",
    name: "Tseitin",
    is: "Tseitin's clauses: the sequent's negation, with a new atom for each compound part and clauses that tie it to that part.",
  },
  {
    key: "plaisted-greenbaum",
    name: "Plaisted–Greenbaum",
    is: "Tseitin's clauses, keeping only the half of each new atom's clauses that its place needs.",
  },
];

/** A step of a normal form, as deduxit answers it: indices of the result's formulas. */
export interface NormalStep {
  readonly rule: string;
  readonly law: string;
  readonly before: number;
  readonly after: number;
  readonly left: readonly number[];
  readonly right: readonly number[];
  readonly added: readonly number[];
}

/** A normal form with its steps and checks, as `ordinary_normalize` answers it. */
export interface NormalForm {
  readonly form: Form;
  readonly promise: "equivalent" | "equisatisfiable";
  /** Whether every claim of the promise was decided valid. */
  readonly checked: boolean;
  readonly sequent: SequentForm;
  /** The normal form; its formulas hold every step's. */
  readonly result: SequentForm;
  readonly steps: readonly NormalStep[];
}

/** A step written in signs: its law, the subformula before and after, and the sequent after it. */
export interface StepText {
  readonly law: string;
  /** What the step says it did: `at a → b`, `t1 names a ∧ b`, `b moves left of ⊢`. */
  readonly what: string;
  /** The sequent after the step. */
  readonly sequent: string;
}

/** Every step of a normal form written in signs, in order. */
export function stepTexts(made: NormalForm): StepText[] {
  const texts = formulaTexts(made.result);
  const text = (k: number) => texts[k] ?? "";
  const clauses: number[] = [];
  return made.steps.map((step) => {
    clauses.push(...step.added);
    const left = [...step.left, ...clauses].map(text).join(", ");
    const right = step.right.map(text).join(", ");
    const sequent = `${left}${left ? " " : ""}⊢ ${right}`.trimEnd();
    const what =
      step.rule === "define"
        ? `${text(step.after)} names ${text(step.before)}, with the clauses ${step.added.map(text).join(", ")}`
        : step.rule === "negate"
          ? `${text(step.before)} moves left of ⊢ as ${text(step.after)}`
          : step.rule === "true-hypothesis"
            ? "⊤ left of ⊢ is left out"
            : `at ${text(step.before)}`;
    return { law: step.law, what, sequent };
  });
}

/** What the page says of a normal form's check: its keyword, tone and sentence. */
export function checkWords(made: NormalForm): {
  keyword: string;
  tone: "ok" | "warn";
  sentence: string;
} {
  if (!made.checked)
    return {
      keyword: "Not checked",
      tone: "warn",
      sentence: "deduxit made the form, but did not decide its check within the page's bounds.",
    };
  if (made.promise === "equivalent")
    return {
      keyword: "Equivalent",
      tone: "ok",
      sentence:
        "Each formula is equivalent to its normal form: deduxit's SAT solver checked it, and deduxit checked the solver's proof.",
    };
  return {
    keyword: "Same verdict",
    tone: "ok",
    sentence:
      "The clauses can all be true exactly when the sequent can be false, so the result is valid exactly when the sequent is: deduxit's SAT solver checked it.",
  };
}

/** A literal as deduxit writes it: the atom `k` counted from 1, `-k` its negation. */
export type Literal = number;

/** A resolvent: its two clauses by number from 0, the atom from 1, and the clause it derives. */
export interface Resolvent {
  readonly first: number;
  readonly second: number;
  readonly atom: number;
  readonly clause: readonly Literal[];
}

/** A refutation, as a refutation by hand is held: the clauses and the resolvents so far. */
export interface Refutation {
  readonly version: number;
  readonly atoms: readonly string[];
  readonly clauses: readonly (readonly Literal[])[];
  readonly resolvents: readonly Resolvent[];
}

/** A step of DPLL, as deduxit answers it. */
export interface DpllEvent {
  readonly event: "unit" | "pure" | "decide" | "conflict" | "backtrack";
  readonly literal?: Literal;
  readonly clause?: number;
  readonly level?: number;
}

/** A clause set decided, as `ordinary_resolve` answers it. */
export interface Resolution {
  readonly method: "saturation" | "dpll";
  readonly verdict: "unsatisfiable" | "satisfiable" | "unknown";
  readonly atoms: readonly string[];
  readonly clauses: readonly (readonly Literal[])[];
  readonly resolvents?: readonly Resolvent[];
  readonly true_atoms?: readonly number[];
  readonly bound?: { readonly kind: string; readonly limit?: number };
  readonly trace?: readonly DpllEvent[];
}

/** A step by hand, as `ordinary_resolve_step` answers it. */
export interface Stepped {
  readonly refutation: Refutation;
  /** The new clause's number. */
  readonly added: number;
  /** Whether the empty clause is derived. */
  readonly finished: boolean;
}

/** A literal written in signs over the atoms. */
export const literalText = (atoms: readonly string[], l: Literal) =>
  `${l < 0 ? "¬" : ""}${atoms[Math.abs(l) - 1] ?? "?"}`;

/** A clause written in signs: `¬a ∨ b`, and `□` for the empty clause. */
export const clauseText = (atoms: readonly string[], clause: readonly Literal[]) =>
  clause.length === 0 ? "□" : clause.map((l) => literalText(atoms, l)).join(" ∨ ");

/** The clauses a refutation numbers, in order: the given ones, then the resolvents. */
export const allClauses = (r: Pick<Refutation, "clauses" | "resolvents">) => [
  ...r.clauses,
  ...r.resolvents.map((s) => s.clause),
];

/**
 * The atoms two clauses can be resolved on, counted from 1: those one holds and the other holds
 * negated. Resolving on one of two such atoms gives a tautology, which deduxit allows; the page
 * offers each.
 */
export function clashes(a: readonly Literal[], b: readonly Literal[]): number[] {
  return [...new Set(a.filter((l) => b.includes(-l)).map(Math.abs))].sort((x, y) => x - y);
}

/** A node of a refutation's graph: a clause, its row and its place in the row. */
export interface GraphNode {
  /** The clause's number, from 0. */
  readonly k: number;
  /** Its row: 0 for a given clause, one more than its deeper parent for a resolvent. */
  readonly row: number;
  /** Its place in its row, from 0. */
  readonly column: number;
}

/** A refutation laid out as a graph: each node in a row, and an edge from each parent. */
export interface Graph {
  readonly nodes: readonly GraphNode[];
  /** Parent and child, by number. */
  readonly edges: readonly (readonly [number, number])[];
  /** The rows' lengths. */
  readonly widths: readonly number[];
}

/**
 * Lays out a refutation: the given clauses in the top row, each resolvent one row below its
 * deeper parent, in the order made, with an edge from each of its two clauses.
 */
export function layout(r: Pick<Refutation, "clauses" | "resolvents">): Graph {
  const row: number[] = r.clauses.map(() => 0);
  const edges: [number, number][] = [];
  r.resolvents.forEach((s, j) => {
    const k = r.clauses.length + j;
    row[k] = Math.max(row[s.first] ?? 0, row[s.second] ?? 0) + 1;
    edges.push([s.first, k], [s.second, k]);
  });
  const widths: number[] = [];
  const nodes = row.map((rw, k) => {
    const column = widths[rw] ?? 0;
    widths[rw] = column + 1;
    return { k, row: rw, column };
  });
  return { nodes, edges, widths: widths.map((w) => w ?? 0) };
}

/** A step of DPLL in words, as the command writes it, and how many decisions it lies under. */
export function eventWords(atoms: readonly string[], e: DpllEvent): string {
  const l = e.literal === undefined ? "" : literalText(atoms, e.literal);
  switch (e.event) {
    case "unit":
      return `unit ${l} from clause ${(e.clause ?? 0) + 1}`;
    case "pure":
      return `pure ${l}`;
    case "decide":
      return `decide ${l} (level ${e.level})`;
    case "conflict":
      return `conflict at clause ${(e.clause ?? 0) + 1}`;
    case "backtrack":
      return `backtrack: ${l} (level ${e.level})`;
  }
}

/** Each step of a trace with its depth: a decision and a backtrack at their level less one, the rest under the decisions open. */
export function traceLines(
  atoms: readonly string[],
  trace: readonly DpllEvent[],
): { text: string; depth: number }[] {
  let open = 0;
  return trace.map((e) => {
    if (e.event === "decide" || e.event === "backtrack") {
      open = e.level ?? 0;
      return { text: eventWords(atoms, e), depth: open - 1 };
    }
    return { text: eventWords(atoms, e), depth: open };
  });
}

/** What the page says of a clause set decided: its keyword, tone and sentence. */
export function resolutionWords(r: Resolution): {
  keyword: string;
  tone: "ok" | "bad" | "warn";
  sentence: string;
} {
  if (r.verdict === "unsatisfiable") {
    const n = r.resolvents?.length ?? 0;
    return {
      keyword: "Valid",
      tone: "ok",
      sentence: `The clauses of its negation cannot all be true: a refutation of ${n} resolution${n === 1 ? "" : "s"} derives □, and deduxit checked every step.`,
    };
  }
  if (r.verdict === "satisfiable") {
    const truths = (r.true_atoms ?? []).map((a) => r.atoms[a - 1] ?? "?");
    const model = truths.length
      ? `${truths.join(", ")} true and every other atom false`
      : "every atom false";
    return {
      keyword: "Not valid",
      tone: "bad",
      sentence: `All the clauses of its negation are true with ${model}, which deduxit checked clause by clause.`,
    };
  }
  return {
    keyword: "Not decided",
    tone: "warn",
    sentence: "deduxit did not decide the clauses within the page's bounds.",
  };
}
