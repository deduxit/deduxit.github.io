// deduxit © Fabian Lukas Grubmüller 2026
// Licensed under the EUPL

/**
 * The stage: deduxit's drawing of the proof (the derivation, or the finished
 * proof's net) on the dotted field, under a camera that zooms and pans; a
 * button over every formula of an open goal (the drawing stays a picture,
 * WCAG's rule for an interactive SVG); and at the active goal everything
 * that acts on it: the dock (the goal navigator, the goal's close, the note,
 * the hint), the rule popover and the split chooser.
 */

import { Maximize, ZoomIn, ZoomOut } from "lucide-solid";
import {
  createEffect,
  createMemo,
  createRenderEffect,
  createSignal,
  For,
  on,
  onCleanup,
  onMount,
  Show,
} from "solid-js";
import { APART, engineLabel } from "../lib/engines";
import { keyAction } from "../lib/keys";
import { type Box, spread } from "../lib/gap";
import { type CutShown, failure, type LinkShown, type MathFont } from "../lib/deduxit";
import { countermodelOf, isOrdinary, type OrdinaryOutcome, sequentText } from "../lib/ordinary";
import { goalAt, paths, searchMade, subtree } from "../lib/steps";
import { intuitionistic, isNatural } from "../lib/suites";
import { formulaText, lost, type Said, shown, stepLine } from "../lib/words";
import {
  type Candidate,
  type Elim,
  lookJson,
  type NetDrawing,
  type NetLook,
  type On,
  type Prover,
  pathKey,
  type Settings,
  viewJson,
} from "./state";
import { type Chip, EngineChip, GoalMenu, PremisesView, RulePopover } from "./Goal";
import { Sign } from "./Signs";
import { ModelFigure } from "./Countermodel";
import { CustomPanel } from "./Custom";
import { ModelView } from "./ModelCheck";
import { TableauCheckView } from "./TableauCheck";
import { LambdaPanel } from "./Lambda";
import { ModalPanel } from "./Modal";
import { type Method, MethodView } from "./Methods";
import { NaturalView } from "./Natural";
import { hinted } from "./RuleHint";
import { compact, ladderKey, token, type Ui, Why } from "./ui";

/** A formula's button over the drawing, in the drawing's own pixels. */
interface Hit {
  readonly goal: number;
  readonly position: number;
  readonly text: string;
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
  /** The part of the width that is padding past the formula's ends, the same on screen at every zoom. */
  readonly fixed: number;
}

