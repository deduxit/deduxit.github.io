// deduxit © Fabian Lukas Grubmüller 2026
// Licensed under the EUPL

/**
 * The frame around the stage, the same on every view: the top row (the word mark, a chip per open
 * sequent, "+", the guide's switch, light or dark, Settings), the rail of the chosen sequent's
 * views with "+ view", the tools at the stage's top right, the toggles' place at its top left, the
 * bottom box with the notes above it, and the new tab view in the stage's place for a sequent not
 * yet entered. In a compact window the rail is a row under the top row and the tools a bar along
 * the bottom (app.css).
 */

import { For, type JSX, onCleanup, onMount, Show } from "solid-js";
import type { Sample } from "../lib/content";
import { KEY_NAMES, type KeyAction, SHORTCUTS } from "../lib/keys";
import { lambdaState, prettyLambda } from "../lib/lambda";
import { prettyModal } from "../lib/modal";
import { isOrdinary, prettyOrdinary, sequentText } from "../lib/ordinary";
import {
  type Calculus,
  intuitionistic,
  isNatural,
  lambda,
  linear,
  markOf,
  modal,
  ordinary,
  sameCalculus,
} from "../lib/suites";
import { effective, THEME_KEY, type Theme, toggled } from "../lib/theme";
import { displayed, pretty } from "../lib/words";
import { ONE_WORLD } from "../lib/kripke";
import square from "../logo/square-light.svg?raw";
import wordmark from "../logo/wordmark-band.svg?raw";
import type { Proof, Prover } from "./state";
import { Sign } from "./Signs";
import { redoStructure, undoStructure } from "./Structure";
import { Toggles } from "./Toggles";
import { useWorkspace } from "./Workspace";
import { PackChip, usePacks } from "./Packs";
import { stepCounts, stepShown, stepTo } from "./Clausal";
import { pressesOf, undoPress } from "./HandTableau";
import { elimOn, elimSettings } from "./Stage";
import {
  addEntry,
  addedOf,
  addView,
  entries,
  GROUPS,
  staleOf,
  termShown,
  updateView,
  VIEWS,
} from "./Views";
import { compact, counterOf, type Ui, type View, viewKey, wayOf, Why } from "./ui";

const storage = () => {
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
};

/** Sets the visitor's choice of scheme on the page and in the browser, every colour fading to it. */
export function applyTheme(theme: Theme) {
  const set = () => {
    if (theme === "system") delete document.documentElement.dataset["theme"];
    else document.documentElement.dataset["theme"] = theme;
  };
  const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!still && typeof document.startViewTransition === "function")
    document.startViewTransition(set);
  else set();
  try {
    if (theme === "system") storage()?.removeItem(THEME_KEY);
    else storage()?.setItem(THEME_KEY, theme);
  } catch {
    // The choice holds for this visit alone.
  }
}

/** Whether the page shows the dark scheme, as the visitor chose it or the system has it. */
export const darkShown = (theme: Theme) =>
  effective(theme, window.matchMedia("(prefers-color-scheme: dark)").matches) === "dark";

/** A proof's state: proved, refuted, unknown, open, or not started. */
export function tone(proof: Proof): "ok" | "bad" | "warn" | "open" | "none" {
  if (proof.lambda) return lambdaState(proof.lambda).tone;
  if (proof.modal) {
    const verdict = proof.modal.outcome?.verdict;
    return verdict === "valid" ? "ok" : verdict === "not_valid" ? "bad" : verdict ? "warn" : "none";
  }
  if (!proof.view) return "none";
  if (proof.view.complete) return "ok";
  if (proof.verdict?.tone === "bad") return "bad";
  if (proof.verdict?.tone === "warn") return "warn";
  return "open";
}

/**
 * Whether Export has something of a proof to write: a session (natural deduction's view writes
 * its own), a modal decision, a lambda tab's term or type.
 */
export function exportable(proof: Proof | undefined): boolean {
  return !!(proof?.session || proof?.modal?.outcome || proof?.lambda?.statement);
}

/** Whether a proof has been entered: a session, or a modal sequent or a lambda-term decided. */
export function started(proof: Proof | undefined): boolean {
  if (!proof) return false;
  return !!(
    proof.session ||
    proof.custom?.session ||
    proof.modal?.statement ||
    proof.modal?.outcome ||
    proof.lambda?.statement ||
    proof.lambda?.illTyped
  );
}

/** A proof's sequent as its chip and the bottom box show it, in its suite's signs. */
export const tabText = (proof: Proof): string =>
  proof.calculus.suite === "ordinary"
    ? prettyOrdinary(proof.input)
    : proof.calculus.suite === "modal"
      ? prettyModal(proof.input)
      : proof.calculus.suite === "lambda"
        ? prettyLambda(proof.input)
        : displayed(proof.input);

/** A proof's text as the bottom box writes it once entered: in signs its suite's reader reads back. */
const inSigns = (proof: Proof): string =>
  proof.calculus.suite === "ordinary"
    ? prettyOrdinary(proof.input)
    : proof.calculus.suite === "modal"
      ? prettyModal(proof.input)
      : proof.calculus.suite === "linear"
        ? pretty(proof.input)
        : proof.input;

/** A proof's state in words, for its chip's and its cell's names. */
function stateWords(proof: Proof): string {
  const t = tone(proof);
  if (t === "ok") return "proved";
  if (t === "bad") return "refuted";
  if (t === "warn") return "unknown";
  const open = proof.view?.goals.length ?? 0;
  if (t === "open") return `${open} ${open === 1 ? "goal" : "goals"} open`;
  return "not started";
}

/** The rail's name of a calculus: one to three letters, or a sign. */
export function cellName(c: Calculus): string {
  if (c.suite === "lambda") return "λ";
  return markOf(c).split("+")[0] ?? markOf(c);
}

/** What a calculus is in full, for its cell's hover and name. */
function calculusName(c: Calculus): string {
  if (c.suite === "ordinary")
    return isNatural(c) ? `Natural deduction, ${cellName(c)}` : `Sequent calculus, ${cellName(c)}`;
  if (c.suite === "linear")
    return `${intuitionistic(c) ? "Intuitionistic" : "Classical"} linear logic, ${markOf(c)}`;
  if (c.suite === "modal") return `Modal logic, ${c.system}`;
  if (c.suite === "lambda") return `Lambda-terms, ${markOf(c)}`;
  return markOf(c);
}

