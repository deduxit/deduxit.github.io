// deduxit © Fabian Lukas Grubmüller 2026
// Licensed under the EUPL

/**
 * The written content the page shows (About, the tour's captions), cloned from the templates the
 * page renders, and a rule drawn as its schema (a rule label's hint).
 */

import { For } from "solid-js";
import { type Rule, written } from "../lib/content";

/** A written text of the page, by its template's name. */
export function Written(props: { name: string; class?: string }) {
  return (
    <div
      class={`written ${props.class ?? ""}`}
      ref={(el) => queueMicrotask(() => el.replaceChildren(written(props.name)))}
    />
  );
}

/** A rule drawn as its schema: the premises over a bar over the conclusion, its name beside the bar. */
export function Schema(props: { rule: Pick<Rule, "name" | "premises" | "conclusion"> }) {
  return (
    <span
      class="schema m"
      role="img"
      aria-label={`${props.rule.name}: from ${props.rule.premises.join(" and ") || "nothing"} to ${props.rule.conclusion}`}
    >
      <span class="sch-fig">
        <span class="sch-prem">
          <For each={props.rule.premises}>{(premise) => <span>{premise}</span>}</For>
        </span>
        <span class="sch-concl">{props.rule.conclusion}</span>
      </span>
      <span class="sch-name">{props.rule.name}</span>
    </span>
  );
}
