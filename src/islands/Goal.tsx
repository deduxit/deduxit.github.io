// deduxit © Fabian Lukas Grubmüller 2026
// Licensed under the EUPL

/**
 * What acts on an open goal of a sequent calculus proof: the rule popover at a formula (one button
 * per rule, the rules that do not apply greyed, a card with the rule drawn), the goal's menu at its
 * `⊢` (close it by the search, prove it apart, use the proof made apart, go back), the two premises
 * a split or a cut would make, and the goal's note over the bottom box.
 */

import { createSignal, For, type JSX, Show } from "solid-js";
import { engineLabel, engineOf, engineTip } from "../lib/engines";
import type { Outcome } from "../lib/deduxit";
import type { Said } from "../lib/words";
import { ruleForm } from "./RuleHint";
import { Sign } from "./Signs";
import type { Candidate, Premises, Shown } from "./state";
import type { Ui } from "./ui";

/** The engine whose work a note or a hint is, by name, with its source on hover. */
export function EngineChip(props: { outcome: Outcome | undefined | null; ui: Ui }) {
  return (
    <Show when={engineOf(props.outcome)}>
      {(engine) => (
        <span class="kw engine" data-tip={engineTip(engine())}>
          {engineLabel(engine())}
        </span>
      )}
    </Show>
  );
}

/** A rule's form, premises over conclusion, as the card draws it. */
function RuleDrawn(props: { rule: string }) {
  return (
    <Show when={ruleForm(props.rule)}>
      {(form) => (
        <div
          class="rule-drawn m"
          role="img"
          aria-label={`${form().premises.join(" and ") || "No premise"}, over ${form().conclusion}`}
        >
          <div class="rule-premises">
            <For each={form().premises}>{(premise) => <span>{premise}</span>}</For>
          </div>
          <div class="rule-bar" />
          <div class="rule-conclusion">{form().conclusion}</div>
        </div>
      )}
    </Show>
  );
}

/** The witness a rule pressed in the popover asks for (∃R, ∀L), as the box beside it shows it. */
export interface WitnessBox {
  readonly rule: string;
  /** The quantifier's variable, which the box's label names: `y =`. */
  readonly variable: string;
  readonly text: string;
  /** What deduxit said of the term last applied, under the field. */
  readonly said: Said | null;
  readonly busy: boolean;
  readonly input: (text: string) => void;
  /** Applies the rule with the term typed, or with the witness left open. */
  readonly apply: (open: boolean) => void;
}

/** The variable a quantified formula binds, as written (`∃y. q(y)` binds `y`), or undefined. */
export const boundVariable = (formula: string): string | undefined =>
  /^\s*[∀∃]\s*([^\s.,()]+)/u.exec(formula)?.[1];

/**
 * The box in the popover for the witness of ∃R or ∀L: the variable, the term typed and a button
 * that applies the rule with it, and `$1`, which leaves the witness open for an axiom or the
 * search to fill. What deduxit refused stands under the field.
 */
function Witness(props: { box: WitnessBox }) {
  const box = () => props.box;
  return (
    <form
      class="witness"
      onSubmit={(event) => {
        event.preventDefault();
        if (box().text.trim() !== "" && !box().busy) box().apply(false);
      }}
    >
      <div class="witness-row">
        <div class="witness-field" data-bad={box().said ? "" : undefined}>
          <label class="m witness-var" for="witness-term">
            {box().variable} =
          </label>
          <input
            id="witness-term"
            class="m"
            type="text"
            spellcheck={false}
            autocomplete="off"
            aria-label={`${box().variable} =, the witness for ${box().rule}`}
            aria-invalid={box().said ? "true" : undefined}
            aria-describedby={box().said ? "witness-said" : undefined}
            value={box().text}
            onInput={(event) => box().input(event.currentTarget.value)}
          />
          <button
            type="submit"
            class="witness-go"
            aria-label={`Apply ${box().rule} with this term for ${box().variable}`}
            data-tip={`Apply ${box().rule} with this term for ${box().variable}`}
            aria-disabled={box().text.trim() === "" || box().busy ? "true" : undefined}
          >
            <Sign name="enter" />
          </button>
        </div>
        <button
          type="button"
          class="witness-open m"
          aria-label="$1, leave the witness open"
          data-tip="Leave the witness open: an axiom or the search fills it"
          aria-disabled={box().busy ? "true" : undefined}
          onClick={() => !box().busy && box().apply(true)}
        >
          $1
        </button>
      </div>
      <Show when={box().said}>
        {(said) => (
          <p id="witness-said" class="said-why" role="alert">
            <span class="kw">{said().keyword}.</span> {said().sentence}
          </p>
        )}
      </Show>
    </form>
  );
}

/**
 * The rule popover at a formula: one button per rule of its connective, side by side, a rule that
 * does not apply to this goal greyed among them. The pointer or the keyboard on a rule shows its
 * card, the rule drawn, and for a greyed rule the reason under it; a press on a greyed rule shows
 * the card until the next press, which a touch screen, having no hover, needs. The arrow keys move
 * along the row; the digits, which pick a rule, are the stage's. A rule that takes a witness,
 * pressed, stays pressed and opens the witness's box beside the row.
 */
