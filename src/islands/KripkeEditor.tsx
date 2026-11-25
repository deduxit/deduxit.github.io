// deduxit © Fabian Lukas Grubmüller 2026
// Licensed under the EUPL

/**
 * The model editor: a Kripke model drawn on a canvas, each world a box with the atoms it forces,
 * each arrow drawn from world to world. A drag from a world onto another adds the arrow or takes
 * it away, back onto the world itself a loop, onto empty space moves the world. The world
 * selected has a form under the canvas with the same choices as controls (its atoms, its
 * arrows, its removal), so the keyboard does everything the pointer does: a world takes the
 * focus, Enter selects it, the arrow keys move it. Under the form, the world to check at and
 * the check; what the check found is marked on the drawing, each mark said in words too.
 */

import { batch, createEffect, createSignal, createUniqueId, For, type JSX, Show } from "solid-js";
import {
  addWorld,
  arrowPath,
  atomsText,
  BOX_HALF_HEIGHT,
  boxHalfWidth,
  boxText,
  CANVAS,
  freeSpot,
  hasArrow,
  inside,
  type Kripke,
  layout,
  type Marks,
  mostWorlds,
  type Point,
  type Reading,
  removeWorld,
  setAtoms,
  setFalsity,
  toggleArrow,
  worldAt,
  worldWords,
} from "../lib/kripke";

/** A drag under way: from which world, where the pointer is, which world it is over. */
interface Drag {
  readonly from: number;
  readonly start: Point;
  readonly at: Point;
  readonly over: number | null;
  /** Whether the pointer has left the world it started on: back on it, the drag is a loop. */
  readonly left: boolean;
  readonly moved: boolean;
}

/** How far a press may travel and still be a press, in the canvas's units. */
const PRESS = 4;

/** What the canvas says under it, by the reading. */
const HOW: Readonly<Record<Reading, string>> = {
  modal:
    "Drag from one world to another to add or take away an arrow, or back onto itself for a loop. Drag a world to empty space to move it.",
  intuitionistic:
    "Drag from a world up to a world above it to add or take away an arrow. Drag a world to empty space to move it.",
  minimal:
    "Drag from a world up to a world above it to add or take away an arrow. Drag a world to empty space to move it.",
  classical: "Classical logic has one world: set the atoms it makes true.",
};