/** A rule label's button over the drawing, in the drawing's own pixels, which opens its hint. */
interface LabelHit {
  readonly label: string;
  /** The inference's number in the drawing's description, which lists them from 1. */
  readonly step: number;
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

/** A cut's button over the drawing, in the drawing's own pixels: what a step names it by. */
interface CutHit {
  /** The node of a derivation's cut, or a vertex at a net's cut link. */
  readonly at: number;
  readonly formula: string;
  /** Whether the strategy reduces it next. */
  readonly next: boolean;
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

/**
 * An open goal on the drawing, in the drawing's own pixels: its `⊢`, whose button opens the goal's
 * menu, and the line over it where its rule will go.
 */
interface GoalHit {
  readonly goal: number;
  /** The `⊢`'s button. */
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
  /** The line over the goal: its left end, its height on the drawing and its width. */
  readonly lineX: number;
  readonly lineY: number;
  readonly lineW: number;
}

/** The camera: the drawing's offset in the stage and its scale. */
interface Camera {
  readonly x: number;
  readonly y: number;
  readonly k: number;
}

const reduced = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * The settings of the stage's drawing: the formulas large enough to click, in the stage's font,
 * a classical derivation two-sided where the calculus's switch asks it.
 */
const drawSettings = (
  work: number,
  essential: boolean,
  net: NetDrawing,
  look: NetLook,
  font: MathFont,
  twoSided: boolean,
  cutSteps?: number,
) =>
  JSON.stringify({
    limits: { work },
    ...(cutSteps ? { cut: { steps: cutSteps } } : {}),
    styles: { svg: { font_size: 30, essential, net, net_look: lookJson(look), font } },
    ...(twoSided ? { view: { classical: "two" } } : {}),
  });

/**
 * The settings of an ordinary derivation's drawing: the formulas large enough to click, in the
 * stage's font, its weakenings and contractions drawn where Settings asks it.
 */
const ordinaryDrawSettings = (settings: Settings) =>
  JSON.stringify({
    limits: { work: settings.budget },
    styles: { svg: { font_size: 30, font: settings.stageFont } },
    ...viewJson(settings, { suite: "ordinary", method: "sequent", logic: "classical" }),
  });

export function Stage(props: { prover: Prover; ui: Ui }) {
  const prover = () => props.prover;
  const proof = () => props.prover.current();
  const { ui, setUi, drawn, setDrawn } = props.ui;
  let stage!: HTMLElement;
  let world!: HTMLDivElement;
  let host!: HTMLDivElement;
  let popover: HTMLDivElement | undefined;
  let menuEl: HTMLDivElement | undefined;
  let premisesEl: HTMLFieldSetElement | undefined;
  const [hits, setHits] = createSignal<Hit[]>([]);
  const [goalHits, setGoalHits] = createSignal<GoalHit[]>([]);
  const [cutHits, setCutHits] = createSignal<CutHit[]>([]);
  const [labelHits, setLabelHits] = createSignal<LabelHit[]>([]);
  /** The cut chooser's formula as typed, and what deduxit said of it. */
  const [cutText, setCutText] = createSignal("");
  const [cutSaid, setCutSaid] = createSignal<Said | null>(null);
  /** The witness chooser's term as typed, and what deduxit said of it. */
  const [witnessText, setWitnessText] = createSignal("");
  const [witnessSaid, setWitnessSaid] = createSignal<Said | null>(null);
  const [camera, setCamera] = createSignal<Camera>({ x: 0, y: 0, k: 1 });

  /** Whether the visitor zoomed since the drawing was last fitted: then their zoom stands. */
  let byHand = false;
  const [problem, setProblem] = createSignal<string | null>(null);
  const [glide, setGlide] = createSignal(false);
  let sequence = 0;
  /** A rule's digit typed while the popover was still asking deduxit. */
  let typedEarly: number | undefined;
  let shownProof: string | undefined;
  /** What the stage drew last: the tree, or the net in one of its drawings. */
  let shownKind: string | undefined;
  /** Whether the proof drawn last was finished. */
  let shownComplete = false;
  /**
   * The session the host's drawing was made for. Between a change of the proof or its session
   * and the new drawing, the host still holds the old one, whose ids the new view's goals may
   * match: its buttons would be laid over the wrong formulas, at a zoom fitted to another
   * drawing, narrower than a control.
   */
  let hostSession: unknown;

  const view = () => proof()?.view ?? null;
  const active = () => prover().activeGoal();
  const formulasOf = (goal: number) => view()?.goals.find((g) => g.goal === goal)?.formulas ?? [];

  /** The drawing's `i<n>` of a goal. */
  const drawingIndex = (goal: number) => view()?.inferences.indexOf(goal) ?? -1;

  const netReady = () => {
    const v = view();
    return !!v && v.complete && v.net === null;
  };

  /** The view an elimination acts on: the net while the net is shown, else the derivation. */
  const onView = (): On => (ui.tab === "net" && netReady() ? "net" : "tree");
  /** The elimination of the finished proof's cuts on the view shown, if one is under way. */
  const elim = (): Elim | null => proof()?.elim[onView()] ?? null;
  /** The settings of the stage's drawing, which an elimination's drawings are made with. */
  const drawJson = () => {
    const s = props.prover.settings();
    return drawSettings(
      s.budget,
      intuitionistic(
        proof()?.calculus ?? { suite: "linear", method: "sequent", mode: "classical" },
      ),
      s.net,
      s.netLook,
      s.stageFont,
      s.twoSided,
      s.cutSteps,
    );
  };
  /** The drawing an elimination shows: the proof or net reached, or a step's, before it. */
  const elimDrawing = (e: Elim) =>
    e.shown === null ? e.reached.drawing : (e.taken[e.shown - 1]?.drawing ?? null);

  // A new drawing whenever the session, the tab or the proof changes.
  createEffect(
    on(
      () =>
        [
          proof()?.session,
          proof()?.view,
          ui.tab,
          props.prover.store.active,
          props.prover.settings().net,
          props.prover.settings().netLook,
          props.prover.settings().stageFont,
          props.prover.settings().twoSided,
          props.prover.settings().structural,
          proof()?.elim.tree?.reached,
          proof()?.elim.tree?.shown,
          proof()?.elim.net?.reached,
          proof()?.elim.net?.shown,
        ] as const,
      async ([session, v, tab, , netDrawing, look, font, twoSided]) => {
        const mine = ++sequence;
        if (!session || !v) {
          host.replaceChildren();
          hostSession = undefined;
          setHits([]);
          setGoalHits([]);
          return;
        }
        const net = tab === "net" && v.complete && v.net === null;
        const eliminating = proof()?.elim[net ? "net" : "tree"] ?? null;
        let svg: string;
        try {
          if (eliminating) {
            const drawing = elimDrawing(eliminating);
            if (drawing === null) {
              const refused = eliminating.reached.refused?.message;
              throw new Error(
                JSON.stringify({
                  code: "page",
                  kind: "refused",
                  message: refused ?? "This step was not drawn: the drawings took their bound.",
                }),
              );
            }
            svg = drawing;
          } else if (isOrdinary(session)) {
            svg = await props.prover.api.ordinary.draw(
              session,
              ordinaryDrawSettings(props.prover.settings()),
            );
          } else {
            // An intuitionistic proof's net is its essential net.
            const settings = drawSettings(
              props.prover.settings().budget,
              session.mode.startsWith("intuitionistic"),
              netDrawing,
              look,
              font,
              twoSided,
            );
            svg = net
              ? await props.prover.api.drawNet(session, settings)
              : await props.prover.api.draw(session, settings);
          }
        } catch (thrown) {
          if (mine !== sequence) return;
          host.replaceChildren();
          hostSession = undefined;
          setHits([]);
          setGoalHits([]);
          setCutHits([]);
          setProblem(failure(thrown instanceof Error ? thrown.message : thrown).message);
          return;
        }
        if (mine !== sequence) return;
        setProblem(null);
        const hadFocus =
          stage.contains(document.activeElement) || document.activeElement === document.body;
        host.innerHTML = svg;
        hostSession = session;
        decorate(net);
        // A net is drawn larger than its derivation, the compact net smaller
        // than the one with its formulas, and a look may add rows: each is
        // fitted afresh.
        const kind = `${net ? `net-${netDrawing}-${JSON.stringify(look)}` : "tree"}${eliminating ? "-cut" : ""}`;
        // A proof just finished is fitted whole, since nothing is left to work on.
        const fresh =
          shownProof !== props.prover.store.active ||
          shownKind !== kind ||
          (v.complete && !shownComplete);
        shownComplete = v.complete;
        shownProof = props.prover.store.active ?? undefined;
        shownKind = kind;
        if (fresh) fitView();
        else {
          // A step can leave the active goal's formulas narrower than a control (a
          // narrower font's more often): zoom in to the floor, unless the visitor zoomed by hand.
          const k = floor();
          if (!byHand && k > camera().k) {
            const c = camera();
            const at = { x: stage.clientWidth / 2, y: stage.clientHeight / 2 };
            move({ k, x: at.x - ((at.x - c.x) * k) / c.k, y: at.y - ((at.y - c.y) * k) / c.k });
          }
          bringIntoView();
        }
        setDrawn((n) => n + 1);
        if (hadFocus && !net) {
          queueMicrotask(() =>
            stage
              .querySelector<HTMLButtonElement>(".fb[data-active]")
              ?.focus({ preventScroll: true }),
          );
        }
      },
    ),
  );

  /** Marks the open goals, the active one and the search's inferences, and lays the buttons over the formulas. */
  function decorate(net: boolean) {
    const v = view();
    const session = proof()?.session;
    if (!v || !session) return;
    if (session !== hostSession) {
      // The drawing of this session is on its way; the one shown is another's.
      setHits([]);
      setGoalHits([]);
      return;
    }
    const eliminating = proof()?.elim[net ? "net" : "tree"];
    if (eliminating) {
      setHits([]);
      setGoalHits([]);
      markElimination(eliminating);
      return;
    }
    setCutHits([]);
    const open = new Set(v.goals.map((g) => g.goal));
    const act = active();
    const where = paths(session);
    const engines = proof()?.engines ?? {};
    // An ordinary session cannot tell a search's graft from a step's own run of weakenings or
    // contractions, so its grafts are the goals the page saw the search close.
    const made = isOrdinary(session)
      ? new Set(
          Object.keys(engines).flatMap((key) => {
            const at = goalAt(session, key === "" ? [] : key.split(".").map(Number));
            return at === undefined ? [] : subtree(session, at);
          }),
        )
      : new Set([
          ...searchMade(session),
          ...Object.entries(engines).flatMap(([key, engine]) => {
            if (engine !== APART) return [];
            const at = goalAt(session, key === "" ? [] : key.split(".").map(Number));
            return at === undefined ? [] : subtree(session, at);
          }),
        ]);
    v.inferences.forEach((inference, n) => {
      const group = host.querySelector(`#i${n}`);
      if (!group) return;
      group.classList.toggle("open-goal", open.has(inference));
      group.classList.toggle("active", inference === act);
      group.classList.toggle("dim", open.has(inference) && inference !== act);
      group.classList.toggle("search", made.has(inference));
      // Beside the rule label of a search's graft, the engine that made it.
      const engine = made.has(inference) ? engines[pathKey(where.get(inference) ?? [])] : undefined;
      const label = group.nextElementSibling;
      if (engine && !net && label instanceof SVGTextElement && !made.has(parentOf(inference))) {
        label.parentNode?.querySelector(`text.engine[data-of="${n}"]`)?.remove();
        const box = label.getBBox();
        const mark = document.createElementNS("http://www.w3.org/2000/svg", "text");
        mark.classList.add("engine");
        mark.dataset["of"] = String(n);
        mark.setAttribute("x", String(box.x + box.width + box.height / 3));
        mark.setAttribute("y", label.getAttribute("y") ?? String(box.y + box.height));
        mark.setAttribute("font-size", String(box.height * 0.6));
        mark.textContent = engineLabel(engine);
        label.after(mark);
      }
    });
    if (net) {
      setHits([]);
      setGoalHits([]);
      return;
    }
    // deduxit's ⋮ over an open goal gives way to the goal's line.
    for (const text of host.querySelectorAll("svg > text"))
      if (text.textContent === "⋮") text.classList.add("goal-dots");
    setHits(targets(v.goals));
    setGoalHits(goalTargets(v.goals));
  }

  /**
   * Marks an elimination's drawing: the cut a step reduced (and where it acted besides) on
   * the drawing it was taken on, and on the proof or net reached a button over every cut,
   * the strategy's next one marked.
   */
  function markElimination(e: Elim) {
    const mark = (id: string, name: string) =>
      host.querySelector(`[id="${CSS.escape(id)}"]`)?.classList.add(name);
    const step = e.shown === null ? undefined : e.taken[e.shown - 1];
    if (step) {
      for (const id of step.highlight?.cut ?? []) mark(id, "reduced");
      for (const id of step.highlight?.above ?? []) mark(id, "acted");
      setCutHits([]);
      return;
    }
    const origin = host.getBoundingClientRect();
    const k = camera().k;
    const at = rendered();
    const least = token("--size-button") / k;
    const next = e.reached.next;
    const found: CutHit[] = [];
    for (const cut of e.reached.cuts) {
      const tree = "node" in cut;
      const ids = tree ? (cut as CutShown).inferences.map((n) => `i${n}`) : [(cut as LinkShown).id];
      const node = tree ? (cut as CutShown).node : (cut as LinkShown).ends[0];
      const isNext = tree
        ? next === node
        : Array.isArray(next) && next[0] === node && next[1] === (cut as LinkShown).ends[1];
      for (const id of ids) {
        const element = host.querySelector(`[id="${CSS.escape(id)}"]`);
        if (!element) continue;
        if (isNext) element.classList.add("next-cut");
        const r = element.getBoundingClientRect();
        const w = Math.max(r.width / at, least);
        const h = Math.max(r.height / at, least);
        found.push({
          at: node,
          // Its negated atoms as the drawing and the formulas' buttons write them, `A⊥`.
          formula: formulaText(cut.formula),
          next: isNext,
          x: (r.left - origin.left) / at + r.width / at / 2 - w / 2,
          y: (r.top - origin.top) / at + r.height / at / 2 - h / 2,
          w,
          h,
        });
      }
    }
    setCutHits(found);
  }

  /**
   * The scale the drawing is shown at on the screen now, by which a box measured on the screen
   * turns into the drawing's own pixels. It can differ from the camera's: an effect that reads
   * the camera may run before the world's transform follows it, and a glide is under way.
   */
  function rendered(): number {
    const width = host.offsetWidth;
    return width > 0 ? host.getBoundingClientRect().width / width : camera().k;
  }

  /**
   * The rule labels' buttons, read off the drawing shown: deduxit writes an inference's label
   * right after its group `i<n>`, a text, or a group where the name has a subscript (`⊕₁`), whose
   * digits the name writes as subscripts. Each grows to a control's size on the screen, as far
   * as half the gap to the next label and the edge of a formula's or a cut's button (`spread`):
   * a fitted drawing on a phone sets its labels closer than that, and overlapping buttons hid
   * each other's taps.
   */
  function labelTargets(formulas: readonly Box[], cuts: readonly Box[]): LabelHit[] {
    if (ui.tab === "net" || !host.firstChild) return [];
    const origin = host.getBoundingClientRect();
    const at = rendered();
    const least = token("--size-button") / camera().k;
    const found: { label: string; step: number; ink: Box }[] = [];
    for (const group of host.querySelectorAll("g[id]")) {
      if (!/^i\d+$/.test(group.id)) continue;
      const label = group.nextElementSibling;
      if (!(label instanceof SVGGraphicsElement) || label.id || label.classList.contains("engine"))
        continue;
      const text = (label.textContent ?? "").replace(/\s+/g, "");
      const name =
        label instanceof SVGGElement
          ? text.replace(/\d+$/, (d) => Array.from(d, (c) => "₀₁₂₃₄₅₆₇₈₉"[Number(c)]).join(""))
          : text;
      if (!name || !hinted(name, true)["data-rule-hint"]) continue;
      const r = label.getBoundingClientRect();
      found.push({
        label: name,
        // The description numbers the inference `i<n>` as n + 1.
        step: Number(group.id.slice(1)) + 1,
        ink: {
          x: (r.left - origin.left) / at,
          y: (r.top - origin.top) / at,
          w: r.width / at,
          h: r.height / at,
        },
      });
    }
    const boxes = spread(
      found.map((f) => f.ink),
      least,
      [...formulas, ...cuts],
    );
    return found.map((f, i) => ({ label: f.label, step: f.step, ...(boxes[i] as Box) }));
  }
  // Whenever the formulas' or the cuts' buttons are laid again, so are the labels'.
  createEffect(() => {
    setLabelHits(labelTargets(hits(), cutHits()));
  });
  // A drawing fitted to a small stage can set its rule labels so close that a label's button,
  // cut at half the gap to its neighbour, is under a target's least size (WCAG 2.2, 2.5.8): zoom
  // in until each is a target high and wide, unless the visitor zoomed by hand.
  createEffect(
    on(
      labelHits,
      (labels) => {
        if (byHand || labels.length === 0) return;
        const target = token("--spacing-target");
        const c = camera();
        const needed = Math.min(
          4,
          Math.max(
            0,
            ...labels.map((l) => (l.h > 0 && l.h * c.k < target ? target / l.h : 0)),
            ...labels.map((l) => (l.w > 0 && l.w * c.k < target ? target / l.w : 0)),
          ),
        );
        if (needed <= c.k * 1.001) return;
        const at = { x: stage.clientWidth / 2, y: stage.clientHeight / 2 };
        move({
          k: needed,
          x: at.x - ((at.x - c.x) * needed) / c.k,
          y: at.y - ((at.y - c.y) * needed) / c.k,
        });
      },
      { defer: true },
    ),
  );

  /** The inference whose premise an inference is, or -1 for the root. */
  function parentOf(inference: number): number {
    const all = proof()?.session?.inferences ?? [];
    return all.findIndex((i) => i.premises?.includes(inference));
  }

  /**
   * The formulas' buttons of the open goals: each covers its formula and half
   * the gap to its neighbours in the goal, so that no tap falls between two,
   * and is at least a control's height on the screen.
   */
  function targets(goals: NonNullable<ReturnType<typeof view>>["goals"]): Hit[] {
    const v = view();
    if (!v) return [];
    const origin = host.getBoundingClientRect();
    const k = camera().k;
    const at = rendered();
    const least = token("--size-button") / k;
    const pad = token("--spacing-1") / k;
    const found: Hit[] = [];
    for (const goal of goals) {
      const n = v.inferences.indexOf(goal.goal);
      const boxes = goal.formulas.flatMap((formula, position) => {
        const element = host.querySelector(`#i${n}-${position}`);
        if (!element) return [];
        const r = element.getBoundingClientRect();
        return [
          {
            position,
            text: shown(formula),
            left: (r.left - origin.left) / at,
            right: (r.right - origin.left) / at,
            top: (r.top - origin.top) / at,
            height: r.height / at,
          },
        ];
      });
      const sorted = [...boxes].sort((a, b) => a.left - b.left);
      sorted.forEach((box, i) => {
        // Half a comma's gap to a neighbour; across a wider one (the ⊢
        // between the sides) no further than the padding.
        const before = sorted[i - 1];
        const after = sorted[i + 1];
        const near = (gap: number) => gap <= box.height / 2;
        const left =
          before && near(box.left - before.right) ? (before.right + box.left) / 2 : box.left - pad;
        const right =
          after && near(after.left - box.right) ? (box.right + after.left) / 2 : box.right + pad;
        const ends = (left === box.left - pad ? 1 : 0) + (right === box.right + pad ? 1 : 0);
        const h = Math.max(box.height + 2 * pad, least);
        found.push({
          goal: goal.goal,
          position: box.position,
          text: box.text,
          x: left,
          y: box.top + box.height / 2 - h / 2,
          w: right - left,
          h,
          fixed: ends * pad * k,
        });
      });
    }
    return found;
  }

  /**
   * The open goals' `⊢` buttons and the lines over the goals. A `⊢` is a text of the goal's group;
   * its button is at least a control on the screen. The line spans the goal's formulas.
   */
  function goalTargets(goals: NonNullable<ReturnType<typeof view>>["goals"]): GoalHit[] {
    const v = view();
    if (!v) return [];
    const origin = host.getBoundingClientRect();
    const at = rendered();
    const least = token("--size-button") / camera().k;
    const lift = token("--spacing-2") / camera().k;
    return goals.flatMap((goal) => {
      const group = host.querySelector(`#i${v.inferences.indexOf(goal.goal)}`);
      const turnstile = [...(group?.children ?? [])].find((c) => c.textContent === "⊢");
      if (!group || !turnstile) return [];
      const g = group.getBoundingClientRect();
      const t = turnstile.getBoundingClientRect();
      const w = Math.max(t.width / at, least);
      const h = Math.max(t.height / at, least);
      return [
        {
          goal: goal.goal,
          x: (t.left - origin.left) / at + t.width / at / 2 - w / 2,
          y: (t.top - origin.top) / at + t.height / at / 2 - h / 2,
          w,
          h,
          lineX: (g.left - origin.left) / at,
          lineY: (g.top - origin.top) / at - lift,
          lineW: g.width / at,
        },
      ];
    });
  }

  // A zoom changes the least size of a formula's button on the screen.
  createEffect(
    on(
      () => camera().k,
      () => {
        const e = elim();
        if (host.firstChild && e) markElimination(e);
        else if (
          host.firstChild &&
          hostSession === proof()?.session &&
          !(ui.tab === "net" && netReady())
        ) {
          setHits(targets(view()?.goals ?? []));
          setGoalHits(goalTargets(view()?.goals ?? []));
        }
      },
      { defer: true },
    ),
  );

  // The active goal changes without a new drawing: mark it again.
  createEffect(
    on(
      () => active(),
      () => {
        if (host.firstChild) decorate(ui.tab === "net" && netReady());
        setDrawn((n) => n + 1);
      },
      { defer: true },
    ),
  );

  /** The drawing's size, with the engines' labels that stand out past its right edge. */
  const natural = () => {
    const svg = host.querySelector("svg");
    if (!svg) return { w: 0, h: 0 };
    const left = host.getBoundingClientRect().left;
    const at = rendered();
    const labels = [...host.querySelectorAll("text.engine")].map(
      (label) => (label.getBoundingClientRect().right - left) / at,
    );
    return { w: Math.max(svg.width.baseVal.value, ...labels), h: svg.height.baseVal.value };
  };

  function move(next: Camera, smooth = false) {
    setGlide(smooth && !reduced());
    setCamera(next);
  }

  /**
   * Fits the whole drawing into the stage, never larger than its own size,
   * and never so small that a formula of the active goal is a smaller target
   * than a control: then the active goal is shown at that size instead.
   */
  function fitView() {
    byHand = false;
    const { w, h } = natural();
    // The tools' column stands over the stage's right: the drawing fits beside it (with the
    // guide on it grows with the tools' names). A compact window's tools are a bar below.
    const tools = compact() ? null : document.querySelector(".tools")?.getBoundingClientRect();
    const right = tools ? Math.max(0, stage.getBoundingClientRect().right - tools.left) : 0;
    const W = stage.clientWidth - right;
    const H = stage.clientHeight;
    if (!w || !h) return;
    const margin = token("--spacing-7");
    // The toggles stand over the stage's top; the bottom box over its bottom, but for a compact
    // window, whose stage ends above the box.
    const top = token("--size-toggle-box") + 2 * token("--size-inset");
    const bottom = compact()
      ? token("--spacing-4")
      : token("--size-box") + 2 * token("--size-box-inset");
    const fit = Math.max(0.2, Math.min(1, (W - margin) / w, (H - top - bottom) / h));
    const k = Math.max(fit, floor());
    if (k > fit) {
      move({ k, x: (W - w * k) / 2, y: top });
      queueMicrotask(() => bringIntoView(false));
    } else {
      move({ k, x: (W - w * k) / 2, y: Math.max(top, top + (H - top - bottom - h * k) / 2) });
    }
  }

  /** The least zoom at which every formula of the active goal is as wide as a control. */
  function floor(): number {
    const goal = active();
    const formulas = (view()?.goals ?? []).filter((g) => g.goal === goal);
    const k = camera().k;
    const least = token("--size-button");
    // A button's width on screen is its formula and gaps, which scale with the zoom, and its
    // padding past the formula's ends, which does not: the zoom at which each is a control wide.
    const needed = targets(formulas).map((t) => {
      const scaled = t.w * k - t.fixed;
      return scaled > 0 ? ((least - t.fixed) / scaled) * k : 0;
    });
    const k1 = Math.max(0, ...needed);
    return Number.isFinite(k1) ? Math.min(4, k1) : 0;
  }

  /** Pans so that the active goal is in view (the other goals stay, dimmed). */
  function bringIntoView(smooth = true) {
    const goal = active();
    if (goal === undefined) return;
    const element = host.querySelector(`#i${drawingIndex(goal)}`);
    if (!element) return;
    const r = element.getBoundingClientRect();
    const s = stage.getBoundingClientRect();
    const edge = token("--spacing-4");
    const above = token("--spacing-7");
    const below = token("--spacing-7");
    let { x, y } = camera();
    // A goal wider than the stage shows its start.
    if (r.right > s.right - edge) x -= r.right - (s.right - edge);
    if (r.left - (x - camera().x) < s.left + edge) x += s.left + edge - (r.left - (x - camera().x));
    if (r.top < s.top + above) y += s.top + above - r.top;
    else if (r.bottom > s.bottom - below) y -= r.bottom - (s.bottom - below);
    if (x !== camera().x || y !== camera().y) move({ ...camera(), x, y }, smooth);
  }

  function zoom(by: number, at?: { x: number; y: number }) {
    byHand = true;
    const c = camera();
    const k = Math.max(0.2, Math.min(4, c.k * by));
    const px = at?.x ?? stage.clientWidth / 2;
    const py = at?.y ?? stage.clientHeight / 2;
    move({ k, x: px - ((px - c.x) * k) / c.k, y: py - ((py - c.y) * k) / c.k }, !at);
  }

  /** Zooms by `by` about the point `from` of the stage, which then lies at `to`: a pinch. */
  function pinch(by: number, from: { x: number; y: number }, to: { x: number; y: number }) {
    byHand = true;
    const c = camera();
    const k = Math.max(0.2, Math.min(4, c.k * by));
    move({ k, x: to.x - ((from.x - c.x) * k) / c.k, y: to.y - ((from.y - c.y) * k) / c.k }, false);
  }

  // A render effect runs before every effect of the same change, so the dock, the buttons and
  // the reasons, which read the drawing's place on the screen, read it moved. As an effect of
  // its own it could run after them: Solid puts an effect that ran last among a signal's
  // readers, and the dock trailed the goal by a move during a drag.
  createRenderEffect(() => {
    const c = camera();
    if (!world) return;
    world.style.transform = `translate(${c.x}px, ${c.y}px) scale(${c.k})`;
    // What the world draws at a size on the screen (a goal's line) divides by the zoom.
    world.style.setProperty("--zoom", String(c.k));
  });

  /**
   * Places an overlay of the stage over an element of the drawing: its bottom a gap above the
   * element's top, its left at the element's left; below the element where the stage's top
   * leaves no room. In a compact window it is a sheet at the stage's bottom, above its controls.
   */
  function placeOver(el: HTMLElement, anchor: Element) {
    const s = stage.getBoundingClientRect();
    const r = anchor.getBoundingClientRect();
    const gap = token("--spacing-2");
    let left: number;
    let top: number;
    if (compact()) {
      const controls = stage.querySelector<HTMLElement>(".stage-ctl")?.offsetTop ?? s.height;
      left = gap;
      top = controls - el.offsetHeight - gap;
    } else {
      left = r.left - s.left;
      top = r.top - s.top - el.offsetHeight - gap;
      if (top < gap) top = r.bottom - s.top + gap;
    }
    el.style.left = `${Math.max(gap, Math.min(left, s.width - el.offsetWidth - gap))}px`;
    el.style.top = `${Math.max(gap, Math.min(top, s.height - el.offsetHeight - gap))}px`;
  }

  /** Places the overlays again once one that just opened is in the document and has its size. */
  const placeSoon = () => queueMicrotask(() => setDrawn((n) => n + 1));

  // The rule popover over its formula, the goal's menu over its ⊢, the premises of a split or a
  // cut over its goal (the cut's box over them), the witness's box under the goal's row.
  createEffect(() => {
    camera();
    drawn();
    void ui.offered;
    void ui.split?.own;
    void ui.split?.left;
    void ui.cutting?.own;
    void ui.cutting?.left;
    void cutSaid();
    void witnessSaid();
    void goalHits();
    const goalOf = (goal: number) => host.querySelector(`#i${drawingIndex(goal)}`);
    const choosing = ui.split ?? ui.cutting;
    if (premisesEl?.isConnected && choosing) {
      const goal = goalOf(choosing.goal);
      if (goal) placeOver(premisesEl, goal);
    }
    if (popover && ui.cutting) {
      const under = premisesEl?.isConnected ? premisesEl : goalOf(ui.cutting.goal);
      if (compact() && premisesEl?.isConnected) {
        // Two sheets: the cut's box at the bottom, the premises right above it.
        const goal = goalOf(ui.cutting.goal);
        if (goal) placeOver(popover, goal);
        const gap = token("--spacing-2");
        premisesEl.style.top = `${popover.offsetTop - premisesEl.offsetHeight - gap}px`;
      } else if (under) placeOver(popover, under);
    } else if (popover && ui.witnessing) {
      const goal = goalOf(ui.witnessing.goal);
      if (goal) placeOver(popover, goal);
    } else if (popover && ui.selected && !ui.split) {
      const formula = stage.querySelector(
        `.fb[data-goal="${ui.selected.goal}"][data-position="${ui.selected.position}"]`,
      );
      if (formula) placeOver(popover, formula);
    }
    if (menuEl && ui.goalMenu !== null) {
      const turnstile = stage.querySelector(`.gt[data-goal="${ui.goalMenu}"]`);
      if (turnstile) placeOver(menuEl, turnstile);
    }
  });

  // Panning by dragging the field, zooming by a pinch (two fingers, or a trackpad's pinch, which
  // browsers send as ctrl and the wheel or, in Safari, as gesture events) and by ctrl and the
  // wheel about where it happens, and both by buttons and keys. The stage takes no gesture of the
  // browser's (touch-action: none), so a pinch here zooms the drawing, never the page; everywhere
  // else the browser's own zoom acts, and ctrl with plus or minus is always the browser's.
  onMount(() => {
    // The pointers down on the stage: one on the field pans; a second finger, wherever it lands,
    // makes a pinch of the two.
    const pointers = new Map<number, { x: number; y: number; pans: boolean }>();
    const down = (event: PointerEvent) => {
      // The truth table and the tableau scroll as a page does.
      if ((event.target as Element).closest(".method")) return;
      const control = (event.target as Element).closest("button, input, .pop, .premises, .cluster");
      if (control && (event.pointerType !== "touch" || pointers.size === 0)) {
        if (event.pointerType === "touch")
          pointers.set(event.pointerId, { x: event.clientX, y: event.clientY, pans: false });
        return;
      }
      pointers.set(event.pointerId, { x: event.clientX, y: event.clientY, pans: true });
      stage.setPointerCapture(event.pointerId);
      stage.dataset["panning"] = "";
    };
    const moved = (event: PointerEvent) => {
      const was = pointers.get(event.pointerId);
      if (!was) return;
      const now = { ...was, x: event.clientX, y: event.clientY };
      const other = [...pointers].find(([id]) => id !== event.pointerId)?.[1];
      pointers.set(event.pointerId, now);
      if (pointers.size === 2 && other) {
        const s = stage.getBoundingClientRect();
        const from = { x: (was.x + other.x) / 2 - s.left, y: (was.y + other.y) / 2 - s.top };
        const to = { x: (now.x + other.x) / 2 - s.left, y: (now.y + other.y) / 2 - s.top };
        const apart = Math.hypot(was.x - other.x, was.y - other.y);
        if (apart > 0) pinch(Math.hypot(now.x - other.x, now.y - other.y) / apart, from, to);
      } else if (pointers.size === 1 && was.pans) {
        const c = camera();
        move({ ...c, x: c.x + now.x - was.x, y: c.y + now.y - was.y }, false);
      }
    };
    const up = (event: PointerEvent) => {
      pointers.delete(event.pointerId);
      if (pointers.size === 0) delete stage.dataset["panning"];
    };
    // Safari's pinch on a trackpad: the scale since the gesture began. On a touch screen the
    // pointers make the pinch, so their gesture events are only kept from the page.
    let scaled = 1;
    const gesture = (event: Event) => {
      if ((event.target as Element).closest(".method")) return;
      event.preventDefault();
      if (pointers.size > 0) return;
      const { scale, clientX, clientY } = event as Event & {
        scale: number;
        clientX: number;
        clientY: number;
      };
      if (event.type === "gesturestart") scaled = 1;
      const s = stage.getBoundingClientRect();
      const at = { x: clientX - s.left, y: clientY - s.top };
      pinch(scale / scaled, at, at);
      scaled = scale;
    };
    const wheel = (event: WheelEvent) => {
      if (!host.firstChild || (event.target as Element).closest(".method")) return;
      event.preventDefault();
      if (event.ctrlKey || event.metaKey) {
        const s = stage.getBoundingClientRect();
        zoom(Math.exp(-event.deltaY / 300), {
          x: event.clientX - s.left,
          y: event.clientY - s.top,
        });
      } else {
        const c = camera();
        move({ ...c, x: c.x - event.deltaX, y: c.y - event.deltaY }, false);
      }
    };
    const resized = new ResizeObserver(() => setDrawn((n) => n + 1));
    stage.addEventListener("pointerdown", down);
    stage.addEventListener("pointermove", moved);
    stage.addEventListener("pointerup", up);
    stage.addEventListener("pointercancel", up);
    stage.addEventListener("wheel", wheel, { passive: false });
    for (const type of ["gesturestart", "gesturechange"]) stage.addEventListener(type, gesture);
    // A panel that opens narrows the stage: the drawing moves aside with its middle, so that the
    // panel does not cover it (and back when the panel closes).
    let width = stage.clientWidth;
    const narrowed = new ResizeObserver(() => {
      const now = stage.clientWidth;
      if (width > 0 && now !== width) move({ ...camera(), x: camera().x + (now - width) / 2 });
      width = now;
      setDrawn((n) => n + 1);
    });
    narrowed.observe(stage);
    onCleanup(() => narrowed.disconnect());
    // The zoom's keys (src/lib/keys.ts): a single key, so only while Settings' "Single keys" is on.
    const keys = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return;
      const inField = !!(event.target as Element).closest("input, textarea, select");
      const action = keyAction(event, {
        inField,
        singleKeys: props.prover.settings().singleKeys,
      });
      if (action === "zoomIn") zoom(1.25);
      else if (action === "zoomOut") zoom(0.8);
      else if (action === "zoomReset") zoom(1 / camera().k);
      else if (action === "fit") fitView();
      else return;
      event.preventDefault();
    };
    window.addEventListener("keydown", keys);
    onCleanup(() => {
      resized.disconnect();
      window.removeEventListener("keydown", keys);
    });
  });

