// deduxit © Fabian Lukas Grubmüller 2026
// Licensed under the EUPL

/**
 * The workspace of linked tabs: tabs made from one another (a translation and its proof, a
 * copy), each a proof node of deduxit's workspace document, which the page holds and sends with
 * every `workspace_…` call. Until the first link the page is as it was: no document, no call,
 * no button. The panel lists the linked tabs, each under the line that says how it was made;
 * its Undo and Redo take back whole changes by name; the graph is the same list in columns.
 */

import {
  batch,
  createContext,
  createEffect,
  createMemo,
  createSignal,
  For,
  on,
  onCleanup,
  onMount,
  Show,
  useContext,
} from "solid-js";
import { createStore } from "solid-js/store";
import { failure } from "../lib/deduxit";
import { isOrdinary, type OrdinarySession, sequentText } from "../lib/ordinary";
import { ordinary, type Logic } from "../lib/suites";
import { displayed } from "../lib/words";
import {
  type Action,
  buttonName,
  changeWords,
  checkWords,
  type Edit,
  joined,
  type Named,
  outOfDate,
  type Row,
  rowsOf,
  sequentNode,
  type WorkspaceView,
} from "../lib/workspace";
import type { Prover } from "./state";
import type { Ui } from "./ui";

/** The workspace, for the parts of the page that link tabs (the sheets, the Logic popover). */
export const WorkspaceContext = createContext<Workspace>();

/** The page's workspace; every component under the app has it. */
export const useWorkspace = () => useContext(WorkspaceContext);

/** The narrowest stage row that docks the panel: the panel's 320 pixels and a stage of 640. */
export const DOCK_WIDTH = 960;

/** The workspace's state on the page. */
export type Workspace = ReturnType<typeof createWorkspace>;

