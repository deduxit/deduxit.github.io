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

import {
  Check,
  CheckCheck,
  ChevronDown,
  CircleHelp,
  Compass,
  CornerDownLeft,
  Download,
  Dumbbell,
  Ellipsis,
  FolderOpen,
  GraduationCap,
  Info,
  Lightbulb,
  ListOrdered,
  Moon,
  Plus,
  Redo2,
  Scissors,
  SlidersHorizontal,
  Square,
  Sun,
  Undo2,
  Upload,
  X,
} from "lucide-solid";
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
import { Toggles } from "./Toggles";
import { useWorkspace } from "./Workspace";
import { compact, type Ui, type View, Why } from "./ui";

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

/** A view's cell in the rail: its view, its short name, and its name in full. */
export interface Cell {
  readonly view: View;
  readonly short: string;
  readonly name: string;
}

/** The views a classical sequent may add (its table, tableau, model, tableau by hand), with their cells. */
const ADDED: Readonly<Record<Exclude<View, "tree" | "net">, { short: string; name: string }>> = {
  table: { short: "TT", name: "Truth table, TT" },
  tableau: { short: "T", name: "Tableau, T" },
  written: { short: "TH", name: "Tableau by hand, TH" },
  model: { short: "M", name: "A model of your own, M" },
};

/** Whether a proof's net can be drawn: its proof finished and a net. */
export const netReady = (proof: Proof | undefined) => {
  const v = proof?.view;
  return !!v && v.complete && v.net === null;
};

/** Whether a proof's sequent has a truth table and a tableau: a started classical ordinary one the search may decide. */
export const decidable = (prover: Prover, proof: Proof | undefined) =>
  !!proof?.session &&
  proof.calculus.suite === "ordinary" &&
  proof.calculus.logic === "classical" &&
  prover.limits().search(proof.id) === null;