  /** Opens a formula's rules, or while a split or a cut is chosen moves it to the other premise. */
  async function pick(hit: Hit) {
    const choosing = ui.split ?? ui.cutting;
    if (choosing) {
      if (hit.goal !== choosing.goal) return;
      if (ui.split && hit.position === ui.split.position) return;
      moveChip(hit.position);
      return;
    }
    await openRules(hit.goal, hit.position);
  }

  /** Moves a formula of the split or the cut being chosen to the other premise. */
  function moveChip(position: number) {
    const choosing = ui.split ?? ui.cutting;
    if (!choosing) return;
    const left = choosing.left.includes(position)
      ? choosing.left.filter((p) => p !== position)
      : [...choosing.left, position].sort((a, b) => a - b);
    if (ui.split) setUi("split", { ...ui.split, left });
    else if (ui.cutting) setUi("cutting", { ...ui.cutting, left });
  }

  /**
   * Opens the rules popover of a goal's formula: each rule of its connective, tried on the goal.
   * The time from the press to the popover with its greyed rules is measured
   * (`deduxit:rules`), as the trials are a call per rule.
   */
  async function openRules(goal: number, position: number) {
    const begun = performance.now();
    props.prover.focus(goal);
    props.prover.clearNote();
    // Another formula picked: the witness chooser gives way to its rules.
    setUi({ selected: { goal, position }, offered: null, witnessing: null, goalMenu: null });
    const offered = await props.prover.rules(goal, position);
    if (ui.selected?.goal !== goal || ui.selected.position !== position) return;
    setUi("offered", offered);
    performance.measure("deduxit:rules", { start: begun, end: performance.now() });
    // A digit typed before the rules arrived picks its rule now.
    const early = typedEarly;
    typedEarly = undefined;
    const rule = early === undefined ? undefined : offered[early - 1];
    if (rule && !rule.refused) {
      void choose(rule);
      return;
    }
    // The first rule that applies takes the focus; where none does, the first, whose card says why.
    queueMicrotask(() =>
      (
        popover?.querySelector<HTMLButtonElement>("button.rule:not([aria-disabled])") ??
        popover?.querySelector<HTMLButtonElement>("button.rule")
      )?.focus({ preventScroll: true }),
    );
  }

