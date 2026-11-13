// deduxit © Fabian Lukas Grubmüller 2026
// Licensed under the EUPL

/**
 * The prover's state and every action on it: the open proofs (each its
 * session document, mode, redo stack and the note at a goal), the settings,
 * and the calls to deduxit through the worker. The components read the store
 * and call these actions; nothing else changes it.
 */

import { batch, createSignal } from "solid-js";
import { createStore, produce } from "solid-js/store";
import { type Api, createApi } from "../lib/api";
import {
  type Engines,
  failure,
  type Hint,
  type Failure,
  type GoalFormula,
  MATH_FONTS,
  type MathFont,
  type Offered,
  type Outcome,
  type Ran,
  type Reached,
  type SequentDoc,
  type SessionDoc,
  type StepForm,
  type Taken,
  type View,
} from "../lib/deduxit";
import type { Example } from "../lib/content";
import { ENGINE_ORDER, engineName, engineOf, fromTab } from "../lib/engines";
import {
  asView,
  hintSteps,
  isOrdinary,
  isOrdinarySequent,
  json as parsed,
  type OrdinarySession,
  ordinaryRefusal,
  ordinaryStep,
  ordinaryVerdict,
  retract as retractOrdinary,
  sequentText as ordinaryText,
} from "../lib/ordinary";
import { Cancelled } from "../lib/protocol";
import {
  type Shelf,
  type StoredProof,
  dropAside,
  saveShelf,
  setAside,
  type Store,
} from "../lib/shelf";
import {
  type Action,
  actions as actionsOf,
  type Decided,
  goalAt,
  paths,
  type Path,
  retract,
  wayBack,
  within,
} from "../lib/steps";
import {
  type Calculus,
  linear,
  type Logic,
  modeOf,
  ordinary,
  SUITES,
  sameCalculus,
} from "../lib/suites";
import {
  cutProblem,
  displayed,
  eliminationStopped,
  fillRefusal,
  inputProblem,
  refusal,
  type Said,
  short,
  type Tone,
  verdict,
  wentBack,
} from "../lib/words";

/** A note at a goal: a refusal, or what a search answered there. */
export interface Note {
  readonly path: Path;
  readonly said: Said;
  readonly tone: Tone;
  /** A refused step's formula, by its position in the goal: "Other rules" opens its rules again. */
  readonly position?: number;
  /** A search's outcome, for its certificate or a retry with a larger budget. */
  readonly outcome?: Outcome;
  /** The budget the search had, for "Try with twice the budget". */
  readonly budget?: number;
}

/** Where the cuts of a finished proof are eliminated: on its derivation, or on its net. */
export type On = "tree" | "net";

/** A step taken in an elimination, with the drawing of the proof or net it was taken on. */
export type StepDone = Taken & { readonly drawing: string | null };

/**
 * A way back in an elimination: the state before a step; or, for a step of a run to the
 * end, the run's start and how many of its steps lead there, taken again on undo (the
 * strategy is deterministic, and nothing of the run but its drawings is kept).
 */
type Back =
  | { readonly kind: "state"; readonly reached: Reached; readonly taken: number }
  | {
      readonly kind: "run";
      readonly from: Reached;
      readonly taken: number;
      readonly steps: number;
    };

/** The elimination of a finished proof's cuts on one view: where it stands and the way back. */
export interface Elim {
  /** The proof or net reached, with its cuts and drawing. */
  reached: Reached;
  /** The steps taken, in order, each with the drawing it was taken on. */
  taken: StepDone[];
  /** The way back, the last step's last. */
  back: Back[];
  /** Why the last run to the end stopped with cuts left, if a bound stopped it. */
  stopped: Said | null;
  /** The first step of the last run whose drawing the bound on drawings left out. */
  undrawn: number | null;
  /** Which step's drawing the stage shows, from 1, or null for the proof or net reached. */
  shown: number | null;
  /** What deduxit refused, said at the elimination. */
  problem: Said | null;
}

/** A proof's session: its suite's own document. */
export type Session = SessionDoc | OrdinarySession;

/** One open proof. */
export interface Proof {
  readonly id: string;
  /** The sequent field's text. */
  input: string;
  /** The calculus it is proved in: its suite, method and the suite's parameter. */
  calculus: Calculus;
  session: Session | null;
  view: View | null;
  /** What undo took back in a linear proof, replayed by redo. */
  redo: Action[][];
  /**
   * What undo took back in an ordinary proof: the session before each undo with its grafts'
   * engines, restored by redo.
   */
  later: { session: OrdinarySession; engines: Record<string, string> }[];
  /** Whether the tab shows the sequent field. */
  editing: boolean;
  /** Why the field's text was not started, with the place to mark. */
  inputProblem: (Said & { readonly span?: { start: number; end: number } }) | null;
  /** The goal worked on, by its path (paths survive replays, numbers do not). */
  active: Path | null;
  note: Note | null;
  /** The whole sequent's verdict, when a search on its root or every goal said one. */
  verdict: (Said & { tone: Tone; outcome?: Outcome }) | null;
  /** The fragment of the text being typed, as deduxit detects it, before it is started. */
  typed: { classical: string; intuitionistic: string } | null;
  /** A line on the stage that is no goal's: a proof the link could not restore. */
  banner: Said | null;
  /** The engine of each search that closed a goal, by the goal's path joined with dots. */
  engines: Record<string, string>;
  /** The tab and goal the proof was opened from ("Open in a new tab"), or null. */
  origin: { readonly from: string; readonly path: Path } | null;
  /** The elimination of a finished proof's cuts on each view, never stored. */
  elim: { tree: Elim | null; net: Elim | null };
}

/** The visitor's settings, kept in the browser but for the engine, which holds for the visit. */
export interface Settings {
  /** The search's work budget per call, `limits.work`. */
  budget: number;
  /** Whether the actions print their keys beside their names. */
  showKeys: boolean;
  /** How a net is drawn, `styles.svg.net`: every formula written, or compact. */
  net: NetDrawing;
  /** How a net looks, `styles.svg.net_look`: deduxit's own look, the textbooks', or a mix. */
  netLook: NetLook;
  /**
   * The engine every search is forced to, `search.engine`; null for deduxit's own choice. Never
   * stored: a forced engine refuses what it does not take, so every visit starts on deduxit's.
   */
  engine: string | null;
  /** The math font the stage's drawing, its formulas and the tabs' sequents are set in. */
  stageFont: MathFont;
  /** The math font the SVG, PNG and PDF exports are set in, `styles.svg.font`; null for the stage's. */
  font: MathFont | null;
  /** Whether deduxit applies every invertible rule by itself after each step, `interactive.invertible`. */
  invertible: boolean;
  /** Whether a classical derivation is drawn two-sided, as its sequent was written, `view.classical`. */
  twoSided: boolean;
  /** The most steps an elimination to the end takes, `cut.steps`. */
  cutSteps: number;
  /** Whether an ordinary derivation draws its weakenings and contractions, `view.structural`. */
  structural: "admissible" | "explicit";
  /** How deep a witness the search builds at first order, `search.witness_depth`. */
  witnessDepth: number;
  /** The most instances of quantified formulas a first-order search holds, `search.instances`. */
  instances: number;
  /** The most terms a first-order session or sequent holds, `limits.terms`. */
  terms: number;
}

/**
 * The view of the settings as deduxit reads it: a classical linear derivation two-sided when
 * asked; an ordinary one with its structural rules drawn when asked.
 */
export const viewJson = (settings: Settings, calculus?: Calculus) => {
  const view =
    calculus?.suite === "ordinary"
      ? settings.structural === "explicit"
        ? { structural: "explicit" }
        : null
      : settings.twoSided
        ? { classical: "two" }
        : null;
  return view ? { view } : {};
};

/** The math font the exports are set in: the one chosen for them, else the stage's. */
export const exportFont = (settings: Settings): MathFont => settings.font ?? settings.stageFont;

/** deduxit's two drawings of a net: every formula occurrence written, or only the literals and the conclusions. */
export type NetDrawing = "formulas" | "compact";

/**
 * How a net looks, deduxit's `svg::NetLook`: the edges into a ⅋ or ? dashed or plain; a ! with
 * auxiliary doors a row up or with every conclusion at the bottom; a ? one node or its rules'
 * nodes ?d, ?c and ?w.
 */
export interface NetLook {
  readonly premises: "dashed" | "plain";
  readonly conclusions: "raised" | "bottom";
  readonly whyNot: "node" | "rules";
}

/** deduxit's own look, its default. */
export const DEDUXIT_LOOK: NetLook = { premises: "dashed", conclusions: "raised", whyNot: "node" };

