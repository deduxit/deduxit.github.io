// deduxit © Fabian Lukas Grubmüller 2026
// Licensed under the EUPL

/**
 * Natural deduction as a method of an ordinary proof: the proof's sequent becomes a goal of
 * deduxit's natural deduction calculus for the tab's logic (NK, NJ or NM), its formulas left of ⊢
 * the assumptions, and the derivation is built by deduxit's `rules_…` calls, backwards from a goal
 * or forwards from numbered lines.
 */

import { formulaTexts, type SequentForm } from "./ordinary";

/** The natural deduction calculus of each ordinary logic, by deduxit's name of its rule file. */
export const CALCULI = { classical: "NK", intuitionistic: "NJ", minimal: "NM" } as const;

/** An ordinary logic. */
export type Logic = keyof typeof CALCULI;

/** What a natural deduction proof of an ordinary sequent starts from. */
export interface Problem {
  /** The rule file's name. */
  readonly calculus: (typeof CALCULI)[Logic];
  /** The formula to derive, in signs. */
  readonly goal: string;
  /** The formulas left of ⊢, each a hypothesis of the whole proof. */
  readonly assumptions: readonly string[];
  /** How the goal was made from the formulas right of ⊢, when it is not one of them. */
  readonly made: "falsity" | "disjunction" | null;
}

/**
 * The natural deduction problem of a sequent `Γ ⊢ Δ`: derive Δ's formula from Γ. A judgement of
 * natural deduction has one formula, so an empty Δ asks for ⊥ and several formulas for their
 * disjunction, which a classical sequent means.
 */
export function problemOf(form: SequentForm, logic: Logic): Problem {
  const texts = formulaTexts(form);
  const compound = (k: number) => {
    const node = form.formulas[k];
    return typeof node === "object" && !("V" in node) && !("¬" in node);
  };
  const right = form.right.map((k) =>
    form.right.length > 1 && compound(k) ? `(${texts[k] ?? ""})` : (texts[k] ?? ""),
  );
  const [only] = right;
  return {
    calculus: CALCULI[logic],
    goal: right.length === 0 ? "⊥" : right.length === 1 && only ? only : right.join(" ∨ "),
    assumptions: form.left.map((k) => texts[k] ?? ""),
    made: right.length === 0 ? "falsity" : right.length > 1 ? "disjunction" : null,
  };
}

/** A line in force as the view lists it. */
export interface LineInForce {
  readonly line: number;
  readonly fitch: number | null;
  readonly sequent: string;
}

/**
 * The number the page shows each line by: its number in the Fitch drawing, the numbers a reader
 * of either drawing cites, where every line has one; the session's own numbers otherwise.
 */
export function shownNumbers(lines: readonly LineInForce[]): number[] {
  const fitch = lines.every((l) => l.fitch !== null);
  return lines.map((l) => (fitch ? (l.fitch as number) : l.line));
}

/**
 * The session's line numbers for the numbers a visitor typed, as the page shows them, or the
 * first typed number that names no line in force.
 */
export function citedLines(
  lines: readonly LineInForce[],
  typed: readonly number[],
): { lines: number[] } | { unknown: number } {
  const shown = shownNumbers(lines);
  const out: number[] = [];
  for (const n of typed) {
    const at = shown.indexOf(n);
    const line = lines[at];
    if (at < 0 || !line) return { unknown: n };
    out.push(line.line);
  }
  return { lines: out };
}

/**
 * deduxit's message with each line it names by the session's number named by the number the page
 * shows, `line 2` becoming `line 3` where the session's line 2 is shown as 3.
 */
export function shownMessage(lines: readonly LineInForce[], message: string): string {
  const shown = shownNumbers(lines);
  return message.replace(/\b(line|lines) (\d+)/g, (whole, word: string, n: string) => {
    const at = lines.findIndex((l) => l.line === Number(n));
    return at < 0 ? whole : `${word} ${shown[at]}`;
  });
}

/** The lines to list, each shown number once: equal hypotheses share their Fitch line. */
export function listedLines(lines: readonly LineInForce[]): { line: LineInForce; shown: number }[] {
  const shown = shownNumbers(lines);
  const seen = new Set<number>();
  return lines.flatMap((line, at) => {
    const n = shown[at] ?? line.line;
    if (seen.has(n)) return [];
    seen.add(n);
    return [{ line, shown: n }];
  });
}

/**
 * The line numbers a forward step cites, as typed: whole numbers from 1, separated by commas or
 * spaces, in the rule's order. Null for any other text.
 */
export function linesOf(text: string): number[] | null {
  const parts = text
    .trim()
    .split(/[\s,]+/)
    .filter((p) => p !== "");
  if (parts.length === 0) return [];
  const numbers = parts.map((p) => (/^[1-9]\d{0,8}$/.test(p) ? Number(p) : Number.NaN));
  return numbers.every(Number.isInteger) ? numbers : null;
}
