// deduxit © Fabian Lukas Grubmüller 2026
// Licensed under the EUPL

import fc from "fast-check";
import { describe, expect, it } from "vitest";
import {
  dropAside,
  PREVIOUS_KEY,
  parseShelf,
  SHELF_PREFIX,
  type Shelf,
  type Store,
  saveShelf,
  setAside,
  type StoredProof,
} from "./shelf";
import { linear, ordinary } from "./suites";

class Memory implements Store {
  map = new Map<string, string>();
  get length() {
    return this.map.size;
  }
  key(i: number) {
    return [...this.map.keys()][i] ?? null;
  }
  getItem(key: string) {
    return this.map.get(key) ?? null;
  }
  setItem(key: string, value: string) {
    this.map.set(key, value);
  }
  removeItem(key: string) {
    this.map.delete(key);
  }
}

const proof = (id: string, saved = 1, input = "A |- A"): StoredProof => ({
  id,
  input,
  calculus: linear("classical"),
  session: null,
  redo: [],
  saved,
});
const shelf = (...proofs: StoredProof[]): Shelf => ({
  version: 2,
  proofs,
  active: proofs[0]?.id ?? null,
});

describe("the stored proofs", () => {
  it("reads back what it saved", () => {
    fc.assert(
      fc.property(fc.uniqueArray(fc.string(), { minLength: 1 }), (ids) => {
        const store = new Memory();
        const saved = shelf(...ids.map((id) => proof(id)));
        expect(saveShelf(store, "v", saved)).toBe(true);
        expect(parseShelf(store.getItem(`${SHELF_PREFIX}v`))).toEqual(saved);
      }),
    );
  });

  it("keeps each proof's suite, method and parameter", () => {
    const store = new Memory();
    const kept = shelf(
      { ...proof("a"), calculus: ordinary("minimal"), later: [] },
      { ...proof("b"), calculus: linear("intuitionistic-affine") },
    );
    saveShelf(store, "v", kept);
    expect(parseShelf(store.getItem(`${SHELF_PREFIX}v`))).toEqual(kept);
  });

  it("reads a shelf of the first version, written before suites, as the linear suite", () => {
    // As the page saved them until 2026-11: a mode for each proof.
    const old = {
      version: 1,
      active: "a",
      proofs: [
        { id: "a", input: "A |- A", mode: "mix", session: null, redo: [], saved: 3 },
        { id: "b", input: "A |- A", mode: "intuitionistic", session: null, redo: [], saved: 4 },
      ],
    };
    expect(parseShelf(JSON.stringify(old))).toEqual({
      version: 2,
      active: "a",
      proofs: [
        { id: "a", input: "A |- A", calculus: linear("mix"), session: null, redo: [], saved: 3 },
        {
          id: "b",
          input: "A |- A",
          calculus: linear("intuitionistic"),
          session: null,
          redo: [],
          saved: 4,
        },
      ],
    });
  });

  it("reads a stored proof in a mode the switches do not offer, of either version", () => {
    // A session pasted in cyclic linear logic or the Lambek calculus is kept as one.
    const old = {
      version: 1,
      active: "a",
      proofs: [
        { id: "a", input: "A |- A", mode: "classical", session: null, redo: [], saved: 1 },
        { id: "b", input: "A |- A", mode: "cyclic", session: null, redo: [], saved: 2 },
      ],
    };
    expect(parseShelf(JSON.stringify(old))?.proofs.map((p) => p.calculus)).toEqual([
      linear("classical"),
      linear("cyclic"),
    ]);
    const kept = shelf(proof("a"), { ...proof("b"), calculus: linear("lambek-star") });
    expect(parseShelf(JSON.stringify(kept))).toEqual(kept);
  });

  it("leaves out a proof it cannot read alone, and refuses what is not a shelf", () => {
    expect(parseShelf("{")).toBeUndefined();
    expect(parseShelf('{"version":3,"proofs":[]}')).toBeUndefined();
    expect(parseShelf('{"version":1,"proofs":{}}')).toBeUndefined();
    // A calculus the registry does not know, beside one it does: the other proof stays.
    const unknown = { ...proof("a"), calculus: { suite: "modal", method: "sequent", logic: "K" } };
    expect(
      parseShelf(JSON.stringify({ version: 2, active: "b", proofs: [unknown, proof("b")] })),
    ).toEqual({ version: 2, active: "b", proofs: [proof("b")] });
    expect(parseShelf('{"version":1,"active":null,"proofs":[{"id":1}]}')).toEqual({
      version: 2,
      active: null,
      proofs: [],
    });
  });

  it("gathers what other visits left, so new work overwrites none of it", () => {
    const store = new Memory();
    saveShelf(store, "first", shelf(proof("a"), proof("b")));
    expect(setAside(store, "second")?.proofs.map((p) => p.id)).toEqual(["a", "b"]);
    expect(store.getItem(`${SHELF_PREFIX}first`)).toBeNull();
    saveShelf(store, "second", shelf(proof("c", 2)));
    // A visit that never answered the bar: both visits' proofs are offered next time.
    expect(setAside(store, "third")?.proofs.map((p) => p.id)).toEqual(["a", "b", "c"]);
    dropAside(store);
    expect(store.getItem(PREVIOUS_KEY)).toBeNull();
    expect(setAside(store, "fourth")).toBeUndefined();
  });

  it("keeps the copy of a proof saved last, whichever visit saved it", () => {
    const store = new Memory();
    // Tab A saves p at one step; tab B opens and sets it aside; tab A goes on.
    saveShelf(store, "A", shelf(proof("p", 1, "one step")));
    setAside(store, "B");
    saveShelf(store, "A", shelf(proof("p", 5, "five steps")));
    expect(setAside(store, "C")?.proofs).toEqual([proof("p", 5, "five steps")]);
  });

  it("keeps two visits from overwriting each other", () => {
    const store = new Memory();
    saveShelf(store, "A", shelf(proof("a")));
    saveShelf(store, "B", shelf(proof("b")));
    expect(
      setAside(store, "C")
        ?.proofs.map((p) => p.id)
        .sort(),
    ).toEqual(["a", "b"]);
  });

  it("takes out of the bar what is open already", () => {
    const store = new Memory();
    saveShelf(store, "A", shelf(proof("a", 1, "A |- A"), proof("b", 1, "B |- B")));
    setAside(store, "B");
    expect(dropAside(store, (p) => p.input !== "A |- A")?.proofs.map((p) => p.id)).toEqual(["b"]);
    expect(dropAside(store, () => false)).toBeUndefined();
  });

  it("reads a storage that throws as empty", () => {
    const refusing: Store = {
      length: 0,
      key() {
        throw new Error("denied");
      },
      getItem() {
        throw new Error("denied");
      },
      setItem() {
        throw new Error("denied");
      },
      removeItem() {
        throw new Error("denied");
      },
    };
    expect(setAside(refusing, "v")).toBeUndefined();
    expect(saveShelf(refusing, "v", shelf())).toBe(false);
  });
});
