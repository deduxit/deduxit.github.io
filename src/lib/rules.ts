// deduxit © Fabian Lukas Grubmüller 2026
// Licensed under the EUPL

/**
 * What a rule label means, for the hint every label carries (the rule popover, the derivation's
 * labels, Learn's steps): the rule's full name, its form (the premises over the conclusion) and
 * one plain sentence. The one-sided rules and the two-sided rules of intuitionistic linear logic
 * are the reference's (`src/content/rules/`); the rules the reference does not draw are here.
 */

import type { Calculus } from "./suites";

/** A rule as its hint shows it. */
export interface RuleHint {
  /** The label, as deduxit names the rule on the stage. */
  readonly name: string;
  /** The rule's full name: "tensor, right". */
  readonly title: string;
  readonly premises: readonly string[];
  readonly conclusion: string;
  /** What the rule does, in one sentence; formulas between backticks. */
  readonly says: string;
}

/** A rule of the reference, as the hint reads it. */
interface Written extends RuleHint {
  readonly twoSided?: readonly string[] | undefined;
  readonly oneSided?: string | undefined;
}

const rule = (
  name: string,
  title: string,
  premises: readonly string[],
  conclusion: string,
  says: string,
): RuleHint => ({ name, title, premises, conclusion, says });

/** The one-sided rules the reference does not draw: Mix and affine weakening. */
const ONE_SIDED: readonly RuleHint[] = [
  rule(
    "mix",
    "Mix",
    ["⊢ Γ", "⊢ Δ"],
    "⊢ Γ, Δ",
    "Splits the goal's formulas between two premises, each proved on its own. A rule only with Mix on.",
  ),
  rule(
    "wk",
    "weakening, affine",
    ["⊢ Γ"],
    "⊢ Γ, A",
    "Drops any formula `A`. A rule only in affine mode.",
  ),
];

/** The rules of intuitionistic linear logic the reference does not draw: affine weakening. */
const INTUITIONISTIC: readonly RuleHint[] = [
  rule(
    "wk",
    "weakening, affine",
    ["Γ ⊢ C"],
    "Γ, A ⊢ C",
    "Drops a hypothesis `A` that is not needed. A rule only in affine mode.",
  ),
];