/** A view's cell in the rail: whose view it is, its letters or sign, and its name in full. */
export interface Cell {
  readonly proof: string;
  readonly view: View;
  readonly short: string;
  readonly name: string;
  /** Letters under the sign, in the interface's font (a translation's author: Gl). */
  readonly sub?: string;
  /** A sign above the name (⧉ for a copy). */
  readonly sign?: string;
  /** Whether its short name is a sign of the math font. */
  readonly math?: boolean;
  /** Joined by a short line to the cell above it, which it was made from. */
  readonly tied?: boolean;
  /** Made from a source that has changed since. */
  readonly stale?: boolean;
  /** The cell it was made from, as `proof:view`, or null for one made from the sequent. */
  readonly from?: string | null;
}

/** Whether a proof's net can be drawn: its proof finished and a net. */
export const netReady = (proof: Proof | undefined) => {
  const v = proof?.view;
  return !!v && v.complete && v.net === null;
};

/** Whether a proof's sequent has a truth table and a tableau: a started classical ordinary one. */
export const decidable = (_prover: Prover, proof: Proof | undefined) =>
  !!proof?.session && proof.calculus.suite === "ordinary" && proof.calculus.logic === "classical";

/**
 * The rail's cells of a proof's chip: the graph once there are two views; then each proof of the
 * sequent (the chip's own, a copy, another calculus) with its net once drawn and the views added
 * to it, a view made from the proof joined to it.
 */
export function cellsOf(prover: Prover, ui: Ui, proof: Proof | undefined): readonly Cell[] {
  if (!proof || !started(proof)) return [];
  const chip = prover.chipOf(proof.id);
  const cells: Cell[] = [];
  for (const m of prover.members(chip)) {
    if (!started(m)) continue;
    const tree = `${m.id}:tree`;
    const copy = m.beside?.kind === "copy" ? m.beside : null;
    cells.push({
      proof: m.id,
      view: "tree",
      short: cellName(m.calculus),
      name: `${calculusName(m.calculus)}${copy ? ", a copy" : ""}`,
      ...(copy ? { sign: "⧉", tied: true, from: `${copy.of}:tree` } : { from: null }),
    });
    if (netReady(m))
      cells.push({
        proof: m.id,
        view: "net",
        short: "◇",
        math: true,
        name: "Proof net",
        from: tree,
      });
    const added = [...(ui.ui.added[m.id] ?? [])];
    // A model shown by a button of its own (a countermodel's "Change this model") has its cell.
    if (m.id === proof.id && ui.ui.tab === "model" && !added.some((a) => a.view === "model"))
      added.push({ view: "model", source: "", sequent: null });
    for (const a of added) {
      if (a.view === "tree" || a.view === "net" || a.view === "graph" || a.view === "countermodel")
        continue;
      // The table and the tableau are of a classical sequent alone.
      if ((a.view === "table" || a.view === "tableau") && !decidable(prover, m)) continue;
      const w = VIEWS[a.view];
      const made = w.from === "proof";
      cells.push({
        proof: m.id,
        view: a.view,
        short: w.short,
        // The name holds what the cell shows, for speech input (WCAG 2.5.3).
        name: `${w.name}, ${w.short}${w.sub ? ` ${w.sub}` : ""}`,
        ...(w.sub ? { sub: w.sub } : {}),
        ...(w.math ? { math: true } : {}),
        tied: made,
        stale: staleOf(m, a),
        from: made ? tree : null,
      });
    }
    // The countermodel view: a modal sequent's once it is not valid, another's once opened. A
    // structure the visitor started from one element is a model of their own, M.
    const counter = counterOf(ui, m.id);
    if ((m.calculus.suite === "modal" && m.modal?.outcome?.verdict === "not_valid") || counter)
      cells.push(
        counter?.kind === "structure" && !counter.found
          ? {
              proof: m.id,
              view: "countermodel",
              short: "M",
              name: "A model of your own, M",
              from: null,
            }
          : {
              proof: m.id,
              view: "countermodel",
              short: "⊭",
              math: true,
              name: "Countermodel, ⊭",
              from: tree,
            },
      );
  }
  if (cells.length >= 2)
    cells.unshift({ proof: chip, view: "graph", short: "", name: "How the views hang together" });
  return cells;
}

/** A cell's state in words, for its name: a proof's goals or verdict, a view out of date. */
function cellWords(prover: Prover, cell: Cell): string {
  if (cell.stale) return ", out of date";
  if (cell.view !== "tree") return "";
  const p = prover.store.proofs.find((q) => q.id === cell.proof);
  return p ? `, ${stateWords(p)}` : "";
}

/** Moves the focus among a group's buttons with the arrow keys, the group one stop of Tab (ARIA's roving tabindex). */
function rove(event: KeyboardEvent, vertical: boolean) {
  const keys = vertical ? ["ArrowUp", "ArrowDown"] : ["ArrowLeft", "ArrowRight"];
  const step = event.key === keys[1] ? 1 : event.key === keys[0] ? -1 : 0;
  if (event.key !== "Home" && event.key !== "End" && step === 0) return;
  const group = event.currentTarget as HTMLElement;
  const items = [
    ...group.querySelectorAll<HTMLElement>("[data-rove]:not([disabled]):not([hidden])"),
  ].filter((el) => el.offsetParent !== null);
  if (items.length === 0) return;
  const at = items.indexOf(document.activeElement as HTMLElement);
  const next =
    event.key === "Home"
      ? 0
      : event.key === "End"
        ? items.length - 1
        : (Math.max(at, 0) + step + items.length) % items.length;
  event.preventDefault();
  items[next]?.focus();
  if (group.getAttribute("role") === "tablist") items[next]?.click();
}

/**
 * Keeps one tool of a toolbar the toolbar's stop of Tab: the one that had it, or else the first
 * that can act, as its tools come, go and turn faint.
 */
function oneStop(bar: HTMLElement) {
  const keep = () => {
    const tools = [...bar.querySelectorAll<HTMLButtonElement>("[data-rove]")];
    const open = tools.filter((t) => !t.disabled && t.offsetParent !== null);
    const stop = open.find((t) => t.tabIndex === 0) ?? open[0];
    for (const t of tools) t.tabIndex = t === stop ? 0 : -1;
  };
  keep();
  const watch = new MutationObserver(keep);
  watch.observe(bar, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ["disabled"],
  });
  onCleanup(() => watch.disconnect());
}

