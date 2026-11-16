// deduxit © Fabian Lukas Grubmüller 2026
// Licensed under the EUPL

/**
 * A Kripke model as the model editor draws and changes it: worlds, each forcing some atoms and
 * pointing to some worlds, laid out on a canvas. The modal suite reads an arrow as "sees", the
 * ordinary one as "is directly below"; the edits are the same, and deduxit's check of the model
 * is the judge of what was drawn. Plain data, geometry and words, no Solid.
 */

/** A world, as deduxit writes it: the atoms it forces and the worlds its arrows point to. */
export interface KripkeWorld {
  readonly atoms: readonly string[];
  readonly arrows?: readonly number[];
  /** Whether the world forces ⊥: in minimal logic alone. */
  readonly falsity?: boolean;
}

/** A Kripke model, as deduxit writes it (wire level 13). */
export interface Kripke {
  readonly version?: number;
  readonly worlds: readonly KripkeWorld[];
  /** The world the model is about: where the sequent fails, in a countermodel. */
  readonly world?: number;
}

/**
 * Which logic reads the model: modal logic (an arrow is "sees"), or ordinary logic in one of its
 * three (an arrow points up to a world directly above; classical logic has one world, minimal
 * logic lets a world force ⊥).
 */
export type Reading = "modal" | "intuitionistic" | "minimal" | "classical";

/** The most worlds the editor holds: enough to try a frame, few enough to read. */
export const MOST_WORLDS = 8;

/** The most worlds a model of the reading may have. */
export const mostWorlds = (reading: Reading): number => (reading === "classical" ? 1 : MOST_WORLDS);

/** A model of one world, forcing nothing: where a model of one's own starts. */
export const ONE_WORLD: Kripke = { worlds: [{ atoms: [] }], world: 0 };

/** The atoms of a world as the editor shows them: their names, comma-separated. */
export const atomsText = (world: KripkeWorld): string => world.atoms.join(", ");

/** The atoms typed in the editor: names separated by commas or spaces, each once. */
export function atomsOf(text: string): string[] {
  const names = text
    .split(/[\s,]+/)
    .map((name) => name.trim())
    .filter((name) => name !== "");
  return Array.from(new Set(names));
}

/** The model with a world added, forcing nothing and pointing nowhere. */
export const addWorld = <M extends Kripke>(model: M): M =>
  ({ ...model, worlds: [...model.worlds, { atoms: [], arrows: [] }] }) as M;

/** The model with world `at` taken out: the arrows to it gone, the later worlds renumbered. */
export function removeWorld<M extends Kripke>(model: M, at: number): M {
  const renumber = (w: number) => (w > at ? w - 1 : w);
  const worlds = model.worlds
    .filter((_, i) => i !== at)
    .map((w) => ({
      ...w,
      arrows: (w.arrows ?? []).filter((t) => t !== at).map(renumber),
    }));
  const world = model.world === undefined || model.world === at ? 0 : renumber(model.world);
  return { ...model, worlds, world: Math.min(world, Math.max(worlds.length - 1, 0)) } as M;
}

/** Whether world `from` has an arrow to world `to`. */
export const hasArrow = (model: Kripke, from: number, to: number): boolean =>
  (model.worlds[from]?.arrows ?? []).includes(to);

/** The model with the arrow from world `from` to world `to` added or taken out. */
export function toggleArrow<M extends Kripke>(model: M, from: number, to: number): M {
  return {
    ...model,
    worlds: model.worlds.map((w, i) => {
      if (i !== from) return w;
      const arrows = w.arrows ?? [];
      const next = arrows.includes(to)
        ? arrows.filter((t) => t !== to)
        : [...arrows, to].sort((a, b) => a - b);
      return { ...w, arrows: next };
    }),
  } as M;
}

/** The model with world `at`'s atoms set from the editor's text. */
export function setAtoms<M extends Kripke>(model: M, at: number, text: string): M {
  return {
    ...model,
    worlds: model.worlds.map((w, i) => (i === at ? { ...w, atoms: atomsOf(text) } : w)),
  } as M;
}

/** The model with world `at` forcing ⊥ or not (minimal logic). */
export function setFalsity<M extends Kripke>(model: M, at: number, falsity: boolean): M {
  return {
    ...model,
    worlds: model.worlds.map((w, i) => {
      if (i !== at) return w;
      const { falsity: _, ...rest } = w;
      return falsity ? { ...rest, falsity: true } : rest;
    }),
  } as M;
}

