// deduxit © Fabian Lukas Grubmüller 2026
// Licensed under the EUPL

/**
 * The prover, one island, in the frame of the design guide: the top row (the open sequents), the
 * rail (the chosen sequent's views), the stage with its toggles, tools, panels and zoom, the
 * bottom box with its notes; the new tab view for a sequent not yet entered, and the Settings page.
 * Here too what holds the work: the link in the URL's fragment, written as the proof changes and
 * read when the page opens; autosave of every open proof, restored by itself on a plain visit
 * while no other tab of the page is open; the one hover rule for tips; the keys; the hint ladder;
 * light dismiss; and deduxit's math fonts, whose bytes the PNG and PDF exports render with, Euler
 * Math also the drawings'.
 */

import { Sign } from "./Signs";
import { createEffect, createSignal, For, on, onCleanup, onMount, Show } from "solid-js";
import { unwrap } from "solid-js/store";
import {
  isEmbedded,
  type LinkContent,
  readLink,
  readPackLink,
  writeLink,
  writeWorkspaceLink,
} from "../lib/link";
import { readHandin, readPack } from "../lib/pack";
import { MATH_FONTS, type MathFont } from "../lib/deduxit";
import { KEY_ROWS, keyAction } from "../lib/keys";
import { prettyModal } from "../lib/modal";
import { prettyOrdinary } from "../lib/ordinary";
import { paths } from "../lib/steps";
import { failure } from "../lib/deduxit";
import { Cancelled } from "../lib/protocol";
import { SHELF_PREFIX } from "../lib/shelf";
import { calculusOf, isNatural, parameterOf, SUITES } from "../lib/suites";
import { inputProblem, pretty } from "../lib/words";
import { parseTheme, type Theme } from "../lib/theme";
import type { Rule, Sample, Stop } from "../lib/content";
import { hintsFor } from "../lib/rules";
import { migrate } from "../lib/storage";
import {
  BottomBox,
  cellsOf,
  Dialog,
  Examples,
  NewTab,
  ProblemNote,
  Rail,
  started,
  tabText,
  Tools,
  TogglesPlace,
  TopRow,
  viewRedo,
  viewUndo,
} from "./Frame";
import { ExportPanel } from "./Export";
import { createPacks, PackPage, PacksContext } from "./Packs";
import {
  AboutPane,
  ImportPanel,
  importText,
  SearchPanel,
  SettingsPage,
  StepsPanel,
} from "./Panels";
import { RuleHints } from "./RuleHint";
import { GoalNotes, GuideLine, pointer, Stage } from "./Stage";
import { createProver } from "./state";
import { createWorkspace, WorkspaceContext } from "./Workspace";
import { Tour } from "./Tour";
import { createUi, ladderKey, Why } from "./ui";

/** The menus that open as a panel beside the tools, a sheet in a compact window. */
const PANELS: readonly string[] = ["steps", "search", "export", "import"];

/** The browser's storage, or undefined where it is refused. */
const storage = () => {
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
};