/** Creates the workspace's state over the prover's tabs; it does nothing before the first link. */
export function createWorkspace(prover: Prover, ui: Ui) {
  const { setUi } = ui;
  const [state, setState] = createStore<{
    /** The document as the last answer gave it, or null before the first link. */
    doc: string | null;
    /** Each linked tab's proof node, by the tab's id. */
    tabs: Record<string, number>;
    view: WorkspaceView | null;
    /** Whether the panel is shown where it docks. */
    shown: boolean;
    /** Whether the panel has been shown in this visit: its first-time sentence. */
    told: boolean;
    /** Whether the graph is shown in the stage's place. */
    graph: boolean;
    /** The row whose action runs. */
    running: number | null;
  }>({ doc: null, tabs: {}, view: null, shown: false, told: false, graph: false, running: null });
  /** The window's width, which decides whether the panel docks. */
  const [width, setWidth] = createSignal(window.innerWidth);
  onMount(() => {
    const resized = () => setWidth(window.innerWidth);
    window.addEventListener("resize", resized);
    onCleanup(() => window.removeEventListener("resize", resized));
  });
  /** Whether the panel docks left of the stage: a wide window with Learn's frame closed. */
  const docks = () => width() >= DOCK_WIDTH && !ui.ui.learn;
  /** Each linked tab's sequent as it was when the workspace last saw it, by the tab's id. */
  const seen = new Map<string, string>();
  /** The workspace's calls, one after another: each answer is the next call's document. */
  let queue: Promise<unknown> = Promise.resolve();
  const settings = () => prover.json();

  /** A linked tab's ordinary session, or null for a tab that is not linked or not started. */
  const sessionOf = (tab: string): OrdinarySession | null => {
    const p = prover.store.proofs.find((q) => q.id === tab);
    return p?.session && isOrdinary(p.session) ? p.session : null;
  };

  /** The proof nodes the workspace remade whose tabs do not show the new session yet. */
  const remade = new Set<number>();
  /**
   * Each linked tab's latest session of the sequent the workspace knows it by, steps included:
   * what a change of its sequent or its closing keeps for Undo, since the tab no longer holds it.
   */
  const latest = new Map<string, OrdinarySession>();
  /** The tabs the workspace opened (a translation's proof, a copy, a link's), which its Undo closes. */
  const opened = new Set<string>();
  /** The tabs an Undo or a change unlinked but left open, by their node: a Redo links them again. */
  const parked = new Map<number, string>();

  /**
   * The sessions of the linked tabs as they are now, by node: laid in before each call, but for a
   * node just remade, whose tab still shows the session before, and with `kept` laid over.
   */
  const work = (kept: ReadonlyMap<number, OrdinarySession> = new Map()) => {
    const sessions: Record<string, OrdinarySession> = {};
    for (const [tab, node] of Object.entries(state.tabs)) {
      const session = sessionOf(tab);
      if (session && !remade.has(node)) sessions[String(node)] = session;
    }
    for (const [node, session] of kept) sessions[String(node)] = session;
    return JSON.stringify(sessions);
  };

  /** What the workspace compares of a tab: its logic and its sequent. */
  const keyOf = (session: OrdinarySession) => `${session.logic}\n${sequentText(session)}`;

  /** Runs `step` after the calls before it, keeping the queue alive past a failure. */
  const queued = <T,>(step: () => Promise<T>): Promise<T> => {
    const next = queue.then(step);
    queue = next.catch(() => undefined);
    return next;
  };

  /** Reads the view of the document now. */
  async function look() {
    const doc = state.doc;
    if (doc === null) return;
    const view = await prover.api.workspace.view(doc, work(), settings());
    setState("view", view);
  }

  /**
   * Makes again, by themselves, the runs that need no search and are out of date or not run
   * (a translation of a changed sequent): what needs no search is never shown stale.
   */
  async function remake() {
    const doc = state.doc;
    const view = state.view;
    if (doc === null || !view) return;
    const stale = view.nodes
      .filter(
        (n) =>
          n.class === "derived" &&
          n.cost === "instant" &&
          n.state.state !== "current" &&
          n.state.cause !== "waits",
      )
      .map((n) => n.node);
    if (stale.length === 0) return;
    const ran = await prover.api.workspace.run(doc, stale, work(), settings());
    setState("doc", ran.workspace);
    await look();
  }

  /**
   * Makes one action, then what needs no search, and reads the view; returns what each edit made.
   * `kept` lays sessions in for nodes whose tabs no longer hold them.
   */
  async function act(action: Action, kept?: ReadonlyMap<number, OrdinarySession>) {
    const answer = await prover.api.workspace.edit(state.doc ?? "", action, work(kept), settings());
    setState("doc", answer.workspace);
    await look();
    await remake();
    return answer.made;
  }

  /** Makes a node's check, the answer kept where the node still asks for it. */
  async function checkNode(node: number) {
    const doc = state.doc;
    if (doc === null) return;
    const computed = await prover.api.workspace.compute(doc, node, "check", work(), settings());
    const accepted = await prover.api.workspace.accept(doc, computed, work(), settings());
    setState("doc", accepted.workspace);
    await look();
  }

  /** The statement of a tab's sequent: its document with its logic and text. */
  const statement = (session: OrdinarySession) =>
    prover.api.workspace.statement("ordinary", sequentText(session), session.logic, settings());

  /**
   * The edits that join a tab to the workspace if it is not there yet, and how a later edit names
   * its sequent's node; `at` is the index the edits start at in the action.
   */
  async function joining(
    tab: string,
    at: number,
  ): Promise<{ edits: Edit[]; sequent: Named } | null> {
    const session = sessionOf(tab);
    if (!session) return null;
    const known = state.tabs[tab];
    if (known !== undefined && state.view) {
      const sequent = sequentNode(state.view, known);
      return sequent === null ? null : { edits: [], sequent };
    }
    const join = joined(await statement(session), JSON.stringify(session), at);
    return { edits: join.edits, sequent: join.sequent };
  }

  /** Records a tab's proof node and the sequent it holds now. */
  function link(tab: string, node: number) {
    // Seen first: the write below runs the effects that compare a tab's sequent with it.
    const session = sessionOf(tab);
    if (session) {
      seen.set(tab, keyOf(session));
      latest.set(tab, session);
    }
    setState("tabs", tab, node);
  }

  /** Forgets a tab's link, leaving the tab as it is. */
  function unlink(tab: string) {
    setState("tabs", tab, undefined as unknown as number);
    seen.delete(tab);
    latest.delete(tab);
  }

  /** Shows the panel by itself at the visit's first link, where it docks. */
  function firstLink() {
    if (state.told) return;
    setState("told", true);
    if (docks()) setState("shown", true);
  }

  /** Opens a proof node's session on a new tab, and links that tab to the node. */
  async function openNode(node: number, logic: Logic): Promise<string | null> {
    const value = state.view?.nodes.find((n) => n.node === node)?.value;
    if (!value) return null;
    const done = await prover.open(JSON.stringify(value), ordinary(logic));
    if ("problem" in done) return null;
    const tab = prover.current()?.id ?? null;
    if (tab) {
      opened.add(tab);
      link(tab, node);
    }
    return tab;
  }

  /** Says a failed workspace call in the status line. */
  const said = (thrown: unknown) => {
    const f = failure(thrown);
    setUi("live", f ? `The workspace refused: ${f.message}` : "The workspace's call was stopped.");
  };

  /** The tabs the visitor closed, each taken out of the workspace in one action. */
  createEffect(
    on(
      () => prover.store.proofs.map((p) => p.id),
      (open) => {
        const gone = Object.keys(state.tabs).filter((tab) => !open.includes(tab));
        if (gone.length === 0) return;
        void queued(async () => {
          const edits: Edit[] = [];
          // The closed tab's last session is what its node keeps, so that Undo reopens it so.
          const kept = new Map<number, OrdinarySession>();
          for (const tab of gone) {
            const node = state.tabs[tab] as number;
            edits.push({ remove: { node } });
            const session = latest.get(tab);
            if (session) kept.set(node, session);
          }
          batch(() => {
            for (const tab of gone) {
              unlink(tab);
              opened.delete(tab);
            }
          });
          await act({ name: "closing", edits }, kept);
        }).catch(said);
      },
      { defer: true },
    ),
  );

  /**
   * A linked tab's sequent or logic changed by the visitor (a new sequent typed and started, the
   * logic switched): the tab that owns its sequent (no line above it) changes that given sequent,
   * which puts what was made from it out of date; a tab made from another, or a copy, leaves the
   * workspace, since its sequent is another tab's to change. Steps keep the tab's latest session.
   */
  createEffect(
    on(
      () =>
        Object.keys(state.tabs).map((tab) => {
          const session = sessionOf(tab);
          return [tab, session] as const;
        }),
      (tabs) => {
        for (const [tab, session] of tabs) {
          if (!session) continue;
          const key = keyOf(session);
          if (seen.get(tab) === key) {
            latest.set(tab, session);
            continue;
          }
          const before = latest.get(tab);
          seen.set(tab, key);
          latest.set(tab, session);
          const node = state.tabs[tab];
          const view = state.view;
          if (node === undefined || !view) continue;
          const row = rows().find((r) => r.tab === tab);
          const input = sequentNode(view, node);
          const owns =
            row !== undefined &&
            row.line === null &&
            view.nodes.find((n) => n.node === input)?.class == null;
          const text = sequentText(session);
          if (!owns || input === null) {
            void queued(async () => {
              unlink(tab);
              parked.set(node, tab);
              await act(
                { name: "unlinking", edits: [{ remove: { node } }] },
                before ? new Map([[node, before]]) : undefined,
              );
              setUi(
                "live",
                `${displayed(text)} is no longer linked: its sequent was made from another tab. Workspace has Undo unlinking.`,
              );
            }).catch(said);
            continue;
          }
          const logicChanged = before !== undefined && before.logic !== session.logic;
          void queued(async () => {
            const value = await statement(session);
            await act(
              {
                name: logicChanged ? "logic change" : "sequent change",
                // The tab's proof starts on the new sequent, as the tab's own did: restarted,
                // then the tab's session laid in, so that it is current. The node holds the
                // earlier proof before the action, so that its Undo brings that proof back.
                edits: [
                  { set: { node: input, value } },
                  { restart: { node } },
                  { work: { node, session: JSON.stringify(session) } },
                ],
              },
              before ? new Map([[node, before]]) : undefined,
            );
            const stale = outOfDate(rows());
            if (stale > 0) setUi("live", changeWords(stale, state.view?.undo ?? null));
          }).catch(said);
        }
      },
      { defer: true },
    ),
  );

  const rows = createMemo((): Row[] => (state.view ? rowsOf(state.view, state.tabs) : []));

  /** Takes back or brings back the workspace's last change, its tabs' proofs as they were. */
  const undo = (forward: boolean) =>
    queued(async () => {
      const doc = state.doc;
      if (doc === null) return;
      const answer = await prover.api.workspace.undo(doc, work(), settings(), forward);
      setState("doc", answer.workspace);
      // A tab parked by an earlier Undo or change whose node is back is linked again.
      const open = new Set(prover.store.proofs.map((p) => p.id));
      for (const [key, session] of Object.entries(answer.sessions)) {
        const node = Number(key);
        const tab = parked.get(node);
        if (tab === undefined) continue;
        parked.delete(node);
        if (!open.has(tab)) continue;
        // The tab shows the session back first, and is seen so: the write runs the change's
        // effect, which would read the tab's own sequent as a new change.
        await prover.showOrdinarySession(tab, session);
        seen.set(tab, keyOf(session));
        latest.set(tab, session);
        setState("tabs", tab, node);
      }
      // Each tab first shows the session the change brought back, then the view is read with it.
      const byNode = new Map(Object.entries(state.tabs).map(([tab, node]) => [node, tab]));
      for (const [node, session] of Object.entries(answer.sessions)) {
        const tab = byNode.get(Number(node));
        if (tab) {
          seen.set(tab, keyOf(session));
          latest.set(tab, session);
          await prover.showOrdinarySession(tab, session);
        }
      }
      await look();
      // A tab whose node the change took away: closed if the workspace opened it, else unlinked.
      const alive = new Set((state.view?.nodes ?? []).map((n) => n.node));
      for (const [node, tab] of Array.from(byNode.entries())) {
        if (alive.has(node)) continue;
        unlink(tab);
        parked.set(node, tab);
        if (opened.delete(tab)) prover.remove(tab);
      }
      // A proof whose tab was closed comes back on a tab of its own.
      const linked = new Set(Object.values(state.tabs));
      for (const n of state.view?.nodes ?? []) {
        if (n.class !== "work" || linked.has(n.node) || !isOrdinary(n.value)) continue;
        parked.delete(n.node);
        await openNode(n.node, (n.value as OrdinarySession).logic);
      }
      if (answer.name) setUi("live", `${forward ? "Redone" : "Undone"}: ${answer.name}.`);
      if (rows().length === 0) reset();
    }).catch(said);

  /** Forgets the workspace when no linked tab is left: the page is as before the first link. */
  function reset() {
    batch(() => {
      setState({ doc: null, tabs: {}, view: null, shown: false, graph: false, running: null });
    });
    seen.clear();
    latest.clear();
    opened.clear();
    parked.clear();
  }

  return {
    state,
    rows,
    docks,
    /** Whether any tab is linked: the button and the panel exist only then. */
    linked: () => rows().length > 0,
    buttonName: () => buttonName(rows()),
    stale: () => outOfDate(rows()),
    setShown: (shown: boolean) => setState("shown", shown),
    setGraph: (graph: boolean) => setState("graph", graph),
    undo: () => undo(false),
    redo: () => undo(true),

    /**
     * "Prove it in ⟨logic⟩" on the translation sheet: one action, "translation", that joins the
     * shown tab, translates its sequent and starts a proof of the translation, which opens on a
     * new tab; the line's check is made at once.
     */
    proveTranslation: (tab: string, translation: string, target: Logic) =>
      queued(async () => {
        const join = await joining(tab, 0);
        if (!join) return;
        const at = join.edits.length;
        const made = await act({
          name: "translation",
          edits: [
            ...join.edits,
            {
              connect: {
                operation: "ordinary.translate",
                from: [join.sequent],
                parameters: { translation, target },
              },
            },
            { connect: { operation: "ordinary.start", from: [{ made: at }] } },
          ],
        });
        if (join.edits.length > 0) link(tab, made[1] as number);
        const translated = made[at] as number;
        const proof = made[at + 1] as number;
        await checkNode(translated);
        const opened = await openNode(proof, target);
        firstLink();
        const source = sessionOf(tab);
        const target_ = opened ? sessionOf(opened) : null;
        if (source && target_)
          setUi(
            "live",
            `${displayed(sequentText(target_))} was made from ${displayed(sequentText(source))} by ${
              state.view?.nodes.find((n) => n.node === translated)
                ? translationName(translation)
                : "a translation"
            }.`,
          );
      }).catch(said),

    /** "Duplicate this proof": one action, "copy", a new tab with the same proof, linked. */
    duplicate: (tab: string) =>
      queued(async () => {
        const session = sessionOf(tab);
        if (!session) return;
        const join = await joining(tab, 0);
        if (!join) return;
        const at = join.edits.length;
        const made = await act({
          name: "copy",
          edits: [
            ...join.edits,
            { connect: { operation: "ordinary.start", from: [join.sequent] } },
            { work: { node: { made: at }, session: JSON.stringify(session) } },
          ],
        });
        if (join.edits.length > 0) link(tab, made[1] as number);
        await openNode(made[at] as number, session.logic);
        firstLink();
        setUi("live", `${displayed(sequentText(session))}: a copy opened on a new tab.`);
      }).catch(said),

    /** Start again: the row's proof made anew from its sequent now; Undo brings the old one back. */
    startAgain: (row: Row) =>
      queued(async () => {
        setState("running", row.node);
        remade.add(row.node);
        try {
          await act({ name: "restart", edits: [{ restart: { node: row.node } }] });
          const value = state.view?.nodes.find((n) => n.node === row.node)?.value;
          if (isOrdinary(value)) {
            seen.set(row.tab, keyOf(value));
            latest.set(row.tab, value);
            await prover.showOrdinarySession(row.tab, value);
          }
          prover.activate(row.tab);
          setUi("live", "Started again. Workspace has Undo restart.");
        } finally {
          remade.delete(row.node);
          setState("running", null);
          await look();
        }
      }).catch(said),

    /**
     * What a link of the tab holds: the workspace's part with the tab's linked group (its proof
     * and what it was made from, no results) and the tab's node; null for a tab not linked.
     */
    packFor: (tab: string) =>
      queued(async () => {
        const node = state.tabs[tab];
        const doc = state.doc;
        if (node === undefined || doc === null) return null;
        // The tab's linked group: every tab joined to it by lines, either way.
        const all = rows();
        const nodes = [node];
        for (let at = 0; at < nodes.length; at++) {
          const here = nodes[at];
          for (const r of all) {
            const next =
              r.node === here ? r.line?.from : r.line?.from === here ? r.node : undefined;
            if (next != null && !nodes.includes(next)) nodes.push(next);
          }
        }
        const document = await prover.api.workspace.pack(doc, nodes, work(), settings());
        return { document, node };
      }),

    /**
     * Opens the linked tabs a link holds, each on a tab of its own, the link's shown tab shown;
     * what needs no search is made at once, and the panel stays closed. Returns whether it read.
     */
    arrive: (document: string, shown: number) =>
      queued(async () => {
        const opened = await prover.api.workspace.open(document, settings());
        setState({ doc: opened, told: true });
        await look();
        await remake();
        let tab: string | null = null;
        for (const n of state.view?.nodes ?? []) {
          if (n.class !== "work" || !isOrdinary(n.value)) continue;
          const made = await openNode(n.node, n.value.logic);
          if (n.node === shown) tab = made;
        }
        await look();
        const count = rows().length;
        if (tab) {
          prover.activate(tab);
          prover.banner(tab, {
            keyword: "Linked tabs",
            sentence: `This link holds ${count} linked ${count === 1 ? "tab" : "tabs"}. The Workspace button shows them.`,
          });
        }
        return count > 0;
      }),

    /** Makes a line's check. */
    check: (node: number) =>
      queued(async () => {
        setState("running", node);
        try {
          await checkNode(node);
        } finally {
          setState("running", null);
        }
      }).catch(said),
  };
}

