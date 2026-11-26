// deduxit © Fabian Lukas Grubmüller 2026
// Licensed under the EUPL

import { describe, expect, it } from "vitest";
import {
  addElement,
  blank,
  flip,
  holds,
  isFirstOrder,
  removeElement,
  setValue,
  signatureOf,
  structureJson,
  elementOf,
} from "./structure";

/** `∀x. r(x, f(x)), p(a) ⊢ q` as deduxit writes the sequent: symbols, terms, atoms as predicates. */
const SEQUENT = {
  version: 25,
  formulas: [{ V: 0 }, { "∀": 0 }, { V: 1 }, { V: 2 }],
  symbols: [
    ["r", 2],
    ["f", 1],
    ["p", 1],
    ["a", 0],
    ["q", 0],
  ],
  fo: [{ B: 0 }, { F: [1, [0]] }, { F: [3, []] }],
  atoms: [{ P: [0, [0, 1]] }, { P: [2, [2]] }, "q"],
  binders: ["x"],
  left: [1, 2],
  right: [3],
};

describe("a structure of a first-order sequent", () => {
  const signature = signatureOf(SEQUENT);

  it("reads the predicates and the function symbols off the sequent", () => {
    expect(isFirstOrder(SEQUENT)).toBe(true);
    expect(signature.predicates).toEqual([
      { name: "r", arity: 2 },
      { name: "p", arity: 1 },
      { name: "q", arity: 0 },
    ]);
    expect(signature.functions).toEqual([
      { name: "f", arity: 1 },
      { name: "a", arity: 0 },
    ]);
  });

  it("starts from one element where nothing holds", () => {
    const one = blank(signature);
    expect(JSON.parse(structureJson(one))).toEqual({
      size: 1,
      constants: [["a", 0]],
      functions: [["f", [0]]],
      predicates: [
        ["r", []],
        ["p", []],
        ["q", []],
      ],
    });
  });

  it("flips a predicate and sets a term's element", () => {
    let s = addElement(blank(signature), signature);
    s = flip(s, "r", [1, 0]);
    s = flip(s, "q", []);
    s = setValue(setValue(s, "f", [1], 1), "a", [], 1);
    expect(holds(s, "r", [1, 0])).toBe(true);
    expect(holds(s, "q", [])).toBe(true);
    expect([elementOf(s, "f", [0]), elementOf(s, "f", [1]), elementOf(s, "a", [])]).toEqual([
      0, 1, 1,
    ]);
    expect(holds(flip(s, "r", [1, 0]), "r", [1, 0])).toBe(false);
  });

  it("keeps the tables when an element comes and goes", () => {
    let s = addElement(blank(signature), signature);
    s = setValue(s, "f", [0], 1);
    s = flip(flip(s, "r", [0, 1]), "p", [1]);
    const three = addElement(s, signature);
    expect(three.functions?.[0]?.[1]).toEqual([1, 0, 0]);
    // Element 0 goes: element 1 becomes 0, and what named 0 names 0.
    const less = removeElement(three, 0, signature);
    expect(less.size).toBe(2);
    expect(holds(less, "p", [0])).toBe(true);
    expect(holds(less, "r", [0, 0])).toBe(false);
    expect(less.functions?.[0]?.[1]).toEqual([0, 0]);
  });
});
