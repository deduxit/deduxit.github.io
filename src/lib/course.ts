// deduxit © Fabian Lukas Grubmüller 2026
// Licensed under the EUPL

/**
 * The format of a suite's course, as data: the schema of its lessons and of its problems. A
 * lesson's core is every suite's (a worked proof played with a rule and a reason per step
 * and a rule to predict, the faded proof, the self-explanation prompt, the hinge question); a
 * suite adds its own parts. src/content.config.ts reads each suite's folder under src/content/
 * with these schemas, and their JSON Schemas stand beside the content for other tools
 * (`<suite>/lesson.schema.json`, `<suite>/problem.schema.json`), held equal by course.test.ts.
 */

import { z } from "astro/zod";

/** The modes deduxit's `start` takes. */
export const MODES = [
  "classical",
  "affine",
  "mix",
  "affine-mix",
  "intuitionistic",
  "intuitionistic-affine",
] as const;

/** The levels of difficulty, from 1, easy, to 4, very hard. */
export const LEVELS = [1, 2, 3, 4] as const;

/**
 * The categories a problem is found under: the connectives it uses, its
 * logic (classical, intuitionistic, and with weakening or Mix), and whether
 * it comes from the literature.
 */
export const CATEGORIES = [
  "multiplicatives",
  "additives",
  "units",
  "exponentials",
  "quantifiers",
  "classical",
  "intuitionistic",
  "structural",
  "literature",
] as const;

/** Text of the lessons and the rules: plain words, formulas between backticks. */
export const words = z.string().min(1);

/** The parts of a lesson every suite has. */
const LESSON_CORE = {
  lesson: z.number().int().min(1),
  title: words,
  /** The store problem whose session is the worked proof. */
  worked: z.string(),
  /** The rules the student predicts among, as deduxit names them. */
  choices: z.array(z.string()).min(2),
  /** One per step of the worked proof's session, in its order. */
  steps: z.array(z.object({ rule: z.string(), reason: words })).min(1),
  /** The steps the faded proof plays before the student takes over. */
  faded: z.number().int().min(0),
  /** The self-explanation prompt, after the step `after` (from 0), and a model answer. */
  explain: z.object({ after: z.number().int().min(0), prompt: words, answer: words }),
  hinge: z.object({
    question: words,
    /** The right answer has no misconception; each wrong one names the one it reveals. */
    options: z
      .array(
        z.object({
          text: words,
          problem: z.string().optional(),
          misconception: words.optional(),
          why: words,
        }),
      )
      .min(3),
  }),
};

/** A lesson of the linear course. */
export const linearLesson = z.object({
  ...LESSON_CORE,
  /** A legal split that leads nowhere, shown before the step `before`: its left premise's formulas. */
  detour: z
    .object({ before: z.number().int().min(0), left: z.array(z.number().int()), text: words })
    .optional(),
  /** Whether the finished worked proof offers its net. */
  net: z.boolean().default(false),
  /**
   * One sentence on how the worked proof's sequent, typed two-sided, is written one-sided; the
   * lesson then shows it with the Two-sided switch on, and off again.
   */
  rewrite: words.optional(),
  /**
   * An attempt at the worked proof's sequent that goes wrong, played before it from the
   * unfinished session beside the lesson: a plausible reason per step, then "which step
   * went wrong?", the wrong step the one without a misconception.
   */
  attempt: z
    .object({
      text: words,
      steps: z
        .array(
          z.object({
            rule: z.string(),
            reason: words,
            misconception: words.optional(),
            why: words,
          }),
        )
        .min(2),
    })
    .optional(),
  /** A sequent the page searches with a budget too small to decide it, and what a larger one decides. */
  unknown: z
    .object({
      sequent: z.string(),
      mode: z.enum(MODES),
      budget: z.number().int().min(1),
      text: words,
    })
    .optional(),
  /**
   * The worked proof's cuts eliminated on the stage, on the derivation and on the net: what to
   * do, and a reason for each case of a step, by deduxit's name of the case.
   */
  eliminate: z.object({ text: words, cases: z.record(z.string(), words) }).optional(),
  /**
   * Problems of the lesson proved with a cut: the cut formula, and the inferences of the proof
   * with that cut (the problem's session) and of the cut-free proof its elimination reaches.
   */
  counts: z
    .array(
      z.object({
        problem: z.string(),
        formula: z.string(),
        with: z.number().int().min(1),
        without: z.number().int().min(1),
      }),
    )
    .default([]),
  /**
   * An attempt at a store problem of the lesson that has no proof, played from the unfinished
   * session beside the lesson (lessons/<n>-<name>.refusal.json), a reason per step, and then
   * the step `refused` at its last open goal, which deduxit refuses; `why` says why.
   */
  refusal: z
    .object({
      problem: z.string(),
      text: words,
      steps: z.array(z.object({ rule: z.string(), reason: words })).min(1),
      refused: z.object({ rule: z.string(), position: z.number().int().min(0), reason: words }),
      why: words,
    })
    .optional(),
  /** Problems of the lesson to ask deduxit about (`ask`) or to draw the net of (`net`), each with a line. */
  gallery: z
    .object({
      title: words,
      act: z.enum(["ask", "net"]),
      items: z.array(z.object({ problem: z.string(), text: words })).min(1),
    })
    .optional(),
});

