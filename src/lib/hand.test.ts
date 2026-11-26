// deduxit © Fabian Lukas Grubmüller 2026
// Licensed under the EUPL

import { describe, expect, it } from "vitest";
import { begin, closed, expand, replay, written } from "./hand";
import type { SequentForm } from "./ordinary";
import { deduxit } from "./testing";

/** A sequent's JSON, as an ordinary session holds it. */
const form = (text: string): SequentForm =>
  JSON.parse(deduxit.ordinary_start(text, "classical", "{}")).session.sequent;

/** deduxit's review of a written tableau. */
const review = (text: string, sequent: string) =>
  JSON.parse(deduxit.ordinary_tableau_review(text, sequent, "{}")) as { standing: string };

describe("a tableau built by hand", () => {
  it("starts with the sequent's formulas, true left of ⊢ and false right of it", () => {
    const f = form("p \\/ q |- q \\/ p");
    expect(written(f, begin(f))).toBe("1 T p ∨ q\n2 F q ∨ p");
  });

  it("closes as deduxit's review says, in any order of presses", () => {
    const sequent = "p \\/ q |- q \\/ p";
    const f = form(sequent);
    for (const order of [
      [1, 2],
      [2, 1],
    ]) {
      const hand = replay(f, order);
      expect(closed(hand.root)).toBe(true);
      expect(review(written(f, hand), sequent).standing).toBe("closed");
    }
  });

  it("leaves a branch open where nothing closes it, as the review does", () => {
    const sequent = "p -> q |- q -> p";
    const f = form(sequent);
    const hand = replay(f, [1, 2]);
    expect(closed(hand.root)).toBe(false);
    expect(review(written(f, hand), sequent).standing).toBe("open");
  });

  it("is unfinished while a line waits to be expanded", () => {
    const sequent = "p /\\ q |- q /\\ p";
    const f = form(sequent);
    const hand = expand(f, begin(f), 1);
    expect(closed(hand.root)).toBe(false);
    expect(review(written(f, hand), sequent).standing).toBe("unfinished");
    expect(review(written(f, expand(f, hand, 2)), sequent).standing).toBe("closed");
  });

  it("expands a line once, and leaves an atom alone", () => {
    const f = form("p, p -> q |- q");
    const once = expand(f, begin(f), 2);
    expect(expand(f, once, 2)).toBe(once);
    expect(expand(f, once, 1)).toBe(once);
  });
});
