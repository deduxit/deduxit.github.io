// deduxit © Fabian Lukas Grubmüller 2026
// Licensed under the EUPL

/**
 * A calculus of the visitor's own: a rule file, deduxit's JSON of a calculus given as data, and
 * a derivation built in it step by step by deduxit's `rules_…` calls. The session document holds
 * the rule file, so the link and the shelf keep the calculus with the proof. Every verdict is
 * "valid in the calculus given": deduxit checks each step against the rules, not the rules
 * themselves.
 */

/** The built-in calculi a visitor starts from, by deduxit's names, the first the default. */
export const STARTERS = [
  { name: "LJ", words: "LJ, Gentzen's intuitionistic sequent calculus" },
  { name: "tableau", words: "The signed tableau of classical logic" },
  { name: "LK", words: "LK, Gentzen's classical sequent calculus" },
  { name: "LM", words: "LM, minimal logic's sequent calculus" },
  { name: "LL", words: "One-sided linear logic" },
] as const;

/** The names of the built-in calculi. */
export const BUILT_IN: readonly string[] = STARTERS.map((s) => s.name);

/** A goal of each built-in calculus to try it on, typed in its own syntax. */
export const EXAMPLES: Readonly<Record<string, string>> = {
  LJ: "a ∧ b ⊢ b ∧ a",
  LK: "⊢ a ∨ ¬a",
  LM: "a → b, b → c ⊢ a → c",
  LL: "⊢ a ⅋ b, ~b ⊗ ~a",
  tableau: "T (a ∧ b), F (b ∧ a)",
};

/** A session in a calculus given as data, as deduxit writes it (wire level 17). */
export interface CustomSession {
  readonly version?: number;
  /** The rule file. */
  readonly calculus: { readonly name: string } & Record<string, unknown>;
  readonly terms: readonly unknown[];
  readonly scopes: readonly unknown[];
  readonly nodes: readonly unknown[];
  readonly history?: readonly number[];
}

/** A rule file as `rules_read` describes it. */
export interface Described {
  readonly name: string;
  readonly description: string;
  readonly zones: readonly { readonly name: string; readonly mark: string | null }[];
  readonly rules: readonly string[];
}

/** An open goal as the view shows it. */
export interface CustomGoal {
  readonly goal: number;
  /** The goal as text, in the calculus's syntax. */
  readonly sequent: string;
  /** Each zone's members as text, in the order of their numbers. */
  readonly zones: readonly (readonly string[])[];
  /** The hypotheses in force, the innermost first. */
  readonly hypotheses: readonly string[];
}

/** What `rules_view` and the calls that change a session answer as the view. */
export interface CustomView {
  readonly calculus: Described;
  /** The sequent derived. */
  readonly sequent: string;
  readonly assumptions: readonly string[];
  readonly finished: boolean;
  readonly steps: number;
  readonly goals: readonly CustomGoal[];
  /** For each inference `i<n>` of the drawing, its node in the session. */
  readonly inferences: readonly number[];
}

/** A session with its view, as `rules_start`, `rules_apply`, `rules_assume` and `rules_undo` answer. */
export interface CustomPlayed {
  readonly session: CustomSession;
  readonly view: CustomView;
}

/** A step deduxit offers for a goal: a rule at members, and what it needs given. */
export interface CustomOffered {
  readonly rule: string;
  readonly at: readonly number[];
  readonly needs: readonly string[];
}

/** A step as `rules_apply` takes it. */
export interface CustomStep {
  readonly rule: string;
  readonly at: readonly number[];
  readonly given: Readonly<Record<string, string>>;
}

/** The verdict of a finished derivation, as `rules_check` answers it. */
export interface CustomChecked {
  readonly calculus: string;
  readonly verdict: string;
  readonly derivation: unknown;
}

/** Whether a document is a session in a calculus given as data. */
export function isCustom(doc: unknown): doc is CustomSession {
  if (!doc || typeof doc !== "object") return false;
  const d = doc as Record<string, unknown>;
  return (
    typeof d["calculus"] === "object" &&
    d["calculus"] !== null &&
    Array.isArray(d["scopes"]) &&
    Array.isArray(d["nodes"]) &&
    Array.isArray(d["terms"])
  );
}

/** A session's rule file as text, as the editor shows it. */
export const fileOf = (session: CustomSession): string => JSON.stringify(session.calculus, null, 2);

/** The rule file's name, read from its text, or undefined where the text is no JSON object. */
export function nameOf(file: string): string | undefined {
  try {
    const parsed = JSON.parse(file) as unknown;
    if (!parsed || typeof parsed !== "object") return undefined;
    const name = (parsed as Record<string, unknown>)["name"];
    return typeof name === "string" && name.trim() ? name : undefined;
  } catch {
    return undefined;
  }
}

/** The assumptions as `rules_start` takes them: one sequent per non-empty line, as JSON. */
export const assumptionsJson = (text: string): string =>
  JSON.stringify(
    text
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line !== ""),
  );

/**
 * A step offered as a button reads it: the rule, and the members it acts on by their text.
 * `members` are the goal's members in the order of their numbers.
 */
export function stepWords(step: CustomOffered, members: readonly string[]): string {
  const on = step.at.map((n) => members[n]).filter((m): m is string => m !== undefined);
  return on.length ? `${step.rule} on ${on.join(", ")}` : step.rule;
}

/** A goal's members in the order of their numbers, the first zone's first. */
export const membersOf = (goal: CustomGoal): string[] => goal.zones.flat();

/**
 * The steps to offer, each once: deduxit lists a rule once per choice of the members it acts on,
 * and two choices that pick equal texts read alike on a button.
 */
export function distinctSteps(
  steps: readonly CustomOffered[],
  members: readonly string[],
): CustomOffered[] {
  const seen = new Set<string>();
  return steps.filter((step) => {
    const key = `${stepWords(step, members)}\n${step.needs.join(",")}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
