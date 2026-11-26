// deduxit © Fabian Lukas Grubmüller 2026
// Licensed under the EUPL

/**
 * The page's own signs, drawn on the guide's grid of 18 units with a round stroke and no fill, in
 * the text's colour; app.css sizes them as every icon of a button.
 */

import rocq from "../third-party/rocq/icon-rocq-black.svg?raw";

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
  /** The next step: a chevron. */
  next: "M6.5 4l5 5-5 5",
  /** To the end: a chevron against a bar. */
  end: "M4.5 4l5 5-5 5M13.5 4v10",
  /** Bring up to date: an arrow round a circle. */
  update: "M14.5 9a5.5 5.5 0 1 1-1.6-3.9M14.5 3.5v3h-3",
  /** The graph of views: a node with two hanging from it. */
  graph: "M4.5 3v9.5a2 2 0 0 0 2 2H9M4.5 7.5a2 2 0 0 0 2 2H9M11 7.5h4M11 14.5h4",
  /** Copy as text: two sheets. */
  copy: "M6.5 6.5h8v8h-8zM11.5 6.5v-3h-8v8h3",
  /** List: three lines. */
  list: "M6 5h9M6 9h9M6 13h9M3 5h.5M3 9h.5M3 13h.5",
  /** Step by step: a stair. */
  stairs: "M3 14.5h3.5v-3.5h3.5v-3.5h3.5v-3.5h1.5",
  /** Eliminate the cuts: a cut line with a cross over it. */
  eliminate: "M2.5 9h4M11.5 9h4M7.5 6.5l3 5M10.5 6.5l-3 5",
  /** Close: a small cross. */
  shut: "M5.5 5.5l7 7M12.5 5.5l-7 7",
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

/** Rocq's logo, its small form: the path of the file the site serves under /licenses/rocq/. */
const ROCQ = {
  box: /viewBox="([^"]+)"/.exec(rocq)?.[1] ?? "0 0 1 1",
  path: /\sd="([^"]+)"/.exec(rocq)?.[1] ?? "",
};

/** Rocq's logo in the text's colour, hidden from assistive technology as every sign is. */
export function RocqLogo() {
  return (
    <svg class="icon icon-rocq" viewBox={ROCQ.box} fill="currentColor" aria-hidden="true">
      <path d={ROCQ.path} />
    </svg>
  );
}
