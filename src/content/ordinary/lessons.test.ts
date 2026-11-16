// deduxit © Fabian Lukas Grubmüller 2026
// Licensed under the EUPL

// The ordinary course: every lesson in its place, its worked proof the session beside its
// problem, finished, of the problem's very sequent, its steps the session's in their order and
// each among the rules to predict, and the session taken back step by step to its sequent, as
// Learn plays it; a hinge with one right answer, and practice from the store.

import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parse } from "yaml";
import { ORDINARY_LESSONS } from "../../lib/content";
import { ordinaryLesson, ordinaryProblem } from "../../lib/course";
import { problemOf } from "../../lib/natural";
import { deduxit } from "../../lib/testing";

const here = new URL("./", import.meta.url);
const read = <T>(dir: string, schema: { parse: (v: unknown) => T }) =>
  readdirSync(new URL(dir, here))
    .filter((name) => name.endsWith(".md"))
    .map((name) => {
      const front = readFileSync(new URL(`${dir}${name}`, here), "utf8").split("---")[1] ?? "";
      return { id: name.replace(/\.md$/, ""), data: schema.parse(parse(front)) };
    });
const lessons = read("lessons/", ordinaryLesson);
const problems = new Map(read("problems/", ordinaryProblem).map((p) => [p.id, p.data]));

interface Session {
  sequent: unknown;
  inferences: { rule?: string }[];
  nodes: { rule?: string }[];
  history?: number[];
}

/** The logics, weakest first. */
const LOGICS = ["minimal", "intuitionistic", "classical"] as const;

/** The page's budget for a search, `DEFAULT_BUDGET` in state.tsx. */
const BUDGET = 2 ** 26;

/** deduxit's verdict on a sequent in a logic, as the page's Close goal reaches it. */
function decided(sequent: string, logic: string): string {
  const started = JSON.parse(deduxit.ordinary_start(sequent, logic, "{}"));
  const settings = JSON.stringify({ limits: { work: Math.floor(BUDGET / 100) } });
  return JSON.parse(deduxit.ordinary_close(JSON.stringify(started.session), 0, settings)).outcome
    .verdict;
}

type Lesson = ReturnType<typeof ordinaryLesson.parse>;

/**
 * The rules of a lesson's worked proof, in their order, read off its session (a goal closed by a
 * line reads `line`), or for a truth table each row's: `falsifies` where deduxit's table marks it.
 * Each session is checked to be finished and of the problem's very sequent.
 */
function steps(l: Lesson, sequent: string, form: unknown): (string | undefined)[] {
  if (l.method === "table") {
    const outcome = JSON.parse(deduxit.ordinary_table(sequent, "{}"));
    const table = outcome.search.table as { rows: string[]; falsifying: number[] };
    return table.rows.map((_, k) => (table.falsifying.includes(k) ? "falsifies" : "holds"));
  }
  const file = new URL(`problems/${l.worked}.${l.method}.json`, here);
  const text = readFileSync(file, "utf8");
  const session = JSON.parse(text) as Session;
  if (l.method === "sequent") {
    const started = JSON.parse(deduxit.ordinary_start(sequent, l.logic, "{}")).session as Session;
    expect(session.sequent).toEqual(started.sequent);
    expect(JSON.parse(deduxit.ordinary_view(text, "{}")).goals).toEqual([]);
    return (session.history ?? []).map((k) => session.inferences[k]?.rule);
  }
  const view = JSON.parse(deduxit.rules_view(text, "{}"));
  expect(view.finished).toBe(true);
  const q = problemOf(form as never, l.method === "tableau" ? "classical" : l.logic);
  const started =
    l.method === "tableau"
      ? deduxit.rules_start(
          "tableau",
          [...q.assumptions.map((a) => `T (${a})`), `F (${q.goal})`].join(", "),
          "",
          "{}",
        )
      : deduxit.rules_start(q.calculus, q.goal, JSON.stringify(q.assumptions), "{}");
  const fresh = JSON.parse(started).view;
  expect([view.sequent, view.assumptions]).toEqual([fresh.sequent, fresh.assumptions]);
  return (session.history ?? []).map((k) => session.nodes[k]?.rule ?? "line");
}

describe("the ordinary course", () => {
  it("has each lesson once, in a place of its list", () => {
    const numbers = lessons.map((l) => l.data.lesson);
    expect(new Set(numbers).size).toBe(numbers.length);
    for (const l of lessons) {
      expect(ORDINARY_LESSONS[l.data.lesson - 1], l.id).toBeDefined();
      expect(l.id.startsWith(`${l.data.lesson}-`), l.id).toBe(true);
    }
  });

  for (const { id, data: l } of lessons)
    describe(`lesson ${id}`, () => {
      const problem = problems.get(l.worked);
      const sequent = problem?.sequent ?? "";
      const form = JSON.parse(deduxit.ordinary_start(sequent, "classical", "{}")).session.sequent;

      it("works a problem of the store its logic proves, or a table of any classical one", () => {
        if (l.method === "table") {
          expect(problem?.logic).toBe("classical");
          return;
        }
        expect(problem?.verdict).toBe("valid");
        expect(LOGICS.indexOf(problem?.logic ?? "classical")).toBeLessThanOrEqual(
          LOGICS.indexOf(l.logic),
        );
        expect(decided(sequent, l.logic)).toBe("valid");
      });

      it("plays its steps in their order, each among the rules to predict", () => {
        expect(steps(l, sequent, form)).toEqual(l.steps.map((s) => s.rule));
        for (const step of l.steps) expect(l.choices).toContain(step.rule);
        expect(l.faded).toBeLessThan(l.steps.length);
        expect(l.explain.after).toBeLessThan(l.steps.length);
      });

      it("is taken back to its sequent step by step, as Learn plays it", () => {
        if (l.method === "table") return;
        const file = new URL(`problems/${l.worked}.${l.method}.json`, here);
        let doc = readFileSync(file, "utf8");
        const undo = l.method === "sequent" ? deduxit.ordinary_undo : deduxit.rules_undo;
        for (const _ of l.steps) doc = JSON.stringify(JSON.parse(undo(doc, "{}")).session);
        expect((JSON.parse(doc) as Session).history ?? []).toEqual([]);
      });

      it("asks a hinge with one right answer, and practises problems of the store", () => {
        expect(l.hinge.options.filter((o) => o.misconception === undefined)).toHaveLength(1);
        const practice = [...problems.values()].filter((p) => p.lesson === l.lesson);
        expect(practice.length).toBeGreaterThan(0);
        if (l.model) {
          const model = problems.get(l.model);
          expect(model?.verdict).toBe("not_valid");
          expect(decided(model?.sequent ?? "", model?.logic ?? "classical")).toBe("not_valid");
        }
      });
    });
});
