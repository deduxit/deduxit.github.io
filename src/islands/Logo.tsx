// deduxit © Fabian Lukas Grubmüller 2026
// Licensed under the EUPL

/**
 * deduxit's word mark (src/logo/), drawn inline so that the theme's tokens
 * paint it: the letters in ink, the long marks in the mark's lapis (app.css).
 * The drawing names itself "deduxit". About shows it with the dictionary
 * line of its word.
 */

import wordmark from "../logo/wordmark-band.svg?raw";

/** The word mark in a span of the given classes. */
export function Logo(props: { class: string }) {
  return (
    <span
      class={`logo ${props.class}`}
      ref={(el) => {
        el.innerHTML = wordmark;
      }}
    />
  );
}

/** What the word dēdūxit is: its pronunciation in classical Latin, its kind and its sense. */
export function Dictionary() {
  return (
    <>
      <b class="headword" lang="la">
        dēdūxit
      </b>{" "}
      <span class="ipa" lang="la-fonipa">
        [deːˈduːk.sɪt]
      </span>{" "}
      <i class="word-kind">Latin, verb</i>: "it has derived", the perfect of <i lang="la">dēdūcō</i>
      , to lead down, derive.
    </>
  );
}
