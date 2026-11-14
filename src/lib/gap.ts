// deduxit © Fabian Lukas Grubmüller 2026
// Licensed under the EUPL

/** A box in the drawing's own pixels. */
export interface Box {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

/** A box by its four edges, which the clipping moves one at a time. */
interface Edges {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

/** Whether two boxes share more than an edge. */
const meet = (a: Edges, b: Edges) =>
  a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;

const edges = (b: Box): Edges => ({ left: b.x, top: b.y, right: b.x + b.w, bottom: b.y + b.h });

/**
 * Moves the edge of `box` that faces `other` to `share` of the way across the widest gap
 * between the mark `ink` and `other`; marks that overlap leave it as it is.
 */
function keepOff(box: Edges, ink: Edges, other: Edges, share: number) {
  const gaps = [
    other.left - ink.right,
    ink.left - other.right,
    other.top - ink.bottom,
    ink.top - other.bottom,
  ];
  const widest = Math.max(...gaps);
  if (widest < 0) return;
  const cut = widest * share;
  const side = gaps.indexOf(widest);
  if (side === 0) box.right = Math.min(box.right, ink.right + cut);
  else if (side === 1) box.left = Math.max(box.left, ink.left - cut);
  else if (side === 2) box.bottom = Math.min(box.bottom, ink.bottom + cut);
  else box.top = Math.max(box.top, ink.top - cut);
}

/** The widest gap between two marks on either axis, below zero where they overlap. */
const gap = (a: Edges, b: Edges) =>
  Math.max(b.left - a.right, a.left - b.right, b.top - a.bottom, a.top - b.bottom);

/**
 * The buttons over small marks of a drawing (its rule labels): each covers its mark and grows
 * to `least` on either axis, centred, but never over a button laid already (`taken`, the
 * formulas' and the cuts'), and no further than half the gap to another mark whose button
 * would meet it. So no two buttons overlap and no tap falls between two marks, as the
 * formulas' buttons share the gap between formulas. A mark that touches another keeps its
 * full button.
 */
export function spread(marks: readonly Box[], least: number, taken: readonly Box[]): Box[] {
  const inks = marks.map(edges);
  const laid = taken.map(edges);
  // First the buttons laid already, then each pair of marks, nearest first, whose buttons
  // still meet: a button cut on one side by a near neighbour then need not give way to a
  // farther one it no longer meets.
  const boxes = marks.map((m, i) => {
    const w = Math.max(m.w, least);
    const h = Math.max(m.h, least);
    const box = edges({ x: m.x + (m.w - w) / 2, y: m.y + (m.h - h) / 2, w, h });
    for (const button of laid) if (meet(box, button)) keepOff(box, inks[i] as Edges, button, 1);
    return box;
  });
  const pairs = inks.flatMap((a, i) =>
    inks.slice(i + 1).map((b, k) => ({ i, j: i + 1 + k, gap: gap(a, b) })),
  );
  pairs.sort((p, q) => p.gap - q.gap);
  for (const { i, j } of pairs) {
    const [a, b] = [boxes[i] as Edges, boxes[j] as Edges];
    if (!meet(a, b)) continue;
    // Both stop at the middle of the same gap, so neither reaches the other.
    keepOff(a, inks[i] as Edges, inks[j] as Edges, 1 / 2);
    keepOff(b, inks[j] as Edges, inks[i] as Edges, 1 / 2);
  }
  return boxes.map((b) => ({ x: b.left, y: b.top, w: b.right - b.left, h: b.bottom - b.top }));
}