/** Classical linear logic drawn two-sided: each rule by the name the drawing gives it. */
const CLASSICAL_TWO_SIDED: readonly RuleHint[] = [
  rule(
    "ax",
    "the axiom",
    [],
    "A ⊢ A",
    "A hypothesis `A` proves the same `A`, with nothing else beside them.",
  ),
  rule(
    "⊗L",
    "tensor, left",
    ["Γ, A, B ⊢ Δ"],
    "Γ, A ⊗ B ⊢ Δ",
    "Uses a hypothesis `A ⊗ B` as its two parts side by side. It never loses a proof.",
  ),
  rule(
    "⊗R",
    "tensor, right",
    ["Γ ⊢ A, Δ", "Γ′ ⊢ B, Δ′"],
    "Γ, Γ′ ⊢ A ⊗ B, Δ, Δ′",
    "Proves `A ⊗ B` by splitting the other formulas: some go with `A`, the rest with `B`.",
  ),
  rule(
    "⅋L",
    "par, left",
    ["Γ, A ⊢ Δ", "Γ′, B ⊢ Δ′"],
    "Γ, Γ′, A ⅋ B ⊢ Δ, Δ′",
    "Uses a hypothesis `A ⅋ B` by splitting the other formulas: some go with `A`, the rest with `B`.",
  ),
  rule(
    "⅋R",
    "par, right",
    ["Γ ⊢ A, B, Δ"],
    "Γ ⊢ A ⅋ B, Δ",
    "Puts `A` and `B` side by side on the right. It never loses a proof.",
  ),
  rule(
    "⊸L",
    "linear implication, left",
    ["Γ ⊢ A, Δ", "Γ′, B ⊢ Δ′"],
    "Γ, Γ′, A ⊸ B ⊢ Δ, Δ′",
    "Uses a hypothesis `A ⊸ B`: some formulas prove `A`, and the rest go on with `B`.",
  ),
  rule(
    "⊸R",
    "linear implication, right",
    ["Γ, A ⊢ B, Δ"],
    "Γ ⊢ A ⊸ B, Δ",
    "Proves `A ⊸ B` by taking `A` as a hypothesis and proving `B`. It never loses a proof.",
  ),
  rule("1L", "one, left", ["Γ ⊢ Δ"], "Γ, 1 ⊢ Δ", "A hypothesis `1` gives nothing and disappears."),
  rule("1R", "one, right", [], "⊢ 1", "Proves `1` from nothing, with nothing else in the goal."),
  rule("⊥L", "bottom, left", [], "⊥ ⊢", "A hypothesis `⊥` alone closes the goal."),
  rule(
    "⊥R",
    "bottom, right",
    ["Γ ⊢ Δ"],
    "Γ ⊢ ⊥, Δ",
    "`⊥` on the right disappears, and the rest of the goal stays.",
  ),
  rule(
    "&L₁",
    "with, left, first",
    ["Γ, A ⊢ Δ"],
    "Γ, A & B ⊢ Δ",
    "Uses a hypothesis `A & B` as `A`.",
  ),
  rule(
    "&L₂",
    "with, left, second",
    ["Γ, B ⊢ Δ"],
    "Γ, A & B ⊢ Δ",
    "Uses a hypothesis `A & B` as `B`.",
  ),
  rule(
    "&R",
    "with, right",
    ["Γ ⊢ A, Δ", "Γ ⊢ B, Δ"],
    "Γ ⊢ A & B, Δ",
    "Proves `A & B` twice, `A` and `B` each with all the other formulas. It never loses a proof.",
  ),
  rule(
    "⊕L",
    "plus, left",
    ["Γ, A ⊢ Δ", "Γ, B ⊢ Δ"],
    "Γ, A ⊕ B ⊢ Δ",
    "Uses a hypothesis `A ⊕ B` by cases, each with all the other formulas. It never loses a proof.",
  ),
  rule(
    "⊕R₁",
    "plus, right, first",
    ["Γ ⊢ A, Δ"],
    "Γ ⊢ A ⊕ B, Δ",
    "Proves `A ⊕ B` by proving `A`; the choice can be the wrong one.",
  ),
  rule(
    "⊕R₂",
    "plus, right, second",
    ["Γ ⊢ B, Δ"],
    "Γ ⊢ A ⊕ B, Δ",
    "Proves `A ⊕ B` by proving `B`; the choice can be the wrong one.",
  ),
  rule(
    "⊤R",
    "top, right",
    [],
    "Γ ⊢ ⊤, Δ",
    "`⊤` on the right closes the goal, whatever else is in it.",
  ),
  rule(
    "0L",
    "zero, left",
    [],
    "Γ, 0 ⊢ Δ",
    "A hypothesis `0` closes the goal, whatever else is in it.",
  ),
  rule(
    "!L",
    "dereliction, left",
    ["Γ, A ⊢ Δ"],
    "Γ, !A ⊢ Δ",
    "Uses a hypothesis `!A` once, as `A`.",
  ),
  rule(
    "!R",
    "promotion, right",
    ["!Γ ⊢ A, ?Δ"],
    "!Γ ⊢ !A, ?Δ",
    "Proves `!A` when every hypothesis is under `!` and every other formula on the right under `?`.",
  ),
  rule("!c", "contraction, left", ["Γ, !A, !A ⊢ Δ"], "Γ, !A ⊢ Δ", "Copies a hypothesis `!A`."),
  rule(
    "!w",
    "weakening, left",
    ["Γ ⊢ Δ"],
    "Γ, !A ⊢ Δ",
    "Drops a hypothesis `!A` that is not needed.",
  ),
  rule(
    "?L",
    "why not, left",
    ["!Γ, A ⊢ ?Δ"],
    "!Γ, ?A ⊢ ?Δ",
    "Uses a hypothesis `?A` when every other hypothesis is under `!` and every formula on the right under `?`.",
  ),
  rule("?R", "dereliction, right", ["Γ ⊢ A, Δ"], "Γ ⊢ ?A, Δ", "Proves `?A` by proving `A` once."),
  rule("?c", "contraction, right", ["Γ ⊢ ?A, ?A, Δ"], "Γ ⊢ ?A, Δ", "Copies `?A` on the right."),
  rule("?w", "weakening, right", ["Γ ⊢ Δ"], "Γ ⊢ ?A, Δ", "Drops `?A` from the right."),
  rule(
    "∀L",
    "for all, left",
    ["Γ, A[t/x] ⊢ Δ"],
    "Γ, ∀x. A ⊢ Δ",
    "Uses a hypothesis `∀x. A` at one witness `t`, a term the prover chooses.",
  ),
  rule(
    "∀R",
    "for all, right",
    ["Γ ⊢ A[a/x], Δ"],
    "Γ ⊢ ∀x. A, Δ",
    "Proves `∀x. A` for an eigenvariable `a`, a fresh name that occurs nowhere else in the goal.",
  ),
  rule(
    "∃L",
    "exists, left",
    ["Γ, A[a/x] ⊢ Δ"],
    "Γ, ∃x. A ⊢ Δ",
    "Uses a hypothesis `∃x. A` with an eigenvariable `a`, a fresh name that occurs nowhere else in the goal.",
  ),
  rule(
    "∃R",
    "exists, right",
    ["Γ ⊢ A[t/x], Δ"],
    "Γ ⊢ ∃x. A, Δ",
    "Proves `∃x. A` for a witness `t`, a term the prover chooses.",
  ),
  rule(
    "mix",
    "Mix",
    ["Γ ⊢ Δ", "Γ′ ⊢ Δ′"],
    "Γ, Γ′ ⊢ Δ, Δ′",
    "Splits the goal's formulas between two premises, each proved on its own. A rule only with Mix on.",
  ),
  rule(
    "wk",
    "weakening, affine",
    ["Γ ⊢ Δ"],
    "Γ, A ⊢ Δ",
    "Drops any formula, on either side. A rule only in affine mode.",
  ),
  rule(
    "cut",
    "cut",
    ["Γ ⊢ A, Δ", "Γ′, A ⊢ Δ′"],
    "Γ, Γ′ ⊢ Δ, Δ′",
    "Proves a lemma `A` with some formulas and uses it as a hypothesis with the rest.",
  ),
  rule(
    "~L",
    "negation, left",
    ["Γ ⊢ A, Δ"],
    "Γ, A⊥ ⊢ Δ",
    "Moves a hypothesis `A⊥` to the right as `A`, where it was written as a negation.",
  ),
  rule(
    "~R",
    "negation, right",
    ["Γ, A ⊢ Δ"],
    "Γ ⊢ A⊥, Δ",
    "Moves `A⊥` on the right to the left as the hypothesis `A`, where it was written as a negation.",
  ),
];