/** A translation's name as the status line says it. */
const translationName = (key: string) =>
  ({
    glivenko: "Glivenko's translation",
    kolmogorov: "Kolmogorov's translation",
    kuroda: "Kuroda's translation",
    "godel-gentzen": "Gödel and Gentzen's translation",
  })[key] ?? "a translation";

/** The Workspace button in the top band, before the tabs: shown from the first link. */
export function WorkspaceButton(props: { workspace: Workspace; ui: Ui }) {
  const toggle = () => {
    if (props.workspace.docks()) props.workspace.setShown(!props.workspace.state.shown);
    else props.ui.setUi("menu", props.ui.ui.menu === "workspace" ? null : "workspace");
  };
  return (
    <Show when={props.workspace.linked()}>
      <button
        type="button"
        class="btn ws-button"
        data-warn={props.workspace.stale() > 0 ? "" : undefined}
        aria-expanded={
          props.workspace.docks() ? props.workspace.state.shown : props.ui.ui.menu === "workspace"
        }
        aria-label={props.workspace.buttonName()}
        onClick={toggle}
      >
        Workspace <span class="ws-count">{props.workspace.rows().length}</span>
      </button>
    </Show>
  );
}

/** The panel of linked tabs: docked left of the stage, or a sheet where the window is narrow. */
export function WorkspacePanel(props: {
  workspace: Workspace;
  prover: Prover;
  ui: Ui;
  docked: boolean;
}) {
  const ws = () => props.workspace;
  const view = () => ws().state.view;
  const close = () => {
    if (props.docked) ws().setShown(false);
    else props.ui.setUi("menu", null);
  };
  let title: HTMLHeadingElement | undefined;
  createEffect(() => {
    if (!props.docked) title?.focus();
  });
  return (
    <section
      class={props.docked ? "ws-panel" : "ws-panel cluster menu"}
      data-docked={props.docked ? "" : undefined}
      role={props.docked ? undefined : "dialog"}
      aria-label="Workspace"
    >
      <div class="ws-head">
        <h2 class="pr-title" tabindex="-1" ref={title}>
          Workspace
        </h2>
        <button
          type="button"
          class="btn btn-small"
          aria-label="Close the workspace"
          onClick={close}
        >
          ×
        </button>
      </div>
      <Show when={view()?.undo || view()?.redo}>
        <p class="row ws-undo">
          <Show when={view()?.undo}>
            {(name) => (
              <button type="button" class="btn btn-small" onClick={() => void ws().undo()}>
                Undo {name()}
              </button>
            )}
          </Show>
          <Show when={view()?.redo}>
            {(name) => (
              <button type="button" class="btn btn-small" onClick={() => void ws().redo()}>
                Redo {name()}
              </button>
            )}
          </Show>
        </p>
      </Show>
      <Show when={ws().rows().length >= 3}>
        <p class="row">
          <button
            type="button"
            class="btn btn-small"
            aria-pressed={ws().state.graph}
            onClick={() => ws().setGraph(!ws().state.graph)}
          >
            {ws().state.graph ? "Back to the proof" : "Show as graph"}
          </button>
        </p>
      </Show>
      <Show when={ws().state.told && ws().rows().length <= 2}>
        <p class="sub ws-told">
          These are your linked tabs. The line above a tab says what it was made from.
        </p>
      </Show>
      <ol class="ws-rows">
        <For each={ws().rows()}>
          {(row) => <RowItem row={row} workspace={ws()} prover={props.prover} />}
        </For>
      </ol>
    </section>
  );
}