/** The top row: the word mark, the open sequents, "+", the guide's switch, light or dark, Settings. */
export function TopRow(props: {
  prover: Prover;
  ui: Ui;
  theme: () => Theme;
  setTheme: (t: Theme) => void;
  newTab: () => void;
  closeChip: (chip: string) => void;
  closePack: () => void;
}) {
  const { ui, setUi } = props.ui;
  const settings = () => props.prover.settings();
  const packs = usePacks();
  return (
    <header class="top-row">
      <a
        class="logo home"
        href="/"
        aria-label="deduxit, a new sequent"
        data-tip="A new sequent"
        onClick={(event) => {
          if (event.ctrlKey || event.metaKey || event.shiftKey || event.button !== 0) return;
          event.preventDefault();
          props.newTab();
        }}
      >
        <span class="mark-word" ref={(el) => (el.innerHTML = wordmark)} />
        <span class="mark-square" ref={(el) => (el.innerHTML = square)} />
      </a>
      <div class="chips-scroll">
        <div
          class="chips"
          role="tablist"
          aria-label="Sequents"
          onKeyDown={(event) => rove(event, false)}
        >
          <Show when={packs}>
            {(p) => (
              <PackChip packs={p()} prover={props.prover} ui={props.ui} close={props.closePack} />
            )}
          </Show>
          <For
            each={props.prover.store.proofs.filter(
              (p) => props.prover.chipOf(p.id) === p.id && !packs?.isProblem(p.id),
            )}
          >
            {(proof) => {
              const mine = () =>
                props.prover.chipOf(props.prover.store.active ?? "") === proof.id && !ui.packPage;
              const chosen = () => mine() && ui.menu !== "settings";
              const text = () => (proof.input ? tabText(proof) : "New sequent");
              return (
                <div class="chip-wrap" role="presentation">
                  <button
                    type="button"
                    role="tab"
                    class="chip"
                    data-rove=""
                    data-proof={proof.id}
                    aria-selected={chosen()}
                    aria-keyshortcuts={chosen() ? "W Delete" : "Delete"}
                    tabindex={mine() ? 0 : -1}
                    aria-label={`${text()}, ${stateWords(proof)}`}
                    data-tip={text()}
                    // Delete on a chip closes it, as in a list of tabs that can be closed (ARIA's
                    // tabs pattern): a key that "Single keys" off leaves on, like the arrows.
                    onKeyDown={(event) => {
                      if (event.key !== "Delete" || event.altKey || event.ctrlKey || event.metaKey)
                        return;
                      event.preventDefault();
                      props.closeChip(proof.id);
                    }}
                    onClick={() => {
                      // A press on the chosen chip switches between its main view and its graph.
                      const main = props.prover.store.active === proof.id && ui.tab === "tree";
                      const graph = ui.tab === "graph";
                      const hasGraph = cellsOf(props.prover, props.ui, proof).some(
                        (c) => c.view === "graph",
                      );
                      props.prover.activate(proof.id);
                      setUi({
                        menu: null,
                        packPage: false,
                        tab: chosen() && main && !graph && hasGraph ? "graph" : "tree",
                      });
                    }}
                  >
                    <span class="chip-text m">{proof.input ? tabText(proof) : "New"}</span>
                    <Show when={tone(proof) === "ok"}>
                      <Sign name="check" class="sign good" />
                    </Show>
                    <Show when={tone(proof) === "bad"}>
                      <Sign name="cross" class="sign bad" />
                    </Show>
                  </button>
                  {/* A pointer's way to close it; the key W does the same for the chip chosen. */}
                  <span
                    class="chip-close"
                    aria-hidden="true"
                    data-tip={`Close ${text()}`}
                    onClick={() => props.closeChip(proof.id)}
                  >
                    <Sign name="shut" />
                  </span>
                </div>
              );
            }}
          </For>
        </div>
        <button
          type="button"
          class="tool new"
          aria-label="New sequent"
          aria-keyshortcuts={SHORTCUTS.newTab}
          data-tip="New sequent"
          data-key={KEY_NAMES.newTab}
          onClick={() => props.newTab()}
        >
          <Sign name="plus" />
        </button>
      </div>
      <button
        type="button"
        class="tool round guide-switch"
        aria-label="Guide"
        aria-pressed={settings().guide}
        data-tip="Guide"
        onClick={() => props.prover.setSettings({ guide: !settings().guide })}
      >
        <Sign name="help" />
      </button>
      <button
        type="button"
        class="tool scheme"
        aria-label={darkShown(props.theme()) ? "Light" : "Dark"}
        data-tip={darkShown(props.theme()) ? "Light" : "Dark"}
        onClick={() => {
          const next = toggled(
            props.theme(),
            window.matchMedia("(prefers-color-scheme: dark)").matches,
          );
          applyTheme(next);
          props.setTheme(next);
        }}
      >
        <Show when={darkShown(props.theme())} fallback={<Sign name="moon" />}>
          <Sign name="sun" />
        </Show>
      </button>
      <button
        type="button"
        class="tool"
        aria-label="Settings"
        aria-pressed={ui.menu === "settings"}
        aria-keyshortcuts={SHORTCUTS.settings}
        data-tip="Settings"
        data-key={KEY_NAMES.settings}
        onClick={() => setUi("menu", ui.menu === "settings" ? null : "settings")}
      >
        <Sign name="settings" />
      </button>
    </header>
  );
}