export default function App(props: {
  /** The math fonts' addresses: the page imports them, so each is served under /fonts/ beside its licence. */
  fonts: Record<MathFont, string>;
  /** The examples of the ordinary suite, which the guide offers over the bottom box. */
  samples: readonly Sample[];
  /** The tour's stops, in their order. */
  stops: readonly Stop[];
  /** The one-sided rules, as a rule label's hint draws them. */
  rules: readonly Rule[];
}) {
  // Before anything reads the browser's storage: an earlier release's keys move to their new names.
  migrate(storage());
  const view = createUi();
  const { ui, setUi } = view;
  const prover = createProver((text) => setUi("live", text));
  const workspace = createWorkspace(prover, view);
  const packs = createPacks(prover, view);
  /** Whether the page is embedded in a course's own page: the stage, the rest left out. */
  const embedded = isEmbedded(typeof location === "undefined" ? "" : location.hash);
  const [theme, setTheme] = createSignal<Theme>("system");
  const [tip, setTip] = createSignal<{
    text: string;
    key?: string;
    x: number;
    y: number;
  } | null>(null);
  let tipBox: HTMLDivElement | undefined;

  const fontBytes = new Map<MathFont, Promise<Uint8Array>>();
  /**
   * A math font's bytes, each fetched once when first asked for, and added to the document under
   * its family: Euler Math at the start, the stage's font when it is chosen, an export's when an
   * export is set in it; the PNG and PDF exports render with them.
   */
  const font = (name: MathFont = "euler") => {
    let bytes = fontBytes.get(name);
    if (!bytes) {
      const family = MATH_FONTS.find((f) => f.key === name)?.family ?? "Euler Math";
      bytes = fetch(props.fonts[name])
        .then((r) => r.arrayBuffer())
        .then((buffer) => {
          const face = new FontFace(family, buffer.slice(0));
          document.fonts.add(face);
          void face.load();
          return new Uint8Array(buffer);
        });
      // A failed fetch is asked again by the next export.
      bytes.catch(() => fontBytes.delete(name));
      fontBytes.set(name, bytes);
    }
    return bytes;
  };

  // The logic is set in the stage's font, which is loaded when it is chosen and not before.
  createEffect(() => {
    const chosen = prover.settings().stageFont;
    document.documentElement.dataset["mathFont"] = chosen;
    void font(chosen).catch(() => undefined);
  });

  /**
   * Opens a course pack's link, or a hand-in's as its pack with its answers (its problems, a tab
   * each, behind the pack's chip); false where the fragment holds neither.
   */
  async function openPack(hash: string, pasted = false): Promise<boolean> {
    const link = await readPackLink(hash);
    if (!link) return false;
    const refused = (keyword: string, sentence: string) => {
      const id = prover.add();
      prover.banner(id, { keyword, sentence });
    };
    const keyword = link.kind === "pack" ? "Pack not opened" : "Hand-in not opened";
    if ("problem" in link) {
      refused(
        keyword,
        link.problem === "size"
          ? "The link unpacks to more than a link may hold."
          : "The link's document did not unpack: it may have been cut short when it was copied.",
      );
      return true;
    }
    const read = link.kind === "handin" ? readHandin(link.text) : readPack(link.text);
    if ("problem" in read) {
      refused(
        keyword,
        `The link holds no ${link.kind === "handin" ? "hand-in" : "course pack"} this page reads (${read.problem}).`,
      );
      return true;
    }
    if (pasted) {
      prover.leave();
      hold(prover.shelfKey());
    }
    if ("handin" in read) await packs.arrive(read.pack, read.answers);
    else await packs.arrive(read);
    return true;
  }

  /** Opens the proof a link holds, or its sequent alone with the reason where the proof is not read. */
  async function openLink(link: LinkContent) {
    // Linked tabs: each opens on a tab of its own, the link's shown one shown.
    if (link.workspace) {
      const read = await workspace
        .arrive(link.workspace.document, link.workspace.node)
        .catch(() => false);
      if (read) return;
    }
    // A suite or parameter this page does not know opens in the suite's first calculus.
    const calculus =
      calculusOf(link.suite, undefined, link.parameter) ??
      SUITES.find((s) => s.key === link.suite)?.start ??
      SUITES[0]?.start;
    const restored = link.session !== undefined ? await prover.open(link.session) : null;
    if (restored && !("problem" in restored)) return;
    const opened = await prover.open(link.sequent, calculus);
    const p = prover.current();
    if ("problem" in opened) {
      // The link's sequent does not parse: it goes into the field with its
      // problem marked, as if it had been typed.
      const id = prover.add();
      prover.setInput(id, link.sequent);
      if (calculus) await prover.setCalculus(id, calculus);
      await prover.submit(id);
    } else if (p && (link.session !== undefined || link.problem || link.workspace)) {
      prover.banner(p.id, {
        keyword: "Proof not restored",
        sentence:
          restored && "problem" in restored
            ? `The link's proof was not read (${restored.problem.keyword}), so the sequent is loaded alone: start again, or import the session file.`
            : link.problem === "version"
              ? "The link was made by another version of this page, so the sequent is loaded alone."
              : link.workspace
                ? "The linked tabs could not be restored, so the sequent is loaded alone."
                : link.problem === "size"
                  ? "The link's proof unpacks to more than a link may hold, so the sequent is loaded alone: import the session file instead."
                  : "The link's proof did not unpack, so the sequent is loaded alone.",
      });
    }
  }

  /** Lets go of the lock this visit holds on its shelf key, while the page is open. */
  let release: (() => void) | undefined;
  /**
   * Holds a lock named by the visit's shelf key for as long as the visit lasts (the Web Locks
   * API): another tab of the page sees it, and so knows that this visit's proofs are open here.
   */
  const hold = (name: string) => {
    release?.();
    release = undefined;
    void navigator.locks
      ?.request(name, () => new Promise<void>((done) => (release = done)))
      .catch(() => undefined);
  };
  /** Whether no other tab of the page is open: none holds a lock on a shelf key but this visit's. */
  const alone = async () => {
    if (!navigator.locks) return false;
    const held = await navigator.locks.query().catch(() => null);
    if (!held) return false;
    const own = prover.shelfKey();
    return !held.held?.some((lock) => lock.name?.startsWith(SHELF_PREFIX) && lock.name !== own);
  };

  /** Closes every sequent, the closed ones kept to restore: the notice's Undo brings them back. */
  const closeEvery = () => {
    prover.leave();
    hold(prover.shelfKey());
    prover.add();
    setUi({
      menu: null,
      notice: {
        text: "Every sequent closed.",
        undo: { label: "Undo", run: () => prover.restore() },
      },
    });
  };

  /** Closes the open course pack with its problems; the notice's Undo opens it again. */
  const closePack = () => {
    const title = packs.open()?.pack.title || "The course pack";
    const back = packs.close();
    setUi({
      menu: null,
      tab: "tree",
      notice: { text: `${title} closed.`, undo: { label: "Undo", run: back } },
    });
  };

  /** Closes a chip with the views beside it, or the pack a problem is of; the notice's Undo puts them back. */
  const closeChip = (chip: string) => {
    if (ui.packPage || packs.isProblem(chip)) {
      closePack();
      return;
    }
    const closed = prover.store.proofs.find((p) => p.id === chip);
    const text = closed?.input ? tabText(closed) : "The new sequent";
    const back = prover.closeChip(chip);
    setUi({
      menu: null,
      tab: "tree",
      notice: {
        text: `${text} closed.`,
        undo: {
          label: "Undo",
          run: () => {
            back();
            setUi("tab", "tree");
          },
        },
      },
    });
  };

  /** Opens the new tab view: the empty sequent there is, or a new one. */
  const newTab = () => {
    const empty = prover.store.proofs.find(
      (p) => !started(p) && !p.input.trim() && !packs.isProblem(p.id),
    );
    if (empty) prover.activate(empty.id);
    else prover.add();
    setUi({ menu: null, tab: "tree", packPage: false });
    queueMicrotask(() => document.querySelector<HTMLInputElement>(".box .field")?.focus());
  };

  /** Opens a file chosen or dropped: a hand-in, a session, a sequent; the notice names the file. */
  const openFile = async (file: File) => {
    const said = await importText(prover, packs, await file.text(), ` from ${file.name}`);
    setUi({ notice: { text: said.text }, live: said.text, menu: null });
  };
  const [dropping, setDropping] = createSignal(false);

  // While the link and the saved proofs load, a change of the active proof is
  // the page starting, not the visitor's: a menu opened meanwhile stays open.
  let starting = true;
  /** The fragment the page wrote last, as the browser reads it back: a change to it is the page's own. */
  let wrote = "";
  /** The page's start, then each link pasted into it, opened one after another. */
  let opening: Promise<void> = Promise.resolve();

  /**
   * Opens a link pasted into the open page, where only the fragment changed, as a load of it
   * would: the open proofs are set aside to restore and the link's proof opens alone.
   */
  const pasted = (event: HashChangeEvent) => {
    // The event's own address: the page's write of its link may land before the event does.
    const hash = new URL(event.newURL).hash;
    if (hash === wrote) return;
    opening = opening
      .catch(() => undefined)
      .then(async () => {
        if (await openPack(hash, true)) {
          prover.prune();
          if (prover.store.proofs.length === 0) prover.add();
          return;
        }
        const link = await readLink(hash);
        if (!link) return;
        // Not `starting`: the old proof's menus and selection close as the active proof changes.
        prover.leave();
        hold(prover.shelfKey());
        await openLink(link);
        prover.prune();
        if (prover.store.proofs.length === 0) prover.add();
      });
  };

  onMount(() => {
    // The scheme the page was painted in, read before the first paint by the body's first script.
    setTheme(parseTheme(document.documentElement.dataset["theme"] ?? null));
    void font().catch(() => undefined);
    // The worker starts with the first call: this one, so that deduxit's
    // module loads after the first paint, before the visitor's first step.
    void prover.api.about().catch(() => undefined);
    if (embedded) document.documentElement.dataset["embed"] = "";
    // An embedded page is a course page's exercise: it sets no earlier visit's proofs aside.
    else {
      prover.begin();
      hold(prover.shelfKey());
    }
    const hash = location.hash;
    opening = (async () => {
      if (!(await openPack(hash))) {
        const link = await readLink(hash);
        if (link) await openLink(link);
        // A plain visit, with no other tab of the page open, brings the last visit's proofs back.
        else if (!embedded && (await alone())) prover.restore();
      }
      prover.prune();
      if (prover.store.proofs.length === 0) prover.add();
      starting = false;
    })();
    window.addEventListener("hashchange", pasted);
    onCleanup(() => window.removeEventListener("hashchange", pasted));
  });

  // Autosave: every change of a proof, a moment after it settles.
  let saving: ReturnType<typeof setTimeout> | undefined;
  createEffect(
    on(
      () =>
        prover.store.proofs.map((p) => [
          p.session,
          p.input,
          p.calculus,
          p.redo.length,
          p.later.length,
          p.custom?.session,
          p.custom?.file,
          p.custom?.assumptions,
        ]),
      () => {
        clearTimeout(saving);
        saving = setTimeout(() => prover.save(), 300);
      },
      { defer: true },
    ),
  );

  // The link: the proof shown, written into the fragment as it changes.
  let linking: ReturnType<typeof setTimeout> | undefined;
  createEffect(
    on(
      () =>
        [
          prover.current()?.session ?? prover.current()?.custom?.session,
          prover.current()?.calculus,
          prover.current()?.input,
          prover.current()?.modal?.outcome ??
            prover.current()?.lambda?.statement ??
            prover.current()?.lambda?.illTyped,
        ] as const,
      ([session, calculus, input, decided]) => {
        clearTimeout(linking);
        if (!calculus || !input) return;
        // A pack's link stays in the address while it is open: it is what a reload opens again.
        if (packs.open()) return;
        // A modal tab's link holds its sequent and system alone, a lambda tab's its term or type
        // and calculus: each is decided again on arrival.
        if (calculus.suite === "modal" || calculus.suite === "lambda") {
          if (!decided) return;
          linking = setTimeout(async () => {
            const text = calculus.suite === "modal" ? prettyModal(input) : input;
            const written = await writeLink(text, calculus.suite, parameterOf(calculus));
            history.replaceState(null, "", embedded ? `${written.hash}&e=1` : written.hash);
            wrote = location.hash;
          }, 400);
          return;
        }
        if (!session) return;
        linking = setTimeout(async () => {
          // A rule file's sequent is written in the file's own symbols, which no sign replaces.
          const text =
            calculus.suite === "ordinary"
              ? prettyOrdinary(input)
              : calculus.suite === "rules"
                ? input
                : pretty(input);
          const shown = prover.current()?.id;
          const linked = shown ? await workspace.packFor(shown).catch(() => null) : null;
          const written = linked
            ? await writeWorkspaceLink(
                text,
                calculus.suite,
                parameterOf(calculus),
                linked.document,
                linked.node,
                JSON.stringify(unwrap(session)),
              )
            : await writeLink(
                text,
                calculus.suite,
                parameterOf(calculus),
                JSON.stringify(unwrap(session)),
              );
          history.replaceState(null, "", embedded ? `${written.hash}&e=1` : written.hash);
          wrote = location.hash;
        }, 400);
      },
      { defer: true },
    ),
  );

  // Closing a menu when the proof changes; the hint ladder stays with its goal.
  createEffect(
    on(
      () => prover.store.active,
      () =>
        !starting &&
        setUi({
          // An import opens its proof and keeps the panel, to say what it read.
          menu: ui.menu === "import" ? "import" : null,
          // A proof outside the open pack leaves its page.
          ...(packs.isProblem(prover.store.active) ? {} : { packPage: false }),
          selected: null,
          offered: null,
          split: null,
          cutting: null,
          goalMenu: null,
          witnessing: null,
        }),
      { defer: true },
    ),
  );

  /**
   * The hint on the active goal: the search is asked once per goal, and the hint then points at
   * the next press from where the visitor is (`pointer` in Stage.tsx), taking nothing back.
   */
  async function hint() {
    const p = prover.current();
    const goal = prover.activeGoal();
    if (!p?.session || goal === undefined) return;
    const key = ladderKey(p.id, paths(p.session).get(goal) ?? []);
    if (ui.ladder?.key === key && ui.ladder.hint) {
      const said = pointer(prover, view);
      if (said) setUi("live", `Hint: ${said.words}`);
      return;
    }
    setUi("ladder", { key, hint: null });
    try {
      const answer = await prover.hint(goal);
      if (ui.ladder?.key !== key) return;
      setUi("ladder", { key, hint: answer });
      const said = pointer(prover, view);
      if (said) setUi("live", `Hint: ${said.words}`);
    } catch (thrown) {
      if (ui.ladder?.key === key) setUi("ladder", null);
      // A refusal (a forced engine that does not take the goal) is said at the goal.
      if (!(thrown instanceof Cancelled))
        prover.note(
          goal,
          inputProblem(failure(thrown instanceof Error ? thrown.message : thrown)),
          "bad",
        );
    }
  }

  // The one hover rule: any element with a tip shows it on hover and on focus, its key after the
  // words. A finger neither hovers nor means the focus a tap leaves: no tip follows a touch.
  // A rule label's hint is `RuleHints`', which a tap opens too.
  onMount(() => {
    let touched = false;
    const pointer = (event: PointerEvent) => {
      touched = event.pointerType === "touch";
    };
    const typed = () => {
      touched = false;
    };
    const show = (event: Event) => {
      if (touched || (event instanceof PointerEvent && event.pointerType === "touch")) return;
      const element = (event.target as Element | null)?.closest?.("[data-tip]");
      if (!element) return;
      const r = element.getBoundingClientRect();
      const key = element.getAttribute("data-key");
      setTip({
        text: element.getAttribute("data-tip") ?? "",
        ...(key ? { key } : {}),
        x: r.left,
        y: r.bottom + 6,
      });
    };
    const hide = () => setTip(null);
    document.addEventListener("pointerdown", pointer, true);
    document.addEventListener("keydown", typed, true);
    document.addEventListener("pointerover", show);
    document.addEventListener("focusin", show);
    document.addEventListener("pointerout", hide);
    document.addEventListener("focusout", hide);
    onCleanup(() => {
      document.removeEventListener("pointerdown", pointer, true);
      document.removeEventListener("keydown", typed, true);
      document.removeEventListener("pointerover", show);
      document.removeEventListener("focusin", show);
      document.removeEventListener("pointerout", hide);
      document.removeEventListener("focusout", hide);
    });
  });

  // Light dismiss: a press outside what is open closes it, as Escape does. A menu, a pane, More's
  // sheet or the bands' popovers stay open for a press inside them or on their own button; the
  // rule popover and the split chooser also for a press on a formula, by which a rule or a side
  // is chosen; the tour's caption is inside everything it shows. A press on the stage that
  // closes something does nothing else (no formula picked, no pan begun, no button pressed),
  // since the visitor aimed at the open thing; a press on a band's button closes it and acts.
  onMount(() => {
    let swallow = false;
    const pressed = (event: PointerEvent) => {
      swallow = false;
      const target = event.target as Element;
      if (target.closest(".tour")) return;
      const outside = (inside: string) => !target.closest(inside);
      let closed = false;
      // The Settings page is a page, not something open over one: only its own button leaves it.
      if (
        ui.menu &&
        ui.menu !== "settings" &&
        outside(".menu, .dialog, [aria-expanded='true']:not(.fb)")
      ) {
        setUi("menu", null);
        closed = true;
      }
      if (ui.more && outside(".tools")) {
        setUi("more", false);
        closed = true;
      }
      if ((ui.selected || ui.split) && outside(".stage .pop, .premises, .fb")) {
        setUi({ selected: null, offered: null, split: null });
        closed = true;
      }
      // The cut's box stays while its formulas are chosen and the tool that opened it is pressed.
      if (ui.cutting && outside(".stage .pop, .premises, .fb, .tools")) {
        setUi("cutting", null);
        closed = true;
      }
      if (ui.goalMenu !== null && outside(".goal-menu, .gt")) {
        setUi("goalMenu", null);
        closed = true;
      }
      if (ui.witnessing && outside(".stage .pop, .fb")) {
        setUi("witnessing", null);
        closed = true;
      }
      if (closed && target.closest(".stage")) {
        swallow = true;
        event.stopPropagation();
      }
    };
    const clicked = (event: MouseEvent) => {
      if (!swallow) return;
      swallow = false;
      event.preventDefault();
      event.stopPropagation();
    };
    // A press that never clicks (a drag) leaves nothing to swallow for a key's click.
    const typed = () => {
      swallow = false;
    };
    document.addEventListener("pointerdown", pressed, true);
    document.addEventListener("click", clicked, true);
    document.addEventListener("keydown", typed, true);
    onCleanup(() => {
      document.removeEventListener("pointerdown", pressed, true);
      document.removeEventListener("click", clicked, true);
      document.removeEventListener("keydown", typed, true);
    });
  });

  createEffect(() => {
    const t = tip();
    if (!t || !tipBox) return;
    const width = tipBox.offsetWidth;
    const height = tipBox.offsetHeight;
    const x = Math.max(8, Math.min(t.x, window.innerWidth - width - 8));
    const y = t.y + height > window.innerHeight - 8 ? t.y - height - 40 : t.y;
    tipBox.style.left = `${x}px`;
    tipBox.style.top = `${y}px`;
  });

  /** Shows the view next to the one shown in the rail, `step` cells on. */
  const cycleView = (step: number) => {
    const cells = cellsOf(prover, view, prover.current());
    if (cells.length < 2) return;
    const at = cells.findIndex(
      (c) => c.view === ui.tab && (c.view === "graph" || c.proof === prover.store.active),
    );
    const next = cells[(Math.max(at, 0) + step + cells.length) % cells.length];
    if (next) {
      prover.activate(next.proof);
      setUi({ tab: next.view, menu: null });
    }
  };
  /** Shows the sequent next to the one shown in the top row, `step` chips on; the pack is one. */
  const cycleSequent = (step: number) => {
    const all = [
      ...(packs.open() ? ["pack"] : []),
      ...prover.store.proofs
        .filter((p) => prover.chipOf(p.id) === p.id && !packs.isProblem(p.id))
        .map((p) => p.id),
    ];
    const here =
      ui.packPage || packs.isProblem(prover.store.active)
        ? "pack"
        : prover.chipOf(prover.store.active ?? "");
    const at = all.indexOf(here);
    const next = all[(Math.max(at, 0) + step + all.length) % all.length];
    if (next === "pack") setUi({ menu: null, tab: "tree", packPage: true });
    else if (next) {
      prover.activate(next);
      setUi({ menu: null, tab: "tree", packPage: false });
    }
  };

  // The keys: every action has one (src/lib/keys.ts); a single key only outside a field, and
  // only while Settings' "Single keys" is on. The zoom's keys are the stage's.
  onMount(() => {
    const keys = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return;
      const inField = !!(event.target as Element).closest("input, textarea, select");
      // In a field, Escape leaves the field and closes nothing around it.
      if (event.key === "Escape" && inField) {
        (event.target as HTMLElement).blur();
        event.preventDefault();
        return;
      }
      if (event.key === "Escape") {
        if (ui.menu === null && !ui.more) return;
        setTip(null);
        setUi({ menu: null, more: false });
        event.preventDefault();
        return;
      }
      // A dialog open (the keys, About) takes no key but Escape.
      if (ui.menu === "keys" || ui.menu === "about") return;
      const action = keyAction(event, { inField, singleKeys: prover.settings().singleKeys });
      if (!action) return;
      // A pack's page has no view: only the keys of the frame act there.
      const frameKeys = [
        "nextSequent",
        "previousSequent",
        "closeSequent",
        "newTab",
        "settings",
        "keys",
      ];
      if (packShown() && !frameKeys.includes(action)) return;
      const proof = prover.current();
      const proving = !!proof?.session && ui.tab === "tree" && !isNatural(proof.calculus);
      const goal = prover.activeGoal();
      const toggle = (menu: "steps" | "export" | "import" | "views" | "settings" | "keys") =>
        setUi("menu", ui.menu === menu ? null : menu);
      const act: Partial<Record<typeof action, () => void>> = {
        undo: () =>
          ui.tab === "tree"
            ? (proving || !!proof?.custom?.session) && void prover.undo()
            : viewUndo(prover, view),
        redo: () =>
          ui.tab === "tree"
            ? (proving || !!proof?.custom?.session) && void prover.redo()
            : viewRedo(prover, view),
        steps: () => proving && toggle("steps"),
        hint: () => proving && void hint(),
        close: () => proving && goal !== undefined && void prover.close(goal),
        closeAll: () => proving && void prover.closeAll(),
        export: () => proof?.session && toggle("export"),
        import: () => toggle("import"),
        nextGoal: () => proving && prover.cycle(1),
        previousGoal: () => proving && prover.cycle(-1),
        nextSequent: () => cycleSequent(1),
        previousSequent: () => cycleSequent(-1),
        closeSequent: () => {
          const p = prover.current();
          if (p) closeChip(prover.chipOf(p.id));
        },
        graph: () => {
          const p = prover.current();
          if (!p) return;
          const chip = prover.chipOf(p.id);
          if (!cellsOf(prover, view, p).some((c) => c.view === "graph")) return;
          prover.activate(chip);
          setUi({ tab: ui.tab === "graph" ? "tree" : "graph", menu: null });
        },
        nextView: () => cycleView(1),
        previousView: () => cycleView(-1),
        addView: () => started(proof) && toggle("views"),
        newTab: () => newTab(),
        box: () => document.querySelector<HTMLInputElement>(".box .field")?.focus(),
        settings: () => toggle("settings"),
        keys: () => toggle("keys"),
      };
      const run = act[action];
      if (!run) return;
      event.preventDefault();
      run();
    };
    window.addEventListener("keydown", keys);
    onCleanup(() => window.removeEventListener("keydown", keys));
  });

  // A notice says what was just done: the next change of the proof shown takes it away.
  createEffect(
    on(
      () => [prover.current()?.session, prover.current()?.input] as const,
      () => setUi("notice", null),
      { defer: true },
    ),
  );

  // A note at a goal is said in the live region too, for a screen reader.
  createEffect(
    on(
      () => prover.current()?.note,
      (note) => {
        if (note) setUi("live", `${note.said.keyword}. ${note.said.sentence}`);
      },
      { defer: true },
    ),
  );

  const settingsShown = () => ui.menu === "settings";
  /** Whether the open pack's page stands in the stage's place. */
  const packShown = () => ui.packPage && !!packs.open();
  const current = () => prover.current();
  const tour = () => {
    setUi({ menu: null, tour: null });
    setUi("tour", 0);
  };

  return (
    <PacksContext.Provider value={packs}>
      <WorkspaceContext.Provider value={workspace}>
        <div class="app" data-guide={prover.settings().guide ? "" : undefined}>
          <TopRow
            prover={prover}
            ui={view}
            theme={theme}
            setTheme={setTheme}
            newTab={newTab}
            closeChip={closeChip}
            closePack={closePack}
          />
          {/* biome-ignore lint/a11y/noStaticElementInteractions: a file dropped anywhere under the top row opens; "Open a file" and Import are the controls that do the same. */}
          <div
            class="body"
            data-dropping={dropping() ? "" : undefined}
            onDragOver={(event) => {
              if (!event.dataTransfer?.types.includes("Files")) return;
              event.preventDefault();
              setDropping(true);
            }}
            onDragLeave={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget as Node | null))
                setDropping(false);
            }}
            onDrop={(event) => {
              event.preventDefault();
              setDropping(false);
              const file = event.dataTransfer?.files[0];
              if (file) void openFile(file);
            }}
          >
            <Show when={!settingsShown() && !packShown()}>
              <Rail prover={prover} ui={view} />
            </Show>
            <div class="stage-area" data-view={ui.tab}>
              <Show
                when={!settingsShown()}
                fallback={
                  <SettingsPage
                    prover={prover}
                    ui={view}
                    theme={theme}
                    setTheme={setTheme}
                    closeEvery={closeEvery}
                  />
                }
              >
                <Show when={!packShown()} fallback={<PackPage packs={packs} prover={prover} />}>
                  <Show
                    when={started(current())}
                    fallback={
                      <NewTab
                        prover={prover}
                        ui={view}
                        samples={props.samples}
                        openFile={(file) => void openFile(file)}
                      />
                    }
                  >
                    <Stage prover={prover} ui={view} />
                    <Tools prover={prover} ui={view} hint={() => void hint()} tour={tour} />
                  </Show>
                  <TogglesPlace prover={prover} ui={view} />
                  <div class="panels">
                    {/* In a compact window a panel is a sheet, and a sheet has a close button. */}
                    <Show when={PANELS.includes(ui.menu ?? "")}>
                      <button
                        type="button"
                        class="tool sheet-close"
                        aria-label="Close"
                        data-tip="Close"
                        onClick={() => setUi("menu", null)}
                      >
                        <Sign name="cross" />
                      </button>
                    </Show>
                    <Show when={ui.menu === "steps"}>
                      <StepsPanel prover={prover} />
                    </Show>
                    <Show when={ui.menu === "search"}>
                      <SearchPanel prover={prover} ui={view} />
                    </Show>
                    <Show when={ui.menu === "export"}>
                      <ExportPanel prover={prover} ui={view} font={font} />
                    </Show>
                    <Show when={ui.menu === "import"}>
                      <ImportPanel prover={prover} ui={view} />
                    </Show>
                  </div>
                  <BottomBox
                    prover={prover}
                    ui={view}
                    notes={
                      <>
                        <Show when={current()}>{(p) => <ProblemNote proof={p()} />}</Show>
                        <Show when={current()?.banner}>
                          {(banner) => (
                            <p class="note said-banner" role="status">
                              <span class="kw">{banner().keyword}</span> <Why said={banner()} />
                            </p>
                          )}
                        </Show>
                        <GoalNotes prover={prover} ui={view} />
                        <GuideLine prover={prover} ui={view} />
                        <Show when={current()?.view?.complete && ui.tab === "tree"}>
                          <p class="note verdict" role="status">
                            <span class="kw ok">Proved.</span> Every goal is closed.
                          </p>
                        </Show>
                        <Show when={ui.notice}>
                          {(notice) => (
                            <p class="note notice" role="status">
                              {notice().text}
                              <Show when={notice().undo}>
                                {(undo) => (
                                  <button
                                    type="button"
                                    class="btn"
                                    onClick={() => {
                                      const run = undo().run;
                                      setUi("notice", null);
                                      run();
                                    }}
                                  >
                                    {undo().label}
                                  </button>
                                )}
                              </Show>
                            </p>
                          )}
                        </Show>
                        <Examples prover={prover} samples={props.samples} />
                      </>
                    }
                  />
                </Show>
                <Show when={embedded}>
                  <a
                    class="embed-open btn"
                    href="/"
                    target="_blank"
                    // The address as it is when pressed: the proof shown, the embed's mark left out.
                    onClick={(event) => {
                      event.currentTarget.href = location.href.replace(/&e=1\b/, "");
                    }}
                    rel="noopener"
                  >
                    Open in deduxit
                  </a>
                </Show>
              </Show>
              <Show when={dropping()}>
                <div class="drop">
                  <p>Drop the file to open it</p>
                </div>
              </Show>
            </div>
          </div>
          <Show when={ui.menu === "keys"}>
            <Dialog label="Keys" onClose={() => setUi("menu", null)}>
              <label class="sw">
                <input
                  type="checkbox"
                  checked={prover.settings().guide}
                  onChange={(event) => prover.setSettings({ guide: event.currentTarget.checked })}
                />
                <span class="sw-t" aria-hidden="true" />
                Guide
              </label>
              <table class="keys">
                <thead>
                  <tr>
                    <th scope="col">Action</th>
                    <th scope="col">Key</th>
                    <th scope="col">Also</th>
                  </tr>
                </thead>
                <tbody>
                  <For each={KEY_ROWS}>
                    {(row) => (
                      <tr>
                        <td>{row.what}</td>
                        <td>
                          <kbd>{row.key}</kbd>
                        </td>
                        <td>{row.also ?? ""}</td>
                      </tr>
                    )}
                  </For>
                </tbody>
              </table>
              <Show when={!prover.settings().singleKeys}>
                <p class="sub">
                  Single keys are off in Settings: only the keys with Ctrl or Cmd act.
                </p>
              </Show>
            </Dialog>
          </Show>
          <Show when={ui.menu === "about"}>
            <Dialog label="About" onClose={() => setUi("menu", null)}>
              <AboutPane prover={prover} />
            </Dialog>
          </Show>
          <Tour prover={prover} ui={view} stops={props.stops} />
          <Show when={tip()}>
            {(t) => (
              <div class="tip" ref={tipBox} role="tooltip">
                {t().text}
                <Show when={t().key}>{(k) => <kbd>{k()}</kbd>}</Show>
              </div>
            )}
          </Show>
          <RuleHints
            hints={(() => {
              const calculus = prover.current()?.calculus;
              return calculus ? hintsFor(props.rules, calculus, false) : [];
            })()}
            drawn={(() => {
              const calculus = prover.current()?.calculus;
              return calculus ? hintsFor(props.rules, calculus, prover.settings().twoSided) : [];
            })()}
          />
          <div class="sr-only" aria-live="polite">
            {ui.live}
          </div>
        </div>
      </WorkspaceContext.Provider>
    </PacksContext.Provider>
  );
}