/**
 * The model as the reading's check takes it: what that logic has no use for left out (a world's
 * ⊥ outside minimal logic, which no control of the editor sets there), and a document of level 13.
 */
export function kripkeJson(model: Kripke, reading: Reading): string {
  const worlds = model.worlds.map((w) => {
    const arrows = w.arrows ?? [];
    return reading === "minimal" && w.falsity
      ? { atoms: w.atoms, falsity: true, arrows }
      : { atoms: w.atoms, arrows };
  });
  return JSON.stringify({ version: 13, worlds, world: model.world ?? 0 });
}

/** A point of the canvas. */
export interface Point {
  readonly x: number;
  readonly y: number;
}

/** The canvas's size, in its own units. */
export const CANVAS = { width: 480, height: 260 } as const;

/** A world's box: its half width and half height. */
export const BOX_HALF_HEIGHT = 20;

/** What a world's box shows: its atoms, and ⊥ where it forces it. */
export const boxText = (world: KripkeWorld | undefined): string =>
  [...(world?.atoms ?? []), ...(world?.falsity ? ["⊥"] : [])].join(", ");

/** A world's box's half width, from what it shows. */
export const boxHalfWidth = (world: KripkeWorld | undefined): number =>
  Math.max(26, 12 + 4.5 * boxText(world).length);

/**
 * Each world's level: in modal logic its distance along the arrows from the model's world (worlds
 * it cannot reach after the farthest), in ordinary logic its height above the worlds no arrow
 * points to (by distance, as in modal logic, where the arrows go round).
 */
export function levels(model: Kripke, reading: Reading): number[] {
  const n = model.worlds.length;
  const distance = (start: number): number[] => {
    const level = new Array<number>(n).fill(-1);
    if (start < n) level[start] = 0;
    const queue = start < n ? [start] : [];
    for (let at = 0; at < queue.length; at++) {
      const w = queue[at] as number;
      for (const t of model.worlds[w]?.arrows ?? []) {
        if (t < n && level[t] === -1) {
          level[t] = (level[w] as number) + 1;
          queue.push(t);
        }
      }
    }
    const far = Math.max(-1, ...level) + 1;
    return level.map((l) => (l === -1 ? far : l));
  };
  if (reading === "modal") return distance(model.world ?? 0);
  // Heights by Kahn's order on the arrows: a world comes after every world below it.
  const below = new Array<number>(n).fill(0);
  for (const w of model.worlds)
    for (const t of w.arrows ?? []) if (t < n) below[t] = (below[t] as number) + 1;
  const height = new Array<number>(n).fill(0);
  const ready = below.flatMap((count, w) => (count === 0 ? [w] : []));
  let seen = 0;
  for (let at = 0; at < ready.length; at++) {
    const w = ready[at] as number;
    seen++;
    for (const t of model.worlds[w]?.arrows ?? []) {
      if (t >= n || t === w) continue;
      height[t] = Math.max(height[t] as number, (height[w] as number) + 1);
      below[t] = (below[t] as number) - 1;
      if (below[t] === 0) ready.push(t);
    }
  }
  return seen === n ? height : distance(model.world ?? 0);
}

/**
 * Where each world's box stands on a fresh canvas, as deduxit draws a model: a row per level, in
 * modal logic top to bottom from the model's world, in ordinary logic bottom to top, each row's
 * worlds spread evenly.
 */
export function layout(model: Kripke, reading: Reading): Point[] {
  const level = levels(model, reading);
  const count = Math.max(0, ...level) + 1;
  const across = level.map((l, w) => level.slice(0, w).filter((m) => m === l).length);
  const widths = level.map((l) => level.filter((m) => m === l).length);
  const { width, height } = CANVAS;
  return level.map((l, w) => {
    const along = ((across[w] as number) + 0.5) / (widths[w] as number);
    const deep = (l + 0.5) / count;
    const x = 50 + (width - 100) * along;
    return {
      x,
      y: reading === "modal" ? 30 + (height - 60) * deep : height - 30 - (height - 60) * deep,
    };
  });
}