/** The Lambek calculus: its own rules, the order of the formulas kept. */
const LAMBEK: readonly RuleHint[] = [
  rule(
    "ax",
    "the axiom",
    [],
    "A ⊢ A",
    "A hypothesis `A` proves the same `A`, with nothing else beside them.",
  ),
  rule(
    "⊗L",
    "tensor, left",
    ["Γ, A, B, Δ ⊢ C"],
    "Γ, A ⊗ B, Δ ⊢ C",
    "Uses a hypothesis `A ⊗ B` as its two parts, side by side in their order.",
  ),
  rule(
    "⊗R",
    "tensor, right",
    ["Γ ⊢ A", "Δ ⊢ B"],
    "Γ, Δ ⊢ A ⊗ B",
    "Proves `A ⊗ B`: the hypotheses on the left prove `A`, those on the right `B`.",
  ),
  rule(
    "\\L",
    "under, left",
    ["Γ ⊢ A", "Δ, B, Δ′ ⊢ C"],
    "Δ, Γ, A \\ B, Δ′ ⊢ C",
    "Uses `A \\ B` with an `A` proved just left of it, and goes on with `B`.",
  ),
  rule(
    "\\R",
    "under, right",
    ["A, Γ ⊢ B"],
    "Γ ⊢ A \\ B",
    "Proves `A \\ B` by taking `A` as the leftmost hypothesis and proving `B`.",
  ),
  rule(
    "/L",
    "over, left",
    ["Γ ⊢ A", "Δ, B, Δ′ ⊢ C"],
    "Δ, B / A, Γ, Δ′ ⊢ C",
    "Uses `B / A` with an `A` proved just right of it, and goes on with `B`.",
  ),
  rule(
    "/R",
    "over, right",
    ["Γ, A ⊢ B"],
    "Γ ⊢ B / A",
    "Proves `B / A` by taking `A` as the rightmost hypothesis and proving `B`.",
  ),
];

