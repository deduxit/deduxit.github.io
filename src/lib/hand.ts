// deduxit © Fabian Lukas Grubmüller 2026
// Licensed under the EUPL

/**
 * A tableau built by hand, a press at a time: the sequent's signed formulas first, then each line
 * pressed expanded by its rule on every open branch below it, a branch closed by itself once it
 * holds a formula marked both true and false. The tableau is a function of the lines pressed, in
 * order, so undo is the list less its last. Written in the text deduxit reviews
 * (`ordinary_tableau_review`), which judges it. Plain data, no Solid.
 */

import { formulaTexts, type SequentForm } from "./ordinary";

/** A line's sign: the formula true or false. */
export type Sign = "T" | "F";

/** A line of the tableau: its number, its sign, its formula by index, and the line it came from. */
export interface Line {
  readonly number: number;
  readonly sign: Sign;
  readonly formula: number;
  readonly from: number | null;
}

/** A stretch of a branch: its lines, then either two branches under it, or its end. */
export interface Node {
  readonly lines: readonly Line[];
  readonly kids: readonly Node[];
  /** The two lines that clash, where the branch closed. */
  readonly closed: readonly [number, number] | null;
}

/** A tableau built by hand: its tree, the lines expanded, and the last number given. */
export interface Hand {
  readonly root: Node;
  readonly expanded: ReadonlySet<number>;
  readonly last: number;
}

/** The two ways a signed formula is taken apart: one branch of lines, or two. */
type Parts = {
  readonly kind: "one" | "two";
  readonly parts: readonly (readonly [Sign, number][])[];
};

/** How a line is expanded, or null for one with nothing to expand (an atom, a constant, a quantifier). */
export function partsOf(form: SequentForm, sign: Sign, formula: number): Parts | null {
  const node = form.formulas[formula];
  if (typeof node !== "object" || node === null) return null;
  const [tag, args] = Object.entries(node)[0] as [string, number | readonly number[]];
  const flip = (s: Sign): Sign => (s === "T" ? "F" : "T");
  if (tag === "¬") return { kind: "one", parts: [[[flip(sign), args as number]]] };
  if (!Array.isArray(args)) return null;
  const [a, b] = args as readonly number[] as readonly [number, number];
  const T = sign === "T";
  switch (tag) {
    case "∧":
      return T
        ? {
            kind: "one",
            parts: [
              [
                ["T", a],
                ["T", b],
              ],
            ],
          }
        : { kind: "two", parts: [[["F", a]], [["F", b]]] };
    case "∨":
      return T
        ? { kind: "two", parts: [[["T", a]], [["T", b]]] }
        : {
            kind: "one",
            parts: [
              [
                ["F", a],
                ["F", b],
              ],
            ],
          };
    case "→":
      return T
        ? { kind: "two", parts: [[["F", a]], [["T", b]]] }
        : {
            kind: "one",
            parts: [
              [
                ["T", a],
                ["F", b],
              ],
            ],
          };
    case "↔":
      return T
        ? {
            kind: "two",
            parts: [
              [
                ["T", a],
                ["T", b],
              ],
              [
                ["F", a],
                ["F", b],
              ],
            ],
          }
        : {
            kind: "two",
            parts: [
              [
                ["T", a],
                ["F", b],
              ],
              [
                ["F", a],
                ["T", b],
              ],
            ],
          };
    default:
      return null;
  }
}

/** The two lines of a branch that clash, or null: a formula true and false, ⊥ true or ⊤ false. */
function clash(form: SequentForm, branch: readonly Line[]): readonly [number, number] | null {
  for (const line of branch) {
    const node = form.formulas[line.formula];
    if ((node === "⊥" && line.sign === "T") || (node === "⊤" && line.sign === "F"))
      return [line.number, line.number];
    const other = branch.find((o) => o.formula === line.formula && o.sign !== line.sign);
    if (other)
      return other.number < line.number ? [other.number, line.number] : [line.number, other.number];
  }
  return null;
}

/** The tableau of a sequent before any press: its formulas left of ⊢ true, right of it false. */
export function begin(form: SequentForm): Hand {
  const lines: Line[] = [
    ...form.left.map((formula) => ({ sign: "T" as const, formula })),
    ...form.right.map((formula) => ({ sign: "F" as const, formula })),
  ].map((l, i) => ({ number: i + 1, sign: l.sign, formula: l.formula, from: null }));
  return {
    root: { lines, kids: [], closed: clash(form, lines) },
    expanded: new Set(),
    last: lines.length,
  };
}

