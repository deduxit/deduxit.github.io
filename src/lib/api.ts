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
import type { OrdinaryOutcome, OrdinarySession, OrdinaryStep, OrdinaryView } from "./ordinary";
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
    /** The name of its call for a finished proof's λ-term. */
    readonly term: string;
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
    },
    replay: (session: SessionDoc, todo: readonly Action[], settings: string) =>
      json<Replayed>("replay", doc(session), JSON.stringify(todo), settings),
    play: (start: Played, todo: readonly Action[], settings: string) =>
      json<Replayed>("play", JSON.stringify(start), JSON.stringify(todo), settings),
  };
}
