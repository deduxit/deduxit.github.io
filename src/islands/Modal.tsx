// deduxit © Fabian Lukas Grubmüller 2026
// Licensed under the EUPL

/**
 * Modal logic in the stage's place: before a sequent is decided, one sentence on what □ and ◇
 * mean and an example to try; once decided, the verdict in the system chosen, the derivation
 * drawn as a tree (each formula at a world, `w0 : □p`) or the countermodel drawn with an arrow
 * from each world to each world it sees. Under it, closed until asked for, the model to change
 * and check again: the frame condition it fails is named, or where the sequent fails, with each
 * formula's value and the world that shows it, marked on the model's drawing. Nothing leaves the
 * page: deduxit runs in its worker.
 */

import { createResource, For, Show } from "solid-js";
import { type Marks, missingArrow, ONE_WORLD } from "../lib/kripke";
import {
  CONDITION_WORDS,
  EXAMPLE,
  evaluationWords,
  type Model,
  SYSTEMS,
  valueWords,
  verdictWords,
} from "../lib/modal";
import { KripkeEditor } from "./KripkeEditor";
import type { Prover } from "./state";
import { Why } from "./ui";

export function ModalPanel(props: { prover: Prover }) {
  const proof = () => props.prover.current();
  const work = () => proof()?.modal ?? null;
  return (
    <section class="method modal" aria-label="Modal logic">
      <Show when={work()?.statement} fallback={<Setup prover={props.prover} />}>
        <Decided prover={props.prover} />
      </Show>
    </section>
  );
}

/** The system's conditions in one sentence: what every world's arrows do. */
function systemSentence(name: string): string {
  const conditions = SYSTEMS.find((s) => s.name === name)?.conditions ?? [];
  if (conditions.length === 0) return `In ${name} a world may see any worlds, or none.`;
  const words = conditions.map((c) => CONDITION_WORDS[c]);
  const listed =
    words.length === 1
      ? words[0]
      : `${words.slice(0, -1).join(", ")} and ${words[words.length - 1] as string}`;
  return `In ${name} every world ${listed}.`;
}

/** Before a sequent is decided: what modal logic is, and a sequent to try. */
function Setup(props: { prover: Prover }) {
  const proof = () => props.prover.current();
  const work = () => proof()?.modal ?? null;
  return (
    <>
      <p class="method-verdict">
        Modal logic adds □A, "A is necessary", and ◇A, "A is possible". A model has worlds, and each
        world sees some of them: □A holds at a world when A holds at every world it sees, ◇A when A
        holds at one of them.
      </p>
      <p class="method-verdict">
        Type a sequent in the field above and press Enter: [] is □, {"<>"} is ◇, the rest as in
        ordinary logic.
      </p>
      <Show when={work()?.problem}>{(said) => <Why said={said()} class="custom-problem" />}</Show>
      <p class="row">
        <button
          type="button"
          class="btn"
          onClick={() => {
            const p = proof();
            if (!p) return;
            props.prover.setInput(p.id, EXAMPLE);
            void props.prover.submit(p.id);
          }}
        >
          Try {EXAMPLE}
        </button>
      </p>
    </>
  );
}

