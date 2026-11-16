// deduxit © Fabian Lukas Grubmüller 2026
// Licensed under the EUPL

/**
 * deduxit's calls as the page makes them: through the module worker
 * (src/worker/deduxit.worker.ts), each answer read from its JSON. A call
 * rejects with what the call threw (deduxit's error JSON, which `failure`
 * reads), or with `Cancelled` when the page stopped it.
 */

import type {
  Closed,
  Failure,
  ClosedAll,
  Hint,
  Inverted,
  Mode,
  Offered,
  Outcome,
  Played,
  Ran,
  Reached,
  ReadResult,
  SequentDoc,
  SessionDoc,
  StepForm,
  Stepped,
  Termed,
} from "./deduxit";
import type {
  CustomChecked,
  CustomOffered,
  CustomPlayed,
  CustomSession,
  CustomStep,
  CustomView,
  DeriveStep,
  Described,
} from "./custom";
import type { OrdinaryOutcome, OrdinarySession, OrdinaryStep, OrdinaryView } from "./ordinary";
import type { Comparison, Interpolation } from "./transforms";
import type { Action as WorkspaceAction, WorkspaceView } from "./workspace";
import { type Client, createClient, type WorkerLike } from "./protocol";
import type { Action, Replayed } from "./steps";

/** What `about` answers. */
export interface About {
  readonly deduxit: string;
  readonly level: number;
  readonly stack_bytes: number;
  /** The suites, each with the prefix of its calls and its parameters. */
  readonly suites: readonly {
    readonly suite: string;
    readonly name: string;
    readonly calls: string;
    readonly parameters: readonly {
      readonly name: string;
      readonly values: readonly string[];
      readonly default: string;
    }[];
    readonly settings: readonly string[];
    /** The name of its call for a finished proof's λ-term, or null for a suite without terms. */
    readonly term: string | null;
  }[];
}

/** An ordinary session with its view, as `ordinary_start`, `ordinary_apply` and `ordinary_undo` answer. */
export interface OrdinaryPlayed {
  readonly session: OrdinarySession;
  readonly view: OrdinaryView;
}

/** The page's handle on deduxit. */
export type Api = ReturnType<typeof createApi>;