/** The rail: the chosen sequent's views, one cell each, and "+ view" with its list. */
export function Rail(props: { prover: Prover; ui: Ui }) {
  const { ui, setUi } = props.ui;
  const proof = () => props.prover.current();
  const cells = () => cellsOf(props.prover, props.ui, proof());
  const workspace = useWorkspace();
  const shown = (cell: Cell) =>
    ui.tab === cell.view &&
    ui.menu !== "settings" &&
    (cell.view === "graph" || props.prover.store.active === cell.proof);
  const count = (p: Proof | undefined) => {
    const n = p?.view?.goals.length ?? 0;
    return n > 9 ? "9+" : String(n);
  };
  const proofOf = (cell: Cell) => props.prover.store.proofs.find((q) => q.id === cell.proof);

  return (
    <nav class="rail" aria-label="Views">
      <div
        class="cells"
        role="tablist"
        aria-label="Views of this sequent"
        aria-orientation="vertical"
        onKeyDown={(event) => rove(event, !compact())}
      >
        <For each={cells()}>
          {(cell) => (
            <button
              type="button"
              role="tab"
              class="cell"
              data-rove=""
              data-view={cell.view}
              data-proof={cell.proof}
              data-tied={cell.tied ? "" : undefined}
              data-stale={cell.stale ? "" : undefined}
              data-capsule={
                cell.view === "net" ||
                (cell.view === "tree" && netReady(proofOf(cell)) && !cell.tied)
                  ? ""
                  : undefined
              }
              aria-selected={shown(cell)}
              tabindex={
                shown(cell) || (!cells().some((c) => shown(c)) && cell === cells()[0]) ? 0 : -1
              }
              aria-keyshortcuts={cell.view === "graph" ? "G" : undefined}
              aria-label={`${cell.name}${cellWords(props.prover, cell)}`}
              data-tip={cell.name}
              onClick={() => {
                // A model is the sequent's own: one of another sequent shown before is set aside.
                const p = proofOf(cell);
                const session = p?.session;
                if (
                  cell.view === "model" &&
                  p?.calculus.suite === "ordinary" &&
                  session &&
                  isOrdinary(session) &&
                  ui.modelSeed?.sequent !== sequentText(session)
                )
                  setUi("modelSeed", {
                    model: ONE_WORLD,
                    sequent: sequentText(session),
                    logic: p.calculus.logic,
                    found: false,
                  });
                props.prover.activate(cell.proof);
                setUi({ tab: cell.view, menu: null });
              }}
            >
              <Show when={cell.view === "graph"}>
                <Sign name="graph" />
              </Show>
              <Show when={cell.sign}>
                <span class="cell-sign m" aria-hidden="true">
                  {cell.sign}
                </span>
              </Show>
              <Show when={cell.view !== "graph"}>
                <span
                  class={`cell-name${cell.math ? " m" : ""}`}
                  data-long={cell.short.length > 2 ? "" : undefined}
                  // The count of open goals is drawn by CSS from here: the name says it in words.
                  data-count={
                    cell.view === "tree" && proofOf(cell) && tone(proofOf(cell) as Proof) === "open"
                      ? count(proofOf(cell))
                      : undefined
                  }
                >
                  <span>{cell.short}</span>
                  <Show when={cell.sub}>
                    <span class="cell-sub">{cell.sub}</span>
                  </Show>
                </span>
              </Show>
              <Show when={cell.stale}>
                <span class="count stale-mark" aria-hidden="true">
                  !
                </span>
              </Show>
              <Show
                when={
                  !cell.stale &&
                  cell.view === "tree" &&
                  proofOf(cell) &&
                  tone(proofOf(cell) as Proof) === "bad"
                }
              >
                <Sign name="cross" class="count sign bad" />
              </Show>
            </button>
          )}
        </For>
      </div>
      <button
        type="button"
        class="cell add"
        aria-label="Add a view"
        aria-expanded={ui.menu === "views"}
        aria-keyshortcuts={SHORTCUTS.addView}
        aria-disabled={started(proof()) ? undefined : "true"}
        data-tip={started(proof()) ? "Add a view" : "Enter a sequent first"}
        data-key={KEY_NAMES.addView}
        onClick={() => {
          if (!started(proof())) {
            setUi("notice", { text: "Enter a sequent first: its views are added here." });
            return;
          }
          setUi("menu", ui.menu === "views" ? null : "views");
        }}
      >
        <Sign name="plus" />
      </button>
      <Show when={ui.menu === "views"}>
        <div class="views-list panel menu" role="dialog" aria-label="Add a view">
          <button
            type="button"
            class="tool sheet-close"
            aria-label="Close"
            data-tip="Close"
            onClick={() => setUi("menu", null)}
          >
            <Sign name="cross" />
          </button>
          <For each={GROUPS}>
            {(group) => (
              <Show when={entries(props.prover, props.ui).some((e) => e.group === group)}>
                <section aria-label={group}>
                  <h2 class="group-head">{group}</h2>
                  <ul>
                    <For each={entries(props.prover, props.ui).filter((e) => e.group === group)}>
                      {(entry) => (
                        <li>
                          <button
                            type="button"
                            class="entry"
                            aria-disabled={entry.why ? "true" : undefined}
                            aria-describedby={entry.why ? `why-${entry.view}` : undefined}
                            onClick={() => {
                              if (!entry.why) addEntry(props.prover, props.ui, workspace, entry);
                            }}
                          >
                            <span class={`badge${entry.math ? " m" : ""}`} aria-hidden="true">
                              <span>{entry.badge}</span>
                              <Show when={entry.sub}>
                                <span class="cell-sub">{entry.sub}</span>
                              </Show>
                            </span>
                            <span class="entry-name">{entry.name}</span>
                            <Show when={entry.there}>
                              <span class="sign-named" role="img" aria-label="added">
                                <Sign name="check" class="sign good" />
                              </span>
                            </Show>
                          </button>
                          <Show when={entry.why}>
                            {(why) => (
                              <p class="entry-why" id={`why-${entry.view}`}>
                                {why()}
                              </p>
                            )}
                          </Show>
                        </li>
                      )}
                    </For>
                  </ul>
                </section>
              </Show>
            )}
          </For>
        </div>
      </Show>
    </nav>
  );
}

/** Undo on a view that is not a proof's own: a structure's change, a normal form's step, an elimination's step. */
export function viewUndo(prover: Prover, ui: Ui) {
  const p = prover.current();
  if (!p) return;
  const tab = ui.ui.tab;
  if (tab === "countermodel") undoStructure(ui, p.id);
  else if (tab === "normal") stepTo(ui, p.id, stepShown(ui, p.id) - 1);
  else if (tab === "tableau") undoPress(p.id);
  else if (tab === "elim") void prover.eliminationUndo(elimOn(prover, ui), elimSettings(prover));
}

