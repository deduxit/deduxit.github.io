// deduxit © Fabian Lukas Grubmüller 2026
// Licensed under the EUPL

import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { type Box, spread } from "./gap";

const overlap = (a: Box, b: Box) =>
  Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x) > 1e-9 &&
  Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y) > 1e-9;
const covers = (a: Box, b: Box) =>
  a.x <= b.x + 1e-9 &&
  a.y <= b.y + 1e-9 &&
  a.x + a.w >= b.x + b.w - 1e-9 &&
  a.y + a.h >= b.y + b.h - 1e-9;

describe("the rule labels' buttons", () => {
  it("grow to a control's size about a lone label", () => {
    expect(spread([{ x: 100, y: 100, w: 20, h: 10 }], 44, [])).toEqual([
      { x: 88, y: 83, w: 44, h: 44 },
    ]);
  });

  it("share the gap between two labels one above the other", () => {
    const [upper, lower] = spread(
      [
        { x: 100, y: 100, w: 20, h: 10 },
        { x: 100, y: 120, w: 20, h: 10 },
      ],
      44,
      [],
    );
    // Each reaches the middle of the 10 pixels between them, and keeps its other sides.
    expect(upper).toEqual({ x: 88, y: 83, w: 44, h: 32 });
    expect(lower).toEqual({ x: 88, y: 115, w: 44, h: 32 });
  });

  it("stop at a formula's button", () => {
    const [label] = spread([{ x: 100, y: 100, w: 20, h: 10 }], 44, [
      { x: 60, y: 115, w: 80, h: 30 },
    ]);
    expect(label).toEqual({ x: 88, y: 83, w: 44, h: 32 });
  });

  it("never overlap where the labels do not, and cover each label", () => {
    const mark = fc.record({
      x: fc.integer({ min: 0, max: 300 }),
      y: fc.integer({ min: 0, max: 300 }),
      w: fc.integer({ min: 1, max: 60 }),
      h: fc.integer({ min: 1, max: 30 }),
    });
    fc.assert(
      fc.property(
        fc.array(mark, { maxLength: 12 }),
        fc.array(mark, { maxLength: 4 }),
        (marks, taken) => {
          const free = marks.filter((m) => !taken.some((t) => overlap(m, t)));
          const buttons = spread(free, 44, taken);
          buttons.forEach((b, i) => {
            const ink = free[i] as Box;
            expect(covers(b, ink)).toBe(true);
            expect(b.w).toBeLessThanOrEqual(Math.max(ink.w, 44) + 1e-9);
            expect(b.h).toBeLessThanOrEqual(Math.max(ink.h, 44) + 1e-9);
            for (const t of taken) expect(overlap(b, t)).toBe(false);
            buttons.forEach((c, j) => {
              if (j > i && !overlap(ink, free[j] as Box))
                expect(overlap(b, c), `${i} ${j}`).toBe(false);
            });
          });
        },
      ),
    );
  });
});
