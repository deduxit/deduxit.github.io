// deduxit © Fabian Lukas Grubmüller 2026
// Licensed under the EUPL

/**
 * The page's own signs, drawn on the guide's grid of 18 units with a round stroke and no fill, in
 * the text's colour; app.css sizes them as every icon of a button.
 */

/** Each sign's path on the 18-unit grid. */
const PATHS = {
  /** Close this goal by the search: a check. */
  close: "M3.5 9.5l3.5 3.5 7.5-8",
  /** Prove apart: the goal taken out into a frame of its own. */
  apart: "M10 3h5v5M15 3l-6 6M13 11v3.5a.5.5 0 0 1-.5.5h-9a.5.5 0 0 1-.5-.5v-9a.5.5 0 0 1 .5-.5H7",
  /** Use a proof made apart: an arrow into the goal's frame. */
  use: "M2.5 9H11M8 6l3 3-3 3M13 3.5h1.5a.5.5 0 0 1 .5.5v10a.5.5 0 0 1-.5.5H13",
  /** Go back: an arrow that turns back. */
  back: "M6.5 4L3 7.5 6.5 11M3 7.5h8a4 4 0 0 1 0 8H9",
  /** A caret that opens settings. */
  caret: "M5.5 7.5l3.5 3.5 3.5-3.5",
  /** Apply: the enter key's arrow. */
  enter: "M14.5 4v5a2 2 0 0 1-2 2H4M7 8l-3 3 3 3",
  /** No proof: a cross. */
  cross: "M5 5l8 8M13 5l-8 8",
  /** Add: a plus. */
  plus: "M9 4v10M4 9h10",
  /** Take away: a minus. */
  minus: "M4.5 9h9",
} as const;

/** A sign's name. */
export type SignName = keyof typeof PATHS;

/** One of the page's signs, hidden from assistive technology: its control carries the name. */
export function Sign(props: { name: SignName; class?: string }) {
  return (
    <svg
      class={`icon${props.class ? ` ${props.class}` : ""}`}
      viewBox="0 0 18 18"
      fill="none"
      stroke="currentColor"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <path d={PATHS[props.name]} />
    </svg>
  );
}
