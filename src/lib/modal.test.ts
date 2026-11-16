// deduxit © Fabian Lukas Grubmüller 2026
// Licensed under the EUPL

import { describe, expect, it } from "vitest";
import {
  addWorld,
  atomsOf,
  type Evaluation,
  evaluationWords,
  frameWords,
  type Model,
  modelJson,
  prettyModal,
  removeWorld,
  SYSTEM_NAMES,
  setAtoms,
  systemWords,
  toggleArrow,
} from "./modal";
import { deduxit } from "./testing";

/** Three worlds in a row, p at the middle one: K's countermodel of □p ⊢ □□p. */
const ROW: Model = {
  worlds: [{ atoms: [], arrows: [1] }, { atoms: ["p"], arrows: [2] }, { atoms: [] }],
  world: 0,
};

describe("the systems", () => {
  it("are deduxit's fifteen, in its order, K first", () => {
    const about = JSON.parse(deduxit.about()) as {
      suites: { suite: string; parameters: { values: string[]; default: string }[] }[];
    };
    const modal = about.suites.find((s) => s.suite === "modal");
    expect(modal?.parameters[0]?.values).toEqual(SYSTEM_NAMES);
    expect(modal?.parameters[0]?.default).toBe("K");
  });

  it("each name their conditions", () => {
    expect(systemWords("K")).toBe("K: no condition");
    expect(systemWords("S4")).toBe("S4: reflexive, transitive");
  });

  it("are each a frame condition deduxit checks: a world with no arrow is a model of K, D and up refuse it", () => {
    const statement = deduxit.modal_read("p |- p", "K", "");
    for (const system of SYSTEM_NAMES) {
      const claimed = deduxit.modal_read("p |- p", system, "");
      const lone = modelJson({ worlds: [{ atoms: [] }] });
      const e = JSON.parse(deduxit.modal_evaluate(claimed, lone, undefined, "")) as Evaluation;
      // A world that sees nothing meets every condition but seriality and reflexivity.
      const refused = system.includes("D") || ["T", "B", "S4", "S5"].includes(system);
      expect(e.frame !== undefined, system).toBe(refused);
    }
    expect(statement).toContain('"system":"K"');
  });
});

describe("a model the visitor edits", () => {
  it("gains and loses worlds, renumbering the arrows", () => {
    const four = addWorld(ROW);
    expect(four.worlds).toHaveLength(4);
    const three = removeWorld(toggleArrow(four, 3, 2), 1);
    expect(three.worlds.map((w) => w.arrows)).toEqual([[], [], [1]]);
  });

  it("takes atoms as typed, each once", () => {
    expect(atomsOf(" p, q  p ")).toEqual(["p", "q"]);
    expect(setAtoms(ROW, 0, "q").worlds[0]?.atoms).toEqual(["q"]);
  });

  it("is checked by deduxit, its failing world and witness said", () => {
    const statement = deduxit.modal_read("[]p |- [][]p", "K", "");
    const e = JSON.parse(
      deduxit.modal_evaluate(statement, modelJson(ROW), undefined, ""),
    ) as Evaluation;
    expect(evaluationWords(e).keyword).toBe("Fails");
    expect(e.values?.find((v) => v.formula === "□□p")?.witness).toBe(1);
    const frame = JSON.parse(
      deduxit.modal_evaluate(
        deduxit.modal_read("[]p |- [][]p", "T", ""),
        modelJson(ROW),
        undefined,
        "",
      ),
    ) as Evaluation;
    expect(evaluationWords(frame)).toEqual({
      keyword: "No model of T",
      sentence: "Not reflexive: world 0 does not see itself.",
    });
  });
});

describe("a frame fault in words", () => {
  it("names each world once where the euclidean witness repeats one", () => {
    expect(frameWords({ condition: "euclidean", worlds: [0, 1, 1] })).toBe(
      "Not euclidean: world 0 sees world 1, but world 1 does not see itself.",
    );
    expect(frameWords({ condition: "euclidean", worlds: [0, 1, 2] })).toBe(
      "Not euclidean: world 0 sees world 1 and world 2, but world 1 does not see world 2.",
    );
  });
});

describe("a modal sequent in signs", () => {
  it("writes [] as □ and <> as ◇, and ordinary logic's signs as the ordinary suite does", () => {
    expect(prettyModal("[]p -> <>(p /\\ ~q) <-> q")).toBe("□p → ◇(p ∧ ¬q) ↔ q");
  });
});
