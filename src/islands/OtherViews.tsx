// deduxit © Fabian Lukas Grubmüller 2026
// Licensed under the EUPL

/**
 * The views of a sequent that stand in the drawing's place without a drawing of deduxit's:
 * resolution, the normal form, the interpolant, the translations, the embedding into linear
 * logic, and a finished proof's λ-term. Each is made from what the view was added with (the
 * sequent as it was then, or the proof), and drawn faint with "Update" once that has changed.
 */

import { Match, Show, Switch } from "solid-js";
import { NormalView, ResolutionView } from "./Clausal";
import type { Proof, Prover } from "./state";
import { InterpolantPanel } from "./Transforms";
import type { Added, Ui } from "./ui";
import {
  EmbeddingView,
  isNegative,
  StaleBar,
  TermView,
  TranslationView,
  ViewPanel,
  VIEWS,
} from "./Views";

/** One view of a sequent or of a proof, in the drawing's place. */
export function OtherView(props: {
  prover: Prover;
  ui: Ui;
  proof: Proof;
  added: Added;
  stale: boolean;
}) {
  const view = () => props.added.view;
  const sequent = () => props.added.sequent;
  const logic = () =>
    props.proof.calculus.suite === "ordinary" ? props.proof.calculus.logic : "classical";
  return (
    <Switch>
      <Match when={isNegative(view()) && sequent()}>
        {(s) => (
          <TranslationView
            prover={props.prover}
            ui={props.ui}
            proof={props.proof.id}
            translation={view() as Parameters<typeof TranslationView>[0]["translation"]}
            sequent={s()}
            stale={props.stale}
          />
        )}
      </Match>
      <Match when={view() === "embedding" && sequent()}>
        {(s) => (
          <EmbeddingView
            prover={props.prover}
            ui={props.ui}
            proof={props.proof.id}
            logic={logic()}
            sequent={s()}
            stale={props.stale}
          />
        )}
      </Match>
      <Match when={view() === "term"}>
        <TermView prover={props.prover} ui={props.ui} proof={props.proof} stale={props.stale} />
      </Match>
      <Match when={sequent()}>
        {(s) => (
          <ViewPanel
            label={view() === "tree" ? "" : VIEWS[view() as "normal"].name}
            stale={props.stale}
          >
            <Show when={props.stale}>
              <StaleBar prover={props.prover} ui={props.ui} proof={props.proof.id} view={view()} />
            </Show>
            <Switch>
              <Match when={view() === "normal"}>
                <NormalView
                  prover={props.prover}
                  ui={props.ui}
                  proof={props.proof.id}
                  sequent={s()}
                  stale={props.stale}
                />
              </Match>
              <Match when={view() === "resolution"}>
                <ResolutionView
                  prover={props.prover}
                  ui={props.ui}
                  proof={props.proof.id}
                  sequent={s()}
                />
              </Match>
              <Match when={view() === "interpolant"}>
                <InterpolantPanel prover={props.prover} ui={props.ui} sequent={s()} />
              </Match>
            </Switch>
          </ViewPanel>
        )}
      </Match>
    </Switch>
  );
}
