// deduxit © Fabian Lukas Grubmüller 2026
// Licensed under the EUPL

/**
 * Lambda-terms as the page shows them: a term the visitor types is checked by deduxit's
 * `lambda_…` calls and its typing derivation drawn; a type the visitor types gets its terms found,
 * listed and counted. Plain data and words, no Solid.
 */

import type { Said } from "./words";

/** A term or a type as typed, in signs: `\` as λ, `->` as →, `-o` as ⊸, `|-` as ⊢. */
export const prettyLambda = (input: string): string =>
  input.replaceAll("\\", "λ").replaceAll("|-", "⊢").replaceAll("->", "→").replaceAll("-o", "⊸");

/** A lambda calculus, as deduxit names it: typed or untyped, and how often a variable is used. */
export type LambdaCalculus =
  | "simple"
  | "linear"
  | "affine"
  | "untyped"
  | "untyped_linear"
  | "untyped_affine";

/** How often a term may use each variable: any number of times, exactly once, at most once. */
export type LambdaUse = "simple" | "linear" | "affine";

/** The uses, in the order the toggle offers them. */
export const LAMBDA_USES: readonly LambdaUse[] = ["simple", "linear", "affine"];

/** The calculi, the typed ones first, each in the uses' order. */
export const LAMBDA_CALCULI: readonly LambdaCalculus[] = [
  "simple",
  "linear",
  "affine",
  "untyped",
  "untyped_linear",
  "untyped_affine",
];

/** Whether a calculus's terms carry no types. */
export const isUntyped = (c: LambdaCalculus): boolean => c.startsWith("untyped");

/** How often a calculus's terms may use each variable. */
export const useOf = (c: LambdaCalculus): LambdaUse =>
  c === "untyped" ? "simple" : (c.replace("untyped_", "") as LambdaUse);

/** The calculus of a use, typed or untyped. */
export const calculusWith = (use: LambdaUse, untyped: boolean): LambdaCalculus =>
  untyped ? (use === "simple" ? "untyped" : `untyped_${use}`) : use;

/**
 * A typed term's text with every λ's type left out (`\x:a -> b. x` to `\x. x`), for the switch to
 * an untyped calculus: a type ends at its binder's `.`, since no type has one.
 */