/** Redo on a view that is not a proof's own: a structure's change taken back. */
export function viewRedo(prover: Prover, ui: Ui) {
  const p = prover.current();
  if (p && ui.ui.tab === "countermodel") redoStructure(ui, p.id);
}

/** A tool: its sign, its name beside it with the guide on, its key in its hover and its name. */
function Tool(props: {
  name: string;
  icon: JSX.Element;
  action?: KeyAction;
  disabled?: boolean;
  pressed?: boolean;
  expanded?: boolean;
  /** Left out of a compact window's bar, in the second row More opens. */
  rare?: boolean;
  /** Inactive until it comes (Learn, Practice): it says so when pressed. */
  soon?: boolean;
  class?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      class={`tool${props.class ? ` ${props.class}` : ""}`}
      data-rove=""
      data-rare={props.rare ? "" : undefined}
      aria-label={props.name}
      aria-keyshortcuts={props.action ? SHORTCUTS[props.action] : undefined}
      aria-pressed={props.pressed}
      aria-expanded={props.expanded}
      aria-disabled={props.soon ? "true" : undefined}
      data-tip={props.soon ? "Coming soon" : props.name}
      data-key={props.action ? KEY_NAMES[props.action] : undefined}
      disabled={props.disabled}
      tabindex={-1}
      onClick={() => props.onClick()}
    >
      {props.icon}
      <span class="tool-name" aria-hidden="true">
        {props.name}
      </span>
    </button>
  );
}

