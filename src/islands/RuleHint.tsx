// deduxit © Fabian Lukas Grubmüller 2026
// Licensed under the EUPL

/**
 * The hint every rule label carries: the rule's full name, its form and what it does, in a card
 * under the label. It opens on hover, on the keyboard's focus and on a tap or a click of a label
 * that toggles it (`data-hint-toggle`), which keeps it until the next press elsewhere or Escape.
 * A screen reader reads the same words as the label's description, so nothing rests on the card.
 */

import { createEffect, createSignal, For, onCleanup, onMount, Show } from "solid-js";
import { hintId, hintNamed, type RuleHint } from "../lib/rules";
import { Schema } from "./Learn";
import { Words } from "./ui";

/** The hints of the active proof's calculus: set by `RuleHints`, read by every label. */
const [hints, setHints] = createSignal<readonly RuleHint[]>([]);

/** A rule label's name, as a hint looks it up: a run of one rule (`?w*`) is that rule's. */
const named = (label: string) => hintNamed(hints(), label.replace(/\*$/, ""));

/**
 * The attributes that give an element its rule's hint: the label it names, and the hint's words
 * as its description. Nothing where the calculus has no such rule.
 */
export function hinted(label: string): { "data-rule-hint"?: string; "aria-describedby"?: string } {
  const hint = named(label);
  return hint ? { "data-rule-hint": label, "aria-describedby": hintId(hint.name) } : {};
}

/** The full name of the rule a label names ("tensor, right"), or nothing where none is known. */
export const titled = (label: string): string | undefined => named(label)?.title;

/** A rule's hint as one line of text, for a screen reader. */
const spoken = (h: RuleHint) =>
  `${h.name}, ${h.title}: from ${h.premises.join(" and ") || "no premise"} to ${h.conclusion}. ${h.says.replaceAll("`", "")}`;

/** A rule label in running text that shows its hint: a button the keyboard and a tap reach. */
export function RuleName(props: { label: string }) {
  return (
    <Show when={named(props.label)} fallback={<span class="m">{props.label}</span>}>
      <button type="button" class="m rule-name" data-hint-toggle="" {...hinted(props.label)}>
        {props.label}
      </button>
    </Show>
  );
}

/** The card, the descriptions and the listeners; once, in the island. */
export function RuleHints(props: { hints: readonly RuleHint[] }) {
  createEffect(() => setHints(props.hints));
  const [open, setOpen] = createSignal<{
    hint: RuleHint;
    at: Element;
    /** Opened by a press: it stays until a press elsewhere. */
    pinned: boolean;
  } | null>(null);
  let card: HTMLDivElement | undefined;

  onMount(() => {
    let touched = false;
    const of = (event: Event) =>
      (event.target as Element | null)?.closest?.("[data-rule-hint]") ?? null;
    const show = (at: Element, pinned: boolean) => {
      const hint = named(at.getAttribute("data-rule-hint") ?? "");
      if (hint) setOpen({ hint, at, pinned });
    };
    const over = (event: PointerEvent) => {
      if (event.pointerType === "touch" || open()?.pinned) return;
      const at = of(event);
      if (at) show(at, false);
    };
    const out = (event: PointerEvent) => {
      const now = open();
      if (!now || now.pinned) return;
      // The pointer may rest on the card.
      const to = event.relatedTarget as Node | null;
      if (to && (now.at.contains(to) || card?.contains(to))) return;
      if (of(event) === now.at || card?.contains(event.target as Node)) setOpen(null);
    };
    const pressed = (event: PointerEvent) => {
      touched = event.pointerType === "touch";
      const now = open();
      const target = event.target as Node;
      if (now?.pinned && !now.at.contains(target) && !card?.contains(target)) setOpen(null);
    };
    const clicked = (event: MouseEvent) => {
      const at = (event.target as Element | null)?.closest?.("[data-hint-toggle][data-rule-hint]");
      if (!at) return;
      const now = open();
      if (now?.pinned && now.at === at) setOpen(null);
      else show(at, true);
    };
    const focused = (event: FocusEvent) => {
      const at = of(event);
      // The focus a tap or a click leaves is the press's to answer; the keyboard's opens it.
      if (!at || touched || !at.matches(":focus-visible")) return;
      if (!open()?.pinned) show(at, false);
    };
    const blurred = (event: FocusEvent) => {
      const now = open();
      if (!now || of(event) !== now.at) return;
      const to = event.relatedTarget as Node | null;
      if (to && card?.contains(to)) return;
      setOpen(null);
    };
    const typed = (event: KeyboardEvent) => {
      touched = false;
      if (event.key !== "Escape" || !open()) return;
      // Escape dismisses the hint alone, and leaves the focus and whatever is open around it.
      setOpen(null);
      event.stopImmediatePropagation();
      event.preventDefault();
    };
    document.addEventListener("pointerover", over);
    document.addEventListener("pointerout", out);
    document.addEventListener("pointerdown", pressed, true);
    document.addEventListener("click", clicked);
    document.addEventListener("focusin", focused);
    document.addEventListener("focusout", blurred);
    document.addEventListener("keydown", typed, true);
    onCleanup(() => {
      document.removeEventListener("pointerover", over);
      document.removeEventListener("pointerout", out);
      document.removeEventListener("pointerdown", pressed, true);
      document.removeEventListener("click", clicked);
      document.removeEventListener("focusin", focused);
      document.removeEventListener("focusout", blurred);
      document.removeEventListener("keydown", typed, true);
    });
  });

  // A label that leaves the page (a popover closed, a drawing redrawn) takes its hint along.
  createEffect(() => {
    const now = open();
    if (!now) return;
    const gone = new MutationObserver(() => {
      if (!now.at.isConnected) setOpen(null);
    });
    gone.observe(document.body, { childList: true, subtree: true });
    onCleanup(() => gone.disconnect());
  });

  // Under the label, inside the window; above it where there is no room below.
  createEffect(() => {
    const now = open();
    if (!now || !card) return;
    const r = now.at.getBoundingClientRect();
    const gap = 6;
    const x = Math.max(8, Math.min(r.left, window.innerWidth - card.offsetWidth - 8));
    const below = r.bottom + gap;
    const y =
      below + card.offsetHeight > window.innerHeight - 8
        ? Math.max(8, r.top - gap - card.offsetHeight)
        : below;
    card.style.left = `${x}px`;
    card.style.top = `${y}px`;
  });

  return (
    <>
      <div hidden>
        <For each={props.hints}>{(h) => <span id={hintId(h.name)}>{spoken(h)}</span>}</For>
      </div>
      <Show when={open()}>
        {(now) => (
          <div
            class="tip rule-tip"
            ref={card}
            role="tooltip"
            data-pinned={now().pinned ? "" : undefined}
          >
            <p class="rule-tip-h">
              <span class="m">{now().hint.name}</span>: {now().hint.title}
            </p>
            <Schema rule={now().hint} />
            <span>
              <Words text={now().hint.says} />
            </span>
          </div>
        )}
      </Show>
    </>
  );
}
