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
  history?: number[];
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
      const file = new URL(`problems/${l.worked}.${l.method}.json`, here);
      const session = JSON.parse(readFileSync(file, "utf8")) as Session;

      it("works a valid problem of the store in its logic", () => {
        expect(problem?.logic).toBe(l.logic);
        expect(problem?.verdict).toBe("valid");
      });

      it("plays a finished session of the problem's sequent, one step per reason", () => {
        expect(l.method).toBe("sequent");
        const started = JSON.parse(deduxit.ordinary_start(problem?.sequent ?? "", l.logic, "{}"))
          .session as Session;
        expect(session.sequent).toEqual(started.sequent);
        const view = JSON.parse(deduxit.ordinary_view(JSON.stringify(session), "{}"));
        expect(view.goals).toEqual([]);
        const rules = (session.history ?? []).map((k) => session.inferences[k]?.rule);
        expect(rules).toEqual(l.steps.map((s) => s.rule));
        for (const step of l.steps) expect(l.choices).toContain(step.rule);
        expect(l.faded).toBeLessThan(l.steps.length);
        expect(l.explain.after).toBeLessThan(l.steps.length);
      });

      it("is taken back to its sequent step by step, as Learn plays it", () => {
        let doc = JSON.stringify(session);
        for (const _ of l.steps)
          doc = JSON.stringify(JSON.parse(deduxit.ordinary_undo(doc, "{}")).session);
        const back = JSON.parse(doc) as Session;
        expect(back.history ?? []).toEqual([]);
        expect(back.sequent).toEqual(session.sequent);
      });

      it("asks a hinge with one right answer, and practises problems of the store", () => {
        expect(l.hinge.options.filter((o) => o.misconception === undefined)).toHaveLength(1);
        const practice = [...problems.values()].filter((p) => p.lesson === l.lesson);
        expect(practice.length).toBeGreaterThan(0);
      });
    });
});
