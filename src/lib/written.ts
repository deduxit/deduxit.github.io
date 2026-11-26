// deduxit © Fabian Lukas Grubmüller 2026
// Licensed under the EUPL

/**
 * A tableau built by hand, as deduxit reviews it (`ordinary_tableau_review`): the review and the
 * words the page says of it. Plain data and words, no Solid.
 */

import type { KripkeModel } from "./ordinary";

/** deduxit's review of a written tableau (wire level 14). */
export interface TableauReview {
  readonly version?: number;
  /** Closed and open are right and finished; unfinished and wrong are the student's to fix. */
  readonly standing: "closed" | "open" | "unfinished" | "wrong";
  readonly sequent?: string;
  /** The line of the text the finding is at, from 1. */
  readonly text_line?: number | null;
  /** The tableau's own line number there. */
  readonly line?: number | null;
  /** What deduxit found, in its words. */
  readonly message: string;
  /** An open tableau's countermodel: the sequent and its one world. */
  readonly countermodel?: { readonly sequent: unknown; readonly model: KripkeModel } | null;
}

/** The keyword, tone and sentence of a review. */
export function reviewWords(review: TableauReview): {
  tone: "ok" | "bad" | "warn";
  keyword: string;
  sentence: string;
} {
  const at = review.text_line ? `Line ${String(review.text_line)}: ` : "";
  switch (review.standing) {
    case "closed":
      return { tone: "ok", keyword: "Closed", sentence: review.message };
    case "open":
      return { tone: "ok", keyword: "Open", sentence: review.message };
    case "unfinished":
      return { tone: "warn", keyword: "Unfinished", sentence: `${at}${review.message}` };
    default:
      return { tone: "bad", keyword: "Wrong step", sentence: `${at}${review.message}` };
  }
}