/** A problem of the linear store. */
export const linearProblem = z
  .object({
    /** A name, for the problems Learn shows and those from the literature. */
    title: z.string().optional(),
    /** As it is typed in the field. */
    sequent: z.string(),
    mode: z.enum(MODES),
    verdict: z.enum(["provable", "unprovable"]),
    level: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
    categories: z.array(z.enum(CATEGORIES)).min(1),
    /** The fragment deduxit detects, as `seq fragment` names it in the mode. */
    fragment: z.string(),
    /** The lesson of the progression whose practice it is, from 1, and its place there. */
    lesson: z.number().int().min(1).optional(),
    order: z.number().int().optional(),
    /** The work that states it, with the place in it, and where to read it. */
    source: z.string().optional(),
    url: z.url().optional(),
  })
  .refine((p) => (p.lesson === undefined) === (p.order === undefined), "a lesson needs its order")
  .refine(
    (p) => p.verdict === "provable" || p.lesson !== undefined,
    "an unprovable problem is Learn's",
  )
  .refine((p) => (p.source === undefined) === (p.url === undefined), "a source needs its url");

/** The ordinary logics, as deduxit names them. */
export const LOGICS = ["classical", "intuitionistic", "minimal"] as const;

/**
 * How an ordinary lesson's worked proof is made: in the sequent calculus (an ordinary session,
 * LK or LJ), by natural deduction (a session of NK, NJ or NM), as a signed tableau (a session
 * of the calculus `tableau`), or read off the truth table, whose steps are its rows.
 */
export const ORDINARY_METHODS = ["sequent", "natural", "tableau", "table"] as const;

/**
 * The categories an ordinary problem is found under: the connectives it uses, the weakest
 * logic it is valid in, and whether it comes from the literature.
 */
export const ORDINARY_CATEGORIES = [
  "conjunction",
  "disjunction",
  "implication",
  "negation",
  "constants",
  "classical",
  "intuitionistic",
  "minimal",
  "literature",
] as const;

/** A problem of the ordinary store. */
export const ordinaryProblem = z
  .object({
    /** A name, for the problems Learn shows and those from the literature. */
    title: z.string().optional(),
    /** In the ordinary syntax, as it is typed in the field. */
    sequent: z.string(),
    /** The logic it is decided in. */
    logic: z.enum(LOGICS),
    /** deduxit's verdict in that logic. */
    verdict: z.enum(["valid", "not_valid"]),
    level: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
    categories: z.array(z.enum(ORDINARY_CATEGORIES)).min(1),
    /** The lesson of the course whose practice it is, from 1, and its place there. */
    lesson: z.number().int().min(1).optional(),
    order: z.number().int().optional(),
    /** The work that states it, with the place in it, and where to read it. */
    source: z.string().optional(),
    url: z.url().optional(),
  })
  .refine((p) => (p.lesson === undefined) === (p.order === undefined), "a lesson needs its order")
  .refine((p) => (p.source === undefined) === (p.url === undefined), "a source needs its url");

/**
 * A lesson of the ordinary course: the core, the method its worked proof is made in, the logic,
 * the drawing of a natural deduction proof, and a problem whose countermodel the lesson reads.
 * The worked proof is the session beside its problem for the method
 * (`<problem>.sequent.json`, `.natural.json`, `.tableau.json`).
 */
export const ordinaryLesson = z.object({
  ...LESSON_CORE,
  method: z.enum(ORDINARY_METHODS),
  logic: z.enum(LOGICS),
  layout: z.enum(["tree", "fitch"]).optional(),
  model: z.string().optional(),
});