/** A free spot for a new world: the point of a grid farthest from every box there is. */
export function freeSpot(taken: readonly Point[]): Point {
  let best: Point = { x: CANVAS.width / 2, y: CANVAS.height / 2 };
  let room = -1;
  for (let row = 0; row < 4; row++) {
    for (let column = 0; column < 6; column++) {
      const spot = {
        x: 50 + ((CANVAS.width - 100) * column) / 5,
        y: 30 + ((CANVAS.height - 60) * row) / 3,
      };
      const nearest = Math.min(
        Number.POSITIVE_INFINITY,
        ...taken.map((p) => Math.hypot((p.x - spot.x) / 2, p.y - spot.y)),
      );
      if (nearest > room) {
        room = nearest;
        best = spot;
      }
    }
  }
  return best;
}

/** A point kept inside the canvas, a box's half size from its edges. */
export const inside = (p: Point, halfWidth: number): Point => ({
  x: Math.min(Math.max(p.x, halfWidth + 2), CANVAS.width - halfWidth - 2),
  y: Math.min(Math.max(p.y, BOX_HALF_HEIGHT + 2), CANVAS.height - BOX_HALF_HEIGHT - 2),
});

/** Where the ray from a box's centre towards `towards` leaves the box, a little outside it. */
function edge(centre: Point, halfWidth: number, towards: Point): Point {
  const dx = towards.x - centre.x;
  const dy = towards.y - centre.y;
  if (dx === 0 && dy === 0) return centre;
  const t = Math.min(
    dx === 0 ? Number.POSITIVE_INFINITY : (halfWidth + 3) / Math.abs(dx),
    dy === 0 ? Number.POSITIVE_INFINITY : (BOX_HALF_HEIGHT + 3) / Math.abs(dy),
  );
  return { x: centre.x + t * dx, y: centre.y + t * dy };
}

/** The `d` of a path from point `a` to point `b`, as a line or a curve through `bend`. */
const pathFrom = (a: Point, b: Point, bend?: Point): string =>
  bend
    ? `M${a.x.toFixed(1)},${a.y.toFixed(1)} Q${bend.x.toFixed(1)},${bend.y.toFixed(1)} ${b.x.toFixed(1)},${b.y.toFixed(1)}`
    : `M${a.x.toFixed(1)},${a.y.toFixed(1)} L${b.x.toFixed(1)},${b.y.toFixed(1)}`;

/**
 * The path of an arrow between two boxes: from box `from` (its centre and half width) to box
 * `to`, bent to one side when the arrow back exists too, so that the two do not overlap; a loop
 * on the box's right side where both are one world.
 */
export function arrowPath(
  from: Point,
  fromHalf: number,
  to: Point,
  toHalf: number,
  bent: boolean,
  loop: boolean,
): string {
  if (loop) {
    // On the box's right side, out of the way of arrows that come from above or below.
    const side = from.x + fromHalf + 2;
    return `M${side.toFixed(1)},${(from.y - 9).toFixed(1)} C${(side + 34).toFixed(1)},${(from.y - 30).toFixed(1)} ${(side + 34).toFixed(1)},${(from.y + 30).toFixed(1)} ${side.toFixed(1)},${(from.y + 9).toFixed(1)}`;
  }
  if (!bent) return pathFrom(edge(from, fromHalf, to), edge(to, toHalf, from));
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.hypot(dx, dy) || 1;
  const bend = {
    x: (from.x + to.x) / 2 + (dy / length) * 22,
    y: (from.y + to.y) / 2 - (dx / length) * 22,
  };
  return pathFrom(edge(from, fromHalf, bend), edge(to, toHalf, bend), bend);
}

/** Which world's box holds point `p`, the last drawn first; null for none. */
export function worldAt(
  p: Point,
  positions: readonly Point[],
  halfWidths: readonly number[],
): number | null {
  for (let w = positions.length - 1; w >= 0; w--) {
    const at = positions[w] as Point;
    const half = (halfWidths[w] ?? 26) + 4;
    if (Math.abs(p.x - at.x) <= half && Math.abs(p.y - at.y) <= BOX_HALF_HEIGHT + 4) return w;
  }
  return null;
}

