// deduxit © Fabian Lukas Grubmüller 2026
// Licensed under the EUPL

import fc from "fast-check";
import { describe, expect, it } from "vitest";
import {
  asView,
  hintSteps,
  type OrdinarySession,
  type OrdinaryView,
  ordinaryStep,
  retract,
  sequentText,
  stepsOf,
} from "./ordinary";
import { deduxit } from "./testing";

const S = "{}";

interface Played {
  session: OrdinarySession;
  view: OrdinaryView;
}

const start = (text: string, logic: string): Played =>
  JSON.parse(deduxit.ordinary_start(text, logic, S));
const apply = (p: Played, goal: number, side: string, position: number, rule: string): Played =>
  JSON.parse(
    deduxit.ordinary_apply(
      JSON.stringify(p.session),
      goal,
      JSON.stringify({ side, position, rule }),
      S,
    ),
  );
const view = (session: OrdinarySession): OrdinaryView =>
  JSON.parse(deduxit.ordinary_view(JSON.stringify(session), S));

describe("the ordinary suite", () => {
  it("numbers a goal's formulas as the drawing's ids do: left of ⊢ first", () => {
    const p = start("a -> b, a |- b", "intuitionistic");
    const goal = asView(p.view).goals[0];
    expect(goal?.formulas.map((f) => [f.text, f.side])).toEqual([
      ["a → b", "input"],
      ["a", "input"],
      ["b", "output"],
    ]);
    const svg = deduxit.ordinary_draw(JSON.stringify(p.session), S);
    for (const position of [0, 1, 2]) expect(svg).toContain(`id="i0-${position}"`);
    expect(svg).not.toContain('id="i0-3"');
    // The formula right of ⊢ is the right side's first, by its place on the page.
    expect(ordinaryStep(goal?.formulas ?? [], { position: 2, rule: "ax" })).toEqual({
      side: "right",
      position: 0,
      rule: "ax",
    });
    expect(
      hintSteps(goal?.formulas ?? [], [
        { side: "right", position: 0, rule: "WR" },
        { side: "left", position: 1, rule: "ax" },
      ]),
    ).toEqual([
      { position: 2, rule: "WR" },
      { side: "left", position: 1, rule: "ax" },
    ]);
  });

  it("writes a session's sequent as the parser reads it back", () => {
    for (const text of [
      "~(a /\\ b) |- ~a \\/ ~b",
      "|- ((a -> b) -> a) -> a",
      "a <-> b, true |- ~~(false -> a)",
    ]) {
      const p = start(text, "classical");
      const again = start(sequentText(p.session), "classical");
      expect(again.session.sequent).toEqual(p.session.sequent);
    }
  });

  it("undoes on a branch: the step that opened the goal, and every step since in its premises", () => {
    // ∧R splits the goal; the right premise's →R comes first, then the left one's.
    let p = start("|- (a -> a) /\\ (b -> b)", "intuitionistic");
    p = apply(p, 0, "right", 0, "∧R");
    const [left, right] = p.view.goals.map((g) => g.goal) as [number, number];
    p = apply(p, right, "right", 0, "→R");
    p = apply(p, left, "right", 0, "→R");
    const leftGoal = p.view.goals.find((g) => g.left[0] === "a")?.goal as number;
    // Undo on the left branch takes back its →R alone, though the session's last step is it too;
    // on the right branch, its own →R, keeping the left one's.
    const rightGoal = p.view.goals.find((g) => g.left[0] === "b")?.goal as number;
    const back = retract(p.session, rightGoal);
    expect(back).toBeDefined();
    const after = view(back?.session as OrdinarySession);
    expect(after.goals.map((g) => [g.left, g.right])).toEqual(
      expect.arrayContaining([
        [["a"], ["a"]],
        [[], ["b → b"]],
      ]),
    );
    expect(after.steps).toBe(2);
    expect(back?.reopened).toBe(after.goals.find((g) => g.right[0] === "b → b")?.goal);
    // Undoing past the split takes back the split and every step in its premises.
    const reopened = back?.reopened as number;
    const twice = retract(back?.session as OrdinarySession, reopened);
    expect(view(twice?.session as OrdinarySession).steps).toBe(0);
    expect(retract(twice?.session as OrdinarySession, 0)).toBeUndefined();
    expect(leftGoal).toBeDefined();
  });

  it("retracts what deduxit's reader accepts, as its undo does for the last step", () => {
    const sequents = [
      ["a /\\ (b \\/ c) |- (a /\\ b) \\/ (a /\\ c)", "intuitionistic"],
      ["~(a /\\ b) |- ~a \\/ ~b", "classical"],
      ["a -> b, b -> c |- a -> c", "minimal"],
      ["(a <-> b) /\\ a |- b \\/ false", "classical"],
    ] as const;
    let retracted = 0;
    let compared = 0;
    fc.assert(
      fc.property(
        fc.constantFrom(...sequents),
        fc.array(fc.nat(), { minLength: 1, maxLength: 12 }),
        fc.nat(),
        ([text, logic], choices, last) => {
          let p = start(text, logic);
          for (const choice of choices) {
            const goals = p.view.goals;
            if (goals.length === 0) break;
            const goal = goals[choice % goals.length] as OrdinaryView["goals"][number];
            const formulas = [
              ...goal.left.map((_, i) => ["left", i] as const),
              ...goal.right.map((_, i) => ["right", i] as const),
            ];
            // A goal weakened down to nothing has no formula to pick.
            if (formulas.length === 0) continue;
            const [side, position] = formulas[(choice >> 3) % formulas.length] as readonly [
              string,
              number,
            ];
            const rules: { rule: string }[] = JSON.parse(
              deduxit.ordinary_rules(JSON.stringify(p.session), goal.goal, side, position, S),
            );
            // Weakening and contraction loop without end: the random walk takes them rarely.
            const useful = rules.filter((r) => !["CL", "CR"].includes(r.rule));
            const rule = useful[(choice >> 6) % Math.max(1, useful.length)];
            if (choice % 7 === 0) {
              const closed = JSON.parse(
                deduxit.ordinary_close(
                  JSON.stringify(p.session),
                  goal.goal,
                  JSON.stringify({ limits: { work: 4096 } }),
                ),
              );
              p = { session: closed.session, view: closed.view };
            } else if (rule) {
              try {
                p = apply(p, goal.goal, side, position, rule.rule);
              } catch {
                // A refusal (the logic's, the size bound's) leaves the session as it was.
              }
            }
          }
          const open = p.view.goals.map((g) => g.goal);
          const goal = open.length ? open[last % open.length] : undefined;
          const back = retract(p.session, goal);
          if (!back) return;
          retracted++;
          // deduxit's reader takes the document, the reopened goal open in it.
          const after = view(back.session);
          expect(after.goals.map((g) => g.goal)).toContain(back.reopened);
          expect(stepsOf(back.session).length).toBe(back.session.history.length);
          // The last step retracted is deduxit's own undo.
          if (back.session.history.length === p.session.history.length - 1 && goal === undefined) {
            const undone = JSON.parse(deduxit.ordinary_undo(JSON.stringify(p.session), S));
            expect(back.session).toEqual(undone.session);
            compared++;
          }
        },
      ),
      { numRuns: 60 },
    );
    // The walk reaches sessions with steps to take back, finished ones among them.
    expect(retracted).toBeGreaterThan(30);
    expect(compared).toBeGreaterThan(0);
  });
});
