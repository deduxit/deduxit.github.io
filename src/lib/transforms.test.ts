// deduxit © Fabian Lukas Grubmüller 2026
// Licensed under the EUPL

import { describe, expect, it } from "vitest";
import { formText, type SequentForm } from "./ordinary";
import { deduxit } from "./testing";
import {
  agreementWords,
  type Comparison,
  hypotheses,
  type Interpolation,
  interpolantAtoms,
  listed,
  moved,
  sharedAtoms,
  TRANSLATIONS,
  translatedText,
  verdictWords,
} from "./transforms";

const translate = (text: string, translation: string): Comparison =>
  JSON.parse(deduxit.ordinary_translate(text, JSON.stringify({ translation }), "{}"));
const interpolate = (text: string, partition = ""): Interpolation =>
  JSON.parse(deduxit.ordinary_interpolate(text, "classical", partition, "{}"));
const sequent = (text: string): SequentForm =>
  JSON.parse(deduxit.ordinary_start(text, "classical", "{}")).session.sequent;

describe("the translations", () => {
  it("are the ones deduxit offers, each into the logic deduxit names for it", () => {
    const about = JSON.parse(deduxit.about()) as {
      suites: {
        transformations?: { translations?: { translation: string; target: string }[] }[];
      }[];
    };
    const offered = about.suites
      .flatMap((s) => s.transformations ?? [])
      .flatMap((t) => t.translations ?? []);
    expect(
      TRANSLATIONS.map((t) => ({ translation: t.key, target: t.target })).toSorted((a, b) =>
        a.translation.localeCompare(b.translation),
      ),
    ).toEqual(offered.toSorted((a, b) => a.translation.localeCompare(b.translation)));
  });

  it("give a translated sequent the field reads back as itself", () => {
    for (const { key } of TRANSLATIONS) {
      const c = translate("a -> b, ~(c \\/ d) |- ~b -> ~a, c", key);
      expect(formText(sequent(translatedText(c)))).toBe(translatedText(c));
    }
  });

  it("say both verdicts and that they agree", () => {
    const valid = agreementWords(translate("a -> b |- ~b -> ~a", "glivenko"));
    expect(valid.keyword).toBe("Both valid");
    expect(valid.sentence).toContain("valid in intuitionistic logic");
    const not = translate("a \\/ b |- a", "kolmogorov");
    expect(agreementWords(not).keyword).toBe("Both not valid");
    expect(verdictWords(not.classical, not.sequent)).toBe(
      "not valid: with a false, b true, every formula left of ⊢ is true and every formula right of it false",
    );
    expect(verdictWords(not.decided, not.translated)).toBe(
      "not valid: the Kripke model below shows it",
    );
  });
});

describe("the interpolant", () => {
  it("starts from the formulas left of ⊢, and moves one formula at a time", () => {
    const form = sequent("a, b |- c, d");
    expect(hypotheses(form)).toEqual({ left: [0, 1], right: [] });
    expect(moved(hypotheses(form), "left", 0)).toEqual({ left: [1], right: [] });
    expect(moved({ left: [1], right: [] }, "left", 0)).toEqual({ left: [0, 1], right: [] });
    expect(moved(hypotheses(form), "right", 1)).toEqual({ left: [0, 1], right: [1] });
  });

  it("names its atoms, and they are among those both parts share", () => {
    const text = "p /\\ (p -> q), s |- q \\/ t";
    const found = interpolate(text);
    expect(found.interpolant?.text).toBe("q");
    expect(interpolantAtoms(found)).toEqual(["q"]);
    expect(sharedAtoms(sequent(text), hypotheses(sequent(text)))).toEqual(["q"]);
    const none = interpolate("a /\\ b |- b \\/ c", JSON.stringify({ left: [0], right: [0] }));
    expect(none.interpolant?.text).toBe("⊥");
    expect(interpolantAtoms(none)).toEqual([]);
  });

  it("writes a list of names as a sentence does", () => {
    expect(listed(["a"])).toBe("a");
    expect(listed(["a", "b"])).toBe("a and b");
    expect(listed(["a", "b", "c"])).toBe("a, b and c");
  });
});