/** What a check found, to mark on the drawing: each mark is said in words beside its colour. */
export interface Marks {
  /** The world where the sequent fails. */
  readonly failing?: number;
  /** The worlds that show a false □ or a true ◇ at the failing world. */
  readonly witnesses?: readonly number[];
  /** The worlds a frame condition the arrows fail names. */
  readonly frame?: readonly number[];
  /** The arrow whose absence breaks the frame condition, from a world to a world. */
  readonly missing?: readonly [number, number] | undefined;
}

/** A list of world numbers as words: "world 1", "worlds 0 and 2". */
export function worldsWords(worlds: readonly number[]): string {
  const names = worlds.map(String);
  if (names.length === 0) return "no world";
  if (names.length === 1) return `world ${names[0] as string}`;
  return `worlds ${names.slice(0, -1).join(", ")} and ${names[names.length - 1] as string}`;
}

/** A world as a screen reader hears it: its number, what it forces, its arrows, its marks. */
export function worldWords(
  model: Kripke,
  w: number,
  reading: Reading,
  marks: Marks | undefined,
): string {
  const world = model.worlds[w];
  const shown = boxText(world);
  const forces = shown === "" ? "forces no atom" : `forces ${shown}`;
  const arrows = world?.arrows ?? [];
  const others = arrows.filter((t) => t !== w);
  const own = arrows.includes(w);
  let points: string;
  if (reading === "modal") {
    const seen = [own ? "itself" : "", others.length > 0 ? worldsWords(others) : ""].filter(
      (s) => s !== "",
    );
    points = seen.length === 0 ? "sees no world" : `sees ${seen.join(" and ")}`;
  } else if (reading === "classical") {
    points = "";
  } else {
    points =
      others.length === 0
        ? "has no world above it"
        : `has ${worldsWords(others)} directly above it`;
  }
  const said = [
    marks?.failing === w ? "the sequent fails here" : "",
    marks?.witnesses?.includes(w) ? "shows a false □ or a true ◇" : "",
    marks?.frame?.includes(w) ? "named by the frame condition" : "",
  ].filter((s) => s !== "");
  return [`World ${String(w)}`, forces, points, ...said].filter((s) => s !== "").join(", ");
}

/** The arrow a frame condition's worlds show missing: the one whose addition meets it there. */
export function missingArrow(
  condition: string,
  worlds: readonly number[],
): readonly [number, number] | undefined {
  const [a, b, c] = worlds;
  switch (condition) {
    case "reflexive":
      return a === undefined ? undefined : [a, a];
    case "symmetric":
      return a === undefined || b === undefined ? undefined : [b, a];
    case "transitive":
      return a === undefined || c === undefined ? undefined : [a, c];
    case "euclidean":
      return b === undefined || c === undefined ? undefined : [b, c];
    default:
      return undefined;
  }
}

/** A formula's forcing at a world, as `ordinary_model` answers it. */
export interface Forced {
  readonly formula: string;
  readonly forced: boolean;
}

/** An ordinary model checked against a sequent, as `ordinary_model` answers it. */
export interface Forcing {
  readonly holds: boolean;
  readonly failing: { readonly world: number; readonly forcing: readonly Forced[] } | null;
}

/** The keyword and sentence of an ordinary model's check. */
export function forcingWords(
  checked: Forcing,
  world: number | null,
  reading: Reading,
): { keyword: string; sentence: string } {
  if (checked.holds || !checked.failing) {
    const at =
      reading === "classical"
        ? "at the one world"
        : world === null
          ? "at every world"
          : `at world ${String(world)} and every world above it`;
    return { keyword: "Holds", sentence: `The sequent holds ${at} of this model.` };
  }
  return {
    keyword: "Fails",
    sentence:
      reading === "classical"
        ? "Every formula left of ⊢ is true and every formula right of it false."
        : `World ${String(checked.failing.world)} forces every formula left of ⊢ and not the one right of it.`,
  };
}

/** A formula's forcing as its line reads. */
export const forcedWords = (f: Forced): string =>
  `${f.formula} is ${f.forced ? "forced" : "not forced"}`;

/** What a model that is none of the logic is told: deduxit's reason, as a sentence. */
export function refusalWords(failure: { readonly message: string }): string {
  const reason = failure.message.replace(/^the Kripke model is wrong: /, "");
  const said = reason.charAt(0).toUpperCase() + reason.slice(1);
  return said.endsWith(".") ? said : `${said}.`;
}
