// deduxit © Fabian Lukas Grubmüller 2026
// Licensed under the EUPL

import { describe, expect, it } from "vitest";
import {
  calculusOf,
  calculusWords,
  custom,
  lambda,
  linear,
  markLabel,
  modal,
  ordinary,
  parameterOf,
  SUITES,
} from "./suites";
import { deduxit } from "./testing";

describe("the suite registry", () => {
  it("names each suite, its calls, its term call and its parameter as deduxit's about does", () => {
    const about = JSON.parse(deduxit.about()) as {
      suites: {
        suite: string;
        name: string;
        calls: string;
        term: string;
        parameters: { name: string; values: string[]; default: string }[];
      }[];
    };
    for (const suite of SUITES) {
      const theirs = about.suites.find((s) => s.suite === suite.key);
      expect(theirs, suite.key).toBeDefined();
      expect(theirs?.name).toBe(suite.name);
      expect(theirs?.calls).toBe(suite.calls);
      expect(theirs?.term).toBe(suite.term);
      const parameter = theirs?.parameters.find((p) => p.name === suite.parameter);
      expect(parameter, `${suite.key}'s ${suite.parameter}`).toBeDefined();
      // The page offers a part of deduxit's values (the linear suite's cyclic and Lambek modes
      // are not on the page), and a new tab starts in deduxit's default.
      for (const value of suite.values) expect(parameter?.values).toContain(value);
      expect(parameterOf(suite.start)).toBe(parameter?.default);
    }
  });

  it("reads back a calculus by its suite, method and parameter, and nothing else", () => {
    for (const suite of SUITES)
      for (const value of suite.values) {
        const c = calculusOf(suite.key, suite.methods[0], value);
        expect(c && parameterOf(c)).toBe(value);
      }
    expect(calculusOf("linear", undefined, "mix")).toEqual(linear("mix"));
    expect(calculusOf("ordinary", "sequent", "minimal")).toEqual(ordinary("minimal"));
    // Natural deduction is a method of ordinary logic alone.
    expect(calculusOf("ordinary", "natural", "classical")).toEqual(
      ordinary("classical", "natural"),
    );
    expect(calculusOf("linear", "natural", "classical")).toBeUndefined();
    expect(calculusOf("ordinary", "sequent", "mix")).toBeUndefined();
    expect(calculusOf("ordinary", "tableau", "classical")).toBeUndefined();
    expect(calculusOf("modal", "sequent", "S4")).toEqual(modal("S4"));
    expect(calculusOf("modal", "sequent", "S6")).toBeUndefined();
    // A lambda calculus is checked by typing, which a link names by leaving the method out.
    expect(calculusOf("lambda", undefined, "linear")).toEqual(lambda("linear"));
    expect(calculusOf("lambda", undefined, "untyped_affine")).toEqual(lambda("untyped_affine"));
    expect(calculusOf("lambda", "sequent", "simple")).toBeUndefined();
    expect(calculusOf("lambda", undefined, "system-f")).toBeUndefined();
    expect(calculusOf("modal", "natural", "K")).toBeUndefined();
    // A rule file of one's own is named by the file: any name up to a bound.
    expect(calculusOf("rules", "sequent", "Mini")).toEqual(custom("Mini"));
    expect(calculusOf("rules", "sequent", " ")).toBeUndefined();
    expect(calculusOf("rules", "sequent", "x".repeat(65))).toBeUndefined();
  });
});

describe("the tab's mark on a wide screen", () => {
  it("names the suite beside the calculus's short mark", () => {
    expect(markLabel(linear("classical"))).toBe("Linear (LL)");
    expect(markLabel(linear("intuitionistic-affine"))).toBe("Linear (ILL+aff)");
    expect(markLabel(ordinary("intuitionistic"))).toBe("Ordinary (LJ)");
    expect(markLabel(ordinary("intuitionistic", "natural"))).toBe("Ordinary (NJ)");
    expect(markLabel(custom("tableau"))).toBe("Custom calculus (tableau)");
    expect(markLabel(modal("S4"))).toBe("Modal (S4)");
    expect(calculusWords(modal("S4"))).toBe("Modal, S4 (reflexive, transitive)");
    expect(calculusWords(modal("K"))).toBe("Modal, K (no condition)");
    expect(markLabel(lambda("simple"))).toBe("Lambda-terms (λ→)");
    expect(calculusWords(lambda("affine"))).toBe("Lambda-terms, affine");
    expect(markLabel(lambda("untyped_linear"))).toBe("Lambda-terms (λ lin)");
    expect(calculusWords(lambda("untyped_linear"))).toBe("Lambda-terms, untyped linear");
  });
});