/** The tools of the view shown, at the stage's top right; a compact window's bar along the bottom. */
export function Tools(props: {
  prover: Prover;
  ui: Ui;
  hint: () => void;
  tour: () => void;
  /** Closes the chosen sequent, with an Undo in the notes. */
  closeSequent: () => void;
}) {
  const { ui, setUi } = props.ui;
  const proof = () => props.prover.current();
  const toggle = (menu: "steps" | "search" | "export" | "import") =>
    setUi("menu", ui.menu === menu ? null : menu);
  const busy = () => props.prover.busy();
  const natural = () => {
    const c = proof()?.calculus;
    return !!c && isNatural(c);
  };
  /** Whether the view shown is a derivation the tools act on (not a table, a model, a net). */
  const proving = () => ui.tab === "tree" && !!proof()?.session && !natural();
  /** Whether the view is a derivation in a calculus given as rules (a modal proof step by step). */
  const ruled = () => !!proof()?.custom?.session;
  const searchOff = () => !proving() || !!proof()?.view?.complete || busy();
  const linearClassical = () => {
    const c = proof()?.calculus;
    return c?.suite === "linear" && !intuitionistic(c);
  };
  const say = (text: string) => setUi("notice", { text });
  /** The structure of the countermodel view shown, where it is one. */
  const structureShown = () => {
    const c = counterOf(props.ui, proof()?.id);
    return c?.kind === "structure" ? c : null;
  };
  /** Whether the tableau by hand is shown. */
  const handShown = () =>
    ui.tab === "tableau" &&
    wayOf<string>(props.ui, proof()?.id ?? "", "tableau", "search") === "hand";
  /** Whether the view shown is out of date. */
  const viewStale = () => {
    const p = proof();
    if (!p || ui.tab === "tree") return false;
    const added = addedOf(props.ui, p.id, ui.tab);
    return !!added && staleOf(p, added);
  };
  /** Whether the stepped view shown can go back a step. */
  const canStepBack = () => {
    const p = proof();
    if (!p) return false;
    if (ui.tab === "normal") return stepShown(props.ui, p.id) > 0;
    if (handShown()) return pressesOf(p.id).length > 0;
    return (p.elim[elimOn(props.prover, props.ui)]?.back.length ?? 0) > 0;
  };
  /** Whether the stepped view shown can go forward. */
  const canStepOn = () => {
    const p = proof();
    if (!p) return false;
    if (ui.tab === "normal")
      return stepShown(props.ui, p.id) < (stepCounts()[viewKey(p.id, "normal")] ?? 0);
    const e = p.elim[elimOn(props.prover, props.ui)];
    return !!e && e.reached.next !== null;
  };
  /** One step forward, or every step to the end. */
  const stepOn = (toEnd: boolean) => {
    const p = proof();
    if (!p) return;
    if (ui.tab === "normal") {
      stepTo(props.ui, p.id, toEnd ? null : stepShown(props.ui, p.id) + 1);
      return;
    }
    const on = elimOn(props.prover, props.ui);
    if (toEnd) void props.prover.eliminationRun(on, elimSettings(props.prover));
    else void props.prover.eliminationStep(on, undefined, elimSettings(props.prover));
  };
  /** The views of the chosen sequent that are out of date. */
  const staleCells = () => cellsOf(props.prover, props.ui, proof()).filter((c) => c.stale);
  /** Copies the λ-term shown as text. */
  const copyTerm = async () => {
    const text = termShown.get(proof()?.id ?? "")?.();
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      say("λ-term copied as text.");
    } catch {
      say("The browser keeps the clipboard closed: select the term to copy it.");
    }
  };
  let toolbar!: HTMLDivElement;
  onMount(() => oneStop(toolbar));

  return (
    <div
      class="tools"
      role="toolbar"
      aria-label="Tools"
      aria-orientation="vertical"
      data-more={ui.more ? "" : undefined}
      ref={toolbar}
      onKeyDown={(event) => rove(event, true)}
      // A tool pressed closes More's row: it has done what the visitor opened the row for.
      onClick={(event) => {
        const pressed = (event.target as Element).closest("[data-rove]");
        if (pressed && !pressed.classList.contains("more")) setUi("more", false);
      }}
      onFocusIn={(event) => {
        for (const b of toolbar.querySelectorAll<HTMLElement>("[data-rove]"))
          b.tabIndex = b === event.target ? 0 : -1;
      }}
    >
      <Show when={ui.tab === "countermodel" && structureShown()}>
        {(c) => (
          <fieldset class="tool-group" aria-label="Changes">
            <Tool
              name="Undo"
              action="undo"
              icon={<Sign name="undo" />}
              disabled={c().past.length === 0}
              onClick={() => viewUndo(props.prover, props.ui)}
            />
            <Tool
              name="Redo"
              action="redo"
              icon={<Sign name="redo" />}
              disabled={c().future.length === 0}
              onClick={() => viewRedo(props.prover, props.ui)}
            />
          </fieldset>
        )}
      </Show>
      <Show when={(ui.tab === "normal" || ui.tab === "elim" || handShown()) && !viewStale()}>
        <fieldset class="tool-group" aria-label="Steps">
          <Tool
            name="Undo"
            action="undo"
            icon={<Sign name="undo" />}
            disabled={!canStepBack() || busy()}
            onClick={() => viewUndo(props.prover, props.ui)}
          />
          <Show when={ui.tab === "elim"}>
            <Tool
              name="Steps"
              rare
              icon={<Sign name="steps" />}
              disabled={(proof()?.elim[elimOn(props.prover, props.ui)]?.taken.length ?? 0) < 2}
              onClick={() =>
                document.querySelector<HTMLDetailsElement>(".steps-taken")?.toggleAttribute("open")
              }
            />
          </Show>
        </fieldset>
        <fieldset class="tool-group" aria-label="Forward" hidden={handShown()}>
          <Tool
            name="Next step"
            icon={<Sign name="next" />}
            disabled={!canStepOn() || busy()}
            onClick={() => stepOn(false)}
          />
          <Tool
            name="To the end"
            icon={<Sign name="end" />}
            disabled={!canStepOn() || busy()}
            onClick={() => stepOn(true)}
          />
        </fieldset>
      </Show>
      <Show when={ui.tab === "term" && !viewStale()}>
        <fieldset class="tool-group" aria-label="Term">
          <Tool
            name="Copy as text"
            icon={<Sign name="copy" />}
            disabled={!termShown.get(proof()?.id ?? "")?.()}
            onClick={() => void copyTerm()}
          />
        </fieldset>
      </Show>
      <Show when={ui.tab === "graph"}>
        <fieldset class="tool-group" aria-label="Views">
          <Tool
            name="Update all"
            icon={<Sign name="update" />}
            disabled={staleCells().length === 0}
            onClick={() => {
              const stale = staleCells();
              for (const cell of stale) updateView(props.prover, props.ui, cell.proof, cell.view);
              say(
                stale.length === 1
                  ? "1 view brought up to date."
                  : `${stale.length} views brought up to date.`,
              );
            }}
          />
        </fieldset>
      </Show>
      <Show
        when={
          proof()?.calculus.suite === "modal" &&
          ui.tab === "tree" &&
          proof()?.modal?.outcome?.verdict === "valid"
        }
      >
        <fieldset class="tool-group" aria-label="Modal logic">
          <Tool
            name="Prove step by step"
            icon={<Sign name="stairs" />}
            disabled={busy() || !proof()?.modal?.outcome?.derivation}
            onClick={() => {
              const p = proof();
              if (p) void props.prover.modalSteps(p.id);
            }}
          />
        </fieldset>
      </Show>
      <Show
        when={
          proof()?.calculus.suite === "lambda" &&
          ui.tab === "tree" &&
          proof()?.lambda?.found?.verdict === "inhabited"
        }
      >
        <fieldset class="tool-group" aria-label="Lambda-terms">
          <Tool
            name="List its terms"
            icon={<Sign name="list" />}
            disabled={busy() || !!proof()?.lambda?.listed}
            onClick={() => {
              const p = proof();
              if (p) void props.prover.lambdaList(p.id);
            }}
          />
        </fieldset>
      </Show>
      <Show when={proving() || (ui.tab === "tree" && !!proof()?.custom?.session)}>
        <fieldset class="tool-group" aria-label="Steps">
          <Tool
            name="Undo"
            action="undo"
            icon={<Sign name="undo" />}
            disabled={
              ruled()
                ? (proof()?.custom?.view?.steps ?? 0) === 0 || busy()
                : !proving() || proof()?.view?.steps === 0 || busy()
            }
            onClick={() => void props.prover.undo()}
          />
          <Tool
            name="Redo"
            action="redo"
            icon={<Sign name="redo" />}
            disabled={
              !(proving() || ruled()) || !(proof()?.redo.length || proof()?.later.length) || busy()
            }
            onClick={() => void props.prover.redo()}
          />
          <Tool
            name="Steps"
            action="steps"
            rare
            icon={<Sign name="steps" />}
            disabled={!proving()}
            expanded={ui.menu === "steps"}
            onClick={() => toggle("steps")}
          />
        </fieldset>
        <fieldset class="tool-group" aria-label="Search">
          <Tool
            name="Hint"
            action="hint"
            icon={<Sign name="hint" />}
            disabled={searchOff()}
            onClick={props.hint}
          />
          <Show
            when={busy()}
            fallback={
              <Tool
                name="Close all"
                action="closeAll"
                icon={<Sign name="closeAll" />}
                disabled={searchOff()}
                onClick={() => void props.prover.closeAll()}
              />
            }
          >
            <Tool
              name="Stop"
              icon={<Sign name="stop" />}
              onClick={() => {
                props.prover.stop();
                say("Stopped: nothing was changed.");
              }}
            />
          </Show>
          <Tool
            name="The search's settings"
            class="caret"
            rare
            icon={<Sign name="caret" />}
            expanded={ui.menu === "search"}
            disabled={!proving()}
            onClick={() => {
              setUi("searchFor", null);
              toggle("search");
            }}
          />
        </fieldset>
        <Show when={proof()?.calculus.suite === "ordinary" && !natural()}>
          <fieldset class="tool-group" aria-label="Drawing">
            <Tool
              name="W C, weakenings and contractions"
              rare
              icon={
                <span class="tool-sign" aria-hidden="true">
                  W C
                </span>
              }
              pressed={props.prover.settings().structural === "explicit"}
              onClick={() =>
                void props.prover.setStructural(
                  props.prover.settings().structural === "explicit" ? "admissible" : "explicit",
                )
              }
            />
          </fieldset>
        </Show>
        <Show when={!!proof()?.view?.complete && (proof()?.view?.cuts.length ?? 0) > 0}>
          <fieldset class="tool-group" aria-label="Cuts">
            <Tool
              name="Eliminate cuts"
              icon={<Sign name="eliminate" />}
              onClick={() => addView(props.prover, props.ui, "elim")}
            />
          </fieldset>
        </Show>
        <Show when={proof()?.calculus.suite === "linear"}>
          <fieldset class="tool-group" aria-label="Drawing">
            <Tool
              name="Cut"
              rare
              icon={<Sign name="cut" />}
              disabled={!proving() || !!proof()?.view?.complete || busy()}
              pressed={ui.cutting !== null}
              onClick={() => {
                const goal = props.prover.activeGoal();
                if (ui.cutting) setUi("cutting", null);
                else if (goal !== undefined) {
                  props.prover.clearNote();
                  setUi({
                    cutting: { goal, left: [], own: null },
                    selected: null,
                    offered: null,
                    split: null,
                  });
                }
              }}
            />
            <Show when={linearClassical()}>
              <Tool
                name="Two-sided"
                rare
                icon={
                  <span class="tool-sign m" aria-hidden="true">
                    ⊢⊣
                  </span>
                }
                pressed={props.prover.settings().twoSided}
                onClick={() =>
                  props.prover.setSettings({ twoSided: !props.prover.settings().twoSided })
                }
              />
            </Show>
          </fieldset>
        </Show>
      </Show>
      <fieldset class="tool-group" aria-label="Files">
        <Tool
          name="Export"
          action="export"
          rare
          icon={<Sign name="export" />}
          disabled={!exportable(proof())}
          expanded={ui.menu === "export"}
          onClick={() => toggle("export")}
        />
        <Tool
          name="Import"
          action="import"
          rare
          icon={<Sign name="import" />}
          expanded={ui.menu === "import"}
          onClick={() => toggle("import")}
        />
        {/* A button outside the chips' tab list, which may hold tabs alone: the way to close a
            sequent for a screen reader on a touch screen. More's rows alone show it. */}
        <Tool
          name="Close this sequent"
          action="closeSequent"
          rare
          class="more-only"
          icon={<Sign name="shut" />}
          onClick={() => props.closeSequent()}
        />
      </fieldset>
      <Show when={props.prover.settings().guide}>
        <fieldset class="tool-group" aria-label="Learn">
          <Tool
            name="Learn"
            rare
            soon
            icon={<Sign name="learn" />}
            onClick={() => say("Learn is coming soon.")}
          />
          <Tool
            name="Practice"
            rare
            soon
            icon={<Sign name="practice" />}
            onClick={() => say("Practice is coming soon.")}
          />
          <Tool name="Tour" rare icon={<Sign name="tour" />} onClick={props.tour} />
        </fieldset>
      </Show>
      <Tool
        name="More"
        class="more"
        icon={<Sign name="more" />}
        expanded={ui.more}
        onClick={() => setUi("more", !ui.more)}
      />
    </div>
  );
}