/** A handle on a fresh worker; `changed` hears the number of pending calls. */
export function createApi(changed: (pending: number) => void) {
  const client: Client = createClient(
    () =>
      new Worker(new URL("../worker/deduxit.worker.ts", import.meta.url), {
        type: "module",
      }) as WorkerLike,
    changed,
  );
  const json = async <T>(call: string, ...args: unknown[]) =>
    JSON.parse(await client.call<string>(call, ...args)) as T;
  const doc = (session: SessionDoc) => JSON.stringify(session);
  return {
    cancel: () => client.cancel(),
    about: () => json<About>("about"),
    defaults: () => json<{ limits: { work: number } }>("defaults"),
    read: (input: string, settings: string) => json<ReadResult>("read", input, settings),
    /** Reads a document for a proof in `mode`: in intuitionistic mode in its own syntax alone. */
    readAs: (input: string, mode: Mode, settings: string) =>
      json<ReadResult>("read_as", input, mode, settings),
    start: (sequent: SequentDoc, mode: Mode, settings: string) =>
      json<Inverted>("start", JSON.stringify(sequent), mode, settings),
    view: (session: SessionDoc, settings: string) =>
      json<Played["view"]>("view", doc(session), settings),
    rules: (session: SessionDoc, goal: number, position: number, settings: string) =>
      json<Offered[]>("rules", doc(session), goal, position, settings),
    splitPasses: (session: SessionDoc, goal: number, step: StepForm, settings: string) =>
      client.call<boolean>("split_passes", doc(session), goal, JSON.stringify(step), settings),
    apply: (session: SessionDoc, goal: number, step: StepForm, settings: string) =>
      json<Inverted & { opened: number[] }>(
        "apply",
        doc(session),
        goal,
        JSON.stringify(step),
        settings,
      ),
    cut: (
      session: SessionDoc,
      goal: number,
      formula: string,
      left: readonly number[],
      settings: string,
    ) =>
      json<Inverted & { opened: number[] }>(
        "cut",
        doc(session),
        goal,
        formula,
        JSON.stringify(left),
        settings,
      ),
    /** A proof's or net's cuts and drawing: `on` the derivation or the net, `of` its document or "" for the session's. */
    cuts: (on: "tree" | "net", session: SessionDoc, of: string, settings: string) =>
      json<Reached>(on === "tree" ? "cuts" : "net_cuts", doc(session), of, settings),
    /** One step of elimination, on the cut `at` (a node, or a vertex at a cut link) or the strategy's. */
    cutStep: (
      on: "tree" | "net",
      session: SessionDoc,
      of: string,
      at: number | undefined,
      settings: string,
    ) => json<Stepped>(on === "tree" ? "cut_step" : "net_cut_step", doc(session), of, at, settings),
    /** Elimination to the end within the settings' bounds. */
    eliminate: (on: "tree" | "net", session: SessionDoc, of: string, settings: string) =>
      json<Ran>(on === "tree" ? "eliminate" : "net_eliminate", doc(session), of, settings),
    close: (session: SessionDoc, goal: number, settings: string) =>
      json<Closed>("close", doc(session), goal, settings),
    fill: (session: SessionDoc, goal: number, source: SessionDoc, settings: string) =>
      json<Played & { filled: number }>("fill", doc(session), goal, doc(source), settings),
    invertAll: (session: SessionDoc, settings: string) =>
      json<Inverted>("invert_all", doc(session), settings),
    closeAll: (session: SessionDoc, settings: string) =>
      json<ClosedAll>("close_all", doc(session), settings),
    hint: (session: SessionDoc, goal: number, settings: string) =>
      json<Hint>("hint", doc(session), goal, settings),
    proof: (session: SessionDoc, settings: string) =>
      json<unknown>("proof", doc(session), settings),
    /** A finished proof's λ-term by its suite's call (`Suite.term`), or why it has none. */
    term: (call: string, session: SessionDoc | OrdinarySession, settings: string) =>
      json<Termed>(call, JSON.stringify(session), settings),
    prove: (sequent: SequentDoc, mode: Mode, settings: string) =>
      json<{ outcome: Outcome; refutation_checked: boolean | null }>(
        "prove",
        JSON.stringify(sequent),
        mode,
        settings,
      ),
    draw: (session: SessionDoc, settings: string) =>
      client.call<string>("draw", doc(session), settings),
    drawNet: (session: SessionDoc, settings: string) =>
      client.call<string>("draw_net", doc(session), settings),
    exportAs: (session: SessionDoc, format: string, settings: string) =>
      client.call<string>("export_as", doc(session), format, settings),
    render: (svg: string, format: "png" | "pdf", font: Uint8Array, settings: string) =>
      client.call<Uint8Array>("render", svg, format, font, settings),
    certificate: (outcome: Outcome, settings: string) =>
      client.call<string>("certificate", JSON.stringify(outcome), settings),
    /** The ordinary suite's calls (`ordinary_…`): sessions of LK and LJ. */
    ordinary: {
      start: (sequent: string, logic: string, settings: string) =>
        json<OrdinaryPlayed>("ordinary_start", sequent, logic, settings),
      view: (session: OrdinarySession, settings: string) =>
        json<OrdinaryView>("ordinary_view", JSON.stringify(session), settings),
      rules: (
        session: OrdinarySession,
        goal: number,
        side: string,
        position: number,
        settings: string,
      ) =>
        json<{ rule: string; split: boolean }[]>(
          "ordinary_rules",
          JSON.stringify(session),
          goal,
          side,
          position,
          settings,
        ),
      apply: (session: OrdinarySession, goal: number, step: OrdinaryStep, settings: string) =>
        json<OrdinaryPlayed & { opened: number[] }>(
          "ordinary_apply",
          JSON.stringify(session),
          goal,
          JSON.stringify(step),
          settings,
        ),
      undo: (session: OrdinarySession, settings: string) =>
        json<OrdinaryPlayed & { reopened: number | null }>(
          "ordinary_undo",
          JSON.stringify(session),
          settings,
        ),
      close: (session: OrdinarySession, goal: number, settings: string) =>
        json<OrdinaryPlayed & { outcome: OrdinaryOutcome; refused: Failure | null }>(
          "ordinary_close",
          JSON.stringify(session),
          goal,
          settings,
        ),
      hint: (session: OrdinarySession, goal: number, settings: string) =>
        json<{ outcome: OrdinaryOutcome; steps: OrdinaryStep[] }>(
          "ordinary_hint",
          JSON.stringify(session),
          goal,
          settings,
        ),
      draw: (session: OrdinarySession, settings: string) =>
        client.call<string>("ordinary_draw", JSON.stringify(session), settings),
      exportAs: (session: OrdinarySession, format: string, settings: string) =>
        client.call<string>("ordinary_export", JSON.stringify(session), format, settings),
      /** An outcome's countermodel drawn as SVG, checked first. */
      modelDrawing: (outcome: OrdinaryOutcome, settings: string) =>
        client.call<string>("ordinary_model_drawing", JSON.stringify(outcome), settings),
      /** The Rocq certificate of an outcome's countermodel. */
      modelCertificate: (outcome: OrdinaryOutcome, settings: string) =>
        client.call<string>("ordinary_model_certificate", JSON.stringify(outcome), settings),
      /** A classical sequent decided by its truth table, the table in the outcome's `search`. */
      table: (sequent: string, settings: string) =>
        json<OrdinaryOutcome>("ordinary_table", sequent, settings),
      /** A classical sequent decided by a signed tableau, the tableau in the outcome's `search`. */
      tableau: (sequent: string, settings: string) =>
        json<OrdinaryOutcome>("ordinary_tableau", sequent, settings),
      /** A classical sequent translated negatively, both decided: `options` names the translation. */
      translate: (sequent: string, options: string, settings: string) =>
        json<Comparison>("ordinary_translate", sequent, options, settings),
      /** A sequent decided in `logic` and its interpolant for `partition`, the halves checked. */
      interpolate: (sequent: string, logic: string, partition: string, settings: string) =>
        json<Interpolation>("ordinary_interpolate", sequent, logic, partition, settings),
    },
    /** The custom calculus's calls (`rules_…`): derivations in a calculus given as a rule file. */
    custom: {
      /** A built-in calculus's rule file, as text. */
      calculus: (name: string) => client.call<string>("rules_calculus", name),
      /** A rule file (its text, or a built-in name) checked and described. */
      read: (calculus: string, settings: string) =>
        json<Described>("rules_read", calculus, settings),
      start: (calculus: string, goal: string, assumptions: string, settings: string) =>
        json<CustomPlayed>("rules_start", calculus, goal, assumptions, settings),
      view: (session: CustomSession, settings: string) =>
        json<CustomView>("rules_view", JSON.stringify(session), settings),
      rules: (session: CustomSession, goal: number, settings: string) =>
        json<CustomOffered[]>("rules_rules", JSON.stringify(session), goal, settings),
      apply: (session: CustomSession, goal: number, step: CustomStep, settings: string) =>
        json<CustomPlayed & { opened: number[] }>(
          "rules_apply",
          JSON.stringify(session),
          goal,
          JSON.stringify(step),
          settings,
        ),
      /** A forward step at a goal: from lines in force to a new line, numbered `line`. */
      derive: (session: CustomSession, goal: number, step: DeriveStep, settings: string) =>
        json<CustomPlayed & { line: number }>(
          "rules_derive",
          JSON.stringify(session),
          goal,
          JSON.stringify(step),
          settings,
        ),
      /** A goal closed by a line in force at it, by the line's number. */
      cite: (session: CustomSession, goal: number, line: number, settings: string) =>
        json<CustomPlayed>("rules_cite", JSON.stringify(session), goal, line, settings),
      assume: (session: CustomSession, goal: number, settings: string) =>
        json<CustomPlayed>("rules_assume", JSON.stringify(session), goal, settings),
      undo: (session: CustomSession, settings: string) =>
        json<CustomPlayed & { reopened: number | null; removed: number | null }>(
          "rules_undo",
          JSON.stringify(session),
          settings,
        ),
      check: (session: CustomSession, settings: string) =>
        json<CustomChecked>("rules_check", JSON.stringify(session), settings),
      draw: (session: CustomSession, settings: string) =>
        client.call<string>("rules_draw", JSON.stringify(session), settings),
      exportAs: (session: CustomSession, format: string, settings: string) =>
        client.call<string>("rules_export", JSON.stringify(session), format, settings),
    },
    /**
     * The workspace's calls (`workspace_…`): the linked tabs. `doc` is the workspace's document as
     * the last answer gave it, a string handed back as it is; `work` maps a linked tab's proof node
     * to its session as the tab holds it now.
     */
    workspace: {
      statement: (suite: string, text: string, parameter: string, settings: string) =>
        client.call<string>("workspace_statement", suite, text, parameter, settings),
      open: (doc: string, settings: string) => client.call<string>("workspace_open", doc, settings),
      edit: (doc: string, action: WorkspaceAction, work: string, settings: string) =>
        json<{ workspace: string; made: (number | number[] | null)[] }>(
          "workspace_edit",
          doc,
          JSON.stringify(action),
          work,
          settings,
        ),
      undo: (doc: string, work: string, settings: string, forward: boolean) =>
        json<{ workspace: string; name: string | null; sessions: Record<string, OrdinarySession> }>(
          forward ? "workspace_redo" : "workspace_undo",
          doc,
          work,
          settings,
        ),
      compute: (
        doc: string,
        node: number,
        what: "output" | "check",
        work: string,
        settings: string,
      ) => client.call<string>("workspace_compute", doc, node, what, work, settings),
      accept: (doc: string, computed: string, work: string, settings: string) =>
        json<{ workspace: string; accepted: boolean }>(
          "workspace_accept",
          doc,
          computed,
          work,
          settings,
        ),
      run: (doc: string, nodes: readonly number[], work: string, settings: string) =>
        json<{ workspace: string; ran: number[] }>(
          "workspace_run",
          doc,
          JSON.stringify(nodes),
          "output",
          work,
          settings,
        ),
      view: (doc: string, work: string, settings: string) =>
        json<WorkspaceView>("workspace_view", doc, work, settings),
      pack: (doc: string, nodes: readonly number[], work: string, settings: string) =>
        client.call<string>("workspace_pack", doc, JSON.stringify(nodes), work, settings),
    },
    replay: (session: SessionDoc, todo: readonly Action[], settings: string) =>
      json<Replayed>("replay", doc(session), JSON.stringify(todo), settings),
    play: (start: Played, todo: readonly Action[], settings: string) =>
      json<Replayed>("play", JSON.stringify(start), JSON.stringify(todo), settings),
  };
}
