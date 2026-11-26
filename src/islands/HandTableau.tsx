// deduxit © Fabian Lukas Grubmüller 2026
// Licensed under the EUPL

/**
 * The tableau view's "By hand" (board D13): the sequent's signed formulas, a press on a line
 * expands it on every open branch below, a branch closes by itself, and deduxit reviews the
 * tableau after every press (`ordinary_tableau_review`), which is the only judge. Undo, the
 * tools' or Ctrl+Z, takes the last press back.
 */

import {
  createEffect,
  createMemo,
  createResource,
  createSignal,
  For,
  type JSX,
  Match,
  Show,
  Switch,
} from "solid-js";
import { failure } from "../lib/deduxit";
import {
  closed,
  finished,
  type Hand,
  type Line,
  type Node,
  partsOf,
  replay,
  written,
} from "../lib/hand";
import { formulaTexts, isOrdinary, type SequentForm } from "../lib/ordinary";
import { rootOf } from "../lib/structure";
import { reviewWords, type TableauReview } from "../lib/written";
import type { Prover } from "./state";
import { setCounter, type Ui } from "./ui";
import { markSteps } from "./Views";

/** The lines pressed in each proof's tableau by hand, in order, kept for the visit. */
const [presses, setPresses] = createSignal<Readonly<Record<string, readonly number[]>>>({});

/** The lines pressed in a proof's tableau by hand. */
export const pressesOf = (proof: string) => presses()[proof] ?? [];

/** Takes the last press of a proof's tableau by hand back; false where there is none. */
export function undoPress(proof: string): boolean {
  const now = pressesOf(proof);
  if (now.length === 0) return false;
  setPresses((all) => ({ ...all, [proof]: now.slice(0, -1) }));
  return true;
}

/** Starts a proof's tableau by hand again, from the sequent's own lines. */
export function startPresses(proof: string) {
  setPresses((all) => ({ ...all, [proof]: [] }));
}

export function HandTableauView(props: {
  prover: Prover;
  ui: Ui;
  proof: string;
  sequent: { text: string; form: unknown };
  header?: JSX.Element;
}) {
  const form = () => props.sequent.form as SequentForm;
  const texts = createMemo(() => formulaTexts(form()));
  const hand = createMemo((): Hand => replay(form(), pressesOf(props.proof)));
  const [said, setSaid] = createSignal("");
  // Presses are the view's own steps: bringing it up to date would lose them.
  createEffect(() =>
    markSteps(props.ui, props.proof, "tableau", pressesOf(props.proof).length > 0),
  );
  const [review] = createResource(
    () => [written(form(), hand()), props.sequent.text] as const,
    async ([text, sequent]) => {
      try {
        return (await props.prover.api.ordinary.tableauReview(
          text,
          sequent,
          "{}",
        )) as TableauReview;
      } catch (thrown) {
        return {
          standing: "wrong",
          message: failure(thrown)?.message ?? "Not reviewed.",
        } as TableauReview;
      }
    },
  );
  const press = (line: Line) => {
    if (hand().expanded.has(line.number)) {
      setSaid(`Line ${String(line.number)} is expanded already.`);
      return;
    }
    if (!partsOf(form(), line.sign, line.formula)) {
      setSaid(`Line ${String(line.number)} is an atom or a constant: it has nothing to expand.`);
      return;
    }
    setSaid("");
    setPresses((all) => ({ ...all, [props.proof]: [...pressesOf(props.proof), line.number] }));
  };

  /** A stretch of a branch: its lines as buttons, then its split or its end. */
  const Stretch = (s: { node: Node; above: readonly Line[] }): JSX.Element => {
    const branch = () => [...s.above, ...s.node.lines];
    return (
      <>
        <For each={s.node.lines}>
          {(line) => {
            const done = () => hand().expanded.has(line.number);
            const atom = () => !partsOf(form(), line.sign, line.formula);
            return (
              <li class="tb-line">
                <button
                  type="button"
                  class="tb-press"
                  data-done={done() || atom() ? "" : undefined}
                  // What the line shows first, then the words its signs stand for (WCAG 2.5.3).
                  aria-label={`${String(line.number)} ${line.sign} ${texts()[line.formula] ?? ""}${
                    line.from === null ? "" : ` ${String(line.from)}`
                  }: ${line.sign === "T" ? "true" : "false"}${
                    line.from === null ? "" : `, from line ${String(line.from)}`
                  }${done() ? ", expanded" : atom() ? "" : ", press to expand it"}`}
                  onClick={() => press(line)}
                >
                  <span class="tb-n">{line.number}</span>{" "}
                  <span class="tb-sign" data-sign={line.sign}>
                    {line.sign}
                  </span>{" "}
                  <span class="m">{texts()[line.formula]}</span>
                  <Show when={line.from !== null}>
                    {" "}
                    <span class="tb-from">{line.from}</span>
                  </Show>
                </button>
              </li>
            );
          }}
        </For>
        <Switch>
          <Match when={s.node.kids.length > 0}>
            <li class="tb-split">
              <ul class="tb-branches" aria-label="A split into two branches">
                <For each={s.node.kids}>
                  {(kid) => (
                    <li class="tb-branch">
                      <ul class="tb">
                        <Stretch node={kid} above={branch()} />
                      </ul>
                    </li>
                  )}
                </For>
              </ul>
            </li>
          </Match>
          <Match when={s.node.closed}>
            {(pair) => (
              <li class="tb-end" data-closed="">
                closed:{" "}
                {pair()[0] === pair()[1]
                  ? `line ${pair()[0]}`
                  : `lines ${pair()[0]} and ${pair()[1]}`}{" "}
                clash
              </li>
            )}
          </Match>
          <Match when={finished(form(), hand(), branch())}>
            <li class="tb-end">open: nothing closes this branch</li>
          </Match>
        </Switch>
      </>
    );
  };

  return (
    <section class="method written" aria-label="Your tableau">
      {props.header}
      <Show when={review()}>
        {(r) => {
          const words = () => reviewWords(r());
          return (
            <p class="method-verdict" role="status">
              <span class={`kw ${words().tone}`}>{words().keyword}</span> {words().sentence}
            </p>
          );
        }}
      </Show>
      <Show when={said()}>
        <p class="said-why" role="alert">
          {said()}
        </p>
      </Show>
      <section class="tb-scroll" tabindex="0" aria-label="The tableau's lines">
        <ul class="tb">
          <Stretch node={hand().root} above={[]} />
        </ul>
      </section>
      <Show when={review()?.standing === "open" ? review()?.countermodel : null}>
        {(found) => (
          <p class="row">
            <button
              type="button"
              class="btn btn-s"
              onClick={() => {
                const current = props.prover.current();
                if (!current) return;
                const session = current.session;
                setCounter(props.ui, current.id, {
                  kind: "kripke",
                  proof: current.id,
                  ...(session && isOrdinary(session) ? { root: rootOf(session) } : {}),
                  seed: {
                    model: found().model,
                    sequent: JSON.stringify(found().sequent),
                    logic: "classical",
                    found: true,
                  },
                });
                props.ui.setUi({ tab: "countermodel" });
              }}
            >
              Check its countermodel
            </button>
          </p>
        )}
      </Show>
      <Show when={closed(hand().root) && pressesOf(props.proof).length > 0}>
        <p class="sub">Every branch is closed.</p>
      </Show>
    </section>
  );
}
