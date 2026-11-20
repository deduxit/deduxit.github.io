// deduxit © Fabian Lukas Grubmüller 2026
// Licensed under the EUPL

import { describe, expect, it } from "vitest";
import {
  allClauses,
  clashes,
  clauseText,
  FORMS,
  layout,
  type NormalForm,
  type Refutation,
  type Resolution,
  resolutionWords,
  type Stepped,
  stepTexts,
  traceLines,
} from "./clausal";
import { formText } from "./ordinary";
import { deduxit } from "./testing";

const normalize = (sequent: string, form: string) =>
  JSON.parse(deduxit.ordinary_normalize(sequent, JSON.stringify({ form }), "{}")) as NormalForm;
const resolve = (sequent: string, options: object) =>
  JSON.parse(deduxit.ordinary_resolve(sequent, JSON.stringify(options), "{}")) as Resolution;

describe("normal forms", () => {
  it("offers the forms deduxit lists", () => {
    const about = JSON.parse(deduxit.about());
    const normal = about.suites[1].transformations.find(
      (t: { transformation: string }) => t.transformation === "normal",
    );
    expect(new Set(FORMS.map((f) => f.key))).toEqual(new Set(normal.forms));
  });

  it("ends each form's steps on its result", () => {
    for (const { key } of FORMS) {
      const made = normalize("a -> b /\\ c, ~(d <-> a) |- true -> d", key);
      const steps = stepTexts(made);
      expect(steps.length).toBeGreaterThan(0);
      expect(steps[steps.length - 1]?.sequent).toBe(formText(made.result));
      expect(made.checked).toBe(true);
    }
  });

  it("says what each step did", () => {
    const steps = stepTexts(normalize("a -> b /\\ c", "cnf"));
    expect(steps.map((s) => s.law)).toEqual(["A → B ≡ ¬A ∨ B", "A ∨ (B ∧ C) ≡ (A ∨ B) ∧ (A ∨ C)"]);
    expect(steps[0]?.what).toBe("at a → (b ∧ c)");
    const encoded = stepTexts(normalize("a /\\ b |- a", "tseitin"));
    expect(encoded[0]?.what).toBe("a moves left of ⊢ as ¬a");
    expect(encoded[1]?.what).toMatch(/^t1 names a ∧ b, with the clauses /);
  });
});

describe("refutations", () => {
  it("writes clauses in signs", () => {
    expect(clauseText(["a", "b"], [-1, 2])).toBe("¬a ∨ b");
    expect(clauseText(["a"], [])).toBe("□");
  });

  it("finds the atoms two clauses clash on", () => {
    expect(clashes([-1, 2], [1])).toEqual([1]);
    expect(clashes([1, 2], [-1, -2])).toEqual([1, 2]);
    expect(clashes([1], [2])).toEqual([]);
  });

  it("lays out a refutation as rows with two edges into each resolvent", () => {
    const found = resolve("a -> b, b -> c |- a -> c", {});
    expect(found.verdict).toBe("unsatisfiable");
    const r = { clauses: found.clauses, resolvents: found.resolvents ?? [] };
    const graph = layout(r);
    expect(graph.nodes).toHaveLength(allClauses(r).length);
    expect(graph.edges).toHaveLength(2 * r.resolvents.length);
    // Every edge goes down from a parent to its resolvent.
    for (const [parent, child] of graph.edges)
      expect(graph.nodes[child]?.row).toBeGreaterThan(graph.nodes[parent]?.row ?? 0);
    expect(graph.widths[0]).toBe(found.clauses.length);
  });

  it("builds a refutation by hand to □, and refuses a step its clauses do not allow", () => {
    const start = deduxit.ordinary_clauses("a -> b, a |- b", "", "{}");
    const r = JSON.parse(start) as Refutation;
    expect(r.clauses.map((c) => clauseText(r.atoms, c))).toEqual(["¬a ∨ b", "a", "¬b"]);
    expect(() => deduxit.ordinary_resolve_step(start, 0, 2, 1, "{}")).toThrow(/step_refused/);
    const one = JSON.parse(deduxit.ordinary_resolve_step(start, 0, 1, 1, "{}")) as Stepped;
    expect(clauseText(r.atoms, one.refutation.resolvents[0]?.clause ?? [])).toBe("b");
    const two = JSON.parse(
      deduxit.ordinary_resolve_step(JSON.stringify(one.refutation), 3, 2, 2, "{}"),
    ) as Stepped;
    expect(two.finished).toBe(true);
    expect(
      JSON.parse(deduxit.ordinary_refutation_check(JSON.stringify(two.refutation), "{}")),
    ).toEqual({
      finished: true,
    });
  });

  it("says each verdict, and indents DPLL's steps by their decisions", () => {
    expect(resolutionWords(resolve("a, a -> b |- b", {})).keyword).toBe("Valid");
    const model = resolve("a \\/ b |- a", { method: "dpll" });
    expect(resolutionWords(model).sentence).toContain("b true and every other atom false");
    const unknown = resolve("a -> b, b -> c |- a -> c", { steps: 1 });
    expect(resolutionWords(unknown).keyword).toBe("Not decided");
    const four = resolve("a \\/ b, ~a \\/ b, a \\/ ~b |- b /\\ a", { method: "dpll" });
    const lines = traceLines(four.atoms, four.trace ?? []);
    expect(lines[0]).toEqual({ text: "decide a (level 1)", depth: 0 });
    expect(lines[1]?.depth).toBe(1);
  });
});
