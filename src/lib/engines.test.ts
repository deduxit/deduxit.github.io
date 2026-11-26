// deduxit © Fabian Lukas Grubmüller 2026
// Licensed under the EUPL

import { describe, expect, it } from "vitest";
import type { Outcome } from "./deduxit";
import { closedBy, engineOf } from "./engines";

describe("what a search closed, as the line says it", () => {
  it("names one goal, every goal, or each engine with its count", () => {
    expect(closedBy(["focus"], 1, false)).toBe("Goal 2 closed by the focused search.");
    expect(closedBy(["focus", "focus"], null, true)).toBe(
      "Every goal closed by the focused search.",
    );
    expect(closedBy(["horn"], null, false)).toBe("1 goal closed by the Horn engine.");
    expect(closedBy(["focus", "horn", "focus"], null, false)).toBe(
      "3 goals closed: 2 by the focused search, 1 by the Horn engine.",
    );
  });

  it("reads an ordinary outcome's engine from its image, or else its method", () => {
    const image = { verdict: "proved", engine: "focus" };
    expect(engineOf({ search: { method: "embedding", image } } as unknown as Outcome)).toBe(
      "focus",
    );
    expect(engineOf({ search: { method: "models" } } as unknown as Outcome)).toBe("models");
  });
});
