// deduxit © Fabian Lukas Grubmüller 2026
// Licensed under the EUPL

// Every rule label deduxit draws or offers has a hint in its calculus, with a full name, a form
// and one sentence; the labels are deduxit's own names (its `Named`, `ClassicalRule` and
// ordinary `Rule` tables).

import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parse } from "yaml";
import type { Mode } from "./deduxit";
import { hintId, hintNamed, hintsFor } from "./rules";
import type { Calculus, Logic } from "./suites";

const written = readdirSync(new URL("../content/rules/", import.meta.url))
  .filter((name) => name.endsWith(".md"))
  .map((name) =>
    parse(
      readFileSync(new URL(`../content/rules/${name}`, import.meta.url), "utf8").split(
        "---\n",
      )[1] ?? "",
    ),
  );

const linear = (mode: Mode): Calculus => ({ suite: "linear", method: "sequent", mode });
const ordinary = (logic: Logic): Calculus => ({ suite: "ordinary", method: "sequent", logic });

const ONE_SIDED = "ax ⊗ ⅋ 1 ⊥ & ⊕₁ ⊕₂ ⊤ ! ?d ?c ?w mix wk cut ∀ ∃";
const TWO_SIDED =
  "ax ⊗L ⊗R ⅋L ⅋R ⊸L ⊸R 1L 1R ⊥L ⊥R &L₁ &L₂ &R ⊕L ⊕R₁ ⊕R₂ ⊤R 0L !L !R !c !w ?L ?R ?c ?w ∀L ∀R ∃L ∃R mix wk cut ~L ~R";
const INTUITIONISTIC =
  "ax ⊸L ⊸R ⊗L ⊗R 1L 1R &L₁ &L₂ &R ⊕L ⊕R₁ ⊕R₂ ⊤R 0L !L !R !c !w ∀R ∃L ∃R ∀L wk cut";
const LAMBEK = "ax ⊗L ⊗R \\L \\R /L /R";
const LJ = "ax WL CL ∧L ∧L₁ ∧L₂ ∧R ∨L ∨R₁ ∨R₂ →L →R ¬L ¬R ↔L ↔L₁ ↔L₂ ↔R ⊥L ⊤L ⊤R";
const LK = `${LJ} WR CR ∨R ⊥R`;

const cases: [string, Calculus, boolean, string][] = [
  ["classical linear logic", linear("affine-mix"), false, ONE_SIDED],
  [
    "classical linear logic drawn two-sided",
    linear("affine-mix"),
    true,
    `${TWO_SIDED} ${ONE_SIDED}`,
  ],
  ["intuitionistic linear logic", linear("intuitionistic-affine"), false, INTUITIONISTIC],
  ["cyclic linear logic", linear("cyclic"), false, "ax ⊗ ⅋"],
  ["the Lambek calculus", linear("lambek"), false, LAMBEK],
  ["LK", ordinary("classical"), false, LK],
  ["LJ, intuitionistic", ordinary("intuitionistic"), false, LJ],
  ["LJ, minimal", ordinary("minimal"), false, LJ],
];

describe("every rule label has a hint", () => {
  it.each(cases)("in %s", (_, calculus, twoSided, labels) => {
    const hints = hintsFor(written, calculus, twoSided);
    for (const label of labels.split(" ")) {
      const hint = hintNamed(hints, label);
      expect(hint, label).toBeDefined();
      expect(hint?.title, label).not.toBe("");
      expect(hint?.conclusion, label).toContain("⊢");
      // One plain sentence: a capital, and a full stop that ends it and nothing before.
      expect(hint?.says.replace(/`[^`]*`/g, "F"), label).toMatch(/^[FA-Z][^.]*\.$/);
    }
  });
});

it("gives each label its own id", () => {
  const labels = [ONE_SIDED, TWO_SIDED, INTUITIONISTIC, LAMBEK, LK].join(" ").split(" ");
  const ids = new Map(labels.map((l) => [hintId(l), l]));
  expect(new Set(ids.values()).size).toBe(new Set(labels).size);
  for (const id of ids.keys()) expect(id).toMatch(/^[a-z0-9-]+$/);
});
