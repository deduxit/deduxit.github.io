// deduxit © Fabian Lukas Grubmüller 2026
// Licensed under the EUPL

/**
 * A classical sequent's negative translations and interpolants, as deduxit's `ordinary_translate`
 * and `ordinary_interpolate` answer them (wire level 16), and what the page's two sheets say of
 * them: the translations in the order the page offers them, both verdicts and whether they agree,
 * an interpolant's three checks.
 */

import type { Logic } from "./suites";
import { assignmentWords } from "./methods";
import { formText, type OrdinaryOutcome, type SequentForm } from "./ordinary";

/** A negative translation, as deduxit names it. */
export type Translation = "glivenko" | "kuroda" | "godel-gentzen" | "kolmogorov";

/** A translation as the page offers it: its name, what it does and the logic it translates into. */
export interface TranslationWords {
  readonly key: Translation;
  readonly name: string;
  /** What it does to the sequent, in one sentence. */
  readonly does: string;
  readonly target: Logic;
}

/**
 * The translations, from the one that changes the sequent least to the one that changes it most,
 * so that the first one a visitor sees is the easiest to read. Each translates into the logic
 * deduxit's `about` lists for it (`transforms.test.ts` holds them equal).
 */
export const TRANSLATIONS: readonly TranslationWords[] = [
  {
    key: "glivenko",
    name: "Glivenko",
    does: "Puts ¬¬ before the formula right of ⊢, if there is one.",
    target: "intuitionistic",
  },
  {
    key: "kuroda",
    name: "Kuroda",
    does: "Puts ¬¬ before every formula of the sequent.",
    target: "intuitionistic",
  },
  {
    key: "godel-gentzen",
    name: "Gödel–Gentzen",
    does: "Puts ¬¬ before every atom and writes A ∨ B as ¬(¬A ∧ ¬B).",
    target: "minimal",
  },
  {
    key: "kolmogorov",
    name: "Kolmogorov",
    does: "Puts ¬¬ before every part of every formula.",
    target: "minimal",
  },
];

/** A translation compared, as `ordinary_translate` answers it. */
export interface Comparison {
  readonly translation: Translation;
  readonly target: Logic;
  /** Both verdicts when they agree, `unknown` when either is undecided. */
  readonly agreement: "valid" | "not_valid" | "unknown";
  readonly sequent: SequentForm;
  readonly translated: SequentForm;
  /** The sequent decided in classical logic. */
  readonly classical: OrdinaryOutcome;
  /** The translation decided in the target logic. */
  readonly decided: OrdinaryOutcome;
}

/** A sequent's interpolant, as `ordinary_interpolate` answers it. */
export interface Interpolation {
  readonly logic: Logic;
  readonly partition: Partition;
  /** The sequent decided. */
  readonly outcome: OrdinaryOutcome;
  /** Absent for a sequent that is not valid or was not decided. */
  readonly interpolant?: {
    readonly text: string;
    /** `Γ₁ ⊢ Δ₁, I`, the interpolant last right of ⊢. */
    readonly first: Half;
    /** `I, Γ₂ ⊢ Δ₂`, the interpolant first left of ⊢. */
    readonly second: Half;
  };
}

/** A half of an interpolation: its sequent and its outcome. */
export interface Half {
  readonly sequent: SequentForm;
  readonly outcome: OrdinaryOutcome;
}

/** The first part of a sequent: the positions of its formulas on each side. */
export interface Partition {
  readonly left: readonly number[];
  readonly right: readonly number[];
}

/** Craig's split: every formula left of ⊢ in the first part, as deduxit's default is. */
export const hypotheses = (form: SequentForm): Partition => ({
  left: form.left.map((_, k) => k),
  right: [],
});

/** The partition with one formula moved to the other part, its positions in order. */
export function moved(partition: Partition, side: "left" | "right", position: number): Partition {
  const list = partition[side];
  const next = list.includes(position)
    ? list.filter((k) => k !== position)
    : [...list, position].sort((a, b) => a - b);
  return { ...partition, [side]: next };
}

/** What a translation does to a sequent with `right` formulas right of ⊢, when the line needs more. */
export const joinWords = (right: number) =>
  right > 1 ? "The formulas right of ⊢ are first joined by ∨ into one." : "";

/** A logic's name in running text. */
export const logicName = (logic: Logic) => `${logic} logic`;