export const eraseTypes = (text: string): string =>
  text.replace(/([λ\\]\s*[\p{L}\p{N}_']+)\s*:[^.]*\./gu, "$1.");

/** A term to try: composition's first half, a function applied to an argument. */
export const TERM_EXAMPLE = String.raw`\f:a -> b. \x:a. f x`;

/** An untyped term to try: the function that applies its argument twice, given the identity. */
export const UNTYPED_EXAMPLE = String.raw`(\f. \x. f (f x)) (\y. y)`;

/** An untyped term to try where every variable is used once: application, given the identity. */
export const UNTYPED_LINEAR_EXAMPLE = String.raw`(\f. \x. f x) (\y. y)`;

/** A type to try: two terms, one for each argument it can give back. */
export const TYPE_EXAMPLE = "a -> a -> a";

/** A term to try in the linear calculi, where every variable is used once. */
export const LINEAR_EXAMPLE = String.raw`\x:a * b. let x be y * z in z * y`;

/**
 * Whether the field's text is a term rather than a type. A term has a λ (`\\` where no `/` stands
 * beside it, since `/\\` and `\\/` are a type's ∧ and ∨), a variable's type after `:`, a pair's
 * bracket (`<` where no `-` follows, since `<->` is a type's ↔), a unit (`()`, `∗`), or a
 * keyword of the terms' syntax (`let`, `case`, `fst`, `true(`, `false_`, …); a type has none of
 * them, `true` and `false` being its constants.
 */
export const isTerm = (text: string): boolean =>
  /[λ:⟨∗]|<(?!-)|(?<!\/)\\(?!\/)|\(\s*\)|\b(?:let|case|fst|snd|inl|inr|abort|promote|derelict|discard|copy)\b|\b(?:inl|inr|abort)_|\b(?:true|false)\s*[_(]/u.test(
    text,
  );

/** A term as deduxit writes it, with what the page shows of it. */
export interface Term {
  readonly calculus: LambdaCalculus;
  /** The term, written with the settings' notation (the bindings add it). */
  readonly text?: string;
  /** Its typing judgement, `x : a ⊢ M : b` (the bindings add it). */
  readonly judgement?: string;
}

/** A term checked: its document, the type of every subterm and its judgement with every type. */
export interface Typed extends Term {
  readonly judgement: string;
}

/** Whether a type has a term, as deduxit decides it. */
export interface Inhabitation {
  readonly verdict: "inhabited" | "empty" | "unknown";
  readonly term?: Term;
  /** Where the type has no term: a Kripke model in which its formula is false. */
  readonly countermodel?: unknown;
  readonly reason?: { readonly kind: string };
}

/** How many terms a type has, up to βη-equality. */
export type Count =
  | { readonly kind: "exactly"; readonly count: number }
  | { readonly kind: "infinite" }
  | { readonly kind: "at_least"; readonly count: number };

/** A type's terms, listed and counted. */
export interface Inhabitants {
  readonly count: Count;
  readonly terms: readonly Term[];
}

/** A calculus in a few words, for the select and the status. */
export const CALCULUS_WORDS: Readonly<Record<LambdaCalculus, string>> = {
  simple: "Simply typed",
  linear: "Linear",
  affine: "Affine",
  untyped: "Untyped",
  untyped_linear: "Untyped linear",
  untyped_affine: "Untyped affine",
};

/** What a use asks of a term's variables, in one sentence. */
export const CALCULUS_SENTENCES: Readonly<Record<LambdaUse, string>> = {
  simple: "A variable may be used any number of times.",
  linear: "Every variable is used exactly once.",
  affine: "Every variable is used at most once.",
};

/** Where in the term's text the next step reduces, in UTF-16 code units as JavaScript counts. */
export interface Span {
  readonly start: number;
  readonly end: number;
}

/**
 * How a reduction ended: in normal form, at its bound on steps or on the term's size, or refused
 * by a limit (deduxit's `lambda.reduction`).
 */
export type ReductionEnd = "normal_form" | "steps" | "nodes" | "refused";

/** A term reduced by β, as the bindings' `lambda_reduce` answers. */
export interface Reduction {
  /** The term reached, with its `text`. */
  readonly term: { readonly text: string };
  /** The steps taken, each naming its redex. */
  readonly steps: readonly unknown[];
  readonly end: ReductionEnd;
  /** The bound reached, for `steps` and `nodes`. */
  readonly limit?: number;
  /** Why a limit refused the reduction, in an error's form. */
  readonly reason?: { readonly message?: string };
  /** The redex the next step reduces, or null in normal form. */
  readonly next: Span | null;
}

/** An untyped term's verdict: its variables used as its calculus asks. */
export const formedWords = (use: LambdaUse): Said => ({
  keyword: "Well formed",
  sentence: CALCULUS_SENTENCES[use],
});

/** An untyped term its calculus refuses, the reason as deduxit says it. */
export const illFormedWords = (reason: string): Said => ({
  keyword: "Not well formed",
  sentence: `${reason.charAt(0).toUpperCase()}${reason.slice(1)}.`,
});

/**
 * Where a reduction stands after `taken` steps, in a sentence; never that it has no end. `bounded`
 * says the steps were "To the end"'s, which stopped at its bound on steps.
 */
export function reductionWords(reached: Reduction, taken: number, bounded = false): string {
  const after = taken === 1 ? "1 step" : `${taken} steps`;
  if (bounded && reached.end === "steps")
    return `Not finished after ${after}, the bound on steps. The part in blue is reduced next.`;
  switch (reached.end) {
    case "normal_form":
      return taken === 0
        ? "It is in normal form: no part of it can be reduced."
        : `Normal form after ${after}: no part of it can be reduced.`;
    case "nodes":
      return `Not finished after ${after}: the term grew past ${reached.limit ?? 0} parts, the bound on its size.`;
    case "refused":
      return `Not finished after ${after}: ${reached.reason?.message ?? "a limit stopped it"}.`;
    default:
      return taken === 0
        ? "The part in blue is reduced next. Press Next step to reduce it."
        : `After ${after}. The part in blue is reduced next.`;
  }
}

/**
 * An untyped term's most general simple type, in a sentence, from the judgement deduxit wrote of
 * the term typed at it (`w : a ⊢ M : b → b`): the type, and the free variables' types it needs.
 */
export function principalWords(judgement: string): string {
  const type = judgement.slice(judgement.lastIndexOf(" : ") + 3);
  const turnstile = judgement.indexOf("⊢");
  const context = turnstile > 0 ? judgement.slice(0, turnstile).trim() : "";
  return context
    ? `Its most general simple type is ${type}, given ${context}.`
    : `Its most general simple type is ${type}.`;
}

/** That no simple type fits an untyped term, with deduxit's reason. */
export const untypableWords = (reason: string): string => `No simple type fits it: ${reason}.`;

/** A checked term's verdict. */
export const typedWords = (typed: Typed): Said => ({
  keyword: "Well typed",
  sentence: `Its type is ${typed.judgement.slice(typed.judgement.lastIndexOf(" : ") + 3)}. The tree below is a proof in natural deduction of that formula, with each step's term written beside it.`,
});

/** An ill-typed term's verdict, the reason as deduxit says it. */
export const illTypedWords = (reason: string): Said => ({
  keyword: "Not well typed",
  sentence: `${reason.charAt(0).toUpperCase()}${reason.slice(1)}.`,
});

/** Whether a type has a term, in words. */
export function inhabitationWords(found: Inhabitation): Said {
  switch (found.verdict) {
    case "inhabited":
      return {
        keyword: "Has a term",
        sentence:
          "A term of a type is a proof of its formula in intuitionistic logic: deduxit found a proof and read it back as this term.",
      };
    case "empty":
      return {
        keyword: "No term",
        sentence:
          "Its formula is not valid in intuitionistic logic, so no term has this type. A Kripke model where it fails shows it.",
      };
    default:
      return {
        keyword: "Not decided",
        sentence:
          found.reason?.kind === "work_limit"
            ? "The budget ran out before the search decided. Raise the budget in Settings."
            : "A bound stopped the search before it decided.",
      };
  }
}

/** How many terms were found, in a sentence. */
export function countWords(count: Count, listed: number): string {
  switch (count.kind) {
    case "exactly":
      return count.count === 1
        ? "Exactly one term, up to βη-equality."
        : `Exactly ${count.count} terms, up to βη-equality.`;
    case "infinite":
      return `Infinitely many terms: one can be put inside another without end. The ${listed} shortest are listed.`;
    default:
      return `At least ${count.count} terms: the search stopped at its depth. The ${listed} shortest are listed.`;
  }
}

/** What a lambda tab's dot and status say: its state in a few words, and its tone. */
export function lambdaState(work: {
  readonly kind: "term" | "type" | null;
  readonly typing: string | null;
  readonly illTyped: string | null;
  readonly found: Inhabitation | null;
  readonly untyped?: boolean;
}): { readonly words: string; readonly tone: "ok" | "bad" | "warn" | "none" } {
  if (work.kind === "term") {
    if (work.illTyped)
      return { words: work.untyped ? "Not well formed" : "Not well typed", tone: "bad" };
    if (!work.typing) return { words: "Checking", tone: "none" };
    return { words: work.untyped ? "Well formed" : "Well typed", tone: "ok" };
  }
  if (work.kind === "type" && work.found) {
    const said = inhabitationWords(work.found);
    const tone =
      work.found.verdict === "inhabited" ? "ok" : work.found.verdict === "empty" ? "bad" : "warn";
    return { words: said.keyword, tone };
  }
  return { words: "Not started", tone: "none" };
}
