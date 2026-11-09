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

/**
 * The hints of the active proof's calculus, set by `RuleHints`: by the names its steps take (the
 * popover, Learn) and by the names its drawing writes, which differ where a classical proof is
 * drawn two-sided (`?c` on the right there, on a `?` formula of either side in a step).
 */
const [hints, setHints] = createSignal<readonly RuleHint[]>([]);
const [drawnHints, setDrawnHints] = createSignal<readonly RuleHint[]>([]);

/** A rule label's hint, as a step or the drawing names it: a run of one rule (`?w*`) is that rule's. */
const named = (label: string, drawn = false) =>
  hintNamed(drawn ? drawnHints() : hints(), label.replace(/\*$/, ""));

/**
 * The attributes that give an element its rule's hint: the label it names, and the hint's words
 * as its description. Nothing where the calculus has no such rule.
 */
export function hinted(
  label: string,
  drawn = false,
): { "data-rule-hint"?: string; "data-drawn"?: string; "aria-describedby"?: string } {
  const hint = named(label, drawn);
  if (!hint) return {};
  return drawn
    ? {
        "data-rule-hint": label,
        "data-drawn": "",
        "aria-describedby": `drawn-${hintId(hint.name)}`,
      }
    : { "data-rule-hint": label, "aria-describedby": hintId(hint.name) };
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
export function RuleHints(props: { hints: readonly RuleHint[]; drawn: readonly RuleHint[] }) {
  createEffect(() => setHints(props.hints));
  createEffect(() => setDrawnHints(props.drawn));
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
      const hint = named(at.getAttribute("data-rule-hint") ?? "", at.hasAttribute("data-drawn"));
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

  // Under the label, inside the window; above it where there is no room below. A rule of the
  // popover has its hint beside the popover (right, else left, else above it), so that the hint
  // never covers the rules listed under the one pointed at.
  createEffect(() => {
    const now = open();
    if (!now || !card) return;
    const gap = 6;
    const [w, h] = [card.offsetWidth, card.offsetHeight];
    const [width, height] = [window.innerWidth, window.innerHeight];
    const clampX = (x: number) => Math.max(8, Math.min(x, width - w - 8));
    const clampY = (y: number) => Math.max(8, Math.min(y, height - h - 8));
    const r = now.at.getBoundingClientRect();
    const pop = now.at.closest(".pop")?.getBoundingClientRect();
    let x: number;
    let y: number;
    if (pop && pop.right + gap + w <= width - 8) [x, y] = [pop.right + gap, clampY(r.top)];
    else if (pop && pop.left - gap - w >= 8) [x, y] = [pop.left - gap - w, clampY(r.top)];
    else if (pop) [x, y] = [clampX(pop.left), Math.max(8, pop.top - gap - h)];
    else {
      x = clampX(r.left);
      const below = r.bottom + gap;
      y = below + h > height - 8 ? Math.max(8, r.top - gap - h) : below;
    }
    card.style.left = `${x}px`;
    card.style.top = `${y}px`;
  });

  return (
    <>
      <div hidden>
        <For each={props.hints}>{(h) => <span id={hintId(h.name)}>{spoken(h)}</span>}</For>
        <For each={props.drawn}>
          {(h) => <span id={`drawn-${hintId(h.name)}`}>{spoken(h)}</span>}
        </For>
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