  /** A rule chosen in the popover: applied, or for a split or a witness its chooser opens. */
  async function choose(rule: Candidate) {
    const spot = ui.selected;
    if (!spot || rule.refused) return;
    if (rule.witness) {
      setWitnessText("");
      setWitnessSaid(null);
      setUi({
        witnessing: { goal: spot.goal, position: spot.position, rule: rule.rule },
        selected: null,
        offered: null,
      });
      queueMicrotask(() => popover?.querySelector<HTMLInputElement>("input")?.focus());
      return;
    }
    if (rule.split) {
      setUi({ split: { ...spot, rule: rule.rule, left: [], own: null }, offered: null });
      const own = await props.prover.premises(spot.goal, {
        rule: rule.rule,
        position: spot.position,
      });
      if (
        ui.split?.goal === spot.goal &&
        ui.split.position === spot.position &&
        own &&
        "own" in own
      )
        setUi("split", { ...ui.split, own: own.own });
      // The apply button takes the focus: a chip with the focus ring looked moved already.
      queueMicrotask(() =>
        premisesEl?.querySelector<HTMLButtonElement>(".apply-step")?.focus({ preventScroll: true }),
      );
      return;
    }
    setUi({ selected: null, offered: null });
    const applied = await props.prover.apply(spot.goal, {
      position: spot.position,
      rule: rule.rule,
    });
    announce(applied === true, rule.rule);
  }

