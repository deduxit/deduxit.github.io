// deduxit © Fabian Lukas Grubmüller 2026
// Licensed under the EUPL

/**
 * The written content, under CC BY 4.0, in src/content/, the linear suite's
 * course (problems, lessons, rules) under src/content/linear/:
 *   problems  problems/<id>.md, the one store of problems Practice and Learn
 *             draw from: a sequent, its mode, deduxit's verdict, its level of
 *             difficulty, the categories it is found under and the fragment
 *             deduxit detects; a provable one has its proof beside it as
 *             problems/<id>.session.json, deduxit's session document as
 *             `deduxit interact` saved it. A problem with a `lesson` is that
 *             lesson's practice in Learn, in its `order` (provable and not
 *             mixed); every unprovable problem is Learn's, and Practice
 *             offers the provable ones. One from the literature names its
 *             `source` and `url`. linear/problems.test.ts holds every
 *             entry to deduxit's verdict and every session to its sequent,
 *             and the flake's `problems` check holds them to deduxit's command.
 *   tour      tour/<n>-<name>.md, the tour's stops in order: what each stop
 *             shows (`target`) and the real step it performs on the stage
 *             (`act`).
 *   texts     texts/<name>.md: About, Practice's opening, and the openings of
 *             Learn's tutorial and reference.
 *   lessons   lessons/<n>-<name>.md, Learn's written lessons: the opening as
 *             the body, the worked proof (a problem of the store, played
 *             step by step from its session, a rule and a reason per step,
 *             the rules to predict among), how many of its steps the faded
 *             proof plays before the student takes over, the
 *             self-explanation prompt after one step, the hinge question
 *             whose wrong answers each name a misconception, and for a lesson
 *             that shows one, a legal split that leads nowhere, an attempt
 *             with a wrong step to find (its unfinished session beside the
 *             lesson as lessons/<n>-<name>.attempt.json), a search run with a
 *             small budget, problems of the store to ask deduxit about or to
 *             draw the net of, the worked proof's cut eliminated on the
 *             stage with a reason per case, problems proved with a cut with
 *             their inferences with it and without, and an attempt whose
 *             last step deduxit refuses (its unfinished session beside the
 *             lesson as lessons/<n>-<name>.refusal.json).
 *   examples  examples.json, the sequent field's menu of examples for the
 *             suites Practice does not serve (ordinary logic): each a sequent
 *             in its suite's syntax, the logic it opens in, deduxit's verdict
 *             in every logic of the suite, and a line on what it shows.
 *             src/content/examples.test.ts holds every verdict to deduxit.
 *   rules     rules/<nn>-<name>.md, the rules the reference draws as schemas
 *             and the stage's popover shows on hover: deduxit's name, the
 *             premises over the conclusion, the lesson that teaches it, what
 *             it does, and for a one-sided rule its two-sided names, for a
 *             two-sided rule of intuitionistic linear logic the one-sided rule
 *             it is.
 * pages/index.astro renders each into a template the island shows.
 */

import { defineCollection } from "astro:content";
import { file, glob } from "astro/loaders";
import { z } from "astro/zod";
import { linearLesson, linearProblem, words } from "./lib/course";

const problems = defineCollection({
  loader: glob({ pattern: "*.md", base: "./src/content/linear/problems" }),
  schema: linearProblem,
});

/** What a stop of the tour points at, and the step it performs. */
export const TARGETS = ["tab", "stage", "formula", "goal", "status", "bottom"] as const;
export const ACTS = ["none", "start", "par", "split", "close"] as const;

const tour = defineCollection({
  loader: glob({ pattern: "*.md", base: "./src/content/tour" }),
  schema: z.object({
    title: z.string(),
    target: z.enum(TARGETS),
    act: z.enum(ACTS),
  }),
});

const texts = defineCollection({
  loader: glob({ pattern: "*.md", base: "./src/content/texts" }),
  schema: z.object({ title: z.string() }),
});

const lessons = defineCollection({
  loader: glob({ pattern: "*.md", base: "./src/content/linear/lessons" }),
  schema: linearLesson,
});

const rules = defineCollection({
  loader: glob({ pattern: "*.md", base: "./src/content/linear/rules" }),
  schema: z
    .object({
      /** As deduxit names the rule on the stage. */
      name: z.string(),
      title: words,
      lesson: z.number().int().min(1),
      premises: z.array(z.string()),
      conclusion: z.string(),
      /** A one-sided rule: its two-sided names, as deduxit's two-sided drawings write them. */
      twoSided: z.array(z.string()).min(1).optional(),
      /** A two-sided rule of intuitionistic linear logic: the one-sided rule it is, by its name. */
      oneSided: z.string().optional(),
      says: words,
    })
    .refine(
      (r) => (r.twoSided === undefined) !== (r.oneSided === undefined),
      "a rule is one-sided, with its two-sided names, or two-sided, with its one-sided rule",
    ),
});

/** An ordinary logic's verdict on an example. */
const ordinaryVerdict = z.enum(["valid", "not_valid"]);

const examples = defineCollection({
  loader: file("src/content/examples.json"),
  schema: z.object({
    title: z.string(),
    /** In the ordinary syntax, as it is typed in the field. */
    sequent: z.string(),
    /** The logic the example opens in. */
    logic: z.enum(["classical", "intuitionistic", "minimal"]),
    /** deduxit's verdict in each logic. */
    verdicts: z.object({
      classical: ordinaryVerdict,
      intuitionistic: ordinaryVerdict,
      minimal: ordinaryVerdict,
    }),
    /** What it shows, in a line. */
    note: z.string(),
  }),
});

export const collections = { problems, tour, texts, lessons, rules, examples };