/** A decided sequent: its verdict, its drawing, and the model to change and check. */
function Decided(props: { prover: Prover }) {
  const proof = () => props.prover.current();
  const work = () => proof()?.modal ?? null;
  const outcome = () => work()?.outcome ?? null;
  const system = () => outcome()?.system ?? "";
  /** The tab's system, decided or not. */
  const chosen = () => {
    const c = proof()?.calculus;
    return c?.suite === "modal" ? c.system : "";
  };
  const font = () => props.prover.settings().stageFont;
  const [drawing] = createResource(
    () => outcome() ?? undefined,
    (decided) =>
      props.prover.api.modal
        .draw(
          decided,
          JSON.stringify({
            limits: { work: props.prover.settings().budget },
            styles: {
              svg: decided.verdict === "valid" ? { font_size: 30, font: font() } : { font: font() },
            },
          }),
        )
        .catch(() => null),
  );
  const verdict = () => {
    const o = outcome();
    return o ? verdictWords(o) : null;
  };
  const tone = () =>
    outcome()?.verdict === "valid" ? "ok" : outcome()?.verdict === "not_valid" ? "bad" : "warn";
  /** A course pack's problem with the search barred: deduxit decides nothing, the model is the visitor's. */
  const barred = () => {
    const p = proof();
    return p ? props.prover.limits().search(p.id) !== null : false;
  };

  return (
    <Show
      when={!barred()}
      fallback={
        <>
          <p class="method-verdict">
            This problem is yours to decide: deduxit decides nothing here. Find a model where the
            sequent fails, and check it.
          </p>
          <p class="method-verdict">{systemSentence(chosen())}</p>
          <Editor prover={props.prover} open />
        </>
      }
    >
      <p class="method-verdict" role="status">
        <Show when={verdict()} fallback={<>Deciding…</>}>
          {(said) => (
            <>
              <span class={`kw ${tone()}`}>{said().keyword}</span> {said().sentence}
            </>
          )}
        </Show>
      </p>
      <Show when={outcome()}>
        <p class="method-verdict">{systemSentence(system())}</p>
      </Show>
      <Show when={work()?.problem}>{(said) => <Why said={said()} class="custom-problem" />}</Show>
      <Show when={drawing()}>
        {(svg) => (
          <Show
            when={outcome()?.verdict === "not_valid"}
            fallback={
              <>
                <p class="method-verdict">
                  Each formula is written at a world, as w0 : □p, and w0 R w1 says that world 0 sees
                  world 1.
                </p>
                <div class="custom-drawing" innerHTML={svg()} />
                <p class="row">
                  <button
                    type="button"
                    class="btn"
                    onClick={() => {
                      const p = proof();
                      if (p) void props.prover.modalSteps(p.id);
                    }}
                  >
                    Prove it step by step
                  </button>
                </p>
              </>
            }
          >
            <figure class="countermodel">
              <div class="countermodel-drawing" innerHTML={svg()} />
              <figcaption class="said-why">
                World {String(outcome()?.countermodel?.model.world ?? 0)}, outlined, is where the
                sequent fails. An arrow points from a world to a world it sees.
              </figcaption>
            </figure>
          </Show>
        )}
      </Show>
      <Show when={outcome() && outcome()?.verdict !== "unknown"}>
        <Editor prover={props.prover} />
      </Show>
    </Show>
  );
}

/** The model to change and check, drawn: its worlds, their atoms and arrows, the world to check at. */
function Editor(props: { prover: Prover; open?: boolean }) {
  const proof = () => props.prover.current();
  const work = () => proof()?.modal ?? null;
  const model = (): Model | null => work()?.model ?? null;
  const set = (next: Model | null) => {
    const p = proof();
    if (p) props.prover.setModalModel(p.id, next);
  };
  const evaluation = () => work()?.evaluation ?? null;
  const marks = (): Marks | undefined => {
    const e = evaluation();
    if (!e) return undefined;
    if (e.frame)
      return { frame: e.frame.worlds, missing: missingArrow(e.frame.condition, e.frame.worlds) };
    return {
      ...(e.failing === undefined ? {} : { failing: e.failing }),
      witnesses: (e.values ?? []).flatMap((v) => (v.witness === undefined ? [] : [v.witness])),
    };
  };
  return (
    <details class="custom-file modal-editor" open={props.open}>
      <summary>
        {work()?.outcome?.countermodel ? "Change the model and check it" : "Check a model"}
      </summary>
      <Show
        when={model()}
        fallback={
          <p class="row">
            <button type="button" class="btn" onClick={() => set({ ...ONE_WORLD })}>
              Start from one world
            </button>
          </p>
        }
      >
        {(m) => (
          <KripkeEditor
            model={m()}
            reading="modal"
            onChange={(next) => set(next as Model)}
            marks={marks()}
            world={work()?.world ?? null}
            onWorld={(w) => {
              const p = proof();
              if (p) props.prover.setModalWorld(p.id, w);
            }}
            onCheck={() => {
              const p = proof();
              if (p) void props.prover.modalCheck(p.id);
            }}
            busy={props.prover.busy()}
          >
            <Show when={evaluation()}>
              {(e) => (
                <div class="modal-check" role="status">
                  <p class="method-verdict">
                    <span class={`kw ${e().frame ? "warn" : e().holds ? "ok" : "bad"}`}>
                      {evaluationWords(e()).keyword}
                    </span>{" "}
                    {evaluationWords(e()).sentence}
                  </p>
                  <Show when={e().frame}>
                    {(f) => (
                      <p class="said-why">
                        {f().condition === "serial"
                          ? `Drag an arrow from world ${String(f().worlds[0] ?? 0)} to any world.`
                          : `The dashed arrow is the one ${e().system} asks for: drag it in, or change the arrows around it.`}
                      </p>
                    )}
                  </Show>
                  <Show when={e().values?.length}>
                    <ul class="modal-values">
                      <For each={e().values}>{(v) => <li class="m">{valueWords(v)}</li>}</For>
                    </ul>
                  </Show>
                </div>
              )}
            </Show>
          </KripkeEditor>
        )}
      </Show>
    </details>
  );
}