  async function applySplit() {
    const split = ui.split;
    if (!split) return;
    setUi({ split: null, selected: null });
    const applied = await props.prover.apply(split.goal, {
      position: split.position,
      rule: split.rule,
      left: split.left,
    });
    announce(applied === true, split.rule);
  }

  /**
   * Takes the quantifier step the witness chooser holds, with the term typed or, `open`, its
   * witness left for an axiom or the search to fill; what deduxit refused stays said in it.
   */
  async function applyWitness(open: boolean) {
    const w = ui.witnessing;
    const text = witnessText().trim();
    if (!w || (!open && text === "")) return;
    const said = await props.prover.witnessed(w.goal, {
      position: w.position,
      rule: w.rule,
      ...(open ? {} : { witness: text }),
    });
    if (said === undefined) return;
    if (said) {
      setWitnessSaid(said);
      setUi("live", `${said.keyword}. ${said.sentence}`);
      return;
    }
    setUi("witnessing", null);
    setWitnessText("");
    announce(true, w.rule);
  }

  // The cut's box, opened by the tools' Cut: a fresh one, its field taking the focus.
  createEffect(
    on(
      () => ui.cutting?.goal,
      (goal, before) => {
        if (goal === undefined || goal === before) return;
        setCutText("");
        setCutSaid(null);
        queueMicrotask(() => popover?.querySelector<HTMLInputElement>("input")?.focus());
      },
    ),
  );

  /**
   * Reads the cut formula as it is typed: once it reads, the two premises the cut would make
   * show over the goal; a text that is no formula is said under the box.
   */
  let typing: ReturnType<typeof setTimeout> | undefined;
  function typeCut(text: string) {
    setCutText(text);
    setCutSaid(null);
    clearTimeout(typing);
    const goal = ui.cutting?.goal;
    if (goal === undefined) return;
    if (text.trim() === "") {
      setUi("cutting", (c) => (c ? { ...c, own: null } : c));
      return;
    }
    typing = setTimeout(async () => {
      const read = await props.prover.premises(goal, { cut: text });
      if (ui.cutting?.goal !== goal || cutText() !== text) return;
      if (read && "own" in read) setUi("cutting", (c) => (c ? { ...c, own: read.own } : c));
      else {
        setUi("cutting", (c) => (c ? { ...c, own: null } : c));
        if (read) setCutSaid(read);
      }
    }, 250);
  }

  /** Makes the cut the box holds; what deduxit refused stays said under the box. */
  async function applyCut() {
    const cutting = ui.cutting;
    if (!cutting || cutText().trim() === "") return;
    const said = await props.prover.cut(cutting.goal, cutText(), cutting.left);
    if (said === undefined) return;
    if (said) {
      setCutSaid(said);
      setUi("live", `${said.keyword}. ${said.sentence}`);
      return;
    }
    setUi("cutting", null);
    setCutText("");
    setUi("live", "cut applied: both premises are open.");
  }

  /** Takes one step of the elimination shown: the cut `at`, or the strategy's. */
  async function eliminationStep(at?: number) {
    const before = elim()?.taken.length ?? 0;
    await props.prover.eliminationStep(onView(), at, drawJson());
    const e = elim();
    const step = e?.taken.at(-1);
    if (e && step && e.taken.length > before) setUi("live", stepLine(e.taken.length, step));
  }

  function announce(applied: boolean, rule: string) {
    const note = proof()?.note;
    if (applied) {
      setUi("live", proof()?.view?.complete ? "Proved: every goal is closed." : `${rule} applied.`);
    } else if (note) {
      setUi("live", `${note.said.keyword}. ${note.said.sentence}`);
      const button = stage.querySelector(".fb[data-active]");
      if (button && !reduced()) {
        button.animate(
          [
            { transform: "translateX(0)" },
            { transform: "translateX(calc(-1 * var(--spacing-1)))" },
            { transform: "translateX(var(--spacing-1))" },
            { transform: "translateX(0)" },
          ],
          { duration: token("--duration-shake") },
        );
      }
    }
  }

  // Escape closes the goal's menu, the popover or a chooser, the focus back on its formula or ⊢;
  // Enter applies a split; a digit typed before the rules arrive picks its rule then.
  onMount(() => {
    const focusOn = (selector: string) => stage.querySelector<HTMLElement>(selector)?.focus();
    const keys = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      if (event.key === "Escape" && ui.goalMenu !== null) {
        const goal = ui.goalMenu;
        setUi("goalMenu", null);
        focusOn(`.gt[data-goal="${goal}"]`);
        event.preventDefault();
      } else if (event.key === "Escape" && ui.cutting) {
        setUi("cutting", null);
        event.preventDefault();
      } else if (event.key === "Escape" && ui.witnessing) {
        const w = ui.witnessing;
        setUi("witnessing", null);
        focusOn(`.fb[data-goal="${w.goal}"][data-position="${w.position}"]`);
        event.preventDefault();
      } else if (event.key === "Escape" && (ui.selected || ui.split)) {
        const spot = ui.split ?? ui.selected;
        setUi({ selected: null, offered: null, split: null });
        if (spot) focusOn(`.fb[data-goal="${spot.goal}"][data-position="${spot.position}"]`);
        event.preventDefault();
      } else if (
        ui.selected &&
        !ui.offered &&
        !ui.split &&
        !ui.witnessing &&
        /^[1-9]$/.test(event.key) &&
        (event.target as Element).closest(".fb")
      ) {
        event.preventDefault();
        typedEarly = Number(event.key);
      } else if (
        ui.split &&
        event.key === "Enter" &&
        !(event.target as Element).closest(".fb, button")
      ) {
        event.preventDefault();
        void applySplit();
      }
    };
    window.addEventListener("keydown", keys);
    onCleanup(() => window.removeEventListener("keydown", keys));
  });