/** The rail's cells of a proof: its proof, its net once drawn, and the views added to it. */
export function cellsOf(prover: Prover, ui: Ui, proof: Proof | undefined): readonly Cell[] {
  if (!proof || !started(proof)) return [];
  const own: Cell[] = [
    { view: "tree", short: cellName(proof.calculus), name: calculusName(proof.calculus) },
  ];
  if (netReady(proof)) own.push({ view: "net", short: "◇", name: "Proof net" });
  // A view shown by a button of its own (a countermodel's "Change this model", a tableau's
  // countermodel) has its cell as an added one does.
  const shownHere = ui.ui.tab;
  const added = [...(ui.ui.added[proof.id] ?? [])];
  if ((shownHere === "model" || shownHere === "written") && !added.includes(shownHere))
    added.push(shownHere);
  for (const view of added) {
    const added = ADDED[view as keyof typeof ADDED];
    if (added && (view === "model" || decidable(prover, proof))) own.push({ view, ...added });
  }
  return own;
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
}) {
  const { ui, setUi } = props.ui;
  const settings = () => props.prover.settings();
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
          <For each={props.prover.store.proofs}>
            {(proof) => {
              const chosen = () => props.prover.store.active === proof.id && ui.menu !== "settings";
              return (
                <button
                  type="button"
                  role="tab"
                  class="chip"
                  data-rove=""
                  data-proof={proof.id}
                  aria-selected={chosen()}
                  tabindex={props.prover.store.active === proof.id ? 0 : -1}
                  aria-label={`${proof.input ? tabText(proof) : "New sequent"}, ${stateWords(proof)}`}
                  data-tip={proof.input ? tabText(proof) : "New sequent"}
                  onClick={() => {
                    props.prover.activate(proof.id);
                    setUi({ menu: null, tab: "tree" });
                  }}
                >
                  <span class="chip-text m">{proof.input ? tabText(proof) : "New"}</span>
                  <Show when={tone(proof) === "ok"}>
                    <Check class="sign good" aria-hidden="true" />
                  </Show>
                  <Show when={tone(proof) === "bad"}>
                    <X class="sign bad" aria-hidden="true" />
                  </Show>
                </button>
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
          <Plus aria-hidden="true" />
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
        <CircleHelp aria-hidden="true" />
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
        <Show when={darkShown(props.theme())} fallback={<Moon aria-hidden="true" />}>
          <Sun aria-hidden="true" />
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
        <SlidersHorizontal aria-hidden="true" />
      </button>
    </header>
  );
}

/** An entry of the list of views to add: its badge, its name, why it cannot be added, its action. */
interface Entry {
  readonly group: "Prove" | "Decide" | "Translate" | "Read off";
  readonly badge: string;
  readonly name: string;
  readonly there: boolean;
  readonly why: string | null;
  readonly add: () => void;
}

/** The rail: the chosen sequent's views, one cell each, and "+ view" with its list. */
export function Rail(props: { prover: Prover; ui: Ui }) {
  const { ui, setUi } = props.ui;
  const proof = () => props.prover.current();
  const cells = () => cellsOf(props.prover, props.ui, proof());
  const workspace = useWorkspace();
  const shown = (view: View) => ui.tab === view && ui.menu !== "settings";
  const count = () => {
    const n = proof()?.view?.goals.length ?? 0;
    return n > 9 ? "9+" : String(n);
  };

  const add = (view: View) => {
    const p = proof();
    if (!p) return;
    const before = ui.added[p.id] ?? [];
    if (view === "model") {
      const session = p.session;
      const c = p.calculus;
      if (session && isOrdinary(session) && c.suite === "ordinary")
        setUi("modelSeed", {
          model: ONE_WORLD,
          sequent: sequentText(session),
          logic: c.logic,
          found: false,
        });
    }
    setUi({
      added: { ...ui.added, [p.id]: before.includes(view) ? before : [...before, view] },
      tab: view,
      menu: null,
    });
  };

  const entries = (): readonly Entry[] => {
    const p = proof();
    const c = p?.calculus;
    const classical = c?.suite === "ordinary" && c.logic === "classical" && !!p?.session;
    const ordinaryStarted = !!p?.session && c?.suite === "ordinary";
    const there = (view: View) => cells().some((cell) => cell.view === view);
    const needs = classical ? null : "Needs a classical sequent, entered.";
    const decides = decidable(props.prover, p) ? null : (needs ?? "The search is barred here.");
    const sheet = (menu: "translate" | "interpolate" | "normalize" | "resolve") => () =>
      setUi("menu", menu);
    return [
      {
        group: "Prove",
        badge: "⧉",
        name: "A copy of this proof",
        there: false,
        why: (p?.session || p?.modal?.outcome) && workspace ? null : "Needs a sequent entered.",
        add: () => {
          const id = p?.id;
          setUi("menu", null);
          if (id && workspace) void workspace.duplicate(id);
        },
      },
      {
        group: "Prove",
        badge: "◇",
        name: "Proof net",
        there: there("net"),
        why:
          c?.suite !== "linear"
            ? "Needs a linear sequent."
            : netReady(p)
              ? null
              : p?.view?.net
                ? `No net: ${p.view.net.message.replace(/^not a proof net: /, "")}.`
                : "The net is drawn once the proof is finished.",
        add: () => setUi({ tab: "net", menu: null }),
      },
      {
        group: "Decide",
        badge: "TT",
        name: "Truth table",
        there: there("table"),
        why: decides,
        add: () => add("table"),
      },
      {
        group: "Decide",
        badge: "T",
        name: "Tableau",
        there: there("tableau"),
        why: decides,
        add: () => add("tableau"),
      },
      {
        group: "Decide",
        badge: "TH",
        name: "Tableau by hand",
        there: there("written"),
        why: decides,
        add: () => add("written"),
      },
      {
        group: "Decide",
        badge: "R",
        name: "Resolution",
        there: false,
        why: needs,
        add: sheet("resolve"),
      },
      {
        group: "Decide",
        badge: "NF",
        name: "Normal form",
        there: false,
        why: needs,
        add: sheet("normalize"),
      },
      {
        group: "Decide",
        badge: "M",
        name: "A model of your own",
        there: there("model"),
        why: ordinaryStarted && !(c && isNatural(c)) ? null : "Needs an ordinary sequent, entered.",
        add: () => add("model"),
      },
      {
        group: "Translate",
        badge: "¬¬",
        name: "Into intuitionistic logic",
        there: false,
        why: needs,
        add: sheet("translate"),
      },
      {
        group: "Read off",
        badge: "I",
        name: "Interpolant",
        there: false,
        why: needs,
        add: sheet("interpolate"),
      },
    ];
  };

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
              data-capsule={
                cell.view === "net" || (cell.view === "tree" && netReady(proof())) ? "" : undefined
              }
              aria-selected={shown(cell.view)}
              tabindex={
                shown(cell.view) || (!cells().some((c) => shown(c.view)) && cell === cells()[0])
                  ? 0
                  : -1
              }
              aria-label={`${cell.name}${cell.view === "tree" && proof() ? `, ${stateWords(proof() as Proof)}` : ""}`}
              data-tip={cell.name}
              onClick={() => {
                // A model is the sequent's own: one of another sequent shown before is set aside.
                const p = proof();
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
                setUi({ tab: cell.view, menu: null });
              }}
            >
              <span
                class="cell-name"
                data-long={cell.short.length > 2 ? "" : undefined}
                // The count of open goals is drawn by CSS from here: the name says it in words.
                data-count={
                  cell.view === "tree" && tone(proof() as Proof) === "open" ? count() : undefined
                }
              >
                {cell.short}
              </span>
              <Show when={cell.view === "tree" && tone(proof() as Proof) === "bad"}>
                <X class="count sign bad" aria-hidden="true" />
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
        <Plus aria-hidden="true" />
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
            <X aria-hidden="true" />
          </button>
          <For each={["Prove", "Decide", "Translate", "Read off"] as const}>
            {(group) => (
              <section aria-label={group}>
                <h2 class="group-head">{group}</h2>
                <ul>
                  <For each={entries().filter((e) => e.group === group)}>
                    {(entry) => (
                      <li>
                        <button
                          type="button"
                          class="entry"
                          aria-disabled={entry.why ? "true" : undefined}
                          aria-describedby={entry.why ? `why-${entry.badge}` : undefined}
                          onClick={() => {
                            if (!entry.why) entry.add();
                          }}
                        >
                          <span class="badge m" aria-hidden="true">
                            {entry.badge}
                          </span>
                          <span class="entry-name">{entry.name}</span>
                          <Show when={entry.there}>
                            <Check class="sign good" aria-label="added" />
                          </Show>
                        </button>
                        <Show when={entry.why}>
                          {(why) => (
                            <p class="entry-why" id={`why-${entry.badge}`}>
                              {why()}
                            </p>
                          )}
                        </Show>
                      </li>
                    )}
                  </For>
                </ul>
              </section>
            )}
          </For>
        </div>
      </Show>
    </nav>
  );
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
  /** Closes More's row: a tool pressed there has done what the visitor opened it for. */
  closeMore?: () => void;
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
      onClick={() => {
        props.onClick();
        if (props.rare) props.closeMore?.();
      }}
    >
      {props.icon}
      <span class="tool-name" aria-hidden="true">
        {props.name}
      </span>
    </button>
  );
}

