// deduxit © Fabian Lukas Grubmüller 2026
// Licensed under the EUPL

import { describe, expect, it } from "vitest";
import { isEmbedded, packed, readPackLink, writePackLink } from "./link";
import {
  type Handin,
  isHandin,
  MOST_PROBLEMS,
  type Pack,
  packCode,
  packText,
  readHandin,
  readPack,
} from "./pack";

const PACK: Pack = {
  pack: 1,
  title: "Week 3",
  search: false,
  problems: [
    { suite: "ordinary", parameter: "intuitionistic", sequent: "a → b, a ⊢ b" },
    { suite: "linear", parameter: "classical", sequent: "A ⊗ B ⊢ B ⊗ A" },
    { suite: "modal", parameter: "S4", sequent: "□p ⊢ p" },
  ],
};

describe("a pack", () => {
  it("reads back what it writes, its keys in one order", () => {
    expect(readPack(packText(PACK))).toEqual(PACK);
    const shuffled = JSON.stringify({
      problems: PACK.problems,
      search: false,
      title: "Week 3",
      pack: 1,
    });
    expect(packText(readPack(shuffled) as Pack)).toBe(packText(PACK));
  });

  it("refuses what the page could not hold to: an unknown calculus, a key of its own, too many", () => {
    const with_ = (changed: object) => JSON.stringify({ ...PACK, ...changed });
    expect(
      readPack(with_({ problems: [{ suite: "linear", parameter: "S4", sequent: "A ⊢ A" }] })),
    ).toHaveProperty("problem");
    expect(
      readPack(with_({ problems: [{ suite: "rules", parameter: "LJ", sequent: "a ⊢ a" }] })),
    ).toHaveProperty("problem");
    expect(readPack(with_({ grade: 10 }))).toHaveProperty("problem");
    expect(readPack(with_({ problems: [] }))).toHaveProperty("problem");
    const many = Array.from({ length: MOST_PROBLEMS + 1 }, () => PACK.problems[0]);
    expect(readPack(with_({ problems: many }))).toHaveProperty("problem");
    expect(readPack("{")).toEqual({ problem: "it is not JSON" });
  });

  it("has a code that a changed problem changes", async () => {
    const code = await packCode(PACK);
    expect(code).toMatch(/^[0-9a-f]{4} [0-9a-f]{4} [0-9a-f]{4}$/);
    expect(await packCode(readPack(packText(PACK)) as Pack)).toBe(code);
    const easier = {
      ...PACK,
      problems: [{ ...PACK.problems[0], sequent: "a ⊢ a" }, ...PACK.problems.slice(1)],
    } as Pack;
    expect(await packCode(easier)).not.toBe(code);
  });

  it("goes into a link and comes back, embedded or not", async () => {
    const hash = await writePackLink(packText(PACK));
    expect(isEmbedded(hash)).toBe(false);
    expect(await readPackLink(hash)).toEqual({ kind: "pack", text: packText(PACK) });
    const embedded = await writePackLink(packText(PACK), true);
    expect(isEmbedded(embedded)).toBe(true);
    expect(await readPackLink("#v=2&u=linear&m=classical&s=A")).toBeUndefined();
    expect(await readPackLink("#v=4&k=%%%")).toEqual({ kind: "pack", problem: "document" });
  });
});

describe("a hand-in", () => {
  const handin: Handin = {
    handin: 1,
    pack: PACK,
    answers: [{ session: { version: 8 } }, null, { model: { worlds: [] }, world: null }],
  };

  // As the page before wrote one.
  const text = JSON.stringify({
    handin: 1,
    pack: JSON.parse(packText(PACK)),
    answers: handin.answers,
  });

  it("is read back, and told from a session by its first key", () => {
    expect(isHandin(text)).toBe(true);
    expect(isHandin(JSON.stringify({ version: 8 }))).toBe(false);
    expect(readHandin(text)).toEqual(handin);
  });

  it("has one answer per problem", () => {
    const short = JSON.stringify({ ...handin, answers: [null] });
    expect(readHandin(short)).toHaveProperty("problem");
  });

  it("is read from a link of the page before", async () => {
    const hash = `#${new URLSearchParams({ v: "4", h: await packed(text) })}`;
    expect(await readPackLink(hash)).toEqual({ kind: "handin", text });
  });
});