/** Whether a line is in a stretch or anywhere below it. */
const holds = (node: Node, number: number): boolean =>
  node.lines.some((l) => l.number === number) || node.kids.some((k) => holds(k, number));

/**
 * The tableau with a line expanded on every open branch below it, the new lines numbered on, and
 * each branch that clashes then closed. Unchanged where the line has nothing to expand or was
 * expanded already.
 */
export function expand(form: SequentForm, hand: Hand, number: number): Hand {
  if (hand.expanded.has(number)) return hand;
  let last = hand.last;
  let line: Line | undefined;
  const find = (node: Node) => {
    for (const l of node.lines) if (l.number === number) line = l;
    for (const k of node.kids) find(k);
  };
  find(hand.root);
  const parts = line ? partsOf(form, line.sign, line.formula) : null;
  if (!line || !parts) return hand;
  const made = (signed: readonly [Sign, number][]): Line[] =>
    signed.map(([sign, formula]) => {
      last += 1;
      return { number: last, sign, formula, from: number };
    });
  // Each open leaf at or below the line's stretch takes the parts, the branch above it known.
  const grow = (node: Node, above: readonly Line[], under: boolean): Node => {
    const here = under || node.lines.some((l) => l.number === number);
    const branch = [...above, ...node.lines];
    if (node.kids.length > 0) return { ...node, kids: node.kids.map((k) => grow(k, branch, here)) };
    if (!here || node.closed) return node;
    if (parts.kind === "one") {
      const lines = [...node.lines, ...made(parts.parts[0] ?? [])];
      return { lines, kids: [], closed: clash(form, [...above, ...lines]) };
    }
    const kids = parts.parts.map((signed) => {
      const lines = made(signed);
      return { lines, kids: [], closed: clash(form, [...branch, ...lines]) };
    });
    return { ...node, kids };
  };
  const root = holds(hand.root, number) ? grow(hand.root, [], false) : hand.root;
  return { root, expanded: new Set([...hand.expanded, number]), last };
}

/** The tableau made by pressing the lines given, in order. */
export function replay(form: SequentForm, pressed: readonly number[]): Hand {
  return pressed.reduce((hand, number) => expand(form, hand, number), begin(form));
}

/** Whether every line of a branch that can be expanded has been. */
export function finished(form: SequentForm, hand: Hand, branch: readonly Line[]): boolean {
  return branch.every(
    (l) => hand.expanded.has(l.number) || partsOf(form, l.sign, l.formula) === null,
  );
}

/** Whether every branch is closed. */
export function closed(node: Node): boolean {
  return node.kids.length > 0 ? node.kids.every(closed) : node.closed !== null;
}

/**
 * The tableau as text, in the form deduxit reviews: a line each, its number, T or F, the formula,
 * and the line it came from; a branch starts with "- ", its lines two spaces in; a closed branch
 * ends with × and its two lines.
 */
export function written(form: SequentForm, hand: Hand): string {
  const texts = formulaTexts(form);
  const out: string[] = [];
  const write = (node: Node, depth: number, first: boolean, above: readonly Line[]) => {
    const branch = [...above, ...node.lines];
    const pad = "  ".repeat(Math.max(0, depth - 1));
    node.lines.forEach((line, i) => {
      const lead = depth > 0 ? (first && i === 0 ? `${pad}- ` : `${pad}  `) : "";
      const from = line.from === null ? "" : ` ${String(line.from)}`;
      out.push(`${lead}${String(line.number)} ${line.sign} ${texts[line.formula] ?? ""}${from}`);
    });
    const lead = depth > 0 ? `${pad}  ` : "";
    if (node.kids.length > 0) for (const k of node.kids) write(k, depth + 1, true, branch);
    else if (node.closed) {
      const [a, b] = node.closed;
      out.push(a === b ? `${lead}× ${String(a)}` : `${lead}× ${String(a)}, ${String(b)}`);
    } else if (finished(form, hand, branch)) out.push(`${lead}open`);
  };
  write(hand.root, 0, true, []);
  return out.join("\n");
}