/** The tools of the view shown, at the stage's top right; a compact window's bar along the bottom. */
export function Tools(props: { prover: Prover; ui: Ui; hint: () => void; tour: () => void }) {
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
  const barred = () => {
    const p = proof();
    return p ? props.prover.limits().search(p.id) : null;
  };
  const searchOff = () => !proving() || !!proof()?.view?.complete || busy() || barred() !== null;
  const linearClassical = () => {
    const c = proof()?.calculus;
    return c?.suite === "linear" && !intuitionistic(c);
  };
  const say = (text: string) => setUi("notice", { text });
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
      onFocusIn={(event) => {
        for (const b of toolbar.querySelectorAll<HTMLElement>("[data-rove]"))
          b.tabIndex = b === event.target ? 0 : -1;
      }}
    >
      <Show when={proving() || ui.tab === "tree"}>
        <fieldset class="tool-group" aria-label="Steps">
          <Tool
            name="Undo"
            action="undo"
            icon={<Undo2 aria-hidden="true" />}
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
            icon={<Redo2 aria-hidden="true" />}
            disabled={
              !(proving() || ruled()) || !(proof()?.redo.length || proof()?.later.length) || busy()
            }
            onClick={() => void props.prover.redo()}
          />
          <Tool
            name="Steps"
            action="steps"
            rare
            closeMore={() => setUi("more", false)}
            icon={<ListOrdered aria-hidden="true" />}
            disabled={!proving()}
            expanded={ui.menu === "steps"}
            onClick={() => toggle("steps")}
          />
        </fieldset>
        <fieldset class="tool-group" aria-label="Search">
          <Tool
            name="Hint"
            action="hint"
            icon={<Lightbulb aria-hidden="true" />}
            disabled={searchOff()}
            onClick={props.hint}
          />
          <Show
            when={busy()}
            fallback={
              <Tool
                name="Close all"
                action="closeAll"
                icon={<CheckCheck aria-hidden="true" />}
                disabled={searchOff()}
                onClick={() => void props.prover.closeAll()}
              />
            }
          >
            <Tool
              name="Stop"
              icon={<Square aria-hidden="true" />}
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
            closeMore={() => setUi("more", false)}
            icon={<ChevronDown aria-hidden="true" />}
            expanded={ui.menu === "search"}
            disabled={!proving()}
            onClick={() => toggle("search")}
          />
        </fieldset>
        <Show when={proof()?.calculus.suite === "ordinary" && !natural()}>
          <fieldset class="tool-group" aria-label="Drawing">
            <Tool
              name="W C, weakenings and contractions"
              rare
              closeMore={() => setUi("more", false)}
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
        <Show when={proof()?.calculus.suite === "linear"}>
          <fieldset class="tool-group" aria-label="Drawing">
            <Tool
              name="Cut"
              rare
              closeMore={() => setUi("more", false)}
              icon={<Scissors aria-hidden="true" />}
              disabled={!proving() || !!proof()?.view?.complete || busy()}
              pressed={ui.cutting !== null}
              onClick={() => {
                const goal = props.prover.activeGoal();
                if (ui.cutting) setUi("cutting", null);
                else if (goal !== undefined) {
                  props.prover.clearNote();
                  setUi({
                    cutting: { goal, left: [] },
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
                closeMore={() => setUi("more", false)}
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
          closeMore={() => setUi("more", false)}
          icon={<Download aria-hidden="true" />}
          disabled={!proof()?.session || natural()}
          expanded={ui.menu === "export"}
          onClick={() => toggle("export")}
        />
        <Tool
          name="Import"
          action="import"
          rare
          closeMore={() => setUi("more", false)}
          icon={<Upload aria-hidden="true" />}
          expanded={ui.menu === "import"}
          onClick={() => toggle("import")}
        />
      </fieldset>
      <Show when={props.prover.settings().guide}>
        <fieldset class="tool-group" aria-label="Learn">
          <Tool
            name="Learn"
            rare
            closeMore={() => setUi("more", false)}
            soon
            icon={<GraduationCap aria-hidden="true" />}
            onClick={() => say("Learn is coming soon.")}
          />
          <Tool
            name="Practice"
            rare
            closeMore={() => setUi("more", false)}
            soon
            icon={<Dumbbell aria-hidden="true" />}
            onClick={() => say("Practice is coming soon.")}
          />
          <Tool name="Tour" rare icon={<Compass aria-hidden="true" />} onClick={props.tour} />
        </fieldset>
      </Show>
      <Tool
        name="More"
        class="more"
        icon={<Ellipsis aria-hidden="true" />}
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
          <CornerDownLeft aria-hidden="true" />
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
          <FolderOpen aria-hidden="true" />
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
          <GraduationCap aria-hidden="true" />
          Learn
        </button>
        <button
          type="button"
          class="btn soon"
          aria-disabled="true"
          data-tip="Coming soon"
          onClick={() => say("Practice is coming soon.")}
        >
          <Dumbbell aria-hidden="true" />
          Practice
        </button>
        <button type="button" class="btn" onClick={() => setUi("menu", "about")}>
          <Info aria-hidden="true" />
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
            <X aria-hidden="true" />
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