/** The look the textbooks share, deduxit's preset `textbook`. */
export const TEXTBOOK_LOOK: NetLook = { premises: "plain", conclusions: "bottom", whyNot: "rules" };

/** Whether two looks are the same. */
export const sameLook = (a: NetLook, b: NetLook) =>
  a.premises === b.premises && a.conclusions === b.conclusions && a.whyNot === b.whyNot;

/** A look as deduxit's settings write it, `styles.svg.net_look`. */
export const lookJson = (look: NetLook) => ({
  premises: look.premises,
  conclusions: look.conclusions,
  why_not: look.whyNot,
});

/** A stored look, each field deduxit's default where it is not one of its values. */
const storedLook = (stored: unknown): NetLook => {
  const look = (typeof stored === "object" && stored !== null ? stored : {}) as Partial<NetLook>;
  return {
    premises: look.premises === "plain" ? "plain" : "dashed",
    conclusions: look.conclusions === "bottom" ? "bottom" : "raised",
    whyNot: look.whyNot === "rules" ? "rules" : "node",
  };
};

/** The tab's default work budget: deduxit's tab default, about a second of search. */
export const DEFAULT_BUDGET = 2 ** 26;
/** The most steps of an elimination to the end by default: deduxit's, `cut::Options::DEFAULT_STEPS`. */
export const DEFAULT_CUT_STEPS = 10_000;
/** The witness depth by default: deduxit's, `Options::DEFAULT_WITNESS_DEPTH`. */
export const DEFAULT_WITNESS_DEPTH = 64;
/** The instances by default: deduxit's, `Options::DEFAULT_INSTANCES`. */
export const DEFAULT_INSTANCES = 2 ** 16;
/** The terms by default: deduxit's tab, `tab::TERMS`, as many as its occurrences. */
export const DEFAULT_TERMS = 1_000_000;

/** A stored count, the default where it is none. */
const count = (stored: unknown, fallback: number) =>
  typeof stored === "number" && Number.isInteger(stored) && stored > 0 ? stored : fallback;
/** The storage key of the settings, under the prover's old name: a new key would lose them. */
const SETTINGS_KEY = "linlog-settings";

const storage = (): Store | undefined => {
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
};

function loadSettings(): Settings {
  try {
    const stored = JSON.parse(storage()?.getItem(SETTINGS_KEY) ?? "{}") as Partial<Settings>;
    return {
      budget:
        typeof stored.budget === "number" && stored.budget > 0 ? stored.budget : DEFAULT_BUDGET,
      showKeys: stored.showKeys === true,
      net: stored.net === "compact" ? "compact" : "formulas",
      netLook: storedLook(stored.netLook),
      engine: null,
      stageFont: MATH_FONTS.find((f) => f.key === stored.stageFont)?.key ?? "euler",
      font: MATH_FONTS.find((f) => f.key === stored.font)?.key ?? null,
      invertible: stored.invertible === true,
      twoSided: stored.twoSided === true,
      structural: stored.structural === "explicit" ? "explicit" : "admissible",
      cutSteps:
        typeof stored.cutSteps === "number" && stored.cutSteps > 0
          ? stored.cutSteps
          : DEFAULT_CUT_STEPS,
      witnessDepth: count(stored.witnessDepth, DEFAULT_WITNESS_DEPTH),
      instances: count(stored.instances, DEFAULT_INSTANCES),
      terms: count(stored.terms, DEFAULT_TERMS),
    };
  } catch {
    return {
      budget: DEFAULT_BUDGET,
      showKeys: false,
      net: "formulas",
      netLook: DEDUXIT_LOOK,
      engine: null,
      stageFont: "euler",
      font: null,
      invertible: false,
      twoSided: false,
      structural: "admissible",
      cutSteps: DEFAULT_CUT_STEPS,
      witnessDepth: DEFAULT_WITNESS_DEPTH,
      instances: DEFAULT_INSTANCES,
      terms: DEFAULT_TERMS,
    };
  }
}

let counter = 0;
const freshId = () => `p${Date.now().toString(36)}${(counter++).toString(36)}`;

/** Whether an open proof is a stored one: the same session, or the same text not started. */
const isOpen = (open: Proof, stored: StoredProof) =>
  open.session
    ? JSON.stringify(open.session) === JSON.stringify(stored.session)
    : !stored.session && open.input.trim() !== "" && open.input === stored.input;

const blank = (calculus: Calculus): Proof => ({
  id: freshId(),
  input: "",
  calculus,
  session: null,
  view: null,
  redo: [],
  later: [],
  editing: true,
  inputProblem: null,
  active: null,
  note: null,
  verdict: null,
  typed: null,
  banner: null,
  engines: {},
  origin: null,
  elim: { tree: null, net: null },
});

/** A goal's formulas as a key, equal for the same formulas in any order: how two tabs' sequents are compared. */
const keyOf = (formulas: readonly GoalFormula[]) =>
  formulas
    .map((f) => `${f.side ?? ""}:${f.text}`)
    .sort()
    .join("\n");

/**
 * A goal's sequent as the sequent field reads it: two-sided where the formulas have sides, each
 * formula as deduxit writes it, which in intuitionistic mode is as the reading writes it in its
 * position (a hypothesis `A ⊸ B`), in the syntax the strict reading takes; an ordinary goal's
 * formulas as the ordinary parser reads them.
 */
const sequentText = (formulas: readonly GoalFormula[]) => {
  const left = formulas.filter((f) => f.side === "input").map((f) => f.text);
  const right = formulas.filter((f) => f.side !== "input").map((f) => f.text);
  return `${left.join(", ")}${left.length ? " " : ""}|- ${right.join(", ")}`;
};

/** A goal's path as the key of `Proof.engines`. */
export const pathKey = (path: Path) => path.join(".");

/** The prover's state and actions, for one island. */
export type Prover = ReturnType<typeof createProver>;

/** Creates the state, its worker and its actions; `say` speaks in the page's live region. */
/** An elimination begun at a proof or net. */
const fresh = (reached: Reached): Elim => ({
  reached,
  taken: [],
  back: [],
  stopped: null,
  undrawn: null,
  shown: null,
  problem: null,
});

/** The document of a proof or net reached, as the next call takes it. */
const documentOf = (reached: Reached) => {
  const document = reached.proof ?? reached.net;
  return document === undefined ? "" : JSON.stringify(document);
};

/** What deduxit refused in an elimination, in the page's words. */
const eliminationProblem = (failed: Failure): Said => ({
  keyword: failed.code === "no_cut" ? "No cut there" : "Not taken",
  sentence: `${failed.message.charAt(0).toUpperCase()}${failed.message.slice(1)}.`,
});

