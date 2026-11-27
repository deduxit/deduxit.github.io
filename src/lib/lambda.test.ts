// deduxit © Fabian Lukas Grubmüller 2026
// Licensed under the EUPL

import { describe, expect, it } from "vitest";
import {
  calculusWith,
  countWords,
  eraseTypes,
  isTerm,
  isUntyped,
  LAMBDA_CALCULI,
  lambdaState,
  prettyLambda,
  principalWords,
  type Reduction,
  reductionWords,
  TERM_EXAMPLE,
  TYPE_EXAMPLE,
  type Typed,
  typedWords,
  UNTYPED_EXAMPLE,
  useOf,
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

  it("reduces an untyped term step by step, marks its next redex and gives its type", () => {
    const term = deduxit.lambda_read(UNTYPED_EXAMPLE, "untyped", "");
    expect(
      lambdaState({ kind: "term", typing: "{}", illTyped: null, found: null, untyped: true }),
    ).toEqual({ words: "Well formed", tone: "ok" });
    const at = (steps: number) =>
      JSON.parse(deduxit.lambda_reduce(term, JSON.stringify({ steps }), "")) as Reduction;
    const first = at(0);
    const span = first.next as { start: number; end: number };
    expect(first.term.text.slice(span.start, span.end)).toBe("(λf. λx. f (f x)) (λy. y)");
    expect(reductionWords(first, 0)).toBe(
      "The part in blue is reduced next. Press Next step to reduce it.",
    );
    // Taken again from the term as read, as the page does: the normal form after three steps.
    const end = at(1000);
    expect(end.term.text).toBe("λx. x");
    expect(end.next).toBeNull();
    expect(reductionWords(end, end.steps.length, true)).toBe(
      "Normal form after 3 steps: no part of it can be reduced.",
    );
    const typed = JSON.parse(deduxit.lambda_infer(term, "")) as { judgement: string };
    expect(principalWords(typed.judgement)).toBe("Its most general simple type is a → a.");
  });

  it("says a reduction is not finished at its bound, never that it has no end", () => {
    const omega = deduxit.lambda_read(String.raw`(\x. x x) (\x. x x)`, "untyped", "");
    const bounded = JSON.parse(
      deduxit.lambda_reduce(omega, JSON.stringify({ steps: 5 }), ""),
    ) as Reduction;
    expect(reductionWords(bounded, 5, true)).toBe(
      "Not finished after 5 steps, the bound on steps. The part in blue is reduced next.",
    );
    expect(() => deduxit.lambda_infer(omega, "")).toThrow(/ill_typed/);
  });

  it("names the free variables' types beside the term's", () => {
    expect(principalWords("w : a ⊢ (λx:b → b. λy:a. x) (λz:b. z) w : b → b")).toBe(
      "Its most general simple type is b → b, given w : a.",
    );
  });

  it("drops a typed term's types for an untyped calculus, and pairs typing with use", () => {
    expect(eraseTypes(String.raw`\f:a -> b. \x:a. f x`)).toBe(String.raw`\f. \x. f x`);
    expect(eraseTypes("λx:a ⊸ b. x")).toBe("λx. x");
    for (const c of LAMBDA_CALCULI) expect(calculusWith(useOf(c), isUntyped(c))).toBe(c);
  });

  it("counts a type's terms in words", () => {
    expect(countWords({ kind: "exactly", count: 1 }, 1)).toBe(
      "Exactly one term, up to βη-equality.",
    );
    expect(countWords({ kind: "infinite" }, 12)).toContain("The 12 shortest are listed.");
  });
});