/** The rules of LK, the classical calculus of ordinary logic, as G3 states them. */
const LK: readonly RuleHint[] = [
  rule(
    "ax",
    "the axiom",
    [],
    "Γ, A ⊢ A, Δ",
    "Closes a goal that has the same formula on both sides of `⊢`.",
  ),
  rule("WL", "weakening, left", ["Γ ⊢ Δ"], "Γ, A ⊢ Δ", "Drops a hypothesis that is not needed."),
  rule("WR", "weakening, right", ["Γ ⊢ Δ"], "Γ ⊢ A, Δ", "Drops a formula on the right."),
  rule("CL", "contraction, left", ["Γ, A, A ⊢ Δ"], "Γ, A ⊢ Δ", "Copies a hypothesis."),
  rule("CR", "contraction, right", ["Γ ⊢ A, A, Δ"], "Γ ⊢ A, Δ", "Copies a formula on the right."),
  rule(
    "∧L",
    "and, left",
    ["Γ, A, B ⊢ Δ"],
    "Γ, A ∧ B ⊢ Δ",
    "Uses a hypothesis `A ∧ B` as the two hypotheses `A` and `B`.",
  ),
  rule(
    "∧L₁",
    "and, left, first",
    ["Γ, A ⊢ Δ"],
    "Γ, A ∧ B ⊢ Δ",
    "Uses a hypothesis `A ∧ B` as `A`.",
  ),
  rule(
    "∧L₂",
    "and, left, second",
    ["Γ, B ⊢ Δ"],
    "Γ, A ∧ B ⊢ Δ",
    "Uses a hypothesis `A ∧ B` as `B`.",
  ),
  rule(
    "∧R",
    "and, right",
    ["Γ ⊢ A, Δ", "Γ ⊢ B, Δ"],
    "Γ ⊢ A ∧ B, Δ",
    "Proves `A ∧ B` by proving `A` and `B`, each from all the hypotheses.",
  ),
  rule(
    "∨L",
    "or, left",
    ["Γ, A ⊢ Δ", "Γ, B ⊢ Δ"],
    "Γ, A ∨ B ⊢ Δ",
    "Uses a hypothesis `A ∨ B` by cases: the goal from `A`, and again from `B`.",
  ),
  rule(
    "∨R",
    "or, right",
    ["Γ ⊢ A, B, Δ"],
    "Γ ⊢ A ∨ B, Δ",
    "Proves `A ∨ B` by keeping both `A` and `B` on the right.",
  ),
  rule("∨R₁", "or, right, first", ["Γ ⊢ A, Δ"], "Γ ⊢ A ∨ B, Δ", "Proves `A ∨ B` by proving `A`."),
  rule("∨R₂", "or, right, second", ["Γ ⊢ B, Δ"], "Γ ⊢ A ∨ B, Δ", "Proves `A ∨ B` by proving `B`."),
  rule(
    "→L",
    "implication, left",
    ["Γ ⊢ A, Δ", "Γ, B ⊢ Δ"],
    "Γ, A → B ⊢ Δ",
    "Uses a hypothesis `A → B`: prove `A`, then go on with `B` as a hypothesis.",
  ),
  rule(
    "→R",
    "implication, right",
    ["Γ, A ⊢ B, Δ"],
    "Γ ⊢ A → B, Δ",
    "Proves `A → B` by taking `A` as a hypothesis and proving `B`.",
  ),
  rule(
    "¬L",
    "not, left",
    ["Γ ⊢ A, Δ"],
    "Γ, ¬A ⊢ Δ",
    "Uses a hypothesis `¬A` by moving `A` to the right.",
  ),
  rule(
    "¬R",
    "not, right",
    ["Γ, A ⊢ Δ"],
    "Γ ⊢ ¬A, Δ",
    "Proves `¬A` by moving `A` to the left as a hypothesis.",
  ),
  rule(
    "↔L",
    "if and only if, left",
    ["Γ, A → B, B → A ⊢ Δ"],
    "Γ, A ↔ B ⊢ Δ",
    "Uses a hypothesis `A ↔ B` as its two implications.",
  ),
  rule(
    "↔L₁",
    "if and only if, left, first",
    ["Γ, A → B ⊢ Δ"],
    "Γ, A ↔ B ⊢ Δ",
    "Uses a hypothesis `A ↔ B` as `A → B`.",
  ),
  rule(
    "↔L₂",
    "if and only if, left, second",
    ["Γ, B → A ⊢ Δ"],
    "Γ, A ↔ B ⊢ Δ",
    "Uses a hypothesis `A ↔ B` as `B → A`.",
  ),
  rule(
    "↔R",
    "if and only if, right",
    ["Γ ⊢ A → B, Δ", "Γ ⊢ B → A, Δ"],
    "Γ ⊢ A ↔ B, Δ",
    "Proves `A ↔ B` by proving both implications.",
  ),
  rule("⊥L", "false, left", [], "Γ, ⊥ ⊢ Δ", "A hypothesis `⊥` closes the goal."),
  rule("⊥R", "false, right", ["Γ ⊢ Δ"], "Γ ⊢ ⊥, Δ", "Drops `⊥` from the right."),
  rule("⊤L", "true, left", ["Γ ⊢ Δ"], "Γ, ⊤ ⊢ Δ", "Drops a hypothesis `⊤`, which says nothing."),
  rule("⊤R", "true, right", [], "Γ ⊢ ⊤, Δ", "`⊤` on the right closes the goal."),
];