  /** Where the hint points on the active goal, from where the visitor is. */
  const pointed = () => pointer(props.prover, props.ui);
  const goalNumber = (goal: number) => goal + 1;

  /** The goal marked as having no proof: the marking's search said so, or a search on it did. */
  const dead = (goal: number) => {
    if (!props.prover.settings().marking) return false;
    if (props.prover.marked(goal) === "none") return true;
    const p = proof();
    const at = p?.note && p.session ? goalAt(p.session, p.note.path) : undefined;
    const verdict: string | undefined = p?.note?.outcome?.verdict;
    return at === goal && (verdict === "unprovable" || verdict === "not_valid");
  };
  // After each step, the marking's search on the goals it opened.
  createEffect(
    on(
      () => [proof()?.id, proof()?.session, props.prover.settings().marking] as const,
      ([id, session, marking]) => {
        if (id && session && marking) void props.prover.mark(id);
      },
    ),
  );

  /** Whether the proof's sequent has a truth table and a tableau: a started classical ordinary one. */
  const decidable = () => {
    const p = proof();
    // A course pack that bars the search bars deduxit's table and tableau too: they decide.
    return (
      !!p?.session &&
      p.calculus.suite === "ordinary" &&
      p.calculus.logic === "classical" &&
      prover().limits().search(p.id) === null
    );
  };
  /** The truth table or the tableau the stage shows in the drawing's place, or null. */
  const method = (): Method | null =>
    (ui.tab === "table" || ui.tab === "tableau") && decidable() ? ui.tab : null;
  /**
   * Whether the stage shows the proof by natural deduction in the drawing's place: a started
   * ordinary sequent whose calculus's method the visitor set to natural deduction.
   */
  const deduced = () => {
    const p = proof();
    return !!p?.session && isNatural(p.calculus);
  };
  /** The Kripke model the stage shows in the drawing's place, to change and check, or null. */
  const modelShown = () => {
    const suite = proof()?.calculus.suite;
    return ui.tab === "model" &&
      suite !== "rules" &&
      suite !== "modal" &&
      suite !== "lambda" &&
      !deduced()
      ? ui.modelSeed
      : null;
  };
  /** The classical sequent whose tableau the visitor writes by hand in the drawing's place, or null. */
  const writtenShown = () => {
    const session = proof()?.session;
    return ui.tab === "written" && decidable() && session && isOrdinary(session)
      ? sequentText(session)
      : null;
  };
  // The model view gives way to the tree when another proof comes to the stage.
  createEffect(
    on(
      () => proof()?.id,
      () => {
        if (ui.tab === "model" || ui.tab === "written") setUi("tab", "tree");
      },
      { defer: true },
    ),
  );
  // The table or the tableau gives way to the tree when the proof changes under it (a key or
  // the band acted on it: the visitor sees what changed) or when the proof shown has none.
  createEffect(
    on(
      () => [proof()?.id, proof()?.session, decidable()] as const,
      ([id, session, ok], before) => {
        if (ui.tab !== "table" && ui.tab !== "tableau") return;
        if (!ok || (before?.[0] === id && before?.[1] !== session)) setUi("tab", "tree");
      },
      { defer: true },
    ),
  );
  return (
    <section
      class="stage"
      aria-label="The proof"
      ref={stage}
      data-method={
        proof()?.calculus.suite === "rules"
          ? "custom"
          : proof()?.calculus.suite === "modal"
            ? "modal"
            : proof()?.calculus.suite === "lambda"
              ? "lambda"
              : deduced()
                ? "natural"
                : modelShown()
                  ? "model"
                  : writtenShown()
                    ? "written"
                    : (method() ?? undefined)
      }
    >
      <div class="world" ref={world} data-glide={glide() ? "" : undefined}>
        <div class="hits">
          {/* Under the formulas' buttons, which win where the two meet. */}
          <For each={labelHits()}>
            {(hit) => (
              <button
                type="button"
                class="lb"
                data-hint-toggle=""
                aria-label={`Rule ${hit.label}, step ${String(hit.step)}`}
                {...hinted(hit.label, true)}
                ref={(el) => {
                  el.style.left = `${hit.x}px`;
                  el.style.top = `${hit.y}px`;
                  el.style.width = `${hit.w}px`;
                  el.style.height = `${hit.h}px`;
                }}
              />
            )}
          </For>
          <For each={hits()}>
            {(hit) => (
              <button
                type="button"
                class="fb"
                data-goal={hit.goal}
                data-position={hit.position}
                data-active={hit.goal === active() ? "" : undefined}
                data-dim={hit.goal !== active() ? "" : undefined}
                data-selected={
                  ui.selected?.goal === hit.goal && ui.selected.position === hit.position
                    ? ""
                    : undefined
                }
                data-left={
                  (ui.split?.goal === hit.goal && ui.split.left.includes(hit.position)) ||
                  (ui.cutting?.goal === hit.goal && ui.cutting.left.includes(hit.position))
                    ? ""
                    : undefined
                }
                data-principal={
                  ui.split?.goal === hit.goal && ui.split.position === hit.position ? "" : undefined
                }
                data-hinted={
                  hit.goal === active() && pointed()?.formula === hit.position ? "" : undefined
                }
                aria-label={`${hit.text}, formula ${hit.position + 1} of goal ${goalNumber(hit.goal)}`}
                aria-pressed={
                  ui.split?.goal === hit.goal
                    ? ui.split.left.includes(hit.position)
                    : ui.cutting?.goal === hit.goal
                      ? ui.cutting.left.includes(hit.position)
                      : undefined
                }
                ref={(el) => {
                  el.style.left = `${hit.x}px`;
                  el.style.top = `${hit.y}px`;
                  el.style.width = `${hit.w}px`;
                  el.style.height = `${hit.h}px`;
                }}
                onClick={() => void pick(hit)}
              />
            )}
          </For>
          <For each={goalHits()}>
            {(hit) => (
              <>
                <div
                  class="goal-line"
                  data-active={hit.goal === active() ? "" : undefined}
                  data-dead={dead(hit.goal) ? "" : undefined}
                  aria-hidden="true"
                  ref={(el) => {
                    el.style.left = `${hit.lineX}px`;
                    el.style.top = `${hit.lineY}px`;
                    el.style.width = `${hit.lineW}px`;
                  }}
                >
                  <Show when={dead(hit.goal)}>
                    <Sign name="cross" class="goal-cross" />
                  </Show>
                </div>
                <button
                  type="button"
                  class="gt"
                  data-goal={hit.goal}
                  data-active={hit.goal === active() ? "" : undefined}
                  aria-label={`⊢, goal ${goalNumber(hit.goal)}${dead(hit.goal) ? ", no proof" : ""}: its actions`}
                  aria-expanded={ui.goalMenu === hit.goal}
                  aria-haspopup="dialog"
                  data-tip={dead(hit.goal) ? "This goal has no proof" : "This goal"}
                  ref={(el) => {
                    el.style.left = `${hit.x}px`;
                    el.style.top = `${hit.y}px`;
                    el.style.width = `${hit.w}px`;
                    el.style.height = `${hit.h}px`;
                  }}
                  onClick={() => {
                    const open = ui.goalMenu === hit.goal;
                    props.prover.focus(hit.goal);
                    setUi({
                      goalMenu: open ? null : hit.goal,
                      selected: null,
                      offered: null,
                      split: null,
                      cutting: null,
                      witnessing: null,
                    });
                    if (!open)
                      queueMicrotask(() =>
                        menuEl?.querySelector<HTMLButtonElement>("button")?.focus(),
                      );
                  }}
                />
              </>
            )}
          </For>
          <For each={cutHits()}>
            {(hit) => (
              <button
                type="button"
                class="cb"
                data-next={hit.next ? "" : undefined}
                aria-label={`Reduce the cut of ${hit.formula}${hit.next ? ", the strategy's next" : ""}`}
                data-tip={`Reduce this cut of ${hit.formula}`}
                disabled={props.prover.busy()}
                ref={(el) => {
                  el.style.left = `${hit.x}px`;
                  el.style.top = `${hit.y}px`;
                  el.style.width = `${hit.w}px`;
                  el.style.height = `${hit.h}px`;
                }}
                onClick={() => void eliminationStep(hit.at)}
              />
            )}
          </For>
        </div>
        {/* Over the buttons, which show through its empty ground: a chosen formula's ground lies
            under its text. */}
        <div class="drawing" ref={host} />
      </div>

      <Show when={!deduced() && method()}>
        {(m) => <MethodView prover={props.prover} method={m()} ui={props.ui} />}
      </Show>
      <Show when={modelShown()}>{(seed) => <ModelView prover={props.prover} seed={seed()} />}</Show>
      <Show when={writtenShown()}>
        {(sequent) => <TableauCheckView prover={props.prover} ui={props.ui} sequent={sequent()} />}
      </Show>
      <Show when={deduced()}>
        <NaturalView prover={props.prover} />
      </Show>
      <Show when={proof()?.calculus.suite === "rules"}>
        <CustomPanel prover={props.prover} />
      </Show>
      <Show when={proof()?.calculus.suite === "modal"}>
        <ModalPanel prover={props.prover} />
      </Show>
      <Show when={proof()?.calculus.suite === "lambda"}>
        <LambdaPanel prover={props.prover} />
      </Show>

      <Show when={problem()}>
        {(text) => <p class="banner kw warn">The drawing failed: {text()}</p>}
      </Show>

      <Show when={view()?.complete && ((view()?.cuts.length ?? 0) > 0 || elim())}>
        <section class="cluster elim" aria-label="Cut elimination">
          <Show
            when={elim()}
            fallback={
              <div class="row">
                <span class="txt">
                  {view()?.cuts.length === 1 ? "1 cut" : `${view()?.cuts.length} cuts`} in this
                  proof
                </span>
                <button
                  type="button"
                  class="btn btn-s btn-primary"
                  data-tip={
                    onView() === "net"
                      ? "Reduce the cut links of the net step by step"
                      : "Reduce the cuts of the derivation step by step"
                  }
                  disabled={props.prover.busy()}
                  onClick={() => void props.prover.eliminate(onView(), drawJson())}
                >
                  Eliminate the cuts
                </button>
              </div>
            }
          >
            {(e) => (
              <>
                <p class="kw-label h">Cut elimination{onView() === "net" ? " on the net" : ""}</p>
                <p class="line" role="status" aria-live="polite">
                  {(() => {
                    const shownStep = e().shown;
                    const step = shownStep === null ? undefined : e().taken[shownStep - 1];
                    if (step && shownStep !== null) return `Before ${stepLine(shownStep, step)}`;
                    const last = e().taken.at(-1);
                    const left = e().reached.cuts.length;
                    const count =
                      left === 0 ? "Cut-free" : `${left} ${left === 1 ? "cut" : "cuts"} left`;
                    return last ? `${stepLine(e().taken.length, last)} · ${count}` : count;
                  })()}
                </p>
                <Show when={e().stopped}>
                  {(said) => (
                    <p class="line warn" role="alert">
                      <span class="kw">{said().keyword}</span> {said().sentence}
                    </p>
                  )}
                </Show>
                <Show when={e().undrawn}>
                  {(k) => (
                    <p class="line sub">
                      Steps from {k()} on are not drawn: their drawings would take more than the
                      page keeps.
                    </p>
                  )}
                </Show>
                <Show when={e().problem}>
                  {(said) => (
                    <p class="line warn" role="alert">
                      <span class="kw">{said().keyword}</span> {said().sentence}
                    </p>
                  )}
                </Show>
                <div class="row">
                  <button
                    type="button"
                    class="btn btn-s btn-primary"
                    data-tip="The next step of the strategy: the cut with no cut above it"
                    disabled={props.prover.busy() || e().reached.next === null}
                    onClick={() => void eliminationStep()}
                  >
                    Next step
                  </button>
                  <button
                    type="button"
                    class="btn btn-s"
                    data-tip="Every step to the cut-free proof, within the bounds of Settings"
                    disabled={props.prover.busy() || e().reached.next === null}
                    onClick={() => void props.prover.eliminationRun(onView(), drawJson())}
                  >
                    To the end
                  </button>
                  <button
                    type="button"
                    class="btn btn-s"
                    data-tip="Take the last step back"
                    disabled={props.prover.busy() || e().back.length === 0}
                    onClick={() => void props.prover.eliminationUndo(onView(), drawJson())}
                  >
                    Undo step
                  </button>
                  <Show when={e().taken.length > 0}>
                    <button
                      type="button"
                      class="btn btn-s"
                      aria-pressed={e().shown !== null}
                      data-tip="The drawing before the last step, its cut marked"
                      onClick={() =>
                        props.prover.eliminationShow(
                          onView(),
                          e().shown === null ? e().taken.length : null,
                        )
                      }
                    >
                      Before
                    </button>
                  </Show>
                  <button
                    type="button"
                    class="btn btn-s"
                    data-tip="Back to the finished proof"
                    onClick={() => props.prover.eliminationLeave(onView())}
                  >
                    Leave
                  </button>
                </div>
                <Show when={e().taken.length > 1}>
                  <details class="steps-taken">
                    <summary>{e().taken.length} steps</summary>
                    <ol>
                      <For
                        each={e().taken.flatMap((step, i) =>
                          step.drawing === null ? [] : [{ step, k: i + 1 }],
                        )}
                      >
                        {(drawn) => (
                          <li>
                            <button
                              type="button"
                              class="mi"
                              aria-pressed={e().shown === drawn.k}
                              onClick={() =>
                                props.prover.eliminationShow(
                                  onView(),
                                  e().shown === drawn.k ? null : drawn.k,
                                )
                              }
                            >
                              {stepLine(drawn.k, drawn.step)}
                            </button>
                          </li>
                        )}
                      </For>
                    </ol>
                    <Show when={e().undrawn}>
                      {(k) => (
                        <p class="sub">
                          Steps {k()} to {e().taken.length} are not drawn: their drawings would take
                          more than the page keeps.
                        </p>
                      )}
                    </Show>
                  </details>
                </Show>
              </>
            )}
          </Show>
        </section>
      </Show>
      {/* A goal is a number from 0: the menu's goal is wrapped, as <Show> takes 0 for false. */}
      <Show when={ui.goalMenu !== null && ui.tab === "tree" ? { at: ui.goalMenu } : undefined}>
        {(menu) => {
          const goal = () => menu().at;
          return (
            <GoalMenu
              ref={(el) => {
                menuEl = el;
                placeSoon();
              }}
              barred={props.prover.limits().search(proof()?.id ?? "")}
              apart={props.prover.apartFor(goal())}
              canBack={dead(goal()) && props.prover.rootMarked(proof()?.id ?? "") !== "none"}
              settingsOpen={ui.menu === "search"}
              close={() => {
                const at = goal();
                setUi("goalMenu", null);
                void props.prover.close(at);
              }}
              settings={() =>
                setUi({
                  searchFor: { goal: goal(), budget: props.prover.settings().budget },
                  menu: ui.menu === "search" ? null : "search",
                })
              }
              proveApart={() => {
                const at = goal();
                setUi("goalMenu", null);
                void props.prover.openGoal(at);
              }}
              useApart={(id) => {
                const at = goal();
                setUi("goalMenu", null);
                void props.prover.useApart(at, id);
              }}
              back={() => {
                const at = goal();
                setUi("goalMenu", null);
                void props.prover.goBack(at);
              }}
            />
          );
        }}
      </Show>

      <Show when={ui.selected && !ui.split}>
        <RulePopover
          ref={(el) => {
            popover = el;
            placeSoon();
          }}
          formula={(() => {
            const formula = formulasOf(ui.selected?.goal ?? 0)[ui.selected?.position ?? 0];
            return formula ? shown(formula) : "";
          })()}
          offered={ui.offered}
          hinted={pointed()?.rule}
          choose={(rule) => void choose(rule)}
        />
      </Show>

      <Show when={ui.split ?? ui.cutting}>
        {(choosing) => {
          const chips = (): Chip[] =>
            formulasOf(choosing().goal).flatMap((f, position) =>
              ui.split && position === ui.split.position
                ? []
                : [{ text: shown(f), side: f.side, position }],
            );
          return (
            <Show when={choosing().own}>
              {(own) => (
                <PremisesView
                  ref={(el) => {
                    premisesEl = el;
                    placeSoon();
                  }}
                  rule={ui.split?.rule ?? "cut"}
                  chips={chips()}
                  left={choosing().left}
                  own={own()}
                  twoSided={intuitionistic(
                    proof()?.calculus ?? { suite: "linear", method: "sequent", mode: "classical" },
                  )}
                  move={pointed()?.move ?? []}
                  ready={pointed()?.ready ?? false}
                  toggle={moveChip}
                  apply={() => void (ui.split ? applySplit() : applyCut())}
                />
              )}
            </Show>
          );
        }}
      </Show>

      <Show when={ui.witnessing}>
        {(w) => (
          <div
            class="cluster pop split cut"
            ref={(el) => {
              popover = el;
              placeSoon();
            }}
            role="dialog"
            aria-label="Witness"
          >
            <p class="pop-h">
              <span class="kw-label">
                Witness for <span class="m">{w().rule}</span>
              </span>
              <span class="m">
                {(() => {
                  const formula = formulasOf(w().goal)[w().position];
                  return formula ? shown(formula) : "";
                })()}
              </span>
            </p>
            <label class="cut-field">
              <span class="sub">
                Witness: a term of the sequent's constants and function symbols, and of the
                eigenvariables made below this goal, such as <span class="m">f(a)</span>
              </span>
              <input
                class="field m"
                type="text"
                spellcheck={false}
                autocomplete="off"
                aria-invalid={witnessSaid() ? "true" : undefined}
                value={witnessText()}
                onInput={(event) => {
                  setWitnessText(event.currentTarget.value);
                  setWitnessSaid(null);
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    void applyWitness(false);
                  }
                }}
              />
            </label>
            <Show when={witnessSaid()}>
              {(said) => (
                <p class="sub warn" role="alert">
                  <span class="kw">{said().keyword}</span> {said().sentence}
                </p>
              )}
            </Show>
            <p class="sub">
              Or leave it open: the goal holds <span class="m">$1</span> until an axiom or the
              search fills it.
            </p>
            <p class="row">
              <button
                type="button"
                class="btn btn-primary"
                disabled={witnessText().trim() === "" || props.prover.busy()}
                onClick={() => void applyWitness(false)}
              >
                Apply
              </button>
              <button
                type="button"
                class="btn"
                disabled={props.prover.busy()}
                onClick={() => void applyWitness(true)}
              >
                Leave open
              </button>
              <button type="button" class="btn" onClick={() => setUi("witnessing", null)}>
                Cancel
              </button>
            </p>
          </div>
        )}
      </Show>