/** A linked tab's row: the line above it, its sequent and state, and an action when it needs one. */
function RowItem(props: { row: Row; workspace: Workspace; prover: Prover }) {
  const proof = () => props.prover.store.proofs.find((p) => p.id === props.row.tab);
  const shown = () => props.prover.current()?.id === props.row.tab;
  const text = () => {
    const session = proof()?.session;
    return session && isOrdinary(session) ? sequentText(session) : (proof()?.input ?? "");
  };
  const words = () => {
    const v = proof()?.view;
    if (!v) return "Not started";
    if (v.complete) return "Proved";
    const open = v.goals.length;
    return `${open} open ${open === 1 ? "goal" : "goals"}`;
  };
  const stale = () => props.row.state === "out_of_date";
  const steps = () => {
    const session = proof()?.session;
    return session && isOrdinary(session) ? session.history.length : 0;
  };
  const sourceText = (node: number | null) => {
    if (node === null) return null;
    const row = props.workspace.rows().find((r) => r.node === node);
    const p = row && props.prover.store.proofs.find((q) => q.id === row.tab);
    const session = p?.session;
    return session && isOrdinary(session) ? sequentText(session) : null;
  };
  return (
    <li
      class="ws-row"
      data-depth={props.row.depth}
      data-shown={shown() ? "" : undefined}
      data-node={props.row.node}
    >
      <Show when={props.row.line}>
        {(line) => {
          const check = () => checkWords(line().checked?.check ?? null);
          return (
            <div class="ws-line" data-kind={line().kind} data-stale={stale() ? "" : undefined}>
              <span class="ws-label">
                {line().kind === "copy"
                  ? `Copy of ${displayed(sourceText(line().from) ?? line().fromSequent ?? "")}`
                  : line().label}
              </span>
              <Show when={line().kind === "made" && !stale()}>
                <span class="ws-check" data-shape={check().shape}>
                  {check().sentence}
                </span>
                <Show when={check().action && line().checked}>
                  {(_) => (
                    <button
                      type="button"
                      class="btn btn-small"
                      aria-busy={props.workspace.state.running === line().checked?.node}
                      onClick={() => {
                        const node = line().checked?.node;
                        if (node !== undefined) void props.workspace.check(node);
                      }}
                    >
                      Check
                    </button>
                  )}
                </Show>
              </Show>
            </div>
          );
        }}
      </Show>
      <button
        type="button"
        class="ws-tab"
        aria-current={shown() ? "true" : undefined}
        onClick={() => props.prover.activate(props.row.tab)}
      >
        <span class="ws-sequent m">{displayed(text())}</span>
        <span class="ws-state sub">
          {words()}
          {(() => {
            const calculus = proof()?.calculus;
            return calculus?.suite === "ordinary" ? ` · ${calculus.logic} logic` : "";
          })()}
        </span>
      </button>
      <Show when={stale()}>
        <div class="ws-stale">
          <span class="kw warn">Out of date</span>{" "}
          <span class="sub">
            {steps() > 0
              ? `It is now ${displayed(props.row.now)}. This proof is of the earlier one. Undo brings it back.`
              : `Made from a sequent that has changed: it is now ${displayed(props.row.now)}.`}
          </span>{" "}
          <button
            type="button"
            class="btn btn-small btn-primary"
            aria-busy={props.workspace.state.running === props.row.node}
            onClick={() => void props.workspace.startAgain(props.row)}
          >
            {steps() > 0 ? "Start again" : "Update"}
          </button>
        </div>
      </Show>
    </li>
  );
}

