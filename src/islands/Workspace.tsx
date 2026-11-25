// deduxit © Fabian Lukas Grubmüller 2026
// Licensed under the EUPL

/**
 * The workspace of linked tabs: tabs made from one another (a translation and its proof, a
 * copy), each a proof node of deduxit's workspace document (a modal tab's node its decision), which the page holds and sends with
 * every `workspace_…` call. Until the first link the page is as it was: no document, no call,
 * no button. The panel lists the linked tabs, each under the line that says how it was made;
 * its Undo and Redo take back whole changes by name; the graph is the same list in columns.
 */

import { batch, createContext, createEffect, createMemo, on, useContext } from "solid-js";
import { createStore } from "solid-js/store";
import { failure } from "../lib/deduxit";
import { prettyModal } from "../lib/modal";
import { isOrdinary, type OrdinarySession, sequentText } from "../lib/ordinary";
import { type Logic, modal, ordinary } from "../lib/suites";
import { displayed } from "../lib/words";
import {
  type Action,
  buttonName,
  changeWords,
  type Edit,
  joined,
  joinedModal,
  type Named,
  outOfDate,
  type Row,
  rowsOf,
  sequentNode,
  type WorkspaceView,
} from "../lib/workspace";
import type { Prover } from "./state";
import type { Ui } from "./ui";

/** The workspace, for the parts of the page that link sequents (the sheets, "+ view"). */
export const WorkspaceContext = createContext<Workspace>();

