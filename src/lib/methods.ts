// deduxit © Fabian Lukas Grubmüller 2026
// Licensed under the EUPL

/**
 * The truth table and the tableau of a classical sequent, as deduxit's `ordinary_table` and
 * `ordinary_tableau` answer them (an ordinary outcome of wire level 14, its `search` the table
 * or the tableau), and what the stage's two views show of them: the columns and rows of the
 * table, the numbered lines of the tableau, and how each of its branches ends, in words.
 */

import { formulaTexts, type OrdinaryOutcome, type SequentForm } from "./ordinary";

/** A truth table as deduxit writes it: a row per assignment, a `T` or `F` per formula. */
export interface TableForm {
  readonly sequent: SequentForm;
  /** The rows, from every atom true to every atom false, each a letter per formula. */
  readonly rows: readonly string[];
  /** The rows that falsify the sequent, from 0. */
  readonly falsifying: readonly number[];
}

/** How a branch of a tableau ends, as deduxit writes it. */
export type TableauEnd =
  | { readonly kind: "closed"; readonly true_line: number; readonly false_line: number }
  | { readonly kind: "falsity" | "truth"; readonly line: number }
  | { readonly kind: "open" | "unexpanded" };

/** A node of a tableau as deduxit writes it: its lines, and its children or its end. */
export interface TableauNodeForm {
  readonly lines: readonly (readonly ["T" | "F", number])[];
  readonly expands?: readonly [number, string];
  readonly children?: readonly number[];
  readonly end?: TableauEnd;
}

/** A tableau as deduxit writes it: its sequent and its nodes, each before its children. */
export interface TableauForm {
  readonly sequent: SequentForm;
  readonly nodes: readonly TableauNodeForm[];
}

/** The table an outcome of `ordinary_table` holds. */
export const tableOf = (outcome: OrdinaryOutcome | undefined): TableForm | undefined =>
  outcome?.search?.method === "table" ? (outcome.search.table as TableForm) : undefined;

/** The tableau an outcome of `ordinary_tableau` holds. */
export const tableauOf = (outcome: OrdinaryOutcome | undefined): TableauForm | undefined =>
  outcome?.search?.method === "tableau" ? (outcome.search.tableau as TableauForm) : undefined;

/** A column of the table: what it heads, and whose values it holds. */
export interface Column {
  /** The atom or formula, in signs. */
  readonly text: string;
  /** Its formula's index in the table's sequent. */
  readonly index: number;
  /** An atom, a formula left of ⊢, or one right of it. */
  readonly side: "atom" | "left" | "right";
}

/** A row of the table: the value under each column, and whether it falsifies the sequent. */
export interface Row {
  readonly values: readonly boolean[];
  readonly falsifies: boolean;
}

/** What the table view shows: the atoms, then the formulas left of ⊢, then those right of it. */
export interface TableModel {
  readonly columns: readonly Column[];
  readonly rows: readonly Row[];
  /** The first row that falsifies the sequent, the countermodel's, or null for a valid one. */
  readonly first: number | null;
}

/** The table view's columns and rows: only the atoms and the sequent's own formulas. */
export function tableModel(table: TableForm): TableModel {
  const texts = formulaTexts(table.sequent);
  const atoms: Column[] = [];
  table.sequent.formulas.forEach((node, index) => {
    if (typeof node === "object" && "V" in node) {
      atoms[node.V as number] = { text: texts[index] ?? "", index, side: "atom" };
    }
  });
  const side = (list: readonly number[], s: "left" | "right"): Column[] =>
    list.map((index) => ({ text: texts[index] ?? "", index, side: s }));
  const columns = [
    ...atoms.filter(Boolean),
    ...side(table.sequent.left, "left"),
    ...side(table.sequent.right, "right"),
  ];
  const falsifying = new Set(table.falsifying);
  const rows = table.rows.map((text, r) => ({
    values: columns.map((c) => text[c.index] === "T"),
    falsifies: falsifying.has(r),
  }));
  return { columns, rows, first: table.falsifying[0] ?? null };
}

/** An assignment in words: `a false, b true`. */
export const assignmentWords = (values: readonly (readonly [string, boolean])[]) =>
  values.map(([atom, value]) => `${atom} ${value ? "true" : "false"}`).join(", ");

/** A row's assignment of the atoms, in words. */
export const rowWords = (model: TableModel, row: number) =>
  assignmentWords(
    model.columns.flatMap((c, k) =>
      c.side === "atom" ? [[c.text, model.rows[row]?.values[k] ?? false] as const] : [],
    ),
  );

