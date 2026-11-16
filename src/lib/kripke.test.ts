// deduxit © Fabian Lukas Grubmüller 2026
// Licensed under the EUPL

import { describe, expect, it } from "vitest";
import { failure } from "./deduxit";
import {
  addWorld,
  CANVAS,
  type Forcing,
  forcingWords,
  type Kripke,
  kripkeJson,
  layout,
  missingArrow,
  refusalWords,
  removeWorld,
  setAtoms,
  setFalsity,
  toggleArrow,
  worldAt,
  worldWords,
} from "./kripke";
import type { Evaluation } from "./modal";
import { deduxit } from "./testing";

/** Three worlds: 0 sees 1 and 2, 1 sees 2, and 2 forces ⊥ (as a minimal model would). */
const THREE: Kripke = {
  worlds: [
    { atoms: [], arrows: [1, 2] },
    { atoms: ["p"], arrows: [2] },
    { atoms: ["p", "q"], falsity: true },
  ],
  world: 1,
};

describe("the edits", () => {
  it("add and take away an arrow, a loop too, and keep a world's ⊥", () => {
    const looped = toggleArrow(THREE, 2, 2);
    expect(looped.worlds[2]).toEqual({ atoms: ["p", "q"], falsity: true, arrows: [2] });
    expect(toggleArrow(looped, 2, 2).worlds[2]?.arrows).toEqual([]);
    expect(toggleArrow(THREE, 0, 1).worlds[0]?.arrows).toEqual([2]);
  });

  it("renumber the worlds after one taken out, and the model's world with them", () => {
    const less = removeWorld(THREE, 0);
    expect(less.worlds).toEqual([
      { atoms: ["p"], arrows: [1] },
      { atoms: ["p", "q"], falsity: true, arrows: [] },
    ]);
    expect(less.world).toBe(0);
    expect(removeWorld(THREE, 1).worlds[0]?.arrows).toEqual([1]);
    expect(removeWorld(THREE, 1).world).toBe(0);
    expect(addWorld(THREE).worlds).toHaveLength(4);
  });

  it("set the atoms and ⊥ of one world alone", () => {
    expect(setAtoms(THREE, 0, "q, r q").worlds[0]?.atoms).toEqual(["q", "r"]);
    expect(setFalsity(THREE, 2, false).worlds[2]).toEqual({ atoms: ["p", "q"], arrows: undefined });
    expect(setFalsity(THREE, 0, true).worlds[0]?.falsity).toBe(true);
  });

  it("send ⊥ in minimal logic alone", () => {
    expect(JSON.parse(kripkeJson(THREE, "minimal")).worlds[2].falsity).toBe(true);
    expect(JSON.parse(kripkeJson(THREE, "intuitionistic")).worlds[2].falsity).toBeUndefined();
    expect(JSON.parse(kripkeJson(THREE, "modal"))).toMatchObject({ version: 13, world: 1 });
  });
});

describe("the canvas", () => {
  it("lays every world out inside it, each on a spot of its own that a press finds", () => {
    for (const reading of ["modal", "intuitionistic"] as const) {
      const spots = layout(THREE, reading);
      expect(new Set(spots.map((p) => `${p.x},${p.y}`)).size).toBe(3);
      for (const [w, p] of spots.entries()) {
        expect(p.x).toBeGreaterThan(0);
        expect(p.x).toBeLessThan(CANVAS.width);
        expect(p.y).toBeGreaterThan(0);
        expect(p.y).toBeLessThan(CANVAS.height);
        expect(worldAt(p, spots, [26, 26, 26])).toBe(w);
      }
    }
    // Ordinary logic draws the worlds above higher up: world 2 above world 0.
    const up = layout(THREE, "intuitionistic");
    expect(up[2]?.y).toBeLessThan(up[0]?.y ?? 0);
  });

  it("says each world in words: what it forces, its arrows, its marks", () => {
    expect(worldWords(THREE, 0, "modal", { failing: 0 })).toBe(
      "World 0, forces no atom, sees worlds 1 and 2, the sequent fails here",
    );
    expect(worldWords(toggleArrow(THREE, 2, 2), 2, "modal", undefined)).toBe(
      "World 2, forces p, q, ⊥, sees itself",
    );
    expect(worldWords(THREE, 1, "intuitionistic", undefined)).toBe(
      "World 1, forces p, has world 2 directly above it",
    );
  });
});