export function createProver(say: (text: string) => void = () => undefined) {
  const [pending, setPending] = createSignal(0);
  const api: Api = createApi(setPending);
  const [store, setStore] = createStore<{ proofs: Proof[]; active: string | null }>({
    proofs: [],
    active: null,
  });
  const [settings, setSettingsSignal] = createSignal<Settings>(loadSettings());
  const [aside, setAsideShelf] = createSignal<Shelf | undefined>(undefined);
  /** The calculus last chosen in this visit, which a new empty tab starts in. */
  const [lastCalculus, setLastCalculus] = createSignal<Calculus>(linear("classical"));
  const [busy, setBusy] = createSignal(false);
  /** This visit's key among the stored proofs. */
  const visit = freshId();

  /**
   * One action that changes a proof at a time: each reads the session before
   * it waits on the worker and shows the answer after, so a second one begun
   * meanwhile would build on the session the first replaces, and one answer
   * would overwrite the other. An action asked for while another runs does
   * nothing (and answers undefined); its buttons and keys wait on `busy`.
   */
  let running: Promise<unknown> = Promise.resolve();
  const guard =
    <A extends unknown[], R>(run: (...args: A) => Promise<R>) =>
    async (...args: A): Promise<R | undefined> => {
      if (busy()) return undefined;
      setBusy(true);
      const now = run(...args);
      running = now.catch(() => undefined);
      try {
        return await now;
      } finally {
        setBusy(false);
      }
    };
  /** As `guard`, but an action asked for while another runs waits for it instead of doing nothing. */
  const queued =
    <A extends unknown[], R>(run: (...args: A) => Promise<R>) =>
    async (...args: A): Promise<R | undefined> => {
      while (busy()) await running;
      return guard(run)(...args);
    };

  /**
   * The settings as deduxit reads them: the tab's defaults with the budget, the engine forced,
   * the invertible rules applied by themselves when they are on, the derivation's sides, and
   * the first-order bounds where they are not the tab's.
   */
  const json = (budget = settings().budget, invertible = settings().invertible) => {
    const s = settings();
    const search = {
      ...(s.engine ? { engine: s.engine } : {}),
      ...(s.witnessDepth !== DEFAULT_WITNESS_DEPTH ? { witness_depth: s.witnessDepth } : {}),
      ...(s.instances !== DEFAULT_INSTANCES ? { instances: s.instances } : {}),
    };
    return JSON.stringify({
      limits: { work: budget, ...(s.terms !== DEFAULT_TERMS ? { terms: s.terms } : {}) },
      ...(Object.keys(search).length ? { search } : {}),
      ...(invertible ? { interactive: { invertible } } : {}),
      ...viewJson(s),
    });
  };
  /**
   * The settings of an ordinary call: the budget, the terms where they are not the tab's, and
   * the structural rules drawn when asked. A forced engine and the invertible rules are the
   * linear suite's: the ordinary search runs on deduxit's translation with its own choice.
   */
  const ordinaryJson = (budget = settings().budget, structural = settings().structural) => {
    const s = { ...settings(), structural };
    return JSON.stringify({
      limits: { work: budget, ...(s.terms !== DEFAULT_TERMS ? { terms: s.terms } : {}) },
      ...viewJson(s, ordinary("classical")),
    });
  };
  /**
   * The engines of the grafts a session still holds: an entry whose goal undo reopened, or took
   * back with the step below it, goes with it.
   */
  const keptGrafts = (session: OrdinarySession, engines: Readonly<Record<string, string>>) =>
    Object.fromEntries(
      Object.entries(engines).filter(([key]) => {
        const at = goalAt(session, key === "" ? [] : key.split(".").map(Number));
        return at !== undefined && session.inferences[at]?.rule !== undefined;
      }),
    );
  /** A search's verdict, of either suite, as the way back reads it. */
  const decidedOf = (verdict: string): Decided =>
    verdict === "proved" || verdict === "valid"
      ? "proved"
      : verdict === "unprovable" || verdict === "not_valid"
        ? "unprovable"
        : "unknown";
  /** A proof's ordinary session, with its logic, where it is one. */
  const ordinaryOf = (p: Proof | undefined) =>
    p?.calculus.suite === "ordinary" && p.session && isOrdinary(p.session)
      ? { session: p.session, logic: p.calculus.logic }
      : undefined;
  /**
   * The settings of a replay, and of a start that only reads the sequent: without the
   * invertible rules, which a replay plays as the steps they were, so that applying them
   * again after each would leave the recorded ones no goal.
   */
  const replaying = () => json(settings().budget, false);

  const current = () => store.proofs.find((p) => p.id === store.active);
  const index = (id: string) => store.proofs.findIndex((p) => p.id === id);

  /** A proof's actions, a proof filled in from another tab replayed from its own inferences. */
  const actionsFor = (p: Proof, list: readonly Action[]): Action[] =>
    list.map((a) =>
      a.kind === "close" && p.engines[pathKey(a.path)]?.startsWith("tab:")
        ? { ...a, own: true }
        : a,
    );

  /** Each finished tab's sequent as a key, by its mode and sequent document. */
  const keys = new Map<string, string>();
  const sequentKey = async (q: Proof): Promise<string | null> => {
    if (!q.session || q.calculus.suite !== "linear") return null;
    const mode = q.calculus.mode;
    const at = `${mode}\n${JSON.stringify(q.session.sequent)}`;
    const known = keys.get(at);
    if (known !== undefined) return known;
    const started = await attempt(() =>
      api.start(q.session?.sequent as SequentDoc, mode, replaying()),
    );
    const root = started.ok ? started.value.view.goals[0] : undefined;
    if (!root) return null;
    const key = keyOf(root.formulas);
    keys.set(at, key);
    return key;
  };

  const update = (id: string, change: (p: Proof) => void) => {
    const at = index(id);
    if (at >= 0) setStore("proofs", at, produce(change));
  };

  /** The goal the actions act on: the active one if still open, else the first open one. */
  const activeGoal = (p: Proof | undefined = current()): number | undefined => {
    if (!p?.session || !p.view) return undefined;
    const open = p.view.goals.map((g) => g.goal);
    const at = p.active ? goalAt(p.session, p.active) : undefined;
    return at !== undefined && open.includes(at) ? at : open[0];
  };

  const pathOf = (p: Proof, goal: number): Path =>
    p.session ? (paths(p.session).get(goal) ?? []) : [];

  /** Shows a played session, the active goal moved to `goal` (or kept where it is still open). */
  const show = (id: string, played: { session: Session; view: View }, goal?: number) => {
    update(id, (p) => {
      p.session = played.session;
      p.view = played.view;
      p.elim = { tree: null, net: null };
      p.editing = false;
      p.inputProblem = null;
      p.note = null;
      p.banner = null;
      if (goal !== undefined) p.active = paths(played.session).get(goal) ?? null;
      if (played.view.complete) p.verdict = null;
    });
  };

  /** Runs a call, turning a stop into nothing and every other failure into the library's error. */
  async function attempt<T>(
    call: () => Promise<T>,
  ): Promise<{ ok: true; value: T } | { ok: false; failed: Failure | null }> {
    try {
      return { ok: true, value: await call() };
    } catch (thrown) {
      if (thrown instanceof Cancelled) return { ok: false, failed: null };
      return { ok: false, failed: failure(thrown instanceof Error ? thrown.message : thrown) };
    }
  }

  function save() {
    const shelf: Shelf = {
      version: 2,
      active: store.active,
      proofs: store.proofs
        .filter((p) => p.session || p.input.trim())
        .map(
          (p): StoredProof => ({
            id: p.id,
            input: p.input,
            calculus: p.calculus,
            session: p.session,
            redo: p.redo,
            ...(p.later.length ? { later: p.later } : {}),
            engines: p.engines,
            origin: p.origin,
            saved: Date.now(),
          }),
        ),
    };
    saveShelf(storage(), visit, shelf);
  }

  /** Why a text was not started, with the place to mark where deduxit gives one. */
  const problemAt = (failed: Failure) => {
    const span = failed.details?.["span_utf16"] as { start: number; end: number } | undefined;
    return { ...inputProblem(failed), ...(span ? { span } : {}) };
  };

  /** Shows an ordinary session on a proof, in its logic: a document opened, pasted or linked. */
  async function showOrdinary(id: string, session: OrdinarySession): Promise<Failure | null> {
    const view = await attempt(() => api.ordinary.view(session, ordinaryJson()));
    if (!view.ok) return view.failed ?? { code: "page", kind: "stopped", message: "stopped" };
    update(id, (q) => {
      q.calculus = ordinary(session.logic);
      q.input = ordinaryText(session);
      q.redo = [];
      q.later = [];
      q.verdict = null;
      q.engines = {};
    });
    show(id, { session, view: asView(view.value) }, view.value.goals[0]?.goal);
    save();
    return null;
  }

  /**
   * Reads a text into a proof in a calculus and starts it: the field's text in the suite's own
   * syntax, a sequent's JSON, or a session pasted there, an ordinary one in its own logic.
   */
  async function startText(id: string, text: string, calculus: Calculus) {
    const doc = parsed(text);
    if (isOrdinary(doc)) {
      const failed = await showOrdinary(id, doc);
      if (failed) update(id, (q) => (q.inputProblem = problemAt(failed)));
      return;
    }
    if (calculus.suite === "ordinary") {
      const started = await attempt(() => api.ordinary.start(text, calculus.logic, ordinaryJson()));
      if (!started.ok) {
        if (started.failed)
          update(id, (q) => (q.inputProblem = problemAt(started.failed as Failure)));
        return;
      }
      setLastCalculus(calculus);
      update(id, (q) => {
        q.calculus = calculus;
        q.redo = [];
        q.later = [];
        q.verdict = null;
        q.engines = {};
      });
      show(id, { session: started.value.session, view: asView(started.value.view) }, 0);
      save();
      return;
    }
    const read = await attempt(() => api.readAs(text, calculus.mode, json()));
    if (!read.ok) {
      if (read.failed) update(id, (q) => (q.inputProblem = problemAt(read.failed as Failure)));
      return;
    }
    if (read.value.kind === "session" && read.value.session) {
      const session = read.value.session;
      const view = await attempt(() => api.view(session, json()));
      if (view.ok) {
        update(id, (q) => (q.calculus = linear(session.mode)));
        show(id, { session, view: view.value }, view.value.goals[0]?.goal);
      }
      return;
    }
    const started = await attempt(() => api.start(read.value.sequent, calculus.mode, json()));
    if (!started.ok) {
      if (started.failed)
        update(id, (q) => (q.inputProblem = inputProblem(started.failed as Failure)));
      return;
    }
    setLastCalculus(calculus);
    update(id, (q) => {
      q.calculus = calculus;
      q.redo = [];
      q.later = [];
      q.verdict = null;
      q.engines = {};
    });
    show(id, started.value, 0);
    save();
  }

  /**
   * Opens an ordinary document or text as a new proof: a session in its own logic, a sequent
   * (typed, or its JSON) in `into`'s logic, or the suite's first where `into` is linear.
   */
  async function openOrdinary(
    text: string,
    doc: unknown,
    into: Calculus,
  ): Promise<{ kind: string } | { problem: Said }> {
    if (isOrdinary(doc)) {
      const id = actions.add();
      const failed = await showOrdinary(id, doc);
      if (failed) {
        actions.remove(id);
        return { problem: inputProblem(failed) };
      }
      return { kind: "session" };
    }
    const start = SUITES.find((x) => x.key === "ordinary")?.start;
    const logic: Logic =
      into.suite === "ordinary"
        ? into.logic
        : start?.suite === "ordinary"
          ? start.logic
          : "intuitionistic";
    const started = await attempt(() => api.ordinary.start(text, logic, ordinaryJson()));
    if (!started.ok) {
      const failed = started.failed;
      if (!failed) return { problem: { keyword: "Stopped", sentence: "" } };
      if (failed.code === "parse" || failed.code === "json") return { problem: problemAt(failed) };
      const id = actions.add();
      update(id, (q) => {
        q.calculus = ordinary(logic);
        q.input = text;
        q.inputProblem = inputProblem(failed);
      });
      return { kind: "sequent" };
    }
    const id = actions.add();
    setLastCalculus(ordinary(logic));
    update(id, (q) => {
      q.calculus = ordinary(logic);
      q.input = doc === undefined ? text : ordinaryText(started.value.session);
    });
    show(id, { session: started.value.session, view: asView(started.value.view) }, 0);
    save();
    return { kind: "sequent" };
  }

  /**
   * Closes an ordinary goal by the search within `budget`: the derivation found grafted, or the
   * verdict noted at the goal (and on the tab for the root). Returns whether it closed.
   */
  async function closeOrdinary(
    p: Proof,
    session: OrdinarySession,
    goal: number,
    budget: number,
  ): Promise<boolean> {
    const path = pathOf(p, goal);
    const result = await attempt(() => api.ordinary.close(session, goal, ordinaryJson(budget)));
    if (!result.ok) {
      const failed = result.failed;
      update(p.id, (q) => {
        q.note =
          failed === null
            ? {
                path,
                said: { keyword: "Stopped", sentence: "The search was stopped." },
                tone: "warn",
              }
            : { path, said: inputProblem(failed), tone: "bad" };
      });
      return false;
    }
    const closed = result.value;
    const outcome = closed.outcome as unknown as Outcome;
    if (closed.outcome.verdict === "valid" && !closed.refused) {
      const engine = engineOf(outcome);
      update(p.id, (q) => {
        q.later = [];
        if (engine) q.engines = { ...q.engines, [pathKey(path)]: engine };
      });
      show(
        p.id,
        { session: closed.session, view: asView(closed.view) },
        closed.view.goals[0]?.goal,
      );
      say(
        `Goal ${goal + 1} closed${engine ? ` by the ${engineName(engine)}` : ""}${closed.view.complete ? ": the proof is finished" : ""}.`,
      );
      save();
      return true;
    }
    const said = closed.refused
      ? {
          keyword: "Proved, but not added to the derivation",
          sentence: closed.refused.message,
          tone: "warn" as Tone,
        }
      : ordinaryVerdict(closed.outcome);
    update(p.id, (q) => {
      q.note = { path, said, tone: said.tone, outcome, budget };
      if (path.length === 0) q.verdict = { ...said, outcome };
    });
    return false;
  }

  const actions = {
    api,
    store,
    pending,
    busy,
    settings,
    aside,
    current,
    activeGoal,
    json,

    /**
     * Turns the invertible rules applied by themselves on or off; on, they are applied at once to
     * every open goal of every proof, as they would have been after each step.
     */
    setInvertible: guard(async (on: boolean) => {
      actions.setSettings({ invertible: on });
      if (!on) return;
      for (const p of store.proofs) {
        // The invertible rules are the linear suite's.
        if (!p.session || p.view?.complete || p.calculus.suite !== "linear") continue;
        const result = await attempt(() => api.invertAll(p.session as SessionDoc, replaying()));
        if (!result.ok || result.value.inverted === 0) continue;
        show(p.id, result.value, activeGoal({ ...p, ...result.value }));
      }
      save();
    }),

    /**
     * Draws the ordinary derivations with their structural rules or without: each ordinary
     * proof's view is asked again, since its map of the drawing's inferences to goals follows
     * the setting, and the new views and the setting change together.
     */
    setStructural: guard(async (structural: Settings["structural"]) => {
      const settings = ordinaryJson(undefined, structural);
      const views = new Map<string, View>();
      for (const p of store.proofs) {
        const o = ordinaryOf(p);
        if (!o) continue;
        const result = await attempt(() => api.ordinary.view(o.session, settings));
        if (result.ok) views.set(p.id, asView(result.value));
      }
      batch(() => {
        actions.setSettings({ structural });
        for (const [id, view] of views) update(id, (q) => (q.view = view));
      });
    }),

    setSettings(change: Partial<Settings>) {
      const next = { ...settings(), ...change };
      setSettingsSignal(next);
      try {
        const { engine: _, ...kept } = next;
        storage()?.setItem(SETTINGS_KEY, JSON.stringify(kept));
      } catch {
        // The settings hold for this visit alone.
      }
    },

    /** At the page's start: sets the last visit's proofs aside for the restore bar. */
    begin() {
      setAsideShelf(setAside(storage(), visit));
    },

    /** Restores the last visit's proofs beside the open ones. */
    restore() {
      const shelf = aside();
      if (!shelf) return;
      batch(() => {
        for (const stored of shelf.proofs) {
          if (store.proofs.some((p) => p.id === stored.id || isOpen(p, stored))) continue;
          const proof: Proof = {
            ...blank(stored.calculus),
            id: stored.id,
            input: stored.input,
            session: stored.session,
            redo: stored.redo.map((r) => [...r]),
            later: (stored.later ?? []).map((l) => ({
              session: l.session,
              engines: { ...l.engines },
            })),
            engines: { ...(stored.engines ?? {}) },
            origin: stored.origin ?? null,
            editing: !stored.session,
          };
          setStore("proofs", (all) => [...all.filter((p) => p.session || p.input.trim()), proof]);
        }
        setStore("active", shelf.active ?? store.proofs[0]?.id ?? null);
      });
      dropAside(storage());
      setAsideShelf(undefined);
      for (const p of store.proofs) if (p.session && !p.view) void actions.refresh(p.id);
      save();
    },

    /** Takes out of the restore bar the proofs open already (a link's). */
    prune() {
      if (!aside()) return;
      setAsideShelf(dropAside(storage(), (stored) => !store.proofs.some((p) => isOpen(p, stored))));
    },

    discard() {
      dropAside(storage());
      setAsideShelf(undefined);
    },

    save,

    /** Reads the view of a stored session again. */
    async refresh(id: string) {
      const p = store.proofs.find((q) => q.id === id);
      if (!p?.session) return;
      const o = ordinaryOf(p);
      const result = o
        ? await attempt(async () => asView(await api.ordinary.view(o.session, ordinaryJson())))
        : await attempt(() => api.view(p.session as SessionDoc, json()));
      if (result.ok) update(id, (q) => (q.view = result.value));
    },

    /** Opens a new proof with the sequent field. */
    add(): string {
      const proof = blank(lastCalculus());
      setStore("proofs", (all) => [...all, proof]);
      setStore("active", proof.id);
      return proof.id;
    },

    activate(id: string) {
      setStore("active", id);
    },

    /** Closes a proof's tab; the page always keeps one. */
    remove(id: string) {
      const at = index(id);
      batch(() => {
        setStore("proofs", (all) => all.filter((p) => p.id !== id));
        if (store.active === id) setStore("active", store.proofs[Math.max(0, at - 1)]?.id ?? null);
        if (store.proofs.length === 0) actions.add();
      });
      save();
    },

    edit(id: string, editing: boolean) {
      update(id, (p) => {
        p.editing = editing;
        if (!editing) p.inputProblem = null;
      });
    },

    setInput(id: string, input: string) {
      update(id, (p) => {
        p.input = input;
        p.inputProblem = null;
      });
    },

    /** Reads the field's text as it is typed, for the fragment beside it. */
    async preview(id: string, input: string) {
      const calculus = store.proofs.find((q) => q.id === id)?.calculus ?? lastCalculus();
      // An ordinary sequent has no fragment of linear logic: its mark is its calculus.
      if (calculus.suite !== "linear") return;
      const read = await attempt(() => api.readAs(input, calculus.mode, json()));
      const p = store.proofs.find((q) => q.id === id);
      if (!p || p.input !== input) return;
      update(id, (q) => (q.typed = read.ok ? (read.value.fragment ?? null) : null));
    },

    /**
     * Starts the field's text as a new session in the proof's calculus, or in `calculus` (or
     * opens a session pasted there); asked for while another action runs, it waits for that one.
     */
    submit: queued(async (id: string, calculus?: Calculus) => {
      const p = store.proofs.find((q) => q.id === id);
      if (p) await startText(id, p.input, calculus ?? p.calculus);
    }),

    /**
     * Changes the proof's calculus, which restarts a started proof: from its sequent within the
     * suite, from the field's text in another suite, whose parser reads it anew.
     */
    setCalculus: guard(async (id: string, calculus: Calculus) => {
      const p = store.proofs.find((q) => q.id === id);
      if (!p) return;
      setLastCalculus(calculus);
      if (!p.session) {
        update(id, (q) => (q.calculus = calculus));
        return;
      }
      if (calculus.suite !== p.calculus.suite) {
        update(id, (q) => {
          q.calculus = calculus;
          q.session = null;
          q.view = null;
          q.redo = [];
          q.later = [];
          q.verdict = null;
          q.engines = {};
          q.note = null;
          q.banner = null;
          q.elim = { tree: null, net: null };
          q.editing = true;
        });
        if (p.input.trim()) await startText(id, p.input, calculus);
        return;
      }
      const session = p.session;
      const started =
        calculus.suite === "ordinary"
          ? await attempt(async () => {
              const played = await api.ordinary.start(
                JSON.stringify(session.sequent),
                calculus.logic,
                ordinaryJson(),
              );
              return { session: played.session, view: asView(played.view) };
            })
          : await attempt(() => api.start((session as SessionDoc).sequent, calculus.mode, json()));
      if (!started.ok) {
        if (started.failed) update(id, (q) => (q.banner = inputProblem(started.failed as Failure)));
        return;
      }
      update(id, (q) => {
        q.calculus = calculus;
        q.redo = [];
        q.later = [];
        q.verdict = null;
        q.engines = {};
      });
      show(id, started.value, 0);
      save();
    }),

    /**
     * Opens a document (a sequent or a session as deduxit writes them, of either suite) as a new
     * proof, a sequent typed in `calculus` or the last chosen; says which it got.
     */
    async open(text: string, calculus?: Calculus): Promise<{ kind: string } | { problem: Said }> {
      const doc = parsed(text);
      const into = calculus ?? lastCalculus();
      if (
        isOrdinary(doc) ||
        isOrdinarySequent(doc) ||
        (doc === undefined && into.suite === "ordinary")
      )
        return openOrdinary(text, doc, into);
      const mode = modeOf(into);
      const read = await attempt(() => api.readAs(text, mode, json()));
      if (!read.ok)
        return {
          problem: read.failed ? inputProblem(read.failed) : { keyword: "Stopped", sentence: "" },
        };
      const id = actions.add();
      if (read.value.kind === "session" && read.value.session) {
        const session = read.value.session;
        const view = await attempt(() => api.view(session, json()));
        if (!view.ok)
          return {
            problem: view.failed ? inputProblem(view.failed) : { keyword: "Stopped", sentence: "" },
          };
        update(id, (q) => {
          q.calculus = linear(session.mode);
          q.input = read.value.text;
        });
        show(id, { session, view: view.value }, view.value.goals[0]?.goal);
        save();
        return { kind: "session" };
      }
      update(id, (q) => (q.input = text.trim().startsWith("{") ? read.value.text : text));
      const startMode = calculus?.suite === "linear" ? calculus.mode : (read.value.mode ?? mode);
      const started = await attempt(() => api.start(read.value.sequent, startMode, json()));
      if (!started.ok) {
        if (started.failed)
          update(id, (q) => (q.inputProblem = inputProblem(started.failed as Failure)));
        return { kind: "sequent" };
      }
      update(id, (q) => (q.calculus = linear(startMode)));
      show(id, started.value, 0);
      save();
      return { kind: "sequent" };
    },

    /**
     * Opens a problem (Learn's or Practice's) as a proof of its own, in place
     * of the page's empty one if that is shown: its sequent to prove, or with `watch` its proof
     * taken back to the sequent, each step on the redo stack by itself, so
     * that Redo plays the proof one step at a time. Nothing open is replaced.
     */
    example: guard(
      async (example: Pick<Example, "sequent" | "mode" | "session">, watch: boolean) => {
        const empty = current();
        const blankId = empty && !empty.session && !empty.input.trim() ? empty.id : null;
        const opened = await actions.open(
          watch && example.session ? example.session : example.sequent,
          linear(example.mode),
        );
        if ("problem" in opened) return;
        const p = current();
        if (blankId && blankId !== p?.id) actions.remove(blankId);
        if (!watch || !p?.session) return;
        const all = actionsOf(p.session as SessionDoc, p.view?.cuts, p.view);
        const result = await attempt(() => api.replay(p.session as SessionDoc, [], replaying()));
        if (!result.ok) return;
        update(p.id, (q) => {
          q.input = example.sequent;
          q.redo = all.toReversed().map((action) => [action]);
        });
        show(p.id, result.value, 0);
        save();
      },
    ),

    /**
     * Shows a lesson's worked proof after its first `played` steps, on the tab `tab` while
     * that tab still holds the problem's sequent, else on a new tab as `example` opens one.
     * With `watch` the steps after are on the redo stack, each by itself, so that Redo plays
     * them; without, the rest of the proof is the visitor's. Returns the tab's id.
     */
    worked: guard(
      async (
        example: Pick<Example, "sequent" | "mode" | "session">,
        played: number,
        watch: boolean,
        tab: string | null,
      ): Promise<string | null> => {
        if (!example.session) return null;
        let p = store.proofs.find(
          (q) =>
            q.id === tab &&
            q.session &&
            sameCalculus(q.calculus, linear(example.mode)) &&
            q.input === example.sequent,
        );
        if (p) actions.activate(p.id);
        else {
          const empty = current();
          const blankId = empty && !empty.session && !empty.input.trim() ? empty.id : null;
          const opened = await actions.open(example.session, linear(example.mode));
          if ("problem" in opened) return null;
          p = current();
          if (blankId && blankId !== p?.id) actions.remove(blankId);
        }
        if (!p?.session) return null;
        // With the session's view, a cut replays from its formula and a quantifier step with its witness.
        const doc = JSON.parse(example.session) as SessionDoc;
        const full = await attempt(() => api.view(doc, json()));
        if (!full.ok) return null;
        const all = actionsOf(doc, full.value.cuts, full.value);
        const result = await attempt(() =>
          api.replay(p.session as SessionDoc, all.slice(0, played), replaying()),
        );
        if (!result.ok) return null;
        const id = p.id;
        update(id, (q) => {
          q.input = example.sequent;
          q.redo = watch
            ? all
                .slice(played)
                .toReversed()
                .map((action) => [action])
            : [];
        });
        const next = all[played];
        show(id, result.value, next ? goalAt(result.value.session, next.path) : undefined);
        save();
        return id;
      },
    ),

    /** Notes a line on the stage that is no goal's. */
    banner(id: string, said: Said | null) {
      update(id, (p) => (p.banner = said));
    },

    focus(goal: number) {
      const p = current();
      if (p) update(p.id, (q) => (q.active = pathOf(p, goal)));
    },

    /** Moves the active goal to the next (or previous) open one. */
    cycle(by: 1 | -1) {
      const p = current();
      const goals = p?.view?.goals.map((g) => g.goal) ?? [];
      const now = activeGoal(p);
      if (!p || now === undefined || goals.length === 0) return;
      const next = goals[(goals.indexOf(now) + by + goals.length) % goals.length] as number;
      actions.focus(next);
    },

    async rules(goal: number, position: number): Promise<Offered[]> {
      const p = current();
      if (!p?.session) return [];
      const o = ordinaryOf(p);
      if (o) {
        const formulas = p.view?.goals.find((g) => g.goal === goal)?.formulas ?? [];
        const { side, position: at } = ordinaryStep(formulas, { position, rule: "" });
        const result = await attempt(() =>
          api.ordinary.rules(o.session, goal, side, at, ordinaryJson()),
        );
        // A rule of two premises shares the goal's context, G3's form a first course reads: the
        // page applies it at once.
        return result.ok ? result.value.map((r) => ({ rule: r.rule, split: false })) : [];
      }
      const result = await attempt(() =>
        api.rules(p.session as SessionDoc, goal, position, json()),
      );
      return result.ok ? result.value : [];
    },

    async splitPasses(goal: number, step: StepForm) {
      const p = current();
      if (!p?.session) return null;
      const result = await attempt(() =>
        api.splitPasses(p.session as SessionDoc, goal, step, json()),
      );
      return result.ok ? result.value : null;
    },

    /** Applies a step; a refusal becomes the note at the goal. Returns whether it applied. */
    apply: guard(async (goal: number, step: StepForm): Promise<boolean> => {
      const p = current();
      if (!p?.session) return false;
      const o = ordinaryOf(p);
      if (o) {
        const formulas = p.view?.goals.find((g) => g.goal === goal)?.formulas ?? [];
        const done = await attempt(() =>
          api.ordinary.apply(o.session, goal, ordinaryStep(formulas, step), ordinaryJson()),
        );
        if (!done.ok) {
          if (done.failed) {
            const said = ordinaryRefusal(done.failed, formulas, step.rule);
            const path = pathOf(p, goal);
            update(p.id, (q) => (q.note = { path, said, tone: "bad", position: step.position }));
          }
          return false;
        }
        update(p.id, (q) => (q.later = []));
        show(
          p.id,
          { session: done.value.session, view: asView(done.value.view) },
          done.value.opened[0] ?? done.value.view.goals[0]?.goal,
        );
        save();
        return true;
      }
      const result = await attempt(() => api.apply(p.session as SessionDoc, goal, step, json()));
      if (!result.ok) {
        if (result.failed) {
          const formulas = p.view?.goals.find((g) => g.goal === goal)?.formulas ?? [];
          const said = refusal(result.failed, formulas, step.rule);
          const path = pathOf(p, goal);
          update(p.id, (q) => (q.note = { path, said, tone: "bad", position: step.position }));
        }
        return false;
      }
      update(p.id, (q) => (q.redo = []));
      show(p.id, result.value, result.value.opened[0] ?? result.value.view.goals[0]?.goal);
      save();
      return true;
    }),

    /**
     * Applies a quantifier step with its witness typed (or left open): what to say at the
     * witness's form when it was not taken (the term, the eigenvariable condition), else null.
     */
    witnessed: guard(async (goal: number, step: StepForm): Promise<Said | null> => {
      const p = current();
      if (!p?.session) return null;
      const result = await attempt(() => api.apply(p.session as SessionDoc, goal, step, json()));
      if (!result.ok) {
        const formulas = p.view?.goals.find((g) => g.goal === goal)?.formulas ?? [];
        return result.failed ? refusal(result.failed, formulas, step.rule) : null;
      }
      update(p.id, (q) => (q.redo = []));
      show(p.id, result.value, result.value.opened[0] ?? result.value.view.goals[0]?.goal);
      save();
      return null;
    }),

    /**
     * Cuts a goal on a formula typed in the tab's syntax, the goal's formulas at `left` going
     * to the first premise; both premises open. Returns what to say at the cut's form when
     * it was not made (its formula's text, or the step's refusal), else null.
     */
    cut: guard(
      async (goal: number, formula: string, left: readonly number[]): Promise<Said | null> => {
        const p = current();
        if (!p?.session) return null;
        const result = await attempt(() =>
          api.cut(p.session as SessionDoc, goal, formula, left, json()),
        );
        if (!result.ok) {
          const formulas = p.view?.goals.find((g) => g.goal === goal)?.formulas ?? [];
          return result.failed ? cutProblem(result.failed, formulas) : null;
        }
        update(p.id, (q) => (q.redo = []));
        show(p.id, result.value, result.value.opened[0] ?? result.value.view.goals[0]?.goal);
        save();
        return null;
      },
    ),

    /** Starts eliminating the finished proof's cuts on a view, `settings` the stage's drawing's. */
    eliminate: guard(async (on: On, settings: string) => {
      const p = current();
      if (!p?.session || !p.view?.complete) return;
      const result = await attempt(() => api.cuts(on, p.session as SessionDoc, "", settings));
      update(p.id, (q) => {
        q.elim[on] = result.ok
          ? fresh(result.value)
          : {
              ...fresh({ cuts: [], next: null, drawing: null }),
              problem: result.failed ? eliminationProblem(result.failed) : null,
            };
      });
    }),

    /** One step of elimination: the cut named (a node, or a vertex at a cut link), or the strategy's. */
    eliminationStep: guard(async (on: On, at: number | undefined, settings: string) => {
      const p = current();
      const e = p?.elim[on];
      if (!p?.session || !e) return;
      const result = await attempt(() =>
        api.cutStep(on, p.session as SessionDoc, documentOf(e.reached), at, settings),
      );
      update(p.id, (q) => {
        const now = q.elim[on];
        if (!now) return;
        if (!result.ok) {
          now.problem = result.failed ? eliminationProblem(result.failed) : null;
          return;
        }
        const { step, marked, ...reached } = result.value;
        now.back.push({ kind: "state", reached: now.reached, taken: now.taken.length });
        now.taken.push({
          ...step,
          drawing: on === "tree" ? now.reached.drawing : (marked ?? null),
        });
        Object.assign(now, { reached, stopped: null, undrawn: null, shown: null, problem: null });
      });
    }),

    /** Eliminates to the end within the settings' bounds, each step undoable alone. */
    eliminationRun: guard(async (on: On, settings: string) => {
      const p = current();
      const e = p?.elim[on];
      if (!p?.session || !e) return;
      const result = await attempt(() =>
        api.eliminate(on, p.session as SessionDoc, documentOf(e.reached), settings),
      );
      update(p.id, (q) => {
        const now = q.elim[on];
        if (!now) return;
        if (!result.ok) {
          now.problem = result.failed ? eliminationProblem(result.failed) : null;
          return;
        }
        const { steps, end, reason, undrawn, ...reached } = result.value;
        const from = now.reached;
        const taken = now.taken.length;
        steps.forEach((_, i) => {
          now.back.push({ kind: "run", from, taken, steps: i });
        });
        now.taken.push(...steps);
        Object.assign(now, {
          reached,
          stopped: end === "refused" ? eliminationStopped(reason, steps.length) : null,
          undrawn: undrawn === null ? null : taken + undrawn,
          shown: null,
          problem: null,
        });
      });
    }),

    /** Takes back the last step of an elimination. */
    eliminationUndo: guard(async (on: On, settings: string) => {
      const p = current();
      const e = p?.elim[on];
      const back = e?.back.at(-1);
      if (!p?.session || !e || !back) return;
      let reached: Reached = back.kind === "state" ? back.reached : back.from;
      if (back.kind === "run" && back.steps > 0) {
        // Its steps are taken again undrawn: the drawings are kept already.
        const bounded = { ...JSON.parse(settings), cut: { steps: back.steps, drawn_bytes: 0 } };
        const result = await attempt(() =>
          api.eliminate(
            on,
            p.session as SessionDoc,
            documentOf(back.from),
            JSON.stringify(bounded),
          ),
        );
        if (!result.ok) return;
        const again: Ran = result.value;
        reached = again;
      }
      update(p.id, (q) => {
        const now = q.elim[on];
        if (!now) return;
        now.back.pop();
        now.taken.splice(back.taken + (back.kind === "run" ? back.steps : 0));
        Object.assign(now, { reached, stopped: null, undrawn: null, shown: null, problem: null });
      });
    }),

    /** Shows the drawing a step was taken on, from 1, or with null the proof or net reached. */
    eliminationShow(on: On, step: number | null) {
      const p = current();
      if (!p?.elim[on]) return;
      update(p.id, (q) => {
        const now = q.elim[on];
        if (now) now.shown = step;
      });
    },

    /** Leaves an elimination: the view shows the finished proof again. */
    eliminationLeave(on: On) {
      const p = current();
      if (p) update(p.id, (q) => (q.elim[on] = null));
    },

    /** Undo on the active goal's branch (on a finished proof, the last step). */
    undo: guard(async () => {
      const p = current();
      if (!p?.session) return;
      const o = ordinaryOf(p);
      if (o) {
        // Undo on the active goal's branch; on a finished proof, its last step.
        const back = retractOrdinary(o.session, p.view?.complete ? undefined : activeGoal(p));
        if (!back) {
          update(p.id, (q) => {
            q.note = {
              path: [],
              said: {
                keyword: "Nothing to undo on this branch",
                sentence: "This goal is the sequent itself, with no step on it yet.",
              },
              tone: "plain",
            };
          });
          return;
        }
        // deduxit's reader checks the session again, every inference and the order of the steps.
        const view = await attempt(() => api.ordinary.view(back.session, ordinaryJson()));
        if (!view.ok) {
          if (view.failed)
            update(
              p.id,
              (q) =>
                (q.note = { path: [], said: inputProblem(view.failed as Failure), tone: "bad" }),
            );
          return;
        }
        update(p.id, (q) => {
          q.later.push({ session: o.session, engines: { ...q.engines } });
          q.engines = keptGrafts(back.session, q.engines);
        });
        show(p.id, { session: back.session, view: asView(view.value) }, back.reopened);
        save();
        return;
      }
      // With the invertible rules on, undo takes back the visitor's last choice with the
      // invertible steps after it: taking back one of those alone, the page would apply it again.
      const invertible = settings().invertible ? new Set(p.view?.invertible ?? []) : undefined;
      const retracted = retract(
        p.session as SessionDoc,
        p.view?.complete ? undefined : activeGoal(p),
        invertible,
        p.view?.cuts,
        p.view,
      );
      const back = retracted && {
        ...retracted,
        kept: actionsFor(p, retracted.kept),
        removed: actionsFor(p, retracted.removed),
      };
      if (!back) {
        // Steps there are, but each one the page applied by itself.
        const automatic =
          invertible !== undefined &&
          retract(p.session as SessionDoc, activeGoal(p), undefined, p.view?.cuts, p.view) !==
            undefined;
        update(p.id, (q) => {
          q.note = {
            path: [],
            said: {
              keyword: "Nothing to undo on this branch",
              sentence: automatic
                ? "Every step on this branch is an invertible rule the page applied by itself."
                : "This goal is the sequent itself, with no step on it yet.",
            },
            tone: "plain",
          };
        });
        return;
      }
      const result = await attempt(() =>
        api.replay(p.session as SessionDoc, back.kept, replaying()),
      );
      if (!result.ok) return;
      const reopened = goalAt(result.value.session, back.reopened);
      update(p.id, (q) => q.redo.push([...back.removed]));
      show(p.id, result.value, reopened);
      if (result.value.failed.length) actions.lost(p.id, result.value.failed);
      save();
    }),

    /**
     * From a goal the search refuted, goes back on its branch to the nearest goal below it that
     * still has a proof: each goal below, nearest first, reopened by a replay without the steps
     * above it and searched within the budget (the sequent's own verdict where one is kept).
     * The steps taken back are one undo, which redo takes again. Without such a goal, the note
     * says why.
     */
    goBack: guard(async (goal: number) => {
      const p = current();
      const doc = p?.session;
      if (!p || !doc) return;
      const path = pathOf(p, goal);
      if (path.length === 0) return;
      const budget = settings().budget;
      const kept = p.verdict?.outcome ? decidedOf(p.verdict.outcome.verdict) : "unknown";
      const o = ordinaryOf(p);
      /** Why the walk ended early: a call refused (said at the goal), or null for a stop. */
      // Set in the walk's callbacks, which the compiler's narrowing does not follow.
      let failed = null as Failure | null;
      /** Shows the session found, its goal open. */
      let commit = null as (() => void) | null;
      const decide = async (below: Path, searched: () => Promise<Decided | null>) =>
        below.length === 0 && kept !== "unknown" ? kept : searched();
      const found = await wayBack(path, async (below) => {
        const child = goalAt(doc, path.slice(0, below.length + 1));
        if (o) {
          const back = retractOrdinary(o.session, child);
          if (!back) return null;
          const view = await attempt(() => api.ordinary.view(back.session, ordinaryJson()));
          if (!view.ok) {
            failed = view.failed;
            return null;
          }
          const decided = await decide(below, async () => {
            const closed = await attempt(() =>
              api.ordinary.close(back.session, back.reopened, ordinaryJson(budget)),
            );
            if (!closed.ok) failed = closed.failed;
            return closed.ok ? decidedOf(closed.value.outcome.verdict) : null;
          });
          commit = () => {
            update(p.id, (q) => {
              q.later.push({ session: o.session, engines: { ...q.engines } });
              q.engines = keptGrafts(back.session, q.engines);
            });
            show(p.id, { session: back.session, view: asView(view.value) }, back.reopened);
          };
          return decided;
        }
        const retracted = retract(doc as SessionDoc, child, undefined, p.view?.cuts, p.view);
        if (!retracted) return null;
        const replayed = await attempt(() =>
          api.replay(doc as SessionDoc, actionsFor(p, retracted.kept), replaying()),
        );
        if (!replayed.ok) {
          failed = replayed.failed;
          return null;
        }
        const at = goalAt(replayed.value.session, below) ?? 0;
        const decided = await decide(below, async () => {
          const closed = await attempt(() => api.close(replayed.value.session, at, json(budget)));
          if (!closed.ok) failed = closed.failed;
          return closed.ok ? decidedOf(closed.value.outcome.verdict) : null;
        });
        commit = () => {
          update(p.id, (q) => q.redo.push(actionsFor(p, retracted.removed)));
          show(p.id, replayed.value, at);
          if (replayed.value.failed.length) actions.lost(p.id, replayed.value.failed);
        };
        return decided;
      });
      const noted = (at: Path, said: Said & { tone: Tone }) => {
        update(p.id, (q) => (q.note = { path: at, said, tone: said.tone }));
        say(`${said.keyword}. ${said.sentence}`);
      };
      if (found === null) {
        noted(
          path,
          failed
            ? { ...inputProblem(failed), tone: "bad" }
            : { keyword: "Stopped", sentence: "The search was stopped.", tone: "warn" },
        );
        return;
      }
      if (found.to === null) {
        noted(path, wentBack(found.why));
        return;
      }
      commit?.();
      noted(found.to, wentBack("proved"));
      save();
    }),

    /** Goes back to the session as it was after its first `count` actions; redo brings the rest back. */
    backTo: guard(async (count: number) => {
      const p = current();
      if (!p?.session) return;
      const o = ordinaryOf(p);
      if (o) {
        // deduxit's undo takes back the session's last step, so going back is undoing to there.
        let session = o.session;
        const before: { session: OrdinarySession; engines: Record<string, string> }[] = [];
        let reopened: number | null = null;
        while (session.history.length > count) {
          const now = session;
          const back = await attempt(() => api.ordinary.undo(now, ordinaryJson()));
          if (!back.ok) return;
          before.push({ session: now, engines: keptGrafts(now, p.engines) });
          session = back.value.session;
          reopened = back.value.reopened;
        }
        if (before.length === 0) return;
        const view = await attempt(() => api.ordinary.view(session, ordinaryJson()));
        if (!view.ok) return;
        const engines = keptGrafts(session, p.engines);
        update(p.id, (q) => {
          q.later.push(...before);
          q.engines = engines;
        });
        show(p.id, { session, view: asView(view.value) }, reopened ?? undefined);
        save();
        return;
      }
      const all = actionsFor(p, actionsOf(p.session as SessionDoc, p.view?.cuts, p.view));
      if (count >= all.length) return;
      const result = await attempt(() =>
        api.replay(p.session as SessionDoc, all.slice(0, count), replaying()),
      );
      if (!result.ok) return;
      const removed = all.slice(count);
      update(p.id, (q) => q.redo.push(removed));
      const reopened = removed[0] ? goalAt(result.value.session, removed[0].path) : undefined;
      show(p.id, result.value, reopened);
      if (result.value.failed.length) actions.lost(p.id, result.value.failed);
      save();
    }),

    /** Redoes what the last undo took back. */
    redo: guard(async () => {
      const o = ordinaryOf(current());
      const p = current();
      if (o && p) {
        const next = p.later.at(-1);
        if (!next) return;
        const view = await attempt(() => api.ordinary.view(next.session, ordinaryJson()));
        if (!view.ok) return;
        update(p.id, (q) => {
          q.later.pop();
          q.engines = { ...next.engines };
        });
        show(p.id, { session: next.session, view: asView(view.value) }, view.value.goals[0]?.goal);
        save();
        return;
      }
      const todo = p?.redo.at(-1);
      if (!p?.session || !p.view || !todo) return;
      const result = await attempt(() =>
        api.play({ session: p.session as SessionDoc, view: p.view as View }, todo, replaying()),
      );
      if (!result.ok) return;
      update(p.id, (q) => q.redo.pop());
      const under = todo[0]?.path ?? [];
      const open = result.value.view.goals.map((g) => g.goal);
      const where = paths(result.value.session);
      const next = open.find((g) => within(where.get(g) ?? [], under)) ?? open[0];
      show(p.id, result.value, next);
      if (result.value.failed.length) actions.lost(p.id, result.value.failed);
      save();
    }),

    /** Says that a replay left goals open that it had closed before. */
    lost(id: string, failed: readonly Path[]) {
      update(id, (q) => {
        q.note = {
          path: failed[0] ?? [],
          said: {
            keyword: "Not closed again",
            sentence:
              "A goal the search had closed did not close again within the budget, so it stays open; raise the budget in Settings and close it again.",
          },
          tone: "warn",
        };
      });
    },

    /**
     * Opens a goal as a proof of its own in a new tab, in the same calculus; the new proof
     * remembers the tab and goal it came from.
     */
    openGoal: guard(async (goal: number) => {
      const p = current();
      const g = p?.view?.goals.find((x) => x.goal === goal);
      if (!p?.session || !g) return;
      const opened = await actions.open(sequentText(g.formulas), p.calculus);
      if ("problem" in opened) return;
      const q = current();
      if (q && q.id !== p.id)
        update(q.id, (x) => (x.origin = { from: p.id, path: pathOf(p, goal) }));
      say(`Goal ${goal + 1} opened in tab ${index(q?.id ?? "") + 1}.`);
      save();
    }),

    /**
     * The other tabs whose finished proof is of a goal's formulas in any order, by id and by
     * their sequent shortened, which names a tab as its place in the row cannot: that changes as
     * tabs close.
     */
    async fillable(goal: number): Promise<{ id: string; tab: string }[]> {
      const p = current();
      const g = p?.view?.goals.find((x) => x.goal === goal);
      // A fill is deduxit's linear call: an ordinary goal is filled by none.
      if (!p || !g || p.calculus.suite !== "linear") return [];
      const want = keyOf(g.formulas);
      const found: { id: string; tab: string }[] = [];
      for (const q of store.proofs) {
        if (q.id === p.id || !q.view?.complete) continue;
        if ((await sequentKey(q)) === want)
          found.push({ id: q.id, tab: short(displayed(q.input)) });
      }
      return found;
    },

    /**
     * Fills a goal with the finished proof of another tab of the same formulas, as one step
     * named with that tab; deduxit checks it in this proof's calculus, and a refusal is said at
     * the goal.
     */
    fill: guard(async (goal: number, from: string) => {
      const p = current();
      const q = store.proofs.find((x) => x.id === from);
      if (!p?.session || !q?.session || p.calculus.suite !== "linear") return;
      const path = pathOf(p, goal);
      const result = await attempt(() =>
        api.fill(p.session as SessionDoc, goal, q.session as SessionDoc, json()),
      );
      const tab = short(displayed(q.input));
      if (!result.ok) {
        if (result.failed)
          update(p.id, (x) => {
            x.note = { path, said: fillRefusal(result.failed as Failure, tab), tone: "bad" };
          });
        return;
      }
      update(p.id, (x) => {
        x.redo = [];
        x.engines = { ...x.engines, [pathKey(path)]: fromTab(tab) };
      });
      show(p.id, result.value, result.value.view.goals[0]?.goal);
      say(
        `Goal ${goal + 1} filled from ${tab}${result.value.view.complete ? ": the proof is finished" : ""}.`,
      );
      save();
    }),

    /** Closes a goal by the search, within the budget (times `factor`). */
    close: guard(async (goal: number, factor: number = 1) => {
      const p = current();
      if (!p?.session) return;
      // A unit of work is whole: a fraction of a budget the visitor set rounds to one.
      const budget = Math.max(1, Math.round(settings().budget * factor));
      const path = pathOf(p, goal);
      const o = ordinaryOf(p);
      if (o) {
        await closeOrdinary(p, o.session, goal, budget);
        return;
      }
      const result = await attempt(() => api.close(p.session as SessionDoc, goal, json(budget)));
      if (!result.ok) {
        if (result.failed === null) {
          update(
            p.id,
            (q) =>
              (q.note = {
                path,
                said: { keyword: "Stopped", sentence: "The search was stopped." },
                tone: "warn",
              }),
          );
        } else {
          update(
            p.id,
            (q) => (q.note = { path, said: inputProblem(result.failed as Failure), tone: "bad" }),
          );
        }
        return;
      }
      const closed = result.value;
      const engine = engineOf(closed.outcome);
      if (closed.outcome.verdict === "proved" && !closed.refused) {
        update(p.id, (q) => {
          q.redo = [];
          if (engine) q.engines = { ...q.engines, [pathKey(path)]: engine };
        });
        show(p.id, closed, closed.view.goals[0]?.goal);
        say(
          `Goal ${goal + 1} closed${engine ? ` by the ${engineName(engine)}` : ""}${closed.view.complete ? ": the proof is finished" : ""}.`,
        );
        save();
        return;
      }
      const said = closed.refused
        ? {
            keyword: "Proved, but not added to the derivation",
            sentence: closed.refused.message,
            tone: "warn" as Tone,
          }
        : verdict(closed.outcome, closed.refutation_checked);
      update(p.id, (q) => {
        q.note = { path, said, tone: said.tone, outcome: closed.outcome, budget };
        if (path.length === 0) q.verdict = { ...said, outcome: closed.outcome };
      });
    }),

    /** Closes every open goal within one budget. */
    closeAll: guard(async () => {
      const p = current();
      if (!p?.session) return;
      const o = ordinaryOf(p);
      if (o) {
        // Each open goal in turn, each within the budget, until one is not closed.
        for (const goal of p.view?.goals.map((g) => g.goal) ?? []) {
          const now = current();
          const doc = ordinaryOf(now)?.session;
          if (!now || now.id !== p.id || !doc) return;
          if (!(await closeOrdinary(now, doc, goal, settings().budget))) return;
        }
        return;
      }
      const result = await attempt(() => api.closeAll(p.session as SessionDoc, json()));
      if (!result.ok) {
        if (result.failed === null) {
          update(
            p.id,
            (q) =>
              (q.note = {
                path: q.active ?? [],
                said: { keyword: "Stopped", sentence: "The search was stopped." },
                tone: "warn",
              }),
          );
        }
        return;
      }
      const closed = result.value;
      const before = p.session;
      const where = paths(before);
      const unproved = closed.results.find((r) => r.outcome && r.outcome.verdict !== "proved");
      const grafted: Record<string, string> = {};
      for (const r of closed.results) {
        const engine = engineOf(r.outcome);
        if (r.outcome?.verdict === "proved" && !r.refused && engine)
          grafted[pathKey(where.get(r.goal) ?? [])] = engine;
      }
      update(p.id, (q) => {
        q.redo = closed.session.history.length !== before.history.length ? [] : q.redo;
        q.engines = { ...q.engines, ...grafted };
      });
      show(p.id, closed, closed.view.goals[0]?.goal);
      if (unproved?.outcome) {
        const said = verdict(unproved.outcome, null);
        const path = where.get(unproved.goal) ?? [];
        update(p.id, (q) => {
          q.note = {
            path,
            said,
            tone: said.tone,
            outcome: unproved.outcome as Outcome,
            budget: settings().budget,
          };
          if (path.length === 0) q.verdict = { ...said, outcome: unproved.outcome as Outcome };
        });
      }
      save();
    }),

    stop() {
      api.cancel();
    },

    /**
     * The search's hint on a goal: its outcome and the first steps of the proof it found, none
     * where it found none.
     */
    async hint(goal: number): Promise<Hint> {
      const p = current();
      const o = ordinaryOf(p);
      if (!o) return api.hint(p?.session as SessionDoc, goal, json());
      const formulas = p?.view?.goals.find((g) => g.goal === goal)?.formulas ?? [];
      const answer = await api.ordinary.hint(o.session, goal, ordinaryJson());
      return {
        outcome: answer.outcome as unknown as Outcome,
        steps: answer.steps.length ? hintSteps(formulas, answer.steps) : null,
        invertible: null,
      };
    },

    /**
     * The engines for a proof's sequent: the one deduxit picks, and for each
     * engine whether it takes the sequent or the refusal a search forced to it
     * answers before it starts (each asked with a budget of one unit, so that
     * none searches).
     */
    async engines(session: SessionDoc): Promise<Engines> {
      const asked = (engine?: string) =>
        attempt(() =>
          api.prove(
            session.sequent,
            session.mode,
            JSON.stringify({
              limits: { work: 1 },
              search: { classical_work: 1, ...(engine ? { engine } : {}) },
            }),
          ),
        );
      const automatic = await asked();
      const engines = [];
      for (const engine of ENGINE_ORDER) {
        const answer = await asked(engine);
        engines.push({ engine, refused: answer.ok ? null : answer.failed });
      }
      return {
        automatic: automatic.ok ? (automatic.value.outcome.engine ?? null) : null,
        engines,
      };
    },

    /** Notes at a goal what the page has to say there: a hint's failure. */
    note(goal: number, said: Said, tone: Tone) {
      const p = current();
      if (p) update(p.id, (q) => (q.note = { path: pathOf(p, goal), said, tone }));
    },

    /** The note at a goal shown, cleared. */
    clearNote() {
      const p = current();
      if (p) update(p.id, (q) => (q.note = null));
    },
  };
  return actions;
}