/** A line of the tableau as the view writes it. */
export interface Line {
  /** Its number, from 1, as a reader counts. */
  readonly number: number;
  /** Whether the formula is true or false on the branch. */
  readonly sign: "T" | "F";
  readonly text: string;
  /** The rule that made it and the line it expands, from 1; absent for the sequent's own lines. */
  readonly from?: { readonly rule: string; readonly line: number };
}

/** A node of the tableau as the view draws it: its lines, then its branches or how it ends. */
export interface Branch {
  readonly lines: readonly Line[];
  /** The two branches of a split, or the one the expansion goes on to. */
  readonly next: readonly Branch[];
  /** How the branch ends: its sign and its words. */
  readonly end?: { readonly closed: boolean; readonly mark: string; readonly words: string };
}

/**
 * The tableau as nested branches, its lines numbered from 1 in the order deduxit gives them, each
 * branch's end in words: the two lines that clash, or an open branch's assignment (its atoms true
 * on it true, the others false).
 */
export function tableauModel(tableau: TableauForm): Branch {
  const texts = formulaTexts(tableau.sequent);
  const { nodes } = tableau;
  const firsts: number[] = [];
  nodes.reduce((first, node, i) => {
    firsts[i] = first;
    return first + node.lines.length;
  }, 0);
  const lineAt = (n: number): readonly ["T" | "F", number] | undefined => {
    for (let i = nodes.length - 1; i >= 0; i--) {
      const first = firsts[i] ?? 0;
      const node = nodes[i];
      if (node && first <= n && n < first + node.lines.length) return node.lines[n - first];
    }
    return undefined;
  };
  const text = (n: number) => texts[lineAt(n)?.[1] ?? -1] ?? "";
  const atomNames = new Map<number, string>();
  tableau.sequent.formulas.forEach((node, index) => {
    if (typeof node === "object" && "V" in node) atomNames.set(index, texts[index] ?? "");
  });
  const atomsInOrder = tableau.sequent.atoms;
  const parentOf = new Map<number, number>();
  nodes.forEach((node, i) => {
    for (const c of node.children ?? []) parentOf.set(c, i);
  });
  const build = (index: number): Branch => {
    const node = nodes[index] as TableauNodeForm;
    const parent = parentOf.get(index);
    const from = parent === undefined ? undefined : nodes[parent]?.expands;
    const lines = node.lines.map(([sign, formula], k) => ({
      number: (firsts[index] ?? 0) + k + 1,
      sign,
      text: texts[formula] ?? "",
      ...(from ? { from: { rule: from[1], line: from[0] + 1 } } : {}),
    }));
    return {
      lines,
      next: (node.children ?? []).map(build),
      ...(node.end ? { end: ending(index, node.end) } : {}),
    };
  };
  const ending = (index: number, end: TableauEnd): NonNullable<Branch["end"]> => {
    switch (end.kind) {
      case "closed":
        return {
          closed: true,
          mark: `× ${end.true_line + 1}, ${end.false_line + 1}`,
          words: `closed: ${text(end.true_line)} is true at line ${end.true_line + 1} and false at line ${end.false_line + 1}`,
        };
      case "falsity":
        return {
          closed: true,
          mark: `× ${end.line + 1}`,
          words: `closed: ⊥ is true at line ${end.line + 1}`,
        };
      case "truth":
        return {
          closed: true,
          mark: `× ${end.line + 1}`,
          words: `closed: ⊤ is false at line ${end.line + 1}`,
        };
      case "open": {
        // The atoms true on the branch, from the root down to this node.
        const truths = new Set<string>();
        for (let at: number | undefined = index; at !== undefined; at = parentOf.get(at)) {
          for (const [sign, formula] of nodes[at]?.lines ?? []) {
            const atom = atomNames.get(formula);
            if (sign === "T" && atom !== undefined) truths.add(atom);
          }
        }
        const words = assignmentWords(atomsInOrder.map((a) => [a, truths.has(a)] as const));
        return { closed: false, mark: "open", words: `open: ${words}` };
      }
      case "unexpanded":
        return { closed: false, mark: "open", words: "not expanded" };
    }
  };
  return build(0);
}

/** Whether every branch of a tableau closes. */
export const closes = (branch: Branch): boolean =>
  branch.next.length > 0 ? branch.next.every(closes) : (branch.end?.closed ?? false);

/** The first open branch's end in words, for the verdict's sentence. */
export const firstOpen = (branch: Branch): string | undefined => {
  if (branch.next.length === 0) return branch.end?.closed === false ? branch.end.words : undefined;
  for (const next of branch.next) {
    const found = firstOpen(next);
    if (found) return found;
  }
  return undefined;
};
