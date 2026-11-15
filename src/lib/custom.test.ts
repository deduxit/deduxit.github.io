// deduxit © Fabian Lukas Grubmüller 2026
// Licensed under the EUPL

import { describe, expect, it } from "vitest";
import {
  assumptionsJson,
  BUILT_IN,
  type CustomOffered,
  type CustomPlayed,
  distinctSteps,
  EXAMPLES,
  fileOf,
  isCustom,
  membersOf,
  nameOf,
  stepWords,
} from "./custom";
import { parseShelf } from "./shelf";
import { custom } from "./suites";
import { deduxit } from "./testing";

describe("the built-in calculi", () => {
  it("start each example goal in its own calculus, and a session reads back as one", () => {
    for (const name of BUILT_IN) {
      const goal = EXAMPLES[name];
      expect(goal, name).toBeDefined();
      const played = JSON.parse(deduxit.rules_start(name, goal ?? "", "", "")) as CustomPlayed;
      expect(played.view.calculus.name.toLowerCase()).toBe(name.toLowerCase());
      expect(played.view.goals).toHaveLength(1);
      expect(isCustom(played.session)).toBe(true);
      // The editor shows the session's own file, which reads as the same calculus.
      const described = JSON.parse(deduxit.rules_read(fileOf(played.session), "")) as {
        name: string;
      };
      expect(described.name).toBe(played.view.calculus.name);
    }
  });

  it("names a step by its rule and the members it acts on, each text offered once", () => {
    const played = JSON.parse(deduxit.rules_start("LJ", "a ∧ a ⊢ a", "", "")) as CustomPlayed;
    const goal = played.view.goals[0];
    expect(goal).toBeDefined();
    if (!goal) return;
    const members = membersOf(goal);
    expect(members).toEqual(["a ∧ a", "a"]);
    const offered = JSON.parse(
      deduxit.rules_rules(JSON.stringify(played.session), goal.goal, ""),
    ) as CustomOffered[];
    const once = distinctSteps(offered, members);
    const words = once.map((s) => stepWords(s, members));
    expect(words).toContain("∧L₁ on a ∧ a");
    expect(new Set(words).size).toBe(words.length);
  });
});

describe("the helpers", () => {
  it("read a rule file's name, the assumptions and a session apart from other documents", () => {
    expect(nameOf('{"name": "Mini"}')).toBe("Mini");
    expect(nameOf("{")).toBeUndefined();
    expect(nameOf('{"name": " "}')).toBeUndefined();
    expect(assumptionsJson("a ⊢ b\n\n  c ⊢ d ")).toBe('["a ⊢ b","c ⊢ d"]');
    expect(isCustom({ calculus: "LK", nodes: [] })).toBe(false);
    expect(isCustom(null)).toBe(false);
  });

  it("keep a custom proof's file, assumptions and session on the shelf", () => {
    const played = JSON.parse(deduxit.rules_start("LJ", "a ⊢ a", "", "")) as CustomPlayed;
    const stored = {
      id: "p1",
      input: "a ⊢ a",
      calculus: custom("LJ"),
      session: null,
      custom: { file: "{}", assumptions: "b ⊢ b", session: played.session },
      redo: [],
      saved: 1,
    };
    const shelf = parseShelf(JSON.stringify({ version: 2, proofs: [stored], active: "p1" }));
    expect(shelf?.proofs[0]?.calculus).toEqual(custom("LJ"));
    expect(shelf?.proofs[0]?.custom?.session).toEqual(played.session);
  });
});
