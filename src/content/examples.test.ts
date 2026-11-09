// linlog © Fabian Lukas Grubmüller 2026
// Licensed under the EUPL

import { describe, expect, it } from "vitest";
import { deduxit } from "../lib/testing";
import examples from "./examples.json";

/** The page's budget for a search, `DEFAULT_BUDGET` in state.tsx. */
const BUDGET = 2 ** 26;

describe("the sequent field's examples", () => {
  it("are decided by deduxit as the file says, in every logic, well within the page's budget", () => {
    for (const example of examples) {
      for (const [logic, verdict] of Object.entries(example.verdicts)) {
        const started = JSON.parse(deduxit.ordinary_start(example.sequent, logic, "{}"));
        const closed = JSON.parse(
          deduxit.ordinary_close(
            JSON.stringify(started.session),
            0,
            JSON.stringify({ limits: { work: Math.floor(BUDGET / 100) } }),
          ),
        );
        expect(closed.outcome.verdict, `${example.id} in ${logic}`).toBe(verdict);
      }
    }
  });

  it("are each one sequent in the logic it opens in, named once", () => {
    const ids = examples.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
    const pairs = examples.map((e) => `${e.logic}\n${e.sequent}`);
    expect(new Set(pairs).size).toBe(pairs.length);
  });
});
