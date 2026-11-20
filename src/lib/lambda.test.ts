// deduxit © Fabian Lukas Grubmüller 2026
// Licensed under the EUPL

import { describe, expect, it } from "vitest";
import {
  countWords,
  isTerm,
  lambdaState,
  prettyLambda,
  TERM_EXAMPLE,
  TYPE_EXAMPLE,
  type Typed,
  typedWords,
} from "./lambda";
import { deduxit } from "./testing";

describe("a lambda tab's text", () => {
  it("is a term when it has a λ, a variable's type or a pair, and a type otherwise", () => {
    expect(isTerm(TERM_EXAMPLE)).toBe(true);
    expect(isTerm("x : a |- x")).toBe(true);
    expect(isTerm("<>")).toBe(true);
    expect(isTerm(TYPE_EXAMPLE)).toBe(false);
    expect(isTerm("a /\\ b -> b")).toBe(false);
    expect(isTerm("a \\/ b <-> b \\/ a")).toBe(false);
    expect(isTerm("true -> false")).toBe(false);
    // Closed terms of the linear calculi need no λ.
    for (const term of [
      "()",
      "true()",
      "() * ()",
      "∗",
      "promote for in ()",
      "let () be () in ()",
      "inl_(1 + 1)(())",
    ])
      expect(isTerm(term), term).toBe(true);
  });

  it("is shown in signs", () => {
    expect(prettyLambda(String.raw`x : a -o b |- \y:a. x y`)).toBe("x : a ⊸ b ⊢ λy:a. x y");
  });
});

describe("what the panel says", () => {
  it("names a checked term's type, read off deduxit's judgement", () => {
    const term = deduxit.lambda_read(TERM_EXAMPLE, "simple", "");
    const typed = JSON.parse(deduxit.lambda_check(term, "")) as Typed;
    expect(typedWords(typed).sentence).toMatch(/^Its type is \(a → b\) → \(a → b\)\./);
    expect(lambdaState({ kind: "term", typing: "{}", illTyped: null, found: null })).toEqual({
      words: "Well typed",
      tone: "ok",
    });
  });

  it("counts a type's terms in words", () => {
    expect(countWords({ kind: "exactly", count: 1 }, 1)).toBe(
      "Exactly one term, up to βη-equality.",
    );
    expect(countWords({ kind: "infinite" }, 12)).toContain("The 12 shortest are listed.");
  });
});