/** The rules of LJ, intuitionistic and minimal logic: one formula right of ⊢. */
const LJ: readonly RuleHint[] = [
  rule(
    "ax",
    "the axiom",
    [],
    "Γ, A ⊢ A",
    "Closes a goal whose formula on the right is one of its hypotheses.",
  ),
  rule("WL", "weakening, left", ["Γ ⊢ C"], "Γ, A ⊢ C", "Drops a hypothesis that is not needed."),
  rule("CL", "contraction, left", ["Γ, A, A ⊢ C"], "Γ, A ⊢ C", "Copies a hypothesis."),
  rule(
    "∧L",
    "and, left",
    ["Γ, A, B ⊢ C"],
    "Γ, A ∧ B ⊢ C",
    "Uses a hypothesis `A ∧ B` as the two hypotheses `A` and `B`.",
  ),
  rule(
    "∧L₁",
    "and, left, first",
    ["Γ, A ⊢ C"],
    "Γ, A ∧ B ⊢ C",
    "Uses a hypothesis `A ∧ B` as `A`.",
  ),
  rule(
    "∧L₂",
    "and, left, second",
    ["Γ, B ⊢ C"],
    "Γ, A ∧ B ⊢ C",
    "Uses a hypothesis `A ∧ B` as `B`.",
  ),
  rule(
    "∧R",
    "and, right",
    ["Γ ⊢ A", "Γ ⊢ B"],
    "Γ ⊢ A ∧ B",
    "Proves `A ∧ B` by proving `A` and `B`, each from all the hypotheses.",
  ),
  rule(
    "∨L",
    "or, left",
    ["Γ, A ⊢ C", "Γ, B ⊢ C"],
    "Γ, A ∨ B ⊢ C",
    "Uses a hypothesis `A ∨ B` by cases: the goal from `A`, and again from `B`.",
  ),
  rule(
    "∨R₁",
    "or, right, first",
    ["Γ ⊢ A"],
    "Γ ⊢ A ∨ B",
    "Proves `A ∨ B` by proving `A`; the choice can be the wrong one.",
  ),
  rule(
    "∨R₂",
    "or, right, second",
    ["Γ ⊢ B"],
    "Γ ⊢ A ∨ B",
    "Proves `A ∨ B` by proving `B`; the choice can be the wrong one.",
  ),
  rule(
    "→L",
    "implication, left",
    ["Γ ⊢ A", "Γ, B ⊢ C"],
    "Γ, A → B ⊢ C",
    "Uses a hypothesis `A → B`: prove `A`, then go on with `B` as a hypothesis.",
  ),
  rule(
    "→R",
    "implication, right",
    ["Γ, A ⊢ B"],
    "Γ ⊢ A → B",
    "Proves `A → B` by taking `A` as a hypothesis and proving `B`.",
  ),
  rule(
    "¬L",
    "not, left",
    ["Γ ⊢ A", "Γ, ⊥ ⊢ C"],
    "Γ, ¬A ⊢ C",
    "Uses a hypothesis `¬A`, read as `A → ⊥`: prove `A`, then go on with `⊥`.",
  ),
  rule(
    "¬R",
    "not, right",
    ["Γ, A ⊢ ⊥"],
    "Γ ⊢ ¬A",
    "Proves `¬A` by deriving `⊥` from the hypothesis `A`.",
  ),
  rule(
    "↔L",
    "if and only if, left",
    ["Γ, A → B, B → A ⊢ C"],
    "Γ, A ↔ B ⊢ C",
    "Uses a hypothesis `A ↔ B` as its two implications.",
  ),
  rule(
    "↔L₁",
    "if and only if, left, first",
    ["Γ, A → B ⊢ C"],
    "Γ, A ↔ B ⊢ C",
    "Uses a hypothesis `A ↔ B` as `A → B`.",
  ),
  rule(
    "↔L₂",
    "if and only if, left, second",
    ["Γ, B → A ⊢ C"],
    "Γ, A ↔ B ⊢ C",
    "Uses a hypothesis `A ↔ B` as `B → A`.",
  ),
  rule(
    "↔R",
    "if and only if, right",
    ["Γ ⊢ A → B", "Γ ⊢ B → A"],
    "Γ ⊢ A ↔ B",
    "Proves `A ↔ B` by proving both implications.",
  ),
  rule(
    "⊥L",
    "false, left",
    [],
    "Γ, ⊥ ⊢ C",
    "A hypothesis `⊥` proves any goal. Not a rule of minimal logic.",
  ),
  rule("⊤L", "true, left", ["Γ ⊢ C"], "Γ, ⊤ ⊢ C", "Drops a hypothesis `⊤`, which says nothing."),
  rule("⊤R", "true, right", [], "Γ ⊢ ⊤", "Proves `⊤` from any hypotheses."),
];

