// deduxit © Fabian Lukas Grubmüller 2026
// Licensed under the EUPL

import { describe, expect, it } from "vitest";
import {
  CALCULI,
  citedLines,
  linesOf,
  listedLines,
  problemOf,
  shownMessage,
  shownNumbers,
} from "./natural";
import type { SequentForm } from "./ordinary";
import { deduxit } from "./testing";

/** An ordinary sequent's JSON, as a session deduxit starts on the text holds it. */
const formOf = (text: string): SequentForm =>
  JSON.parse(deduxit.ordinary_start(text, "classical", "{}")).session.sequent as SequentForm;

describe("the problem of a sequent", () => {
  it("derives the formula right of ⊢ from those left of it, in the logic's calculus", () => {
    const problem = problemOf(formOf("a ∧ b, a → c ⊢ c ∨ b"), "intuitionistic");
    expect(problem).toEqual({
      calculus: "NJ",
      goal: "c ∨ b",
      assumptions: ["a ∧ b", "a → c"],
      made: null,
    });
  });

  it("asks for ⊥ when nothing is right of ⊢, and for the disjunction of several", () => {
    expect(problemOf(formOf("a, ¬a ⊢"), "minimal")).toMatchObject({ goal: "⊥", made: "falsity" });
    expect(problemOf(formOf("⊢ a → b, a"), "classical")).toMatchObject({
      calculus: "NK",
      goal: "(a → b) ∨ a",
      made: "disjunction",
    });
  });

  it("starts a session deduxit takes in each logic's calculus", () => {
    for (const logic of Object.keys(CALCULI) as (keyof typeof CALCULI)[]) {
      const p = problemOf(formOf("a ∧ ⊤, a → ¬b ⊢ ¬¬(b ↔ a) ∨ c"), logic);
      const started = JSON.parse(
        deduxit.rules_start(p.calculus, p.goal, JSON.stringify(p.assumptions), "{}"),
      );
      expect(started.view.calculus.name).toBe(p.calculus);
      expect(started.view.goals[0].lines.map((l: { sequent: string }) => l.sequent)).toEqual(
        p.assumptions,
      );
    }
  });
});

describe("the lines a forward step cites", () => {
  it("are whole numbers from 1, by commas or spaces", () => {
    expect(linesOf("2, 3")).toEqual([2, 3]);
    expect(linesOf(" 4 4 ")).toEqual([4, 4]);
    expect(linesOf("")).toEqual([]);
  });

  it("are refused as any other text", () => {
    for (const text of ["0", "2.5", "two", "1-3", "-1"]) expect(linesOf(text)).toBeNull();
  });
});

describe("the numbers lines are shown and cited by", () => {
  // The session numbers lines as its steps made them; the Fitch drawing top to bottom.
  const lines = [
    { line: 1, fitch: 1, sequent: "a ∧ b" },
    { line: 3, fitch: 2, sequent: "b" },
    { line: 4, fitch: 3, sequent: "b → a" },
  ];

  it("are the Fitch drawing's, read back as the session's for deduxit's calls", () => {
    expect(shownNumbers(lines)).toEqual([1, 2, 3]);
    expect(citedLines(lines, [3, 2])).toEqual({ lines: [4, 3] });
  });

  it("refuse a number no line in force is shown by", () => {
    expect(citedLines(lines, [2, 4])).toEqual({ unknown: 4 });
  });

  it("name the lines in deduxit's refusals as the page shows them", () => {
    expect(shownMessage(lines, "line 3 is no instance of premise 1 of →E")).toBe(
      "line 2 is no instance of premise 1 of →E",
    );
    expect(shownMessage(lines, "there is no line 9")).toBe("there is no line 9");
  });

  it("list two equal hypotheses, which share their Fitch line, once", () => {
    const twice = [
      { line: 1, fitch: 1, sequent: "a" },
      { line: 2, fitch: 1, sequent: "a" },
    ];
    expect(listedLines(twice).map((l) => l.shown)).toEqual([1]);
    expect(citedLines(twice, [1, 1])).toEqual({ lines: [1, 1] });
  });

  it("are the session's own where the drawing has no Fitch proof", () => {
    const without = lines.map((l) => ({ ...l, fitch: null }));
    expect(shownNumbers(without)).toEqual([1, 3, 4]);
    expect(citedLines(without, [4])).toEqual({ lines: [4] });
  });
});
