// deduxit © Fabian Lukas Grubmüller 2026
// Licensed under the EUPL

/**
 * The truth table and the tableau of a classical proof's sequent, two views the stage shows in
 * the place of the drawing when the visitor picks them: deduxit decides the sequent by the
 * method (`ordinary_table`, `ordinary_tableau`), and the view says the verdict and why in one
 * sentence, then shows the table or the tree, and under a sequent that is not valid its
 * countermodel. The proof itself stays as it was.
 */

import {
  createMemo,
  createResource,
  createSignal,
  For,
  type JSX,
  Match,
  Show,
  Switch,
} from "solid-js";
import { type Failure, failure as failureOf } from "../lib/deduxit";
import {
  type Branch,
  closes,
  firstOpen,
  rowWords,
  type TableModel,
  tableauModel,
  tableauOf,
  tableModel,
  tableOf,
} from "../lib/methods";
import { isOrdinary, type OrdinaryOutcome, sequentText } from "../lib/ordinary";
import { ModelFigure } from "./Countermodel";
import type { Prover } from "./state";

/** The views a classical proof's sequent can be shown in besides its derivation. */
export type Method = "table" | "tableau";

/** The most atoms the page offers to draw a table of past deduxit's bound: 2^14 rows. */
const MOST_ATOMS = 14;

/** deduxit's answer: the outcome, or what it refused. */
type Answer = { readonly outcome: OrdinaryOutcome } | { readonly failure: Failure };

export function MethodView(props: { prover: Prover; method: Method }) {
  const sequent = () => {
    const session = props.prover.current()?.session;
    return session && isOrdinary(session) ? sequentText(session) : undefined;
  };
  /** A larger bound on a table's atoms, asked for after deduxit refused one. */
  const [atoms, setAtoms] = createSignal<number | null>(null);
  const [answer] = createResource(
    () => {
      const text = sequent();
      return text ? ([text, props.method, atoms()] as const) : undefined;
    },
    async ([text, method, most]): Promise<Answer> => {
      const settings = JSON.stringify(most === null ? {} : { limits: { table_atoms: most } });
      const ordinary = props.prover.api.ordinary;
      try {
        return {
          outcome: await (method === "table"
            ? ordinary.table(text, settings)
            : ordinary.tableau(text, settings)),
        };
      } catch (thrown) {
        return { failure: failureOf(thrown) };
      }
    },
  );
  const outcome = () => {
    const a = answer();
    return a && "outcome" in a ? a.outcome : undefined;
  };
  const failure = () => {
    const a = answer();
    return a && "failure" in a ? a.failure : undefined;
  };
  let figure: HTMLDivElement | undefined;
  const toCountermodel = () => {
    figure?.scrollIntoView({ block: "nearest" });
    figure?.focus();
  };

  return (
    <section
      class="method"
      aria-label={props.method === "table" ? "Truth table" : "Tableau"}
      aria-busy={answer.loading}
    >
      <Show when={failure()}>
        {(f) => <Refused failure={f()} method={props.method} raise={(n) => setAtoms(n)} />}
      </Show>
      <Show when={outcome()}>
        {(o) => (
          <>
            <Switch>
              {/* A model is made once: a prop is read again at every use. */}
              <Match when={tableOf(o())}>
                {(table) => {
                  const model = createMemo(() => tableModel(table()));
                  return <TableView model={model()} toModel={toCountermodel} />;
                }}
              </Match>
              <Match when={tableauOf(o())}>
                {(tableau) => {
                  const tree = createMemo(() => tableauModel(tableau()));
                  return <TableauView tree={tree()} />;
                }}
              </Match>
            </Switch>
            <Show when={o().countermodel}>
              <div class="method-model" ref={figure} tabindex="-1">
                <ModelFigure outcome={o()} prover={props.prover} />
              </div>
            </Show>
          </>
        )}
      </Show>
    </section>
  );
}

/** What deduxit refused, in words, and for a table past the bound on atoms the way on. */
function Refused(props: { failure: Failure; method: Method; raise: (atoms: number) => void }) {
  const atoms = () => {
    const n = Number(props.failure.details?.atoms);
    return Number.isInteger(n) ? n : null;
  };
  return (
    <Show
      when={props.failure.code === "too_many_atoms" && atoms()}
      fallback={<p class="method-verdict said-why">{props.failure.message}</p>}
    >
      {(n) => (
        <div class="method-verdict">
          <p>
            This sequent has {n()} atoms, so its truth table has {2 ** n()} rows: more than the page
            draws at once. The tableau decides it without the rows.
          </p>
          <Show when={n() <= MOST_ATOMS}>
            <p>
              <button type="button" class="btn" onClick={() => props.raise(n())}>
                Draw all {2 ** n()} rows
              </button>
            </p>
          </Show>
        </div>
      )}
    </Show>
  );
}

/** A verdict's keyword and its one sentence. */
function Verdict(props: { valid: boolean; children: JSX.Element }) {
  return (
    <p class="method-verdict" role="status">
      <span class={props.valid ? "kw ok" : "kw bad"}>{props.valid ? "Valid" : "Not valid"}</span>{" "}
      {props.children}
    </p>
  );
}