export function KripkeEditor(props: {
  model: Kripke;
  reading: Reading;
  onChange: (model: Kripke) => void;
  /** What the last check found, on this model. */
  marks?: Marks | undefined;
  /** The world the check is at; null for every world. */
  world: number | null;
  onWorld: (world: number | null) => void;
  onCheck: () => void;
  busy: boolean;
  /** The check's answer, shown under the controls. */
  children?: JSX.Element;
}) {
  const id = createUniqueId();
  const count = () => props.model.worlds.length;
  const [spots, setSpots] = createSignal<Point[]>(layout(props.model, props.reading));
  // A model from outside (a countermodel decided again) is laid out afresh; the editor's own
  // additions and removals keep the places the visitor gave, the places and the model changed
  // in one batch so that this sees them agree.
  createEffect(() => {
    if (spots().length !== count()) setSpots(layout(props.model, props.reading));
  });
  const [chosen, setChosen] = createSignal(props.model.world ?? 0);
  const selected = () => Math.min(chosen(), Math.max(count() - 1, 0));
  const [drag, setDrag] = createSignal<Drag | null>(null);
  const [said, setSaid] = createSignal("");
  const halves = () => props.model.worlds.map(boxHalfWidth);
  const spot = (w: number): Point => spots()[w] ?? { x: CANVAS.width / 2, y: CANVAS.height / 2 };
  const ordinary = () => props.reading !== "modal";
  let svg: SVGSVGElement | undefined;

  const change = (next: Kripke, words: string) => {
    props.onChange(next);
    setSaid(words);
  };
  const toggle = (from: number, to: number) => {
    const had = hasArrow(props.model, from, to);
    const what =
      from === to
        ? `The loop at world ${String(from)}`
        : `The arrow from world ${String(from)} to world ${String(to)}`;
    change(toggleArrow(props.model, from, to), `${what} ${had ? "is taken away" : "is added"}.`);
  };
  const add = () => {
    const w = count();
    batch(() => {
      setSpots([...spots(), freeSpot(spots())]);
      change(addWorld(props.model), `World ${String(w)} is added.`);
      setChosen(w);
    });
  };
  const remove = (w: number) => {
    const later = w < count() - 1 ? " The worlds after it are numbered one lower." : "";
    const at = props.world;
    const next = Math.max(0, w - 1);
    batch(() => {
      // The world checked at follows its renumbering, and is every world once it is gone.
      if (at !== null && at >= w) props.onWorld(at === w ? null : at - 1);
      setSpots(spots().filter((_, i) => i !== w));
      change(removeWorld(props.model, w), `World ${String(w)} is removed.${later}`);
      setChosen(next);
    });
    // The removal button may be gone with the second-to-last world: the focus goes to the
    // world selected now.
    svg?.querySelector<SVGGElement>(`.kripke-world[data-world="${String(next)}"]`)?.focus();
  };
  const move = (w: number, to: Point) =>
    setSpots(spots().map((p, i) => (i === w ? inside(to, halves()[w] ?? 26) : p)));

  /** The pointer's place in the canvas's units. */
  const pointer = (event: PointerEvent): Point => {
    const matrix = svg?.getScreenCTM();
    if (!matrix) return { x: 0, y: 0 };
    const p = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse());
    return { x: p.x, y: p.y };
  };
  const press = (w: number, event: PointerEvent) => {
    if (event.button !== 0) return;
    event.preventDefault();
    const box = event.currentTarget as SVGGElement;
    box.setPointerCapture?.(event.pointerId);
    box.focus();
    const at = pointer(event);
    setDrag({ from: w, start: at, at, over: w, left: false, moved: false });
  };
  const follow = (event: PointerEvent) => {
    const d = drag();
    if (!d) return;
    const at = pointer(event);
    const over = worldAt(at, spots(), halves());
    const moved = d.moved || Math.hypot(at.x - d.start.x, at.y - d.start.y) > PRESS;
    setDrag({ ...d, at, over, moved, left: d.left || over !== d.from });
  };
  const release = () => {
    const d = drag();
    setDrag(null);
    if (!d) return;
    if (!d.moved) {
      setChosen(d.from);
      return;
    }
    if (d.over === null) move(d.from, d.at);
    else if (props.reading === "classical") return;
    else if (d.over !== d.from) toggle(d.from, d.over);
    // A loop is modal logic's: in ordinary logic every world is above itself already.
    else if (d.left && !ordinary()) toggle(d.from, d.from);
  };
  const keyed = (w: number, event: KeyboardEvent) => {
    const step = event.shiftKey ? 2 : 12;
    const by: Record<string, Point> = {
      ArrowLeft: { x: -step, y: 0 },
      ArrowRight: { x: step, y: 0 },
      ArrowUp: { x: 0, y: -step },
      ArrowDown: { x: 0, y: step },
    };
    const delta = by[event.key];
    if (delta) {
      event.preventDefault();
      const p = spot(w);
      move(w, { x: p.x + delta.x, y: p.y + delta.y });
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      setChosen(w);
    }
  };

  const missing = () => {
    const m = props.marks?.missing;
    return m && !hasArrow(props.model, m[0], m[1]) ? m : undefined;
  };
  const path = (from: number, to: number) =>
    arrowPath(
      spot(from),
      halves()[from] ?? 26,
      spot(to),
      halves()[to] ?? 26,
      from !== to && hasArrow(props.model, to, from),
      from === to,
    );
  const arrows = () =>
    props.model.worlds.flatMap((w, from) =>
      (w.arrows ?? []).filter((to) => to < count()).map((to) => [from, to] as const),
    );
  /** The drag's preview: the arrow it would add or take away, or the place it would move to. */
  const preview = () => {
    const d = drag();
    if (!d?.moved) return null;
    if (d.over === null) return { kind: "move" as const, at: d.at };
    if (d.over === d.from && !d.left) return null;
    return { kind: "arrow" as const, path: path(d.from, d.over), to: d.over };
  };
  const loose = () => {
    const d = drag();
    if (!d?.moved || d.over !== null || props.reading === "classical") return null;
    const from = spot(d.from);
    return `M${from.x.toFixed(1)},${from.y.toFixed(1)} L${d.at.x.toFixed(1)},${d.at.y.toFixed(1)}`;
  };
  const world = () => props.model.worlds[selected()];
  const others = () => props.model.worlds.map((_, i) => i);

  return (
    <div class="kripke">
      <p class="said-why kripke-how" id={`${id}-how`}>
        {HOW[props.reading]}
      </p>
      {/* biome-ignore lint/a11y/useSemanticElements: an SVG canvas cannot be a fieldset; it groups the worlds' buttons under one name. */}
      <svg
        ref={svg}
        class="kripke-canvas"
        viewBox={`0 0 ${String(CANVAS.width)} ${String(CANVAS.height)}`}
        role="group"
        aria-label="The model's worlds"
        aria-describedby={`${id}-how`}
        onPointerMove={follow}
        onPointerUp={release}
        onPointerCancel={() => setDrag(null)}
        data-dragging={drag()?.moved ? "" : undefined}
      >
        <defs>
          <marker
            id={`${id}-tip`}
            class="kripke-tip"
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="7"
            markerHeight="7"
            orient="auto-start-reverse"
          >
            <path d="M0,0 L10,5 L0,10 z" />
          </marker>
          <marker
            id={`${id}-tip-missing`}
            class="kripke-tip missing"
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="7"
            markerHeight="7"
            orient="auto-start-reverse"
          >
            <path d="M0,0 L10,5 L0,10 z" />
          </marker>
        </defs>
        {/* biome-ignore lint/a11y/noAriaHiddenOnFocusable: the arrows take no focus; each world's name says them. */}
        <g aria-hidden="true">
          <For each={arrows()}>
            {([from, to]) => (
              <path
                class="kripke-arrow"
                d={path(from, to)}
                marker-end={`url(#${id}-tip)`}
                data-from={from}
                data-to={to}
              />
            )}
          </For>
          <Show when={missing()}>
            {(m) => (
              <path
                class="kripke-arrow missing"
                d={path(m()[0], m()[1])}
                marker-end={`url(#${id}-tip-missing)`}
              />
            )}
          </Show>
          <Show when={preview()?.kind === "arrow" ? preview() : null}>
            {(p) => (
              <path
                class="kripke-arrow preview"
                d={(p() as { path: string }).path}
                marker-end={`url(#${id}-tip)`}
              />
            )}
          </Show>
          <Show when={loose()}>{(d) => <path class="kripke-arrow loose" d={d()} />}</Show>
          <Show when={preview()?.kind === "move" ? drag() : null}>
            {(d) => {
              const half = () => halves()[d().from] ?? 26;
              const at = () => inside(d().at, half());
              return (
                <rect
                  class="kripke-ghost"
                  x={at().x - half()}
                  y={at().y - BOX_HALF_HEIGHT}
                  width={2 * half()}
                  height={2 * BOX_HALF_HEIGHT}
                  rx="7"
                />
              );
            }}
          </Show>
        </g>
        <For each={props.model.worlds}>
          {(_, at) => {
            const half = () => halves()[at()] ?? 26;
            const p = () => spot(at());
            return (
              // biome-ignore lint/a11y/useSemanticElements: an SVG group has no button element; it takes the button's role, focus and keys.
              <g
                class="kripke-world"
                role="button"
                tabindex="0"
                aria-pressed={selected() === at()}
                aria-label={worldWords(props.model, at(), props.reading, props.marks)}
                transform={`translate(${p().x.toFixed(1)} ${p().y.toFixed(1)})`}
                data-world={at()}
                data-failing={props.marks?.failing === at() ? "" : undefined}
                data-witness={props.marks?.witnesses?.includes(at()) ? "" : undefined}
                data-frame={props.marks?.frame?.includes(at()) ? "" : undefined}
                data-target={drag()?.moved && drag()?.over === at() ? "" : undefined}
                onPointerDown={(event) => press(at(), event)}
                onKeyDown={(event) => keyed(at(), event)}
              >
                <rect
                  class="kripke-box"
                  x={-half()}
                  y={-BOX_HALF_HEIGHT}
                  width={2 * half()}
                  height={2 * BOX_HALF_HEIGHT}
                  rx="7"
                />
              </g>
            );
          }}
        </For>
        {/* The boxes' words, a layer the pointer passes through: a button's name says them, and
            words drawn inside it would differ from that name (WCAG's label in name). */}
        {/* biome-ignore lint/a11y/noAriaHiddenOnFocusable: the words take no focus; each world's button says them. */}
        <g class="kripke-words" aria-hidden="true">
          <For each={props.model.worlds}>
            {(w, at) => {
              const half = () => halves()[at()] ?? 26;
              const p = () => spot(at());
              const tag = () =>
                props.marks?.failing === at()
                  ? "fails here"
                  : props.marks?.witnesses?.includes(at())
                    ? "witness"
                    : "";
              return (
                <g
                  transform={`translate(${p().x.toFixed(1)} ${p().y.toFixed(1)})`}
                  data-world={at()}
                  data-failing={props.marks?.failing === at() ? "" : undefined}
                >
                  <text class="kripke-num" x={-half() + 6} y={-BOX_HALF_HEIGHT + 11}>
                    {String(at())}
                  </text>
                  <text class="kripke-atoms" x="0" y="7" text-anchor="middle">
                    {boxText(w)}
                  </text>
                  <Show when={tag()}>
                    <text class="kripke-tag" x={-half() - 6} y="4" text-anchor="end">
                      {tag()}
                    </text>
                  </Show>
                </g>
              );
            }}
          </For>
        </g>
      </svg>
      <p class="sr-only" aria-live="polite">
        {said()}
      </p>
      <Show when={world()}>
        {(w) => (
          <fieldset class="kripke-form">
            <legend>World {String(selected())}</legend>
            <label class="custom-field">
              <span>forces</span>
              <input
                class="field"
                spellcheck={false}
                autocomplete="off"
                aria-label={`Atoms world ${String(selected())} forces`}
                placeholder="p, q"
                value={atomsText(w())}
                onChange={(event) =>
                  change(
                    setAtoms(props.model, selected(), event.currentTarget.value),
                    `World ${String(selected())} forces ${event.currentTarget.value.trim() || "no atom"}.`,
                  )
                }
              />
            </label>
            <Show when={props.reading === "minimal"}>
              <label class="kripke-chip">
                <input
                  type="checkbox"
                  aria-label={`World ${String(selected())} forces ⊥`}
                  checked={!!w().falsity}
                  onChange={(event) =>
                    change(
                      setFalsity(props.model, selected(), event.currentTarget.checked),
                      `World ${String(selected())} ${event.currentTarget.checked ? "forces" : "does not force"} ⊥.`,
                    )
                  }
                />
                forces ⊥
              </label>
            </Show>
            <Show when={props.reading !== "classical"}>
              <fieldset
                class="modal-sees"
                aria-label={
                  ordinary()
                    ? `Worlds directly above world ${String(selected())}`
                    : `Worlds world ${String(selected())} sees`
                }
              >
                <span>{ordinary() ? "below" : "sees"}</span>
                <For each={others()}>
                  {(to) => (
                    <Show
                      when={!ordinary() || to !== selected() || (w().arrows ?? []).includes(to)}
                    >
                      <label class="kripke-chip">
                        <input
                          type="checkbox"
                          aria-label={
                            ordinary()
                              ? `World ${String(selected())} is below world ${String(to)}`
                              : `World ${String(selected())} sees world ${String(to)}`
                          }
                          checked={(w().arrows ?? []).includes(to)}
                          onChange={() => toggle(selected(), to)}
                        />
                        {String(to)}
                      </label>
                    </Show>
                  )}
                </For>
              </fieldset>
            </Show>
            <Show when={count() > 1}>
              <button type="button" class="btn btn-s" onClick={() => remove(selected())}>
                Remove world {String(selected())}
              </button>
            </Show>
          </fieldset>
        )}
      </Show>
      <p class="row">
        <Show when={props.reading !== "classical"}>
          <button
            type="button"
            class="btn"
            disabled={count() >= mostWorlds(props.reading)}
            onClick={add}
          >
            Add a world
          </button>
          <label class="custom-field">
            <span>Check at</span>
            <select
              class="field"
              aria-label="The world to check the sequent at"
              value={props.world === null ? "" : String(props.world)}
              onChange={(event) => {
                const value = event.currentTarget.value;
                props.onWorld(value === "" ? null : Number(value));
              }}
            >
              <option value="">every world</option>
              <For each={others()}>
                {(w) => <option value={String(w)}>world {String(w)}</option>}
              </For>
            </select>
          </label>
        </Show>
        <button
          type="button"
          class="btn btn-primary"
          disabled={props.busy}
          onClick={() => props.onCheck()}
        >
          Check the model
        </button>
      </p>
      {props.children}
    </div>
  );
}