/** The bottom box: the chosen sequent as text, and Enter; the notes above it. */
export function BottomBox(props: { prover: Prover; ui: Ui; notes: JSX.Element }) {
  const proof = () => props.prover.current();
  let typing: ReturnType<typeof setTimeout> | undefined;
  /** Enters the box's text; once it reads, the box writes it in signs, as the chip does. */
  const enter = async () => {
    const p = proof();
    if (!p) return;
    await props.prover.submit(p.id);
    const now = props.prover.store.proofs.find((q) => q.id === p.id);
    if (!now || now.inputProblem || !started(now)) return;
    const signed = inSigns(now);
    if (signed !== now.input) props.prover.setInput(now.id, signed);
  };
  // The box and its notes take room at the stage's bottom: the view under them keeps clear of it.
  const measured = (el: HTMLDivElement) => {
    const said = new ResizeObserver(() =>
      el.parentElement?.style.setProperty("--size-bottom", `${el.offsetHeight}px`),
    );
    said.observe(el);
    onCleanup(() => said.disconnect());
  };
  return (
    <div class="bottom" ref={measured}>
      <div class="notes">{props.notes}</div>
      <form
        class="box"
        data-invalid={proof()?.inputProblem ? "" : undefined}
        onSubmit={(event) => {
          event.preventDefault();
          void enter();
        }}
      >
        <input
          class="field m-in"
          aria-label="Sequent"
          aria-invalid={proof()?.inputProblem ? "true" : undefined}
          aria-describedby={proof()?.inputProblem ? "box-problem" : undefined}
          aria-keyshortcuts="/"
          placeholder={placeholder(proof()?.calculus)}
          spellcheck={false}
          autocomplete="off"
          enterkeyhint="go"
          value={proof()?.input ?? ""}
          onInput={(event) => {
            const p = proof();
            if (!p) return;
            const text = event.currentTarget.value;
            props.prover.setInput(p.id, text);
            clearTimeout(typing);
            typing = setTimeout(() => void props.prover.preview(p.id, text), 250);
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.preventDefault();
              event.currentTarget.blur();
            }
          }}
        />
        <button type="submit" class="enter" aria-label="Enter" data-tip="Enter">
          <Sign name="enter" />
          <span class="tool-name" aria-hidden="true">
            Enter
          </span>
        </button>
      </form>
    </div>
  );
}

/** What the bottom box shows when it is empty: an example in the suite's syntax. */
function placeholder(c: Calculus | undefined): string {
  if (c?.suite === "ordinary") return "a /\\ b |- b /\\ a";
  if (c?.suite === "modal") return "[](p -> q) |- []p -> []q";
  if (c?.suite === "lambda") return "\\x. x";
  return "A * B |- B * A";
}

/** The field's problem as a note: the text with the place of the fault marked, the keyword, the reason. */
export function ProblemNote(props: { proof: Proof }) {
  return (
    <Show when={props.proof.inputProblem}>
      {(problem) => (
        <div class="note problem" id="box-problem" role="alert">
          <p class="caret m-in">
            <Show when={problem().span} fallback={props.proof.input}>
              {(span) => (
                <>
                  {props.proof.input.slice(0, span().start)}
                  <mark class="at">
                    {props.proof.input.slice(
                      span().start,
                      Math.max(span().end, span().start + 1),
                    ) || " "}
                  </mark>
                  {props.proof.input.slice(Math.max(span().end, span().start + 1))}
                </>
              )}
            </Show>
          </p>
          <p>
            <span class="kw bad">{problem().keyword}</span> <Why said={problem()} />
          </p>
        </div>
      )}
    </Show>
  );
}