      <Show when={ui.cutting}>
        <div
          class="cluster pop cut-box"
          ref={(el) => {
            popover = el;
            placeSoon();
          }}
          role="dialog"
          aria-label="Cut"
        >
          <label class="cut-field">
            <span class="sub">
              The cut formula
              {proof()?.calculus.suite === "linear" &&
              intuitionistic(
                proof()?.calculus ?? { suite: "linear", method: "sequent", mode: "classical" },
              )
                ? ", in intuitionistic logic"
                : ""}
            </span>
            <input
              class="field m"
              type="text"
              spellcheck={false}
              autocomplete="off"
              aria-invalid={cutSaid() ? "true" : undefined}
              aria-describedby={cutSaid() ? "cut-problem" : undefined}
              value={cutText()}
              onInput={(event) => typeCut(event.currentTarget.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void applyCut();
                }
              }}
            />
          </label>
          <Show when={cutSaid()}>
            {(said) => (
              <p class="sub warn" id="cut-problem" role="alert">
                <span class="kw">{said().keyword}</span> {said().sentence}
              </p>
            )}
          </Show>
        </div>
      </Show>

      <fieldset class="cluster stage-ctl zoom" aria-label="Zoom">
        <button
          type="button"
          class="btn icon"
          aria-label="Zoom out"
          aria-keyshortcuts="-"
          data-tip="Zoom out"
          data-key="−"
          onClick={() => zoom(0.8)}
        >
          <ZoomOut aria-hidden="true" />
        </button>
        <span class="zoom-v">{Math.round(camera().k * 100)}%</span>
        <button
          type="button"
          class="btn icon"
          aria-label="Zoom in"
          aria-keyshortcuts="+"
          data-tip="Zoom in"
          data-key="+"
          onClick={() => zoom(1.25)}
        >
          <ZoomIn aria-hidden="true" />
        </button>
        <button
          type="button"
          class="btn icon"
          aria-label="Fit the drawing"
          aria-keyshortcuts="F"
          data-tip="Fit the drawing"
          data-key="F"
          onClick={fitView}
        >
          <Maximize aria-hidden="true" />
        </button>
      </fieldset>
    </section>
  );
}

