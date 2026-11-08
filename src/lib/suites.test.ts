// linlog © Fabian Lukas Grubmüller 2026
// Licensed under the EUPL

import { describe, expect, it } from "vitest";
import { calculusOf, linear, ordinary, parameterOf, SUITES } from "./suites";
import { linlog } from "./testing";

describe("the suite registry", () => {
  it("names each suite, its calls and its parameter as linlog's about does", () => {
    const about = JSON.parse(linlog.about()) as {
      suites: {
        suite: string;
        name: string;
        calls: string;
        parameters: { name: string; values: string[]; default: string }[];
      }[];
    };
    for (const suite of SUITES) {
      const theirs = about.suites.find((s) => s.suite === suite.key);
      expect(theirs, suite.key).toBeDefined();
      expect(theirs?.name).toBe(suite.name);
      expect(theirs?.calls).toBe(suite.calls);
      const parameter = theirs?.parameters.find((p) => p.name === suite.parameter);
      expect(parameter, `${suite.key}'s ${suite.parameter}`).toBeDefined();
      // The page offers a part of linlog's values (the linear suite's cyclic and Lambek modes
      // are not on the page), and a new tab starts in linlog's default.
      for (const value of suite.values) expect(parameter?.values).toContain(value);
      expect(parameterOf(suite.start)).toBe(parameter?.default);
    }
  });

  it("reads back a calculus by its suite, method and parameter, and nothing else", () => {
    for (const suite of SUITES)
      for (const value of suite.values) {
        const c = calculusOf(suite.key, "sequent", value);
        expect(c && parameterOf(c)).toBe(value);
      }
    expect(calculusOf("linear", undefined, "mix")).toEqual(linear("mix"));
    expect(calculusOf("ordinary", "sequent", "minimal")).toEqual(ordinary("minimal"));
    expect(calculusOf("ordinary", "sequent", "mix")).toBeUndefined();
    expect(calculusOf("ordinary", "tableau", "classical")).toBeUndefined();
    expect(calculusOf("modal", "sequent", "K")).toBeUndefined();
  });
});
