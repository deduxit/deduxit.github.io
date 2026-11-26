// deduxit © Fabian Lukas Grubmüller 2026
// Licensed under the EUPL

/**
 * The island's own view state, beside the proofs' (state.tsx): what is
 * selected, which popover, panel or page is open, the view shown and the views
 * added, a notice, More's row, the hint ladder, the live region's message and
 * the tour's stop.
 */

import { createSignal, For, Show } from "solid-js";
import { createStore, produce } from "solid-js/store";
import type { Hint } from "../lib/deduxit";
import type { Kripke } from "../lib/kripke";
import type { Root, Signature, Structure } from "../lib/structure";
import type { Logic } from "../lib/suites";
import type { Said } from "../lib/words";
import type { Candidate, Premises } from "./state";

/** A formula of a goal, by its position. */
export interface Spot {
  readonly goal: number;
  readonly position: number;
}

/**
 * A split being chosen: the rule asked for, the formulas sent to the first premise, and the
 * premises' own formulas, read off a trial (null until it answers).
 */
export interface Split extends Spot {
  readonly rule: string;
  readonly left: readonly number[];
  readonly own: Premises["own"] | null;
}

/**
 * A cut being made at a goal: the goal's positions going to the premise proving the cut formula,
 * and the premises' own formulas once the formula typed reads (null before).
 */
export interface Cutting {
  readonly goal: number;
  readonly left: readonly number[];
  readonly own: Premises["own"] | null;
}

/** The hint on one goal: the search's answer, which points at the next press from where the visitor is. */
export interface Ladder {
  /** The proof and the goal's path it is for, joined. */
  readonly key: string;
  readonly hint: Hint | null;
}

/** The search the panel under Close all runs: on one goal or on every open goal, with its budget. */
export interface SearchFor {
  readonly goal: number | "all";
  readonly budget: number;
}

/**
 * Which panel, page, list or dialog is open: a panel beside the tools (Steps, the search's
 * settings, Export, Import, a course pack's sheets), the list of views to add, the Settings page,
 * the list of keys, About.
 */
export type Menu =
  | "export"
  | "import"
  | "settings"
  | "keys"
  | "steps"
  | "search"
  | "views"
  | "about"
  | null;

/** A negative translation, each a view of its own. */
export type Negative = "glivenko" | "kuroda" | "godel-gentzen" | "kolmogorov";

/**
 * A view of a sequent the stage shows, each a cell in the rail: a proof and its net; the graph of
 * the views; what decides the sequent (truth table, tableau, resolution, a model of one's own, a
 * countermodel); what is read off it (normal form, interpolant); its translations (the four
 * negative ones, and the embedding into linear logic); and what is made from a finished proof
 * (its cuts eliminated, its λ-term).
 */
export type View =
  | "tree"
  | "net"
  | "graph"
  | "table"
  | "tableau"
  | "resolution"
  | "normal"
  | "interpolant"
  | "model"
  | "countermodel"
  | Negative
  | "embedding"
  | "elim"
  | "term";

/**
 * A view added to a proof by "+ view", with what it was made from: the sequent as text for a view
 * of the sequent, the session's key for a view of the proof. It is out of date once that changed.
 */
export interface Added {
  readonly view: View;
  /** What it was made from, compared with what the proof holds now. */
  readonly source: string;
  /** The sequent it was made from, as text and as deduxit's JSON. */
  readonly sequent: { readonly text: string; readonly form: unknown } | null;
  /** Whether it has steps of its own, which bringing it up to date would lose. */
  readonly steps?: boolean;
}

/**
 * The countermodel view `⊭` of a proof: a finite structure of a first-order sequent, changed
 * press by press with its own undo and redo, or the Kripke model deduxit found for a
 * propositional or modal one, changed in the model editor.
 */
export type Counter =
  | {
      readonly kind: "structure";
      /** The proof whose view it is. */
      readonly proof: string;
      /**
       * The sequent as text, which deduxit checks the structure against: a goal's formulas as
       * deduxit writes them, or the sequent as typed. Not its JSON, whose arena holds the
       * proof's eigenvariables once a ∀R or ∃L step was taken, which no sequent may hold.
       */
      readonly sequent: string;
      /** The proof's sequent when the view was opened: typed anew, it drops the view. */
      readonly root?: Root;
      readonly logic: Logic;
      readonly signature: Signature;
      /** Whether deduxit found it; else it is the visitor's own, from one element. */
      readonly found: boolean;
      readonly now: Structure;
      readonly past: readonly Structure[];
      readonly future: readonly Structure[];
    }
  | {
      readonly kind: "kripke";
      readonly proof: string;
      readonly seed: ModelSeed;
      readonly root?: Root;
    }
  | { readonly kind: "modal"; readonly proof: string };

/** A line above the bottom box saying what was done, with an action that takes it back. */
export interface Notice {
  readonly text: string;
  readonly undo?: { readonly label: string; readonly run: () => void };
}

/** What the stage's model view starts from: a model, its sequent (text or JSON) and its logic. */
export interface ModelSeed {
  readonly model: Kripke;
  readonly sequent: string;
  readonly logic: Logic;
  /** Whether the model is a countermodel deduxit found, to change; else one of the visitor's own. */
  readonly found: boolean;
}