/** Where the hint points on the active goal, and what it says in words. */
export interface Pointer {
  readonly words: string;
  /** The formula to press. */
  readonly formula?: number;
  /** The rule to take in the open popover. */
  readonly rule?: string;
  /** The formulas of a split to move to the other premise. */
  readonly move: readonly number[];
  /** Whether the split being chosen is the hint's, to apply. */
  readonly ready: boolean;
  /** Whether no rule leads on from the goal, by the search. */
  readonly none?: boolean;
}

/**
 * Where the hint points on the active goal, from where the visitor is: the formula to press;
 * with that formula chosen, the rule to take; with its split open, the formulas to move and then
 * the button that applies it. Null where the hint was not asked on this goal.
 */
export function pointer(prover: Prover, view: Ui): Pointer | null {
  const { ui } = view;
  const p = prover.current();
  const goal = prover.activeGoal();
  if (!p?.session || goal === undefined || !ui.ladder) return null;
  if (ui.ladder.key !== ladderKey(p.id, paths(p.session).get(goal) ?? [])) return null;
  const hint = ui.ladder.hint;
  if (!hint) return { words: "Asking the search.", move: [], ready: false };
  const step = hint.steps?.[0];
  if (!step)
    return {
      words: "The search finds no proof of this goal, so no rule leads on. Undo the last step.",
      move: [],
      ready: false,
      none: true,
    };
  const formulas = p.view?.goals.find((g) => g.goal === goal)?.formulas ?? [];
  const named = (position: number) => {
    const f = formulas[position];
    return f ? shown(f) : `formula ${position + 1}`;
  };
  if (ui.cutting?.goal === goal)
    return {
      words: "The search proves without a cut. Type the formula you want to cut on.",
      move: [],
      ready: false,
    };
  const split = ui.split;
  if (split?.goal === goal && split.position === step.position && split.rule === step.rule) {
    const want = step.left ?? [];
    const move = formulas
      .map((_, i) => i)
      .filter((i) => i !== split.position && want.includes(i) !== split.left.includes(i));
    return move.length > 0
      ? {
          words: `Move ${move.map(named).join(" and ")} to the other premise.`,
          move,
          ready: false,
        }
      : { words: "This split works. Press the arrow to apply it.", move: [], ready: true };
  }
  if (ui.selected?.goal === goal && ui.selected.position === step.position)
    return { words: `Take ${step.rule}.`, rule: step.rule, move: [], ready: false };
  return {
    words: `Press ${named(step.position)} and take ${step.rule}.`,
    formula: step.position,
    move: [],
    ready: false,
  };
}

/**
 * The active goal's note over the bottom box: a refusal, or what a search found there (its
 * keyword, its engine, its reason, a countermodel); after Unknown, "Search longer" with twice the
 * budget and a caret for that search's settings. With the guide on, the hint in words.
 */
export function GoalNotes(props: { prover: Prover; ui: Ui }) {
  const { ui, setUi } = props.ui;
  const proof = () => props.prover.current();
  const note = createMemo(() => {
    const p = proof();
    const goal = props.prover.activeGoal();
    if (!p?.note || !p.session || ui.tab !== "tree") return null;
    const at = goalAt(p.session, p.note.path);
    return at === goal || (p.note.path.length === 0 && !p.view?.complete) ? p.note : null;
  });
  const pointed = () => pointer(props.prover, props.ui);
  /** Whether a search on the sequent itself found it has no proof. */
  const sequentUnprovable = () => {
    const verdict: string | undefined = proof()?.verdict?.outcome?.verdict;
    return verdict === "unprovable" || verdict === "not_valid";
  };
  return (
    <>
      {/* Keyed: its parts read the note as a value, never through an accessor gone stale. */}
      <Show when={note()} keyed>
        {(n) => {
          const verdict = (): string | undefined => n.outcome?.verdict;
          const budget = () => n.budget ?? props.prover.settings().budget;
          return (
            <div class="note goal-note" role="status">
              <span class={`kw ${n.tone}`}>{n.said.keyword}.</span>
              <EngineChip outcome={n.outcome} ui={props.ui} /> <Why said={n.said} />
              <Show when={verdict() === "unknown"}>
                <span class="row">
                  <button
                    type="button"
                    class="btn btn-primary"
                    onClick={() => {
                      const factor = (2 * budget()) / props.prover.settings().budget;
                      const goal = props.prover.activeGoal();
                      if (n.all) void props.prover.closeAll(factor);
                      else if (goal !== undefined) void props.prover.close(goal, factor);
                    }}
                  >
                    Search longer ({(2 * budget()).toLocaleString("en")})
                  </button>
                  <button
                    type="button"
                    class="btn icon"
                    aria-label="This search's settings"
                    data-tip="The engine and the budget of this search"
                    aria-expanded={ui.menu === "search"}
                    onClick={() => {
                      const goal = props.prover.activeGoal();
                      setUi({
                        searchFor: {
                          goal: n.all || goal === undefined ? "all" : goal,
                          budget: 2 * budget(),
                        },
                        menu: ui.menu === "search" ? null : "search",
                      });
                    }}
                  >
                    <Sign name="caret" />
                  </button>
                </span>
              </Show>
              <Show when={countermodelOf(n.outcome)}>
                <ModelFigure
                  outcome={n.outcome as unknown as OrdinaryOutcome}
                  prover={props.prover}
                  ui={props.ui}
                />
              </Show>
              <Show
                when={
                  n.path.length > 0 && (verdict() === "unprovable" || verdict() === "not_valid")
                }
              >
                <p class="said-why">{lost(sequentUnprovable())}</p>
              </Show>
            </div>
          );
        }}
      </Show>
      <Show when={pointed()}>
        {(pointing) => (
          <Show when={props.prover.settings().guide || pointing().none}>
            <p class="note hint-line" role="status">
              <span class="kw">Hint.</span> {pointing().words}
            </p>
          </Show>
        )}
      </Show>
    </>
  );
}

/**
 * With the guide on, one sentence over the bottom box that says what to press next on a proof by
 * hand, one action at a time; nothing where the hint already says it, or where the view is not a
 * derivation worked on.
 */
export function GuideLine(props: { prover: Prover; ui: Ui }) {
  const { ui } = props.ui;
  const words = () => {
    const p = props.prover.current();
    if (!props.prover.settings().guide || !p) return null;
    // A sequent not entered yet: ordinary logic's examples say it, the other logics this.
    if (!p.session && !p.modal?.outcome && !p.lambda?.statement)
      return p.calculus.suite === "ordinary"
        ? null
        : p.calculus.suite === "lambda"
          ? "Type a term or a type below and press Enter."
          : "Type a sequent below and press Enter.";
    if (!p.session || ui.tab !== "tree") return null;
    if (pointer(props.prover, props.ui)) return null;
    if (isNatural(p.calculus))
      return "Press a rule to work back from the goal, or cite lines to work forward from them.";
    if (p.view?.complete) return "Every goal is closed: the sequent is proved.";
    if (ui.goalMenu !== null) return "Press ✓ to let the search close this goal.";
    if (ui.split)
      return `Press a formula to move it to the other premise, then press ${ui.split.rule} ↵.`;
    if (ui.cutting)
      return ui.cutting.own
        ? "Press a formula to move it to the other premise, then press cut ↵."
        : "Type the cut formula.";
    if (ui.selected) return "Press a rule to apply it. A grey rule shows why it does not apply.";
    return "Press a formula on a dashed line to see its rules.";
  };
  return <Show when={words()}>{(text) => <p class="note guide-line">{text()}</p>}</Show>;
}
