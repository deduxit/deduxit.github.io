// deduxit © Fabian Lukas Grubmüller 2026
// Licensed under the EUPL

/**
 * A tableau written by hand, in the drawing's place: the student types the tableau of a classical
 * proof's sequent line by line, and deduxit reviews it (`ordinary_tableau_review`): the first
 * wrong step named with its line, an unfinished branch, or a tableau that closes or ends open,
 * an open one with its countermodel to open in the model editor. The sequent's own lines are
 * written in at the start; deduxit's tableau is not shown here.
 */

import { createEffect, createSignal, on, Show } from "solid-js";
import { type Failure, failure as failureOf } from "../lib/deduxit";
import { type TableauReview, reviewWords, startLines } from "../lib/written";
import type { Prover } from "./state";
import type { Ui } from "./ui";

/** deduxit's answer: its review, or the text it could not read with the place. */
type Answer = { readonly review: TableauReview } | { readonly failure: Failure };

export function TableauCheckView(props: { prover: Prover; ui: Ui; sequent: string }) {
  const [text, setText] = createSignal("");
  const [answer, setAnswer] = createSignal<Answer | null>(null);
  const [busy, setBusy] = createSignal(false);
  let field: HTMLTextAreaElement | undefined;
  // Whether the student typed since the sequent was set: the start lines arrive later and must
  // not overwrite what they typed.
  let typed = false;

  // The sequent's own lines, numbered and signed, as a tableau starts: deduxit's tableau gives
  // them, and nothing past them.
  createEffect(
    on(
      () => props.sequent,
      async (sequent) => {
        setAnswer(null);
        typed = false;
        let lines = "";
        try {
          lines = startLines(await props.prover.api.ordinary.tableau(sequent, "{}"));
        } catch {
          lines = "";
        }
        if (!typed) setText(lines);
      },
    ),
  );

  /** Selects line `line` of the text (from 1), from `column` (from 1) when given. */
  function point(line: number, column?: number) {
    if (!field) return;
    const lines = text().split("\n");
    const start = lines.slice(0, line - 1).reduce((n, l) => n + l.length + 1, 0);
    const length = lines[line - 1]?.length ?? 0;
    const from = column ? start + Math.min(column - 1, length) : start;
    field.focus();
    field.setSelectionRange(from, column ? from + 1 : start + length);
  }

  async function check() {
    const written = text();
    setBusy(true);
    let found: Answer;
    try {
      found = {
        review: await props.prover.api.ordinary.tableauReview(written, props.sequent, "{}"),
      };
    } catch (thrown) {
      found = { failure: failureOf(thrown instanceof Error ? thrown.message : thrown) };
    } finally {
      setBusy(false);
    }
    if (text() !== written) return;
    setAnswer(found);
    if ("review" in found && found.review.text_line) point(found.review.text_line);
    else if ("failure" in found) {
      const at = found.failure.details;
      const line = Number(at?.["line"]);
      if (Number.isInteger(line) && line > 0) point(line, Number(at?.["column"]) || undefined);
    }
  }

  const words = () => {
    const a = answer();
    if (!a) return null;
    if ("review" in a) return reviewWords(a.review);
    const hint = a.failure.details?.["hint"];
    return {
      tone: "bad" as const,
      keyword: "Not read",
      sentence: `${a.failure.message}${typeof hint === "string" ? ` ${hint}` : ""}`,
    };
  };
  const countermodel = () => {
    const a = answer();
    return a && "review" in a ? a.review.countermodel : undefined;
  };

  return (
    <section class="method written" aria-label="Your tableau">
      <p class="method-verdict">
        Write the tableau of <span class="m">{props.sequent}</span>, a line each: its number, T or
        F, the formula, and the number of the line it comes from. A branch starts with - under the
        line it splits, its lines two spaces in. End a branch with × and the two lines that clash,
        or with open.
      </p>
      <details class="custom-file">
        <summary>An example</summary>
        <pre class="written-example">
          {"1 T p ∨ q\n2 F q ∨ p\n3 F q 2\n4 F p 2\n- 5 T p 1\n  × 4, 5\n- 6 T q 1\n  × 3, 6"}
        </pre>
      </details>
      <textarea
        ref={field}
        class="field written-text"
        aria-label="Your tableau, a line each"
        spellcheck={false}
        autocomplete="off"
        rows={12}
        value={text()}
        onInput={(event) => {
          typed = true;
          setText(event.currentTarget.value);
          setAnswer(null);
        }}
      />
      <p class="row">
        <button
          type="button"
          class="btn btn-primary"
          disabled={busy() || !text().trim()}
          onClick={() => void check()}
        >
          Check the tableau
        </button>
      </p>
      <Show when={words()}>
        {(w) => (
          <div class="modal-check" role="status">
            <p class="method-verdict">
              <span class={`kw ${w().tone}`}>{w().keyword}</span> {w().sentence}
            </p>
            <Show when={countermodel()}>
              {(found) => (
                <p class="row">
                  <button
                    type="button"
                    class="btn btn-s"
                    onClick={() =>
                      props.ui.setUi({
                        modelSeed: {
                          model: found().model,
                          sequent: JSON.stringify(found().sequent),
                          logic: "classical",
                          found: true,
                        },
                        tab: "model",
                      })
                    }
                  >
                    Check its countermodel
                  </button>
                </p>
              )}
            </Show>
          </div>
        )}
      </Show>
    </section>
  );
}