export function RulePopover(props: {
  formula: string;
  offered: readonly Candidate[] | null;
  /** The rule the hint points at, ringed. */
  hinted: string | undefined;
  /** The witness box of the rule pressed, or null. */
  witness: WitnessBox | null;
  choose: (rule: Candidate) => void;
  ref: (el: HTMLDivElement) => void;
}) {
  const [over, setOver] = createSignal<number | null>(null);
  const [told, setTold] = createSignal<number | null>(null);
  /** The rule whose card shows: the one pressed while greyed, else the one under the pointer or the focus. */
  const carded = () => told() ?? over();
  let row: HTMLFieldSetElement | undefined;
  const press = (rule: Candidate, at: number) => {
    if (rule.refused) setTold(told() === at ? null : at);
    else props.choose(rule);
  };
  const keys = (event: KeyboardEvent) => {
    if (event.ctrlKey || event.metaKey || event.altKey || !props.offered) return;
    const buttons = [...(row?.querySelectorAll<HTMLButtonElement>("button.rule") ?? [])];
    const at = buttons.indexOf(document.activeElement as HTMLButtonElement);
    // The digits are the stage's, which takes them on the formula's button too.
    if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
      event.preventDefault();
      const next = (at + (event.key === "ArrowRight" ? 1 : -1) + buttons.length) % buttons.length;
      buttons[next]?.focus();
    }
  };
  // The card stands over its rule's button.
  const placed = (card: HTMLDivElement) => {
    queueMicrotask(() => {
      const k = carded();
      const button = k === null ? null : row?.querySelectorAll<HTMLElement>("button.rule")[k];
      if (button) card.style.left = `${button.offsetLeft}px`;
      const top = card.closest(".stage")?.getBoundingClientRect().top ?? 0;
      if (card.getBoundingClientRect().top < top) card.dataset["below"] = "";
    });
  };
  return (
    <div class="cluster pop rules-pop" ref={props.ref} role="dialog" aria-label="Rules">
      <Show
        when={props.offered}
        fallback={<p class="sub">Asking deduxit for the rules of {props.formula}</p>}
      >
        {(offered) => (
          <Show
            when={offered().length > 0}
            fallback={
              <p class="sub">
                No rule acts on <span class="m">{props.formula}</span>.
              </p>
            }
          >
            <fieldset
              class="rule-row"
              aria-label={`Rules of ${props.formula}`}
              ref={row}
              onKeyDown={keys}
            >
              <For each={offered()}>
                {(rule, i) => (
                  <>
                    <button
                      type="button"
                      class="rule m"
                      data-hinted={props.hinted === rule.rule ? "" : undefined}
                      aria-pressed={rule.witness ? props.witness?.rule === rule.rule : undefined}
                      aria-disabled={rule.refused ? "true" : undefined}
                      aria-label={`${rule.rule}${rule.refused ? ", does not apply" : ""}`}
                      aria-describedby={rule.refused ? `rule-why-${i()}` : undefined}
                      aria-keyshortcuts={i() < 9 ? String(i() + 1) : undefined}
                      onPointerEnter={() => setOver(i())}
                      onPointerLeave={() => over() === i() && setOver(null)}
                      onFocus={() => setOver(i())}
                      onBlur={() => over() === i() && setOver(null)}
                      onClick={() => press(rule, i())}
                    >
                      {rule.rule}
                    </button>
                    <Show when={rule.refused}>
                      {(why) => (
                        <span class="sr-only" id={`rule-why-${i()}`}>
                          {why().keyword}: {why().sentence}
                        </span>
                      )}
                    </Show>
                  </>
                )}
              </For>
            </fieldset>
            <Show when={props.witness}>{(box) => <Witness box={box()} />}</Show>
            <Show when={carded() !== null ? offered()[carded() as number] : undefined}>
              {(rule) => (
                <div
                  class="rule-card"
                  role={told() === null ? "tooltip" : "note"}
                  ref={placed}
                  data-told={told() === null ? undefined : ""}
                >
                  <RuleDrawn rule={rule().rule} />
                  <Show when={rule().refused}>{(why) => <Reason said={why()} />}</Show>
                </div>
              )}
            </Show>
          </Show>
        )}
      </Show>
    </div>
  );
}

/** A reason under its keyword, as a line. */
function Reason(props: { said: Said }) {
  return (
    <p class="said-why">
      <span class="kw">{props.said.keyword}.</span> {props.said.sentence}
    </p>
  );
}

/** A button of the goal's menu: its sign, and with the guide on its name beside it. */
function MenuButton(props: {
  name: string;
  tip: string;
  sign: JSX.Element;
  keys?: string;
  class?: string;
  expanded?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      class={`goal-act${props.class ? ` ${props.class}` : ""}`}
      aria-label={props.name}
      aria-keyshortcuts={props.keys}
      aria-expanded={props.expanded}
      data-tip={props.tip}
      onClick={() => props.onClick()}
    >
      {props.sign}
      <span class="tool-name" aria-hidden="true">
        {props.name}
      </span>
    </button>
  );
}

