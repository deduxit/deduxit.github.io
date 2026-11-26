// deduxit © Fabian Lukas Grubmüller 2026
// Licensed under the EUPL

import { describe, expect, it } from "vitest";
import { failure } from "./deduxit";
import { deduxit } from "./testing";
import { reviewWords, type TableauReview } from "./written";

const SEQUENT = "p \\/ q |- q \\/ p";

/** deduxit's review of `text` against `SEQUENT`, or its refusal. */
const review = (text: string) => {
  try {
    return JSON.parse(deduxit.ordinary_tableau_review(text, SEQUENT, "{}")) as TableauReview;
  } catch (thrown) {
    return failure(thrown);
  }
};

describe("a tableau built by hand, as deduxit reviews it", () => {
  it("is closed as the page's example writes it", () => {
    const closed = review(
      "1 T p ∨ q\n2 F q ∨ p\n3 F q 2\n4 F p 2\n- 5 T p 1\n  × 4, 5\n- 6 T q 1\n  × 3, 6",
    ) as TableauReview;
    expect(closed.standing).toBe("closed");
    expect(reviewWords(closed)).toMatchObject({ tone: "ok", keyword: "Closed" });
  });

  it("names a wrong step by its line of the text: a branch closed on lines that do not clash", () => {
    const wrong = review(
      "1 T p ∨ q\n2 F q ∨ p\n3 F q 2\n4 F p 2\n- 5 T q 1\n  × 4, 5\n- 6 T q 1\n  × 3, 6",
    ) as TableauReview;
    expect(wrong.standing).toBe("wrong");
    expect(wrong.text_line).toBe(6);
    expect(reviewWords(wrong)).toMatchObject({ tone: "bad", keyword: "Wrong step" });
    expect(reviewWords(wrong).sentence).toMatch(/^Line 6: /);
  });

  it("is unfinished where a branch is neither closed nor done", () => {
    const unfinished = review("1 T p ∨ q\n2 F q ∨ p\n3 F q 2") as TableauReview;
    expect(unfinished.standing).toBe("unfinished");
    expect(reviewWords(unfinished).tone).toBe("warn");
  });

  it("is refused with its place where it is no tableau", () => {
    const refused = review("1 T p ∨\n") as ReturnType<typeof failure>;
    expect(refused.code).toBe("parse");
    expect(Number(refused.details?.["line"])).toBe(1);
  });
});