/** The atoms each formula of a sequent's JSON holds, by its index (operands come first). */
export function atomsOf(form: SequentForm): ReadonlySet<string>[] {
  const sets: Set<string>[] = [];
  form.formulas.forEach((node, i) => {
    const set = new Set<string>();
    if (typeof node === "object") {
      const [tag, args] = Object.entries(node)[0] as [string, number | readonly number[]];
      if (tag === "V") set.add(form.atoms[args as number] ?? "");
      else
        for (const k of typeof args === "number" ? [args] : args)
          for (const a of sets[k] ?? []) set.add(a);
    }
    sets[i] = set;
  });
  return sets;
}

/** The atoms of the formulas in a part of the sequent, in the sequent's order of atoms. */
function partAtoms(form: SequentForm, partition: Partition, first: boolean): Set<string> {
  const sets = atomsOf(form);
  const found = new Set<string>();
  for (const side of ["left", "right"] as const) {
    form[side].forEach((index, k) => {
      if (partition[side].includes(k) === first) for (const a of sets[index] ?? []) found.add(a);
    });
  }
  return found;
}

/** An interpolant's atoms, read off the first half, where it is the last formula right of ⊢. */
export function interpolantAtoms(interpolation: Interpolation): string[] {
  const first = interpolation.interpolant?.first.sequent;
  if (!first) return [];
  const own = atomsOf(first)[first.right[first.right.length - 1] ?? -1] ?? new Set();
  return first.atoms.filter((a) => own.has(a));
}

/** The atoms both parts of the sequent share. */
export function sharedAtoms(form: SequentForm, partition: Partition): string[] {
  const one = partAtoms(form, partition, true);
  const two = partAtoms(form, partition, false);
  return form.atoms.filter((a) => one.has(a) && two.has(a));
}

/** A list of names in running text: `a`, `a and b`, `a, b and c`. */
export function listed(names: readonly string[]): string {
  if (names.length <= 1) return names[0] ?? "";
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

/** A classical countermodel's one world in words: every atom of the sequent true or false. */
export function worldWords(outcome: OrdinaryOutcome, form: SequentForm): string {
  const truths = new Set(outcome.countermodel?.model.worlds[0]?.atoms ?? []);
  return assignmentWords(form.atoms.map((a) => [a, truths.has(a)] as const));
}

/** What the page says of a translation compared: its keyword, tone and sentence. */
export function agreementWords(c: Comparison): {
  keyword: string;
  tone: "ok" | "bad" | "warn";
  sentence: string;
} {
  const into = logicName(c.target);
  if (c.agreement === "valid")
    return {
      keyword: "Both valid",
      tone: "ok",
      sentence: `The sequent is valid in classical logic, and its translation is valid in ${into}. A negative translation keeps the verdict, so the two agree.`,
    };
  if (c.agreement === "not_valid")
    return {
      keyword: "Both not valid",
      tone: "bad",
      sentence: `The sequent is not valid in classical logic, and its translation is not valid in ${into}. A negative translation keeps the verdict, so the two agree.`,
    };
  const which =
    c.classical.verdict === "unknown"
      ? "the sequent in classical logic"
      : `the translation in ${into}`;
  return {
    keyword: "Not decided",
    tone: "warn",
    sentence: `deduxit did not decide ${which} within the page's bounds, so the two verdicts cannot be compared.`,
  };
}

/** One logic's verdict on its sequent, in a few words, for the line under the agreement. */
export function verdictWords(outcome: OrdinaryOutcome, form: SequentForm): string {
  if (outcome.verdict === "valid") {
    if (outcome.derivation) return "valid: deduxit found a derivation and checked it";
    // The SAT solver proves a classical sequent valid by a refutation of its negation, no derivation.
    if (outcome.clausal_proof)
      return "valid: the SAT solver showed that no values make it false, and deduxit checked its proof";
    return "valid";
  }
  if (outcome.verdict === "not_valid") {
    if (outcome.logic === "classical" && outcome.countermodel)
      return `not valid: with ${worldWords(outcome, form)}, every formula left of ⊢ is true and every formula right of it false`;
    return outcome.countermodel
      ? "not valid: the Kripke model below shows it"
      : "not valid: deduxit found no derivation";
  }
  return "not decided within the page's bounds";
}

/** The translated sequent written in signs, as the field reads it. */
export const translatedText = (c: Comparison) => formText(c.translated);

/** A half an interpolant is checked on, written in signs. */
export const halfText = (half: Half) => formText(half.sequent);