/** The rules whose hints a calculus shows, its labels drawn one-sided or two-sided. */
export function hintsFor(
  written: readonly Written[],
  calculus: Calculus,
  twoSided: boolean,
): readonly RuleHint[] {
  if (calculus.suite === "ordinary") return calculus.logic === "classical" ? LK : LJ;
  const mode = calculus.mode;
  if (mode.startsWith("lambek")) return LAMBEK;
  if (mode.startsWith("intuitionistic"))
    return [...written.filter((r) => r.oneSided !== undefined), ...INTUITIONISTIC];
  const oneSided = [...written.filter((r) => r.twoSided !== undefined), ...ONE_SIDED];
  // A classical session's steps keep their one-sided names; its drawing two-sided names them by side.
  return twoSided ? [...CLASSICAL_TWO_SIDED, ...oneSided] : oneSided;
}

/** The hint of the rule a label names, among a calculus's rules; none where none is known. */
export function hintNamed(hints: readonly RuleHint[], label: string): RuleHint | undefined {
  return hints.find((h) => h.name === label);
}

/** A rule's label as an id: the same for the same label, safe in an HTML id. */
export function hintId(label: string): string {
  return `rule-hint-${Array.from(label, (c) => c.codePointAt(0)?.toString(16)).join("-")}`;
}
