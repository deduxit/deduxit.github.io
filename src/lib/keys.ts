// deduxit © Fabian Lukas Grubmüller 2026
// Licensed under the EUPL

/**
 * The page's keys: every action has one and nothing needs one. A single key acts only outside a
 * text field, never with Ctrl, Alt, Meta or AltGr held nor while a character is composed, and only
 * while the visitor's "Single keys" switch is on (WCAG 2.2, 2.1.4: speech input types letters). A
 * letter is read by the character it types (`KeyboardEvent.key`), so it is the same key on every
 * layout.
 */

/** What a key does. */
export type KeyAction =
  | "undo"
  | "redo"
  | "steps"
  | "hint"
  | "close"
  | "closeAll"
  | "export"
  | "import"
  | "nextGoal"
  | "previousGoal"
  | "nextSequent"
  | "previousSequent"
  | "closeSequent"
  | "nextView"
  | "previousView"
  | "graph"
  | "addView"
  | "newTab"
  | "box"
  | "zoomIn"
  | "zoomOut"
  | "zoomReset"
  | "fit"
  | "settings"
  | "keys";

/** A row of the keys' list: what it does in words, its key as shown, and the other keys that do it. */
export interface KeyRow {
  readonly what: string;
  readonly key: string;
  readonly also?: string;
}

/** The list of keys, as the Keys dialog and the Settings page show it. */
export const KEY_ROWS: readonly KeyRow[] = [
  { what: "Move between formulas and controls", key: "Tab, Shift+Tab" },
  { what: "Open a formula's rules; apply", key: "Enter", also: "Space" },
  { what: "Pick a rule in the open popover", key: "1 to 9", also: "The arrow keys and Enter" },
  { what: "Close a popover, a panel, a list", key: "Esc" },
  { what: "Next, previous open goal", key: "J, K", also: "], [" },
  { what: "Undo, redo", key: "Ctrl+Z, Ctrl+Shift+Z", also: "U, Shift+U; Ctrl+Y" },
  { what: "Steps", key: "S" },
  { what: "Hint", key: "H" },
  { what: "Close this goal by the search; every goal", key: "C; Shift+C" },
  { what: "Export; Import", key: "E; I" },
  { what: "Next, previous sequent", key: "T, Shift+T", also: "Left and Right in the top row" },
  { what: "Close this sequent", key: "W" },
  { what: "Next, previous view", key: "V, Shift+V", also: "Up and Down in the rail" },
  { what: "The graph of views", key: "G" },
  { what: "Add a view", key: "A" },
  { what: "New tab view", key: "N" },
  { what: "Put the cursor in the bottom box", key: "/" },
  { what: "Zoom in, out; 100 %; fit", key: "+ or =, -; 0; F" },
  { what: "Settings", key: "," },
  { what: "The list of keys", key: "?", also: "Ctrl+/" },
];

/** Each action's key in `aria-keyshortcuts`' syntax, for the control that does it. */
export const SHORTCUTS: Readonly<Partial<Record<KeyAction, string>>> = {
  undo: "Control+Z U",
  redo: "Control+Shift+Z Shift+U",
  steps: "S",
  hint: "H",
  close: "C",
  closeAll: "Shift+C",
  export: "E",
  import: "I",
  nextSequent: "T",
  previousSequent: "Shift+T",
  closeSequent: "W",
  nextView: "V",
  previousView: "Shift+V",
  graph: "G",
  addView: "A",
  newTab: "N",
  zoomIn: "+",
  zoomOut: "-",
  zoomReset: "0",
  fit: "F",
  settings: ",",
  keys: "?",
};

/** Each action's key as a tool's hover shows it. */
export const KEY_NAMES: Readonly<Partial<Record<KeyAction, string>>> = {
  undo: "Ctrl+Z",
  redo: "Ctrl+Shift+Z",
  steps: "S",
  hint: "H",
  close: "C",
  closeAll: "Shift+C",
  export: "E",
  import: "I",
  closeSequent: "W",
  graph: "G",
  addView: "A",
  newTab: "N",
  zoomIn: "+",
  zoomOut: "-",
  fit: "F",
  settings: ",",
  keys: "?",
};

/** The single keys, by the character they type. */
const SINGLE: Readonly<Record<string, KeyAction>> = {
  u: "undo",
  U: "redo",
  s: "steps",
  h: "hint",
  c: "close",
  C: "closeAll",
  e: "export",
  i: "import",
  j: "nextGoal",
  "]": "nextGoal",
  k: "previousGoal",
  "[": "previousGoal",
  t: "nextSequent",
  T: "previousSequent",
  w: "closeSequent",
  v: "nextView",
  V: "previousView",
  g: "graph",
  a: "addView",
  n: "newTab",
  "/": "box",
  "+": "zoomIn",
  "=": "zoomIn",
  "-": "zoomOut",
  "0": "zoomReset",
  f: "fit",
  F: "fit",
  ",": "settings",
  "?": "keys",
};

/** What a key event asks for, as the page reads it; null for a key the page leaves alone. */
export function keyAction(
  event: Pick<
    KeyboardEvent,
    "key" | "ctrlKey" | "metaKey" | "altKey" | "shiftKey" | "isComposing"
  > & { getModifierState?: (key: string) => boolean },
  where: { inField: boolean; singleKeys: boolean },
): KeyAction | null {
  // In a field every key is the field's, Ctrl+Z its own undo among them.
  if (event.isComposing || where.inField) return null;
  const command = event.ctrlKey || event.metaKey;
  // Windows reports AltGr as Ctrl and Alt together, and a layout types brackets with it: a key
  // with Alt is never the page's.
  if (event.altKey || event.getModifierState?.("AltGraph")) return null;
  if (command) {
    const key = event.key.toLowerCase();
    if (key === "z") return event.shiftKey ? "redo" : "undo";
    if (key === "y") return "redo";
    if (key === "/") return "keys";
    return null;
  }
  if (!where.singleKeys) return null;
  return SINGLE[event.key] ?? null;
}
