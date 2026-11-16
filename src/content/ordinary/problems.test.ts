// deduxit © Fabian Lukas Grubmüller 2026
// Licensed under the EUPL

// The ordinary suite's store: every problem decided by deduxit as its file says, within a
// hundredth of the page's budget, its categories the sequent's connectives and the weakest
// logic that proves it, and no sequent twice in one logic. The flake's `ordinary-problems`
// check holds the same verdicts to deduxit's command.

import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parse } from "yaml";
import { ordinaryProblem } from "../../lib/course";
import { deduxit } from "../../lib/testing";

/** The page's budget for a search, `DEFAULT_BUDGET` in state.tsx. */
const BUDGET = 2 ** 26;
const LOGICS = ["minimal", "intuitionistic", "classical"] as const;

const here = new URL("./problems/", import.meta.url);
const store = readdirSync(here)
  .filter((name) => name.endsWith(".md"))
  .map((name) => {
    const text = readFileSync(new URL(name, here), "utf8");
    const front = text.split("---")[1] ?? "";
    return { id: name.replace(/\.md$/, ""), data: ordinaryProblem.parse(parse(front)) };
  });

/** deduxit's verdict on a sequent in a logic, as the page's Close goal reaches it. */
function decided(sequent: string, logic: string): string {
  const started = JSON.parse(deduxit.ordinary_start(sequent, logic, "{}"));
  const closed = JSON.parse(
    deduxit.ordinary_close(
      JSON.stringify(started.session),
      0,
      JSON.stringify({ limits: { work: Math.floor(BUDGET / 100) } }),
    ),
  );
  return closed.outcome.verdict;
}

describe("the ordinary store", () => {
  it("holds a course's worth of problems, valid and not, in every logic", () => {
    expect(store.length).toBeGreaterThanOrEqual(60);
    for (const logic of LOGICS)
      for (const verdict of ["valid", "not_valid"])
        expect(
          store.some((p) => p.data.logic === logic && p.data.verdict === verdict),
          `${verdict} in ${logic}`,
        ).toBe(true);
  });

  it("is decided by deduxit as each file says", () => {
    for (const { id, data } of store)
      expect(decided(data.sequent, data.logic), id).toBe(data.verdict);
  });

  it("files each problem under its connectives and the weakest logic that proves it", () => {
    for (const { id, data } of store) {
      const s = data.sequent;
      const connectives = [
        ["conjunction", s.includes("/\\")],
        ["disjunction", s.includes("\\/")],
        ["equivalence", s.includes("<->")],
        ["implication", s.replaceAll("<->", "").includes("->")],
        ["negation", s.includes("~")],
        ["constants", /\b(true|false)\b/.test(s)],
      ] as const;
      for (const [name, has] of connectives)
        expect(data.categories.includes(name), `${id}: ${name}`).toBe(has);
      const weakest = LOGICS.find((logic) => decided(s, logic) === "valid");
      for (const logic of LOGICS)
        expect(data.categories.includes(logic), `${id}: ${logic}`).toBe(logic === weakest);
    }
  });

  it("has no sequent twice in one logic", () => {
    const pairs = store.map((p) => `${p.data.logic}\n${p.data.sequent}`);
    expect(new Set(pairs).size).toBe(pairs.length);
  });
});