/**
 * The table: a column per atom, then per formula left of ⊢ and right of it, a row per
 * assignment from every atom true to every atom false, and a row that falsifies the sequent
 * marked with its sign and its word; the first one is the countermodel, drawn under the table.
 */
function TableView(props: { model: TableModel; toModel: () => void }) {
  const firstRight = () => props.model.columns.findIndex((c) => c.side === "right");
  const firstFormula = () => props.model.columns.findIndex((c) => c.side !== "atom");
  const edge = (k: number) =>
    k === firstRight() ? "turnstile" : k === firstFormula() ? "atoms" : undefined;
  return (
    <>
      <Show
        when={props.model.first !== null}
        fallback={
          <Verdict valid>
            No row makes every formula left of ⊢ true and every formula right of it false.
          </Verdict>
        }
      >
        <Verdict valid={false}>
          With {rowWords(props.model, props.model.first ?? 0)}, every formula left of ⊢ is true and
          every formula right of it false: row {(props.model.first ?? 0) + 1}.
        </Verdict>
      </Show>
      {/* A long table scrolls in its own box, which the keyboard reaches (WCAG 2.1.1). */}
      <section class="tt-scroll" tabindex="0" aria-label="The rows">
        <table class="tt">
          <thead>
            <tr>
              <For each={props.model.columns}>
                {(c, k) => (
                  <th scope="col" class="m" data-edge={edge(k())}>
                    {c.text}
                  </th>
                )}
              </For>
              <th scope="col">
                <span class="sr-only">Falsifies the sequent</span>
              </th>
            </tr>
          </thead>
          <tbody>
            <For each={props.model.rows}>
              {(row, r) => (
                <tr data-falsifies={row.falsifies ? "" : undefined}>
                  <For each={row.values}>
                    {(value, k) => (
                      <td data-edge={edge(k())} data-value={value ? "T" : "F"}>
                        {value ? "T" : "F"}
                      </td>
                    )}
                  </For>
                  <td class="tt-mark">
                    <Show when={row.falsifies}>
                      <Show when={r() === props.model.first} fallback={<>× falsifies</>}>
                        <button type="button" class="linkish" onClick={() => props.toModel()}>
                          × the countermodel
                        </button>
                      </Show>
                    </Show>
                  </td>
                </tr>
              )}
            </For>
          </tbody>
        </table>
      </section>
    </>
  );
}

/**
 * The tableau: its lines numbered, each a formula marked true (T) or false (F) with the rule
 * and the line it comes from, a split drawn as two branches side by side (one above the other
 * on a phone), and each branch ending closed (×, the lines that clash) or open, with the
 * assignment an open branch gives.
 */
function TableauView(props: { tree: Branch }) {
  return (
    <>
      <Show
        when={closes(props.tree)}
        fallback={
          <Verdict valid={false}>
            A branch stays open, {firstOpen(props.tree)?.replace(/^open: /, "with ")}: every formula
            marked T is true there and every formula marked F false.
          </Verdict>
        }
      >
        <Verdict valid>
          Every branch closes: each makes one formula both true and false, so no assignment makes
          every formula left of ⊢ true and every formula right of it false.
        </Verdict>
      </Show>
      <section class="tb-scroll" tabindex="0" aria-label="The tableau's lines">
        <ul class="tb">
          <Lines branch={props.tree} />
        </ul>
      </section>
    </>
  );
}

/** A branch's lines, then its split, the branch it goes on to, or its end, as list items. */
function Lines(props: { branch: Branch }) {
  return (
    <>
      <For each={props.branch.lines}>
        {(line) => (
          <li class="tb-line">
            <span class="tb-n">{line.number}</span>
            <span class="tb-sign" data-sign={line.sign}>
              <span aria-hidden="true">{line.sign}</span>
              <span class="sr-only">{line.sign === "T" ? "true:" : "false:"}</span>
            </span>
            <span class="m">{line.text}</span>
            <Show when={line.from}>
              {(from) => (
                <span class="tb-from">
                  <span aria-hidden="true">
                    {from().rule} {from().line}
                  </span>
                  <span class="sr-only">
                    , by {from().rule} from line {from().line}
                  </span>
                </span>
              )}
            </Show>
          </li>
        )}
      </For>
      <Switch>
        <Match when={props.branch.next.length === 1}>
          <Lines branch={props.branch.next[0] as Branch} />
        </Match>
        <Match when={props.branch.next.length > 1}>
          <li class="tb-split">
            <ul class="tb-branches" aria-label="A split into two branches">
              <For each={props.branch.next}>
                {(next) => (
                  <li class="tb-branch">
                    <ul class="tb">
                      <Lines branch={next} />
                    </ul>
                  </li>
                )}
              </For>
            </ul>
          </li>
        </Match>
        <Match when={props.branch.end}>
          {(end) => (
            <li class="tb-end" data-closed={end().closed ? "" : undefined}>
              <span aria-hidden="true">{end().closed ? end().mark : end().words}</span>
              <span class="sr-only">{end().words}</span>
            </li>
          )}
        </Match>
      </Switch>
    </>
  );
}
