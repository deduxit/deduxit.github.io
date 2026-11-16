// deduxit © Fabian Lukas Grubmüller 2026
// Licensed under the EUPL

/**
 * The workspace of linked tabs, as the page reads it: deduxit's
 * `workspace_view` answer, the rows the panel lists, the line above each row
 * and the actions the page sends to `workspace_edit`. Plain data and
 * words, no Solid: the island's `workspace.tsx` holds the state.
 *
 * A linked tab is a proof node of the workspace (`ordinary.start`, class
 * `work`), or for a modal tab its decision (`modal.decide`): a modal tab holds
 * no steps, only the outcome. Its sequent is the node above it: a given
 * sequent for a tab the visitor typed, or a translation of one for a tab made
 * from it.
 */

/** A node's state as the bindings write it. */
export interface NodeState {
  readonly state: "given" | "current" | "not_run" | "out_of_date" | "other";
  /** Why it is out of date: an input changed, its recipe changed, another build made it, or an input waits. */
  readonly cause?: "input" | "recipe" | "version" | "waits" | "other";
  /** The node the cause names. */
  readonly node?: number | null;
}

/** The check of what an operation promised. */
export interface Check {
  readonly promise: string;
  readonly status: "held" | "failed" | "open" | "recorded" | "outside" | "none";
  readonly parts: readonly {
    readonly name: string;
    readonly status: string;
    readonly verdict?: string;
  }[];
}

/** A node as `workspace_view` answers it. */
export interface WorkspaceNode {
  readonly node: number;
  readonly kind: string;
  readonly value: unknown;
  readonly summary: string | null;
  readonly operation: string | null;
  readonly label: string | null;
  readonly cost: "instant" | "search" | "other" | null;
  readonly class: "derived" | "work" | "copy" | "other" | null;
  readonly from: readonly number[];
  readonly parameters: { readonly [key: string]: unknown } | null;
  readonly state: NodeState;
  readonly end: {
    readonly end: string;
    readonly reason?: string;
    readonly setting?: string;
  } | null;
  readonly check: Check | null;
  readonly column: number | null;
}

/** What `workspace_view` answers. */
export interface WorkspaceView {
  readonly nodes: readonly WorkspaceNode[];
  /** The name of the action undo takes back, or null. */
  readonly undo: string | null;
  /** The name of the action redo brings back, or null. */
  readonly redo: string | null;
}

/** The line above a row: how the tab was made from another. */
export interface Line {
  /** `made` by an operation, or a `copy` of another tab's proof. */
  readonly kind: "made" | "copy";
  /** The words at the line's end: the operation's name. */
  readonly label: string;
  /** The row it was made from, where that tab is open. */
  readonly from: number | null;
  /** The sequent it was made from, as deduxit writes it. */
  readonly fromSequent: string | null;
  /** The node whose check the line carries, and that check. */
  readonly checked: { readonly node: number; readonly check: Check | null } | null;
}

/** A row of the panel: a linked tab. */
export interface Row {
  readonly node: number;
  readonly tab: string;
  readonly line: Line | null;
  /** `current`, or `out_of_date` while the sequent above it changed. */
  readonly state: "current" | "out_of_date";
  /** The sequent it is made of now, as deduxit writes it; the tab shows the one its proof is of. */
  readonly now: string;
  /** Indent: how many rows it was made from, at most three. */
  readonly depth: number;
}

/** The names of the translations, as the line says them. */
const TRANSLATIONS: { readonly [key: string]: string } = {
  glivenko: "Glivenko's translation",
  kolmogorov: "Kolmogorov's translation",
  kuroda: "Kuroda's translation",
  "godel-gentzen": "Gödel and Gentzen's translation",
};

/** Whether a node is a tab's: a proof (class `work`), or a modal tab's decision. */
export const isTabNode = (node: WorkspaceNode): boolean =>
  node.class === "work" || node.operation === "modal.decide";

/** The words at a made line's end, for the node that made the sequent. */
export function labelOf(node: WorkspaceNode): string {
  if (node.operation === "ordinary.translate") {
    const translation = node.parameters?.["translation"];
    return (
      (typeof translation === "string" && TRANSLATIONS[translation]) || "A negative translation"
    );
  }
  return node.label ?? node.operation ?? "Made";
}

/** The sequent a node's value holds as deduxit writes it, or its summary. */
const sequentOf = (node: WorkspaceNode | undefined): string => node?.summary ?? "";

/**
 * The rows of the panel: each tab's proof node, in the order the nodes were made, with the line
 * above it (what its sequent was made from) and whether it is out of date.
 */
