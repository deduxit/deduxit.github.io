// deduxit © Fabian Lukas Grubmüller 2026
// Licensed under the EUPL

import { describe, expect, it } from "vitest";
import { deduxit } from "./testing";
import {
  type Action,
  buttonName,
  changeWords,
  checkWords,
  joined,
  rowsOf,
  sequentNode,
  type WorkspaceView,
} from "./workspace";

const statement = (text: string, logic = "classical") =>
  deduxit.workspace_statement("ordinary", text, logic, "{}");
const session = (text: string, logic = "classical") =>
  JSON.stringify(JSON.parse(deduxit.ordinary_start(text, logic, "{}")).session);
const edit = (doc: string, action: Action) =>
  JSON.parse(deduxit.workspace_edit(doc, JSON.stringify(action), "", "{}")) as {
    workspace: string;
    made: (number | null)[];
  };
const view = (doc: string): WorkspaceView => JSON.parse(deduxit.workspace_view(doc, "", "{}"));

/** A tab typed with `|- a \/ ~a`, translated by Glivenko's translation and proved on a second tab. */
function translated() {
  const join = joined(statement("|- a \\/ ~a"), session("|- a \\/ ~a"), 0);
  const answer = edit("", {
    name: "translation",
    edits: [
      ...join.edits,
      {
        connect: {
          operation: "ordinary.translate",
          from: [join.sequent],
          parameters: { translation: "glivenko", target: "intuitionistic" },
        },
      },
      { connect: { operation: "ordinary.start", from: [{ made: 3 }] } },
    ],
  });
  return { doc: answer.workspace, made: answer.made };
}

describe("the rows of the panel", () => {
  it("lists each linked tab under the line that says how it was made", () => {
    const { doc, made } = translated();
    expect(made).toEqual([0, 1, null, 2, 3]);
    const rows = rowsOf(view(doc), { first: 1, second: 3 });
    expect(rows.map((r) => [r.tab, r.state, r.depth])).toEqual([
      ["first", "current", 0],
      ["second", "current", 1],
    ]);
    expect(rows[0]?.line).toBeNull();
    expect(rows[1]?.line).toMatchObject({
      kind: "made",
      label: "Glivenko's translation",
      from: 1,
      checked: { node: 2, check: null },
    });
    expect(sequentNode(view(doc), 1)).toBe(0);
  });

  it("puts a tab made from a changed sequent out of date, and names the sequent it is made of now", () => {
    const { doc } = translated();
    const changed = edit(doc, {
      name: "sequent change",
      edits: [{ set: { node: 0, value: statement("|- a -> b \\/ ~b") } }, { restart: { node: 1 } }],
    }).workspace;
    const ran = JSON.parse(deduxit.workspace_run(changed, "[2]", "output", "", "{}")).workspace;
    const rows = rowsOf(view(ran), { first: 1, second: 3 });
    expect(rows[1]?.state).toBe("out_of_date");
    expect(rows[1]?.now).toContain("¬¬");
    expect(buttonName(rows)).toBe("Workspace, 2 linked tabs, 1 out of date");
    expect(view(ran).undo).toBe("sequent change");
  });

  it("marks a second proof of the same sequent as a copy of the first", () => {
    const join = joined(statement("a |- a"), session("a |- a"), 0);
    const { workspace } = edit("", {
      name: "copy",
      edits: [...join.edits, { connect: { operation: "ordinary.start", from: [join.sequent] } }],
    });
    const rows = rowsOf(view(workspace), { first: 1, copy: 2 });
    expect(rows[1]?.line).toMatchObject({ kind: "copy", from: 1 });
  });
});

describe("the words", () => {
  it("says each check as the line shows it, with its one action", () => {
    expect(checkWords(null)).toMatchObject({ shape: "none-yet", action: "check" });
    expect(checkWords({ promise: "same_verdict", status: "held", parts: [] }).sentence).toBe(
      "Both valid, so the verdicts agree.",
    );
    expect(checkWords({ promise: "same_verdict", status: "failed", parts: [] }).action).toBeNull();
  });

  it("names the workspace's Undo after a change", () => {
    expect(changeWords(1, "sequent change")).toBe(
      "1 linked tab is out of date. Workspace has Undo sequent change.",
    );
  });
});