/** Creates the view state. */
export function createUi() {
  const [ui, setUi] = createStore<{
    selected: Spot | null;
    offered: Candidate[] | null;
    split: Split | null;
    cutting: Cutting | null;
    /** The goal whose menu is open at its `⊢`. */
    goalMenu: number | null;
    /** The search the search's settings run, once a goal's or a note's caret set it; else Close all's. */
    searchFor: SearchFor | null;
    /** The witness chooser open at a formula, for ∃R or ∀L: a term typed, or the witness left open. */
    witnessing: { goal: number; position: number; rule: string } | null;
    menu: Menu;
    /**
     * The stage's view of the active proof: its derivation, its net, or a view added to it
     * (`added`); a model of one's own starts from `modelSeed`.
     */
    tab: View;
    /** The views a visitor added to each proof by "+ view", by the proof's id, beside its proof and net. */
    added: Readonly<Record<string, readonly Added[]>>;
    /** How a view works where it has a toggle of its own (a tableau by search or by hand), by proof and view. */
    ways: Readonly<Record<string, string>>;
    /** The step a stepped view shows (a normal form's), by proof and view; absent for its last. */
    stepAt: Readonly<Record<string, number>>;
    /** What was just done, said above the bottom box until the next action. */
    notice: Notice | null;
    /** In a compact window, whether the tools' second row (More) is open. */
    more: boolean;
    /** Whether the open course pack's page is shown, its problems listed, in the stage's place. */
    packPage: boolean;
    /** The model the model view starts from, the sequent it is checked against, and the logic. */
    modelSeed: ModelSeed | null;
    /** The countermodel view `⊭` of each proof that has one open, by the proof's id. */
    counters: Readonly<Record<string, Counter>>;
    ladder: Ladder | null;
    live: string;
    /** The tour's stop shown (from 0), or null when no tour runs. */
    tour: number | null;
  }>({
    selected: null,
    offered: null,
    split: null,
    cutting: null,
    goalMenu: null,
    searchFor: null,
    witnessing: null,
    menu: null,
    tab: "tree",
    added: {},
    ways: {},
    stepAt: {},
    notice: null,
    more: false,
    packPage: false,
    modelSeed: null,
    counters: {},
    ladder: null,
    live: "",
    tour: null,
  });
  /** Bumped when the drawing must be laid out again (a new drawing, a resize). */
  const [drawn, setDrawn] = createSignal(0);
  return { ui, setUi, drawn, setDrawn };
}

/** The view state's type. */
export type Ui = ReturnType<typeof createUi>;

/** The key of a proof's view in `ways` and `stepAt`. */
export const viewKey = (proof: string, view: View) => `${proof}:${view}`;

/** The way a proof's view works, where it has a toggle: its first way until one is chosen. */
export function wayOf<T extends string>(ui: Ui, proof: string, view: View, first: T): T {
  return (ui.ui.ways[viewKey(proof, view)] as T | undefined) ?? first;
}

/** The countermodel view of a proof, if one is open. */
export const counterOf = (ui: Ui, proof: string | undefined): Counter | null =>
  proof ? (ui.ui.counters[proof] ?? null) : null;

/** Sets or takes away the countermodel view of a proof. */
export function setCounter(ui: Ui, proof: string, counter: Counter | null) {
  // A store merges an object set into it: a key is taken away in place.
  ui.setUi(
    "counters",
    produce((all: Record<string, Counter>) => {
      if (counter) all[proof] = counter;
      else delete all[proof];
    }),
  );
}

/** The hint ladder's key for a proof's goal: the proof and the goal's path. */
export function ladderKey(proof: string, path: readonly number[]): string {
  return `${proof}:${path.join(".")}`;
}

/** A token of tokens.css as a number: a length in pixels (a rem at the root's size), a duration in milliseconds. */
export function token(name: string): number {
  const root = getComputedStyle(document.documentElement);
  const value = root.getPropertyValue(name).trim();
  const number = Number.parseFloat(value) || 0;
  return value.endsWith("rem") ? number * (Number.parseFloat(root.fontSize) || 16) : number;
}

/** The compact window class, under 600 pixels wide, where tokens.css makes every target 44 pixels: as app.css's media queries. */
const COMPACT = "(width < 600px)";

/** Whether the window is compact, as a signal. */
export const compact = (() => {
  const query = typeof window === "undefined" ? null : window.matchMedia(COMPACT);
  const [matches, setMatches] = createSignal(query?.matches ?? false);
  query?.addEventListener("change", (event) => setMatches(event.matches));
  return matches;
})();

/** Written text whose formulas stand between backticks, the formulas set in the math font. */
export function Words(props: { text: string }) {
  return (
    <For each={props.text.split("`")}>
      {(part, i) => (i() % 2 === 1 ? <span class="m">{part}</span> : part)}
    </For>
  );
}

/**
 * A reason's sentence, shown under its keyword: in view for every reader, a touch included,
 * since a tip follows no touch. A long reason's rest stays behind "more".
 */
export function Why(props: { said: Said; class?: string }) {
  // The rest shown, by its text: another reason in the same place starts closed.
  const [shown, setShown] = createSignal<string | null>(null);
  const open = () => props.said.more !== undefined && shown() === props.said.more;
  // Each branch is one element: a fragment toggled inside another lost its nodes.
  return (
    <p class={props.class ? `said-why ${props.class}` : "said-why"}>
      {props.said.sentence}
      <Show when={open()}>
        <span class="rest">{props.said.more}</span>
      </Show>
      <Show when={props.said.more !== undefined}>
        <button
          type="button"
          class="linkish more"
          aria-expanded={open()}
          onClick={() => setShown(open() ? null : (props.said.more ?? null))}
        >
          {open() ? "less" : "more"}
        </button>
      </Show>
    </p>
  );
}