export function rowsOf(view: WorkspaceView, tabs: { readonly [tab: string]: number }): Row[] {
  const byNode = new Map(view.nodes.map((n) => [n.node, n]));
  const tabOf = new Map(Object.entries(tabs).map(([tab, node]) => [node, tab]));
  const rows: Row[] = [];
  // The first row made on each given sequent: the tab the visitor typed it in.
  const owner = new Map<number, number>();
  const depths = new Map<number, number>();
  for (const node of view.nodes) {
    const tab = tabOf.get(node.node);
    if (!isTabNode(node) || tab === undefined) continue;
    const input = byNode.get(node.from[0] ?? -1);
    // The chain of made sequents up to the given one.
    const made: WorkspaceNode[] = [];
    let at = input;
    while (at && at.class === "derived") {
      made.push(at);
      at = byNode.get(at.from[0] ?? -1);
    }
    const given = at;
    let line: Line | null = null;
    if (made.length > 0) {
      const first = made[made.length - 1] as WorkspaceNode;
      const source = given ? owner.get(given.node) : undefined;
      line = {
        kind: "made",
        label: made.map(labelOf).reverse().join(", then "),
        from: source ?? null,
        fromSequent: given ? sequentOf(given) : null,
        checked: { node: first.node, check: first.check },
      };
    } else if (given) {
      const source = owner.get(given.node);
      if (source === undefined) owner.set(given.node, node.node);
      else
        line = {
          kind: "copy",
          label: "Copy",
          from: source,
          fromSequent: sequentOf(given),
          checked: null,
        };
    }
    const stale = node.state.state === "out_of_date";
    const depth = line?.from != null ? Math.min(3, (depths.get(line.from) ?? 0) + 1) : 0;
    depths.set(node.node, depth);
    rows.push({
      node: node.node,
      tab,
      line,
      state: stale ? "out_of_date" : "current",
      now: sequentOf(input),
      depth,
    });
  }
  return rows;
}

/** What the line says of its check: a shape, a sentence and the one action it offers. */
export interface CheckWords {
  readonly shape: "held" | "none-yet" | "open" | "failed" | "none";
  readonly sentence: string;
  readonly action: "check" | null;
}

/** The words of a line's check (section 13.3 of the design). */
export function checkWords(check: Check | null): CheckWords {
  switch (check?.status) {
    case "held":
      return { shape: "held", sentence: "Both valid, so the verdicts agree.", action: null };
    case "recorded":
      return { shape: "none-yet", sentence: "Checked where the link was made.", action: "check" };
    case "open":
      return {
        shape: "open",
        sentence: "Not decided: the budget ran out before both sequents were decided.",
        action: "check",
      };
    case "failed":
      return {
        shape: "failed",
        sentence:
          "Check failed: the sequent and its translation have different verdicts. This is a fault in deduxit.",
        action: null,
      };
    case "none":
    case "outside":
      return { shape: "none", sentence: "Keeps the verdict.", action: null };
    default:
      return { shape: "none-yet", sentence: "Not checked yet.", action: "check" };
  }
}

/** A node an edit names: a node of the workspace, or the one an earlier edit of the action made. */
export type Named = number | { readonly made: number };

/** One edit of an action, as `workspace_edit` reads it. */
export type Edit =
  | { readonly add: { readonly kind: string; readonly value: string } }
  | { readonly set: { readonly node: Named; readonly value: string } }
  | {
      readonly connect: {
        readonly operation: string;
        readonly from: readonly Named[];
        readonly parameters?: { readonly [key: string]: unknown };
      };
    }
  | { readonly restart: { readonly node: Named } }
  | { readonly work: { readonly node: Named; readonly session: string } }
  | { readonly detach: { readonly node: Named } }
  | { readonly remove: { readonly node: Named } };

/** An action: its name, which the panel's Undo and Redo say, and its edits. */
export interface Action {
  readonly name: string;
  readonly edits: readonly Edit[];
}

/**
 * The edits that put a tab's proof into the workspace, where it is not there yet: its sequent as
 * a given value, and its proof as a node on it holding the tab's session. Returns the edits and
 * how a later edit names the sequent's and the proof's nodes.
 */
export function joined(
  statement: string,
  session: string,
  at: number,
): { edits: Edit[]; sequent: Named; proof: Named } {
  return {
    edits: [
      { add: { kind: "ordinary.sequent", value: statement } },
      { connect: { operation: "ordinary.start", from: [{ made: at }] } },
      { work: { node: { made: at + 1 }, session } },
    ],
    sequent: { made: at },
    proof: { made: at + 1 },
  };
}

/**
 * The edits that put a modal tab into the workspace: its statement as a given value, and its
 * decision on it, which the page runs at once. Returns the edits and how a later edit names the
 * statement's and the decision's nodes.
 */
export function joinedModal(
  statement: string,
  at: number,
): { edits: Edit[]; sequent: Named; proof: Named } {
  return {
    edits: [
      { add: { kind: "modal.sequent", value: statement } },
      { connect: { operation: "modal.decide", from: [{ made: at }] } },
    ],
    sequent: { made: at },
    proof: { made: at + 1 },
  };
}

/** The node a joined tab's sequent is: the given node its proof is made on. */
export function sequentNode(view: WorkspaceView, proof: number): number | null {
  const node = view.nodes.find((n) => n.node === proof);
  const input = node?.from[0];
  return input === undefined ? null : input;
}

/** How many linked tabs are out of date, for the Workspace button's name and the status line. */
export function outOfDate(rows: readonly Row[]): number {
  return rows.filter((r) => r.state === "out_of_date").length;
}

/** The Workspace button's accessible name, which says the state. */
export function buttonName(rows: readonly Row[]): string {
  const stale = outOfDate(rows);
  const tabs = `${rows.length} linked ${rows.length === 1 ? "tab" : "tabs"}`;
  return stale > 0 ? `Workspace, ${tabs}, ${stale} out of date` : `Workspace, ${tabs}`;
}

/** What the status line says after a change that put rows out of date. */
export function changeWords(stale: number, undo: string | null): string {
  const tabs = `${stale} linked ${stale === 1 ? "tab is" : "tabs are"} out of date.`;
  return undo ? `${tabs} Workspace has Undo ${undo}.` : tabs;
}