/** The four logics a new sequent may be in, ordinary logic first, each with its sign. */
const LOGICS: readonly {
  suite: Calculus["suite"];
  name: string;
  sign: string;
  says: string;
  start: Calculus;
}[] = [
  {
    suite: "ordinary",
    name: "Ordinary logic",
    sign: "∧",
    says: "Classical, intuitionistic and minimal logic",
    start: ordinary("classical", "sequent"),
  },
  {
    suite: "linear",
    name: "Linear logic",
    sign: "⅋",
    says: "Every hypothesis used exactly once",
    start: linear("classical"),
  },
  {
    suite: "modal",
    name: "Modal logic",
    sign: "□",
    says: "Necessity and possibility, in fifteen systems",
    start: modal("K"),
  },
  {
    suite: "lambda",
    name: "Lambda-terms",
    sign: "λ",
    says: "A proof read as a program",
    start: lambda("simple"),
  },
];

/**
 * The new tab view, in the stage's place for a sequent not yet entered: the four logics, then
 * "Open a file", "Restore N proofs" when there are proofs to restore, Learn and Practice (coming
 * soon) and About.
 */
export function NewTab(props: {
  prover: Prover;
  ui: Ui;
  samples: readonly Sample[];
  openFile: (file: File) => void;
}) {
  const { setUi } = props.ui;
  const proof = () => props.prover.current();
  const chosen = (c: Calculus) => proof()?.calculus.suite === c.suite;
  let file!: HTMLInputElement;
  const aside = () => props.prover.aside()?.proofs.length ?? 0;
  const say = (text: string) => setUi("notice", { text });
  // The box takes the focus where nothing else has it, but not on a touch screen, where it would
  // open the screen keyboard over the logics.
  onMount(() => {
    const free = !document.activeElement || document.activeElement === document.body;
    if (free && window.matchMedia("(pointer: fine)").matches)
      document.querySelector<HTMLInputElement>(".box .field")?.focus();
  });
  return (
    <section class="new-tab" aria-label="New sequent">
      <fieldset class="logics" aria-label="Logic">
        <For each={LOGICS}>
          {(logic) => (
            <button
              type="button"
              class="logic"
              aria-pressed={chosen(logic.start)}
              onClick={() => {
                const p = proof();
                if (!p) return;
                if (!sameCalculus(p.calculus, logic.start) && !chosen(logic.start))
                  void props.prover.setCalculus(p.id, logic.start);
                queueMicrotask(() =>
                  document.querySelector<HTMLInputElement>(".box .field")?.focus(),
                );
              }}
            >
              <span class="logic-sign m" aria-hidden="true">
                {logic.sign}
              </span>
              <span class="logic-rule" aria-hidden="true" />
              <span class="logic-name">{logic.name}</span>
              <Show when={props.prover.settings().guide}>
                <span class="logic-says">{logic.says}</span>
              </Show>
            </button>
          )}
        </For>
      </fieldset>
      <div class="new-actions">
        <button type="button" class="btn" onClick={() => file.click()}>
          <Sign name="open" />
          Open a file
        </button>
        <input
          ref={file}
          hidden
          type="file"
          accept=".json,application/json,text/plain"
          onChange={(event) => {
            const f = event.currentTarget.files?.[0];
            if (f) props.openFile(f);
            event.currentTarget.value = "";
          }}
        />
        <Show when={aside() > 0}>
          <button type="button" class="btn" onClick={() => props.prover.restore()}>
            Restore {aside()} {aside() === 1 ? "proof" : "proofs"}
          </button>
        </Show>
        <span class="divider" aria-hidden="true" />
        <button
          type="button"
          class="btn soon"
          aria-disabled="true"
          data-tip="Coming soon"
          onClick={() => say("Learn is coming soon.")}
        >
          <Sign name="learn" />
          Learn
        </button>
        <button
          type="button"
          class="btn soon"
          aria-disabled="true"
          data-tip="Coming soon"
          onClick={() => say("Practice is coming soon.")}
        >
          <Sign name="practice" />
          Practice
        </button>
        <button type="button" class="btn" onClick={() => setUi("menu", "about")}>
          <Sign name="info" />
          About
        </button>
      </div>
    </section>
  );
}

/** With the guide on and ordinary logic chosen, that logic's examples over the bottom box: a press puts one in it. */
export function Examples(props: { prover: Prover; samples: readonly Sample[] }) {
  const proof = () => props.prover.current();
  const shown = () => {
    const c = proof()?.calculus;
    return c?.suite === "ordinary" ? props.samples.filter((s) => s.logic === c.logic) : [];
  };
  return (
    <Show when={props.prover.settings().guide && !started(proof()) && shown().length > 0}>
      <div class="note examples">
        <p>Type a sequent below and press Enter, or try one of these.</p>
        <p class="example-row">
          <For each={shown()}>
            {(sample) => (
              <button
                type="button"
                class="btn m"
                aria-label={`Example: ${sample.title}, ${prettyOrdinary(sample.sequent)}`}
                data-tip={sample.title}
                onClick={() => {
                  const p = proof();
                  if (!p) return;
                  props.prover.setInput(p.id, sample.sequent);
                  document.querySelector<HTMLInputElement>(".box .field")?.focus();
                }}
              >
                {prettyOrdinary(sample.sequent)}
              </button>
            )}
          </For>
        </p>
      </div>
    </Show>
  );
}

/** A dialog over the page with a heading and a close button, closed by Escape too. */
export function Dialog(props: { label: string; onClose: () => void; children: JSX.Element }) {
  let close!: HTMLButtonElement;
  // The dialog takes the focus, and gives it back where it was when it closes.
  const before = document.activeElement as HTMLElement | null;
  onMount(() => close.focus());
  onCleanup(() => before?.focus?.());
  return (
    <div class="dialog-scrim">
      <div class="dialog panel menu" role="dialog" aria-modal="true" aria-label={props.label}>
        <div class="dialog-head">
          <h2>{props.label}</h2>
          <button
            ref={close}
            type="button"
            class="tool"
            aria-label="Close"
            data-tip="Close"
            onClick={() => props.onClose()}
          >
            <Sign name="cross" />
          </button>
        </div>
        {props.children}
      </div>
    </div>
  );
}

/** The toggles' place at the stage's top left: the calculus of the view shown. */
export function TogglesPlace(props: { prover: Prover; ui: Ui }) {
  return (
    <div class="toggles-place">
      <Toggles prover={props.prover} ui={props.ui} />
    </div>
  );
}