/** The graph: the linked tabs in columns by what they were made from, in the stage's place. */
export function WorkspaceGraph(props: { workspace: Workspace; prover: Prover }) {
  const columns = createMemo(() => {
    const rows = props.workspace.rows();
    const byColumn = new Map<number, Row[]>();
    for (const row of rows) {
      const list = byColumn.get(row.depth) ?? [];
      list.push(row);
      byColumn.set(row.depth, list);
    }
    return [...byColumn.entries()].sort(([a], [b]) => a - b).map(([, list]) => list);
  });
  const text = (row: Row) => {
    const p = props.prover.store.proofs.find((q) => q.id === row.tab);
    const session = p?.session;
    return session && isOrdinary(session) ? sequentText(session) : (p?.input ?? "");
  };
  return (
    <section class="ws-graph" aria-label="Workspace graph">
      <ol class="ws-columns">
        <For each={columns()}>
          {(column) => (
            <li class="ws-column">
              <ol class="ws-cards">
                <For each={column}>
                  {(row) => (
                    <li class="ws-card" data-stale={row.state === "out_of_date" ? "" : undefined}>
                      <Show when={row.line}>
                        {(line) => (
                          <p class="ws-label sub">
                            {line().kind === "copy" ? "Copy" : line().label}
                          </p>
                        )}
                      </Show>
                      <button
                        type="button"
                        class="ws-tab"
                        onClick={() => {
                          props.prover.activate(row.tab);
                          props.workspace.setGraph(false);
                        }}
                      >
                        <span class="ws-sequent m">{displayed(text(row))}</span>
                      </button>
                      <Show when={row.state === "out_of_date"}>
                        <span class="kw warn">Out of date</span>
                      </Show>
                    </li>
                  )}
                </For>
              </ol>
            </li>
          )}
        </For>
      </ol>
    </section>
  );
}