/**
 * The goal's menu at its `⊢`: close this goal by the search, with a caret for that search's
 * settings; prove the goal apart as a sequent of its own; once that proof is finished, use it
 * here; and on a goal the search showed to have no proof, go back to where every goal had one.
 */
export function GoalMenu(props: {
  ref: (el: HTMLDivElement) => void;
  apart: { id: string; tab: string } | null;
  canBack: boolean;
  settingsOpen: boolean;
  close: () => void;
  settings: () => void;
  proveApart: () => void;
  useApart: (id: string) => void;
  back: () => void;
}) {
  return (
    <div class="cluster pop goal-menu" ref={props.ref} role="dialog" aria-label="This goal">
      <MenuButton
        name="Close goal"
        tip="Close this goal by the search"
        keys="C"
        sign={<Sign name="close" />}
        onClick={props.close}
      />
      <MenuButton
        name="This search's settings"
        tip="The engine and the budget of this search"
        class="caret"
        expanded={props.settingsOpen}
        sign={<Sign name="caret" />}
        onClick={props.settings}
      />
      <MenuButton
        name="Prove apart"
        tip="Prove this goal apart, as a sequent of its own at the top"
        sign={<Sign name="apart" />}
        onClick={props.proveApart}
      />
      <Show when={props.apart}>
        {(apart) => (
          <MenuButton
            name="Use its proof"
            tip={`Close this goal with the proof of ${apart().tab}, made apart`}
            sign={<Sign name="use" />}
            onClick={() => props.useApart(apart().id)}
          />
        )}
      </Show>
      <Show when={props.canBack}>
        <MenuButton
          name="Go back"
          tip="Take back the steps since every open goal had a proof"
          sign={<Sign name="back" />}
          onClick={props.back}
        />
      </Show>
    </div>
  );
}

/** A formula of the goal as a premise shows it: its text, its place in the goal, and its side of ⊢. */
export interface Chip extends Shown {
  readonly position: number;
}

/**
 * The two premises a split or a cut would make, over the goal: each dashed, the goal's formulas as
 * chips inside them, a press on a chip moving it to the other premise; at the line's end the
 * button that applies the step. Every split is a legal step, so the button is never greyed.
 */
export function PremisesView(props: {
  ref: (el: HTMLFieldSetElement) => void;
  /** The rule's sign: a connective, or "cut". */
  rule: string;
  chips: readonly Chip[];
  /** The positions in the first premise. */
  left: readonly number[];
  own: Premises["own"] | null;
  /** In intuitionistic mode the premises are written two-sided. */
  twoSided: boolean;
  /** The positions the hint says to move, and whether the split is the hint's. */
  move: readonly number[];
  ready: boolean;
  toggle: (position: number) => void;
  apply: () => void;
}) {
  /** A premise's formulas in order: inputs, ⊢, outputs; one-sided: ⊢ first. */
  const premise = (side: 0 | 1) => {
    const mine = props.chips.filter((c) => props.left.includes(c.position) === (side === 0));
    const own = props.own?.[side] ?? [];
    const input = (x: Shown) => props.twoSided && x.side === "input";
    return {
      before: [...mine.filter(input), ...own.filter(input)],
      after: [...mine.filter((x) => !input(x)), ...own.filter((x) => !input(x))],
    };
  };
  const item = (x: Shown | Chip) =>
    "position" in x && x.side !== "output" ? (
      <button
        type="button"
        class="chip-f m"
        data-hinted={props.move.includes(x.position) ? "" : undefined}
        aria-pressed={props.left.includes(x.position)}
        data-tip="Move it to the other premise"
        onClick={() => props.toggle(x.position)}
      >
        {x.text}
      </button>
    ) : (
      <span class="own m">{x.text}</span>
    );
  return (
    <fieldset
      class="premises"
      ref={props.ref}
      aria-label={
        props.rule === "cut"
          ? "Cut: the pressed formulas go to the first premise"
          : `Split for ${props.rule}: the pressed formulas go to the first premise`
      }
    >
      <For each={[0, 1] as const}>
        {(side) => (
          <div class="prem" data-side={side}>
            <For each={premise(side).before}>{item}</For>
            <span class="m turn">⊢</span>
            <For each={premise(side).after}>{item}</For>
          </div>
        )}
      </For>
      <button
        type="button"
        class="apply-step"
        data-hinted={props.ready ? "" : undefined}
        aria-label={props.rule === "cut" ? "Apply the cut" : `Apply ${props.rule}`}
        data-tip={
          props.rule === "cut"
            ? "Apply the cut with this split"
            : `Apply ${props.rule} with this split`
        }
        onClick={() => props.apply()}
      >
        <span class="m">{props.rule}</span> <Sign name="enter" />
      </button>
    </fieldset>
  );
}
