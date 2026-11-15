// deduxit © Fabian Lukas Grubmüller 2026
// Licensed under the EUPL

import { describe, expect, it } from "vitest";
import {
  closes,
  firstOpen,
  rowWords,
  tableauModel,
  tableauOf,
  tableModel,
  tableOf,
} from "./methods";
import type { OrdinaryOutcome } from "./ordinary";
import { deduxit } from "./testing";

const table = (text: string): OrdinaryOutcome => JSON.parse(deduxit.ordinary_table(text, "{}"));
const tableau = (text: string): OrdinaryOutcome => JSON.parse(deduxit.ordinary_tableau(text, "{}"));

describe("the truth table's view", () => {
  it("shows the atoms, then the formulas left of ⊢ and right of it, a falsifying row marked", () => {
    const model = tableModel(tableOf(table("a -> b |- b -> a")) as never);
    expect(model.columns.map((c) => [c.text, c.side])).toEqual([
      ["a", "atom"],
      ["b", "atom"],
      ["a → b", "left"],
      ["b → a", "right"],
    ]);
    expect(model.rows.map((r) => r.falsifies)).toEqual([false, false, true, false]);
    expect(model.rows[2]?.values).toEqual([false, true, true, false]);
    expect(model.first).toBe(2);
    expect(rowWords(model, 2)).toBe("a false, b true");
  });

  it("has no falsifying row for a valid sequent", () => {
    expect(tableModel(tableOf(table("|- a \\/ ~a")) as never).first).toBeNull();
  });
});

describe("the tableau's view", () => {
  it("numbers the lines, cites the rule and line each comes from, and says why a branch closes", () => {
    const tree = tableauModel(tableauOf(tableau("a /\\ b |- b /\\ a")) as never);
    expect(tree.lines.map((l) => `${l.number} ${l.sign} ${l.text}`)).toEqual([
      "1 T a ∧ b",
      "2 F b ∧ a",
    ]);
    const [alpha] = tree.next;
    expect(alpha?.lines.map((l) => [l.text, l.from])).toEqual([
      ["a", { rule: "∧L", line: 1 }],
      ["b", { rule: "∧L", line: 1 }],
    ]);
    expect(alpha?.next.map((b) => b.end?.mark)).toEqual(["× 4, 5", "× 3, 6"]);
    expect(alpha?.next[0]?.end?.words).toBe("closed: b is true at line 4 and false at line 5");
    expect(closes(tree)).toBe(true);
  });

  it("gives an open branch's assignment in words", () => {
    const tree = tableauModel(tableauOf(tableau("a -> b |- b -> a")) as never);
    expect(closes(tree)).toBe(false);
    expect(firstOpen(tree)).toBe("open: a false, b true");
  });
});
