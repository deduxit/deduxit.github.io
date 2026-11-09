// deduxit © Fabian Lukas Grubmüller 2026
// Licensed under the EUPL

/**
 * deduxit's word mark (src/logo/), drawn inline so that the theme's tokens
 * paint it: the letters in ink, the long marks in the mark's lapis (app.css).
 * The drawing names itself "deduxit". In the band it carries the dictionary
 * line of its word, on hover and on focus.
 */

import { createEffect, createSignal, onCleanup } from "solid-js";
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

/**
 * The band's word mark, a button that a visitor reaches by the keyboard as well as the pointer:
 * it shows the dictionary line in a card under it on hover, on the keyboard's focus and on a
 * click or a tap, which keeps it until the focus leaves. A screen reader reads that line as the
 * button's description; the pointer may rest on the card, and Escape dismisses it (SC 1.4.13).
 */
export function BandMark() {
  const [hovered, setHovered] = createSignal(false);
  const [focused, setFocused] = createSignal(false);
  const [pressed, setPressed] = createSignal(false);
  const [dismissed, setDismissed] = createSignal(false);
  const open = () => (hovered() || focused() || pressed()) && !dismissed();
  // Escape holds until the pointer and the focus have both left.
  createEffect(() => {
    if (!hovered() && !focused() && !pressed()) setDismissed(false);
  });
  createEffect(() => {
    if (!open()) return;
    const dismiss = (event: KeyboardEvent) => {
      if (event.key === "Escape") setDismissed(true);
    };
    document.addEventListener("keydown", dismiss, true);
    onCleanup(() => document.removeEventListener("keydown", dismiss, true));
  });
  return (
    <span
      class="mark-host"
      onPointerEnter={(event) => {
        if (event.pointerType !== "touch") setHovered(true);
      }}
      onPointerLeave={() => setHovered(false)}
    >
      <button
        type="button"
        class="logo wordmark"
        aria-label="deduxit"
        aria-describedby="dictionary"
        // The focus a click or a tap leaves is the click's to answer; the keyboard's opens it.
        onFocus={(event) => setFocused(event.currentTarget.matches(":focus-visible"))}
        onBlur={() => {
          setFocused(false);
          setPressed(false);
        }}
        onClick={() => {
          setDismissed(false);
          setPressed(!pressed());
        }}
        ref={(el) => {
          el.innerHTML = wordmark;
          // The card says what the drawing's own title would, and more; the name is the button's.
          const svg = el.querySelector("svg");
          svg?.querySelector("title")?.remove();
          svg?.removeAttribute("role");
          svg?.removeAttribute("aria-label");
          svg?.setAttribute("aria-hidden", "true");
        }}
      />
      <span id="dictionary" class="cluster dictionary" role="tooltip" hidden={!open()}>
        <Dictionary />
      </span>
    </span>
  );
}