/** The page's workspace; every component under the app has it. */
export const useWorkspace = () => useContext(WorkspaceContext);

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
    /** The row whose action runs. */
    running: number | null;
    /** An Undo or a Redo asked for and not yet shown, which can take seconds, and its action. */
    undoing: { readonly redo: boolean; readonly name: string } | null;
  }>({
    doc: null,
    tabs: {},
    view: null,
    running: null,
    undoing: null,
  });
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

  /**
   * A modal tab's statement once decided, with what the workspace compares of it: its system and
   * its sequent as typed. Null for a tab of another suite or not decided yet.
   */
  const modalOf = (
    tab: string,
  ): { statement: string; system: string; text: string; key: string } | null => {
    const p = prover.store.proofs.find((q) => q.id === tab);
    const statement = p?.modal?.statement;
    if (!statement || !p.modal?.outcome) return null;
    const read = JSON.parse(statement) as { system?: string; text?: string };
    const system = read.system ?? "K";
    const text = read.text ?? p.input;
    return { statement, system, text, key: `${system}\n${text}` };
  };

  /** Whether a node is a modal tab's decision, which only a modal tab may be linked to. */
  const isModalNode = (node: number) =>
    state.view?.nodes.find((n) => n.node === node)?.operation === "modal.decide";

  /**
   * Takes a tab out of the workspace whose suite changed (a modal tab switched to ordinary logic,
   * or back): its node is the other suite's, a proof or a decision the tab no longer holds.
   * Undo brings the node back and links the tab again.
   */
  function leaveForSuite(tab: string, node: number, text: string) {
    void queued(async () => {
      unlink(tab);
      parked.set(node, tab);
      await act({ name: "unlinking", edits: [{ remove: { node } }] });
      setUi(
        "live",
        `${text} is no longer linked: its tab is now in another suite. Workspace has Undo unlinking.`,
      );
    }).catch(said);
  }

  /** Makes the nodes given, a modal tab's decision, and reads the view. */
  async function runNodes(nodes: readonly number[]) {
    const doc = state.doc;
    if (doc === null || nodes.length === 0) return;
    const ran = await prover.api.workspace.run(doc, nodes, work(), settings());
    setState("doc", ran.workspace);
    await look();
  }

  /** The statement a modal tab's decision is made on: the given node above it, as JSON. */
  const statementAbove = (node: number): string | null => {
    const view = state.view;
    if (!view) return null;
    const input = sequentNode(view, node);
    const value = view.nodes.find((n) => n.node === input)?.value;
    return value ? JSON.stringify(value) : null;
  };

  /**
   * Shows on each linked modal tab the statement its decision is made on now, decided again:
   * after an Undo, and after a change, which a copy of the same decision follows (the workspace
   * makes one record for one recipe on one statement).
   */
  async function followStatements() {
    for (const [tab, node] of Object.entries(state.tabs)) {
      const now = modalOf(tab);
      const above = statementAbove(node);
      if (!now || !above) continue;
      const read = JSON.parse(above) as { system?: string; text?: string };
      const key = `${read.system ?? "K"}\n${read.text ?? ""}`;
      if (key === now.key) continue;
      seen.set(tab, key);
      await prover.showModalStatement(tab, above);
    }
  }

  /** Opens a modal decision's statement on a new tab, decided there, and links the tab. */
  async function openModalNode(node: number): Promise<string | null> {
    const statement = statementAbove(node);
    if (!statement) return null;
    const read = JSON.parse(statement) as { system?: string; text?: string };
    if (!read.text) return null;
    const done = await prover.open(read.text, modal(read.system ?? "K"));
    if ("problem" in done) return null;
    const tab = prover.current()?.id ?? null;
    if (tab) {
      opened.add(tab);
      link(tab, node);
    }
    return tab;
  }

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
    const modalTab = modalOf(tab);
    if (!session && !modalTab) return null;
    const known = state.tabs[tab];
    if (known !== undefined && state.view) {
      const sequent = sequentNode(state.view, known);
      return sequent === null ? null : { edits: [], sequent };
    }
    if (modalTab) {
      const join = joinedModal(modalTab.statement, at);
      return { edits: join.edits, sequent: join.sequent };
    }
    if (!session) return null;
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
    const modalTab = modalOf(tab);
    if (modalTab) seen.set(tab, modalTab.key);
    setState("tabs", tab, node);
  }

  /** Forgets a tab's link, leaving the tab as it is. */
  function unlink(tab: string) {
    setState("tabs", tab, undefined as unknown as number);
    seen.delete(tab);
    latest.delete(tab);
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
          if (isModalNode(node)) {
            leaveForSuite(tab, node, displayed(sequentText(session)));
            continue;
          }
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

  /**
   * A linked modal tab's sequent or system changed by the visitor: the tab that owns its given
   * statement changes it and its decision is made again; a copy, the same decision of the same
   * statement, follows at once (`followStatements`). A copy's own change leaves the workspace,
   * its statement another tab's to change, and so does a tab that came into modal logic from
   * another suite.
   */
  createEffect(
    on(
      () => Object.keys(state.tabs).map((tab) => [tab, modalOf(tab)?.key ?? null] as const),
      (tabs) => {
        for (const [tab, key] of tabs) {
          const modalTab = modalOf(tab);
          const before = seen.get(tab);
          if (!key || !modalTab || before === key) continue;
          seen.set(tab, key);
          const node = state.tabs[tab];
          const view = state.view;
          if (node === undefined || !view) continue;
          if (!isModalNode(node)) {
            leaveForSuite(tab, node, prettyModal(modalTab.text));
            continue;
          }
          const row = rows().find((r) => r.tab === tab);
          const input = sequentNode(view, node);
          if (row?.line !== null || input === null) {
            void queued(async () => {
              unlink(tab);
              parked.set(node, tab);
              await act({ name: "unlinking", edits: [{ remove: { node } }] });
              setUi(
                "live",
                `${prettyModal(modalTab.text)} is no longer linked: its sequent was another tab's. Workspace has Undo unlinking.`,
              );
            }).catch(said);
            continue;
          }
          const systemChanged = before !== undefined && before.split("\n")[0] !== modalTab.system;
          void queued(async () => {
            await act({
              name: systemChanged ? "system change" : "sequent change",
              edits: [{ set: { node: input, value: modalTab.statement } }],
            });
            await runNodes([node]);
            await followStatements();
            const stale = outOfDate(rows());
            if (stale > 0) setUi("live", changeWords(stale, state.view?.undo ?? null));
          }).catch(said);
        }
      },
      { defer: true },
    ),
  );

  const rows = createMemo((): Row[] => (state.view ? rowsOf(state.view, state.tabs) : []));

  /**
   * Takes back or brings back the workspace's last change, its tabs' proofs as they were. The
   * buttons say so until it is shown, and a second press meanwhile does nothing.
   */
  const undo = async (forward: boolean) => {
    if (state.undoing !== null) return;
    // The name as pressed: the view names the next action once the change is read.
    const name = (forward ? state.view?.redo : state.view?.undo) ?? "";
    setState("undoing", { redo: forward, name });
    await queued(async () => {
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
      // A parked modal tab whose decision is back is linked again, showing that statement.
      await look();
      for (const [node, tab] of Array.from(parked.entries())) {
        if (!isModalNode(node)) continue;
        parked.delete(node);
        if (!open.has(tab)) continue;
        const above = statementAbove(node);
        if (!above) continue;
        const read = JSON.parse(above) as { system?: string; text?: string };
        seen.set(tab, `${read.system ?? "K"}\n${read.text ?? ""}`);
        await prover.showModalStatement(tab, above);
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
      // A modal tab shows the statement its decision is made on now, decided again.
      await followStatements();
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
        if (linked.has(n.node)) continue;
        if (n.operation === "modal.decide") {
          parked.delete(n.node);
          await openModalNode(n.node);
          continue;
        }
        if (n.class !== "work" || !isOrdinary(n.value)) continue;
        parked.delete(n.node);
        await openNode(n.node, (n.value as OrdinarySession).logic);
      }
      if (answer.name) setUi("live", `${forward ? "Redone" : "Undone"}: ${answer.name}.`);
      if (rows().length === 0) reset();
    })
      .catch(said)
      .finally(() => setState("undoing", null));
  };

  /** Forgets the workspace when no linked tab is left: the page is as before the first link. */
  function reset() {
    batch(() => {
      setState({
        doc: null,
        tabs: {},
        view: null,
        running: null,
        undoing: null,
      });
    });
    seen.clear();
    latest.clear();
    opened.clear();
    parked.clear();
  }

  return {
    state,
    rows,
    /** Whether any tab is linked: the button and the panel exist only then. */
    linked: () => rows().length > 0,
    buttonName: () => buttonName(rows()),
    stale: () => outOfDate(rows()),
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
        const modalTab = modalOf(tab);
        if (modalTab) {
          const join = await joining(tab, 0);
          if (!join) return;
          const at = join.edits.length;
          const made = await act({
            name: "copy",
            edits: [
              ...join.edits,
              { connect: { operation: "modal.decide", from: [join.sequent] } },
            ],
          });
          const copy = made[at] as number;
          if (join.edits.length > 0) link(tab, made[1] as number);
          await runNodes(join.edits.length > 0 ? [made[1] as number, copy] : [copy]);
          await openModalNode(copy);
          setUi("live", `${prettyModal(modalTab.text)}: a copy opened on a new tab.`);
          return;
        }
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
        setUi("live", `${displayed(sequentText(session))}: a copy opened on a new tab.`);
      }).catch(said),

    /** Start again: the row's proof made anew from its sequent now; Undo brings the old one back. */
    startAgain: (row: Row) =>
      queued(async () => {
        if (state.view?.nodes.find((n) => n.node === row.node)?.operation === "modal.decide") {
          // A modal tab's decision is made again on the statement above it, which the tab shows.
          setState("running", row.node);
          try {
            await runNodes([row.node]);
            const above = statementAbove(row.node);
            if (above) {
              const read = JSON.parse(above) as { system?: string; text?: string };
              seen.set(row.tab, `${read.system ?? "K"}\n${read.text ?? ""}`);
              await prover.showModalStatement(row.tab, above);
            }
            prover.activate(row.tab);
            setUi("live", "Decided again.");
          } finally {
            setState("running", null);
            await look();
          }
          return;
        }
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
        setState({ doc: opened });
        await look();
        await remake();
        let tab: string | null = null;
        for (const n of state.view?.nodes ?? []) {
          if (n.operation === "modal.decide") {
            const made = await openModalNode(n.node);
            if (n.node === shown) tab = made;
            continue;
          }
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

/** A translation's name as the live region says it. */
const translationName = (key: string) =>
  ({
    glivenko: "Glivenko's translation",
    kolmogorov: "Kolmogorov's translation",
    kuroda: "Kuroda's translation",
    "godel-gentzen": "Gödel and Gentzen's translation",
  })[key] ?? "a translation";
