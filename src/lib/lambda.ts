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

/** A lambda calculus, as deduxit names it. */
export type LambdaCalculus = "simple" | "linear" | "affine";

/** The calculi, in the order the select offers them, the simply typed one first. */
export const LAMBDA_CALCULI: readonly LambdaCalculus[] = ["simple", "linear", "affine"];

/** A term to try: composition's first half, a function applied to an argument. */
export const TERM_EXAMPLE = String.raw`\f:a -> b. \x:a. f x`;

/** A type to try: two terms, one for each argument it can give back. */
export const TYPE_EXAMPLE = "a -> a -> a";

/** A term to try in the linear calculi, where every variable is used once. */
export const LINEAR_EXAMPLE = String.raw`\x:a * b. let x be y * z in z * y`;

/**
 * Whether the field's text is a term rather than a type: a term has a λ (`\` where no `/` stands
 * beside it, since `/\` and `\/` are a type's ∧ and ∨), a variable's type after `:`, or a pair's
 * bracket (`<` where no `-` follows, since `<->` is a type's ↔), and a type has none of them.
 */
export const isTerm = (text: string): boolean => /[λ:⟨]|<(?!-)|(?<!\/)\\(?!\/)/u.test(text);

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
};

/** What a calculus asks of a term's variables, in one sentence. */
export const CALCULUS_SENTENCES: Readonly<Record<LambdaCalculus, string>> = {
  simple: "A variable may be used any number of times.",
  linear: "Every variable is used exactly once.",
  affine: "Every variable is used at most once.",
};

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
}): { readonly words: string; readonly tone: "ok" | "bad" | "warn" | "none" } {
  if (work.kind === "term") {
    if (work.illTyped) return { words: "Not well typed", tone: "bad" };
    return work.typing ? { words: "Well typed", tone: "ok" } : { words: "Checking", tone: "none" };
  }
  if (work.kind === "type" && work.found) {
    const said = inhabitationWords(work.found);
    const tone =
      work.found.verdict === "inhabited" ? "ok" : work.found.verdict === "empty" ? "bad" : "warn";
    return { words: said.keyword, tone };
  }
  return { words: "Not started", tone: "none" };
}