describe("the arrow a frame condition asks for", () => {
  /** deduxit's check of `model` in `system`. */
  const evaluate = (model: Kripke, system: string) =>
    JSON.parse(
      deduxit.modal_evaluate(
        deduxit.modal_read("[]p |- p", system, ""),
        kripkeJson(model, "modal"),
        undefined,
        "",
      ),
    ) as Evaluation;
  const faulty: readonly [string, string, Kripke][] = [
    ["reflexive", "T", { worlds: [{ atoms: [] }], world: 0 }],
    [
      "symmetric",
      "KB",
      {
        worlds: [
          { atoms: [], arrows: [1] },
          { atoms: [], arrows: [] },
        ],
        world: 0,
      },
    ],
    [
      "transitive",
      "K4",
      {
        worlds: [{ atoms: [], arrows: [1] }, { atoms: [], arrows: [2] }, { atoms: [] }],
        world: 0,
      },
    ],
    [
      "euclidean",
      "K5",
      { worlds: [{ atoms: [], arrows: [1, 2] }, { atoms: [] }, { atoms: [] }], world: 0 },
    ],
  ];

  it.each(faulty)("is the one whose addition meets %s there", (condition, system, model) => {
    const fault = evaluate(model, system).frame;
    expect(fault?.condition).toBe(condition);
    const missing = missingArrow(condition, fault?.worlds ?? []);
    expect(missing).toBeDefined();
    const [from, to] = missing as readonly [number, number];
    const fixed = evaluate(toggleArrow(model, from, to), system).frame;
    // The fault named moves on: not the same condition at the same worlds.
    expect(fixed?.condition === condition && `${fixed.worlds}` === `${fault?.worlds}`).toBe(false);
  });

  it("is none for a world that sees no world", () => {
    expect(missingArrow("serial", [0])).toBeUndefined();
  });
});

describe("an ordinary model's check", () => {
  /** deduxit's check of `model` against `sequent` in `logic`, or its refusal. */
  const check = (model: Kripke, sequent: string, logic: "intuitionistic" | "minimal") => {
    try {
      return JSON.parse(
        deduxit.ordinary_model(kripkeJson(model, logic), sequent, logic, undefined, "{}"),
      ) as Forcing;
    } catch (thrown) {
      return failure(thrown);
    }
  };
  const fork: Kripke = {
    worlds: [{ atoms: [], arrows: [1] }, { atoms: ["p"] }],
    world: 0,
  };

  it("finds the world where excluded middle fails, in words", () => {
    const found = check(fork, "|- p \\/ ~p", "intuitionistic") as Forcing;
    expect(found.holds).toBe(false);
    expect(found.failing?.world).toBe(0);
    expect(forcingWords(found, null, "intuitionistic").sentence).toBe(
      "World 0 forces every formula left of ⊢ and not the one right of it.",
    );
  });

  it("refuses a model whose upper world forgets an atom, naming the worlds", () => {
    const forgetful = setAtoms(fork, 0, "q");
    const refused = check(forgetful, "|- p \\/ ~p", "intuitionistic");
    expect("code" in refused && refused.code).toBe("invalid_model");
    expect(refusalWords(refused as ReturnType<typeof failure>)).toBe(
      "World 1 above world 0 does not force all it forces.",
    );
  });

  it("takes ⊥ at a world in minimal logic, and sends none in intuitionistic logic", () => {
    const falsum = setFalsity(fork, 1, true);
    expect("holds" in check(falsum, "|- ~p \\/ ~~p", "minimal")).toBe(true);
    const refused = check({ ...falsum }, "|- p", "intuitionistic");
    // The editor never sends ⊥ outside minimal logic: what is sent has none.
    expect("holds" in refused).toBe(true);
  });
});
