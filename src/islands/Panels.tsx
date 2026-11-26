// deduxit © Fabian Lukas Grubmüller 2026
// Licensed under the EUPL

/**
 * The panels the tools open beside them: Steps, the search's settings, Export (a menu of the
 * formats, the link and the finished proof's λ-term, each copied or saved) and Import (a file, a
 * paste, or a drop anywhere under the top row); the Settings page; About.
 */

import { createResource, createSignal, For, type JSX, Show } from "solid-js";
import { APART, ENGINE_ORDER, engineLabel, engineName, engineTip } from "../lib/engines";
import { type Failure, MATH_FONTS } from "../lib/deduxit";
import { isHandin, readHandin } from "../lib/pack";
import { isOrdinary, stepsOf } from "../lib/ordinary";
import { actions, goalAt, paths, within } from "../lib/steps";
import { notTaken, shown } from "../lib/words";
import type { Theme } from "../lib/theme";
import {
  DEFAULT_BUDGET,
  DEFAULT_CUT_STEPS,
  DEFAULT_INSTANCES,
  DEFAULT_TERMS,
  DEFAULT_WITNESS_DEPTH,
  DEDUXIT_LOOK,
  type NetLook,
  type Prover,
  pathKey,
  type SearchDefaults,
  type SearchLogic,
  sameLook,
  searchLogic,
  TEXTBOOK_LOOK,
} from "./state";
import { Sign } from "./Signs";
import { Written } from "./Written";
import { Dictionary, Logo } from "./Logo";
import { usePacks } from "./Packs";
import { applyTheme } from "./Frame";
import type { Ui } from "./ui";

/** Saves a file the page made. */
export function download(name: string, content: BlobPart, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function ImportPanel(props: { prover: Prover; ui: Ui }) {
  const [text, setText] = createSignal("");
  const [said, setSaid] = createSignal<{ text: string; tone: string } | null>(null);
  const packs = usePacks();
  async function take(content: string, from: string) {
    const outcome = await importText(props.prover, packs, content, from);
    setSaid(outcome);
    if (outcome.tone === "ok") props.ui.setUi("live", outcome.text);
  }

  return (
    <div class="cluster menu" role="dialog" aria-label="Import">
      <p class="kw-label h">Import</p>
      <div class="form">
        <label class="lbl">
          <span>File</span>
          <input
            class="file-in"
            type="file"
            accept=".json,application/json,text/plain"
            onChange={async (event) => {
              const file = event.currentTarget.files?.[0];
              if (file) await take(await file.text(), ` from ${file.name}`);
            }}
          />
        </label>
        <label class="lbl col">
          <span>Paste a sequent, or a session or sequent in deduxit's JSON</span>
          <textarea
            value={text()}
            onInput={(event) => setText(event.currentTarget.value)}
            spellcheck={false}
          />
        </label>
        <p class="row">
          <button
            type="button"
            class="btn btn-primary"
            disabled={!text().trim()}
            onClick={() => void take(text(), "")}
          >
            Import
          </button>
          <span class="sub">Or drop a .json file anywhere on the page.</span>
        </p>
        <Show when={said()}>
          {(s) => (
            <p class={`said kw ${s().tone}`} role="status">
              {s().text}
            </p>
          )}
        </Show>
      </div>
    </div>
  );
}

/**
 * A row of Settings' net drawing: a field of the net's look (`styles.svg.net_look`) and its
 * values, or with no field a choice of whole looks, each pressed when the look is it.
 */
function LookRow<K extends keyof NetLook>(props: {
  prover: Prover;
  label: string;
  field?: K;
  options: readonly (readonly [NetLook[K] | NetLook, string, string])[];
}) {
  const look = () => props.prover.settings().netLook;
  const choose = (value: NetLook[K] | NetLook) =>
    props.prover.setSettings({
      netLook:
        props.field === undefined
          ? (value as NetLook)
          : { ...look(), [props.field]: value as NetLook[K] },
    });
  const isPressed = (value: NetLook[K] | NetLook) =>
    props.field === undefined ? sameLook(look(), value as NetLook) : look()[props.field] === value;
  return (
    <div class="st-row">
      <span>{props.label}</span>
      <fieldset class="seg" aria-label={props.label}>
        <For each={props.options}>
          {([value, name, tip]) => (
            <button
              type="button"
              class="seg-b"
              aria-pressed={isPressed(value)}
              data-tip={tip}
              onClick={() => choose(value)}
            >
              {name}
            </button>
          )}
        </For>
      </fieldset>
    </div>
  );
}

/** What an invertible rule is and why applying one never loses a proof: the switch's tip. */
const INVERTIBLE_TIP =
  "An invertible rule never loses a proof: when its goal has a proof, so do its premises. ⅋, ⊥, & and ⊤ are always invertible; ! is when every other formula is under ?; 1, ⊗ and the axiom are when their formulas are the whole goal. In LK every rule of a connective is; in LJ all but →L, ¬L and the two ∨R.";

/** A row of the Settings page: its label at the left, its control at the right or under it. */
function Row(props: { label: string; for?: string | undefined; children: JSX.Element }) {
  return (
    <div class="st-row">
      <Show when={props.for} fallback={<span>{props.label}</span>}>
        {(id) => <label for={id()}>{props.label}</label>}
      </Show>
      {props.children}
    </div>
  );
}

/** A switch of the Settings page, its label at the left; its line of help under it. */
function Switch(props: {
  label: string;
  checked: boolean;
  help?: string;
  tip?: string;
  id: string;
  onChange: (on: boolean) => void;
}) {
  return (
    <>
      <label class="sw st-row" data-tip={props.tip}>
        <span>{props.label}</span>
        <input
          type="checkbox"
          checked={props.checked}
          aria-describedby={props.help ? props.id : undefined}
          onChange={(event) => props.onChange(event.currentTarget.checked)}
        />
        <span class="sw-t" aria-hidden="true" />
      </label>
      <Show when={props.help}>
        <p class="sub st-help" id={props.id}>
          {props.help}
        </p>
      </Show>
    </>
  );
}

/** A count of the Settings page, right-aligned: a whole number above 0, else the default. */
function Count(props: {
  label: string;
  id: string;
  value: number;
  fallback: number;
  set: (value: number) => void;
}) {
  return (
    <Row label={props.label} for={props.id}>
      <input
        id={props.id}
        class="field num st-num"
        type="text"
        inputmode="numeric"
        autocomplete="off"
        value={props.value}
        onChange={(event) => {
          const value = Math.floor(Number(event.currentTarget.value.replace(/[^0-9]/g, "")));
          const next = value > 0 ? value : props.fallback;
          event.currentTarget.value = String(next);
          props.set(next);
        }}
      />
    </Row>
  );
}

/** Each math font by the short name the Settings page shows. */
const FONT_SHORT: Readonly<Record<string, string>> = {
  euler: "Euler",
  "stix-two": "STIX Two",
  garamond: "Garamond",
  asana: "Asana",
  "new-computer-modern": "New Computer Modern",
};

/** The logics whose search has defaults, by their names on the page. */
const LOGICS: readonly (readonly [SearchLogic, string])[] = [
  ["ordinary", "Ordinary"],
  ["linear", "Linear"],
  ["modal", "Modal"],
];

/**
 * The Settings page (board D10), in the stage's place: one column of rows. Look (the scheme, the
 * formulas' font, the nets), Search (each logic's defaults), Proving, Keys, This browser, and
 * About (the keys, what deduxit is with its licences, privacy).
 */
export function SettingsPage(props: {
  prover: Prover;
  ui: Ui;
  theme: () => Theme;
  setTheme: (t: Theme) => void;
  /** Closes every sequent, which a notice can undo. */
  closeEvery: () => void;
}) {
  const { setUi } = props.ui;
  const s = () => props.prover.settings();
  const [logic, setLogic] = createSignal<SearchLogic>(
    searchLogic(props.prover.current()?.calculus),
  );
  const defaults = () => s().search[logic()];
  const setSearch = (change: Partial<SearchDefaults>) => props.prover.setSearch(logic(), change);
  const seconds = () => Math.round(defaults().budget / 68e6);
  return (
    <section class="settings-page" aria-labelledby="settings-title">
      <div class="st-head">
        <h1 id="settings-title">Settings</h1>
        <span class="sub">Kept in this browser</span>
      </div>
      <section aria-labelledby="st-look">
        <h2 id="st-look">Look</h2>
        <Row label="Scheme">
          <fieldset class="seg" aria-label="Scheme">
            <For each={["light", "dark", "system"] as const}>
              {(t) => (
                <button
                  type="button"
                  class="seg-b"
                  aria-pressed={props.theme() === t}
                  onClick={() => {
                    applyTheme(t);
                    props.setTheme(t);
                  }}
                >
                  {t === "system" ? "System" : t === "light" ? "Light" : "Dark"}
                </button>
              )}
            </For>
          </fieldset>
        </Row>
        <Row label="Font of the formulas">
          <fieldset class="seg st-fonts" aria-label="Font of the formulas">
            <For each={MATH_FONTS}>
              {(font) => (
                <button
                  type="button"
                  class="seg-b"
                  aria-pressed={s().stageFont === font.key}
                  data-tip={font.look}
                  onClick={() => props.prover.setSettings({ stageFont: font.key })}
                >
                  {FONT_SHORT[font.key] ?? font.name}
                </button>
              )}
            </For>
          </fieldset>
        </Row>
        <p class="sub st-help">
          The drawing, its formulas and the exports, unless Export chooses another.
        </p>
        <Row label="Proof nets">
          <fieldset class="seg" aria-label="Proof nets">
            <For each={["formulas", "compact"] as const}>
              {(net) => (
                <button
                  type="button"
                  class="seg-b"
                  aria-pressed={s().net === net}
                  data-tip={
                    net === "formulas"
                      ? "Every formula of the net written"
                      : "The literals and the conclusions alone, for a wide net"
                  }
                  onClick={() => props.prover.setSettings({ net })}
                >
                  {net === "formulas" ? "Formulas" : "Compact"}
                </button>
              )}
            </For>
          </fieldset>
        </Row>
        <LookRow
          prover={props.prover}
          label="Look of a net"
          options={[
            [
              DEDUXIT_LOOK,
              "Default",
              "The page's own: edges into ⅋ and ? dashed, a ! with doors a row up, one ? node",
            ],
            [
              TEXTBOOK_LOOK,
              "Textbook",
              "As the textbooks draw nets: every edge plain, every conclusion at the bottom, a ? as its rules' nodes",
            ],
          ]}
        />
        <LookRow
          prover={props.prover}
          label="Edges into ⅋, ?"
          field="premises"
          options={[
            ["dashed", "Dashed", "Dashed and blue, since a switching keeps one of them"],
            ["plain", "Plain", "Drawn as every other edge"],
          ]}
        />
        <LookRow
          prover={props.prover}
          label="A ! with doors"
          field="conclusions"
          options={[
            ["raised", "A row up", "Written under its door, above the ? nodes its wires reach"],
            ["bottom", "At the bottom", "On the bottom row with every other conclusion"],
          ]}
        />
        <LookRow
          prover={props.prover}
          label="A ? node"
          field="whyNot"
          options={[
            ["node", "One node", "One ? with every copy and wire as a premise"],
            [
              "rules",
              "Its rules",
              "A dereliction ?d under each copy, contractions ?c, a weakening ?w",
            ],
          ]}
        />
      </section>
      <section aria-labelledby="st-search">
        <h2 id="st-search">Search</h2>
        <Row label="Defaults for">
          <fieldset class="seg" aria-label="Defaults for">
            <For each={LOGICS}>
              {([key, name]) => (
                <button
                  type="button"
                  class="seg-b"
                  aria-pressed={logic() === key}
                  onClick={() => setLogic(key)}
                >
                  {name}
                </button>
              )}
            </For>
          </fieldset>
        </Row>
        <Row label="Engine" for={logic() === "linear" ? "st-engine" : undefined}>
          <Show
            when={logic() === "linear"}
            fallback={<span class="st-value">deduxit's choice</span>}
          >
            <select
              id="st-engine"
              class="field st-engine"
              value={s().engine ?? ""}
              onChange={(event) =>
                props.prover.setSettings({ engine: event.currentTarget.value || null })
              }
            >
              <option value="">Automatic</option>
              <For each={ENGINE_ORDER}>
                {(engine) => <option value={engine}>{engineLabel(engine)}</option>}
              </For>
            </select>
          </Show>
        </Row>
        <p class="sub st-help">
          {logic() === "linear"
            ? "An engine chosen holds for this visit. One that does not take a sequent says so at its goal."
            : "deduxit picks the way to search in this logic."}
        </p>
        <Count
          label="Budget, in units of work"
          id="st-budget"
          value={defaults().budget}
          fallback={DEFAULT_BUDGET}
          set={(budget) => setSearch({ budget })}
        />
        <p class="sub st-help">
          {seconds() >= 1
            ? `About ${seconds()} second${seconds() > 1 ? "s" : ""} of search here.`
            : "Less than a second of search here."}
        </p>
        <Show when={logic() !== "modal"}>
          <Count
            label="Witness depth"
            id="st-witness"
            value={defaults().witnessDepth}
            fallback={DEFAULT_WITNESS_DEPTH}
            set={(witnessDepth) => setSearch({ witnessDepth })}
          />
          <p class="sub st-help">How deeply a search nests the terms it tries for ∃R and ∀L.</p>
          <Count
            label="Instances"
            id="st-instances"
            value={defaults().instances}
            fallback={DEFAULT_INSTANCES}
            set={(instances) => setSearch({ instances })}
          />
          <p class="sub st-help">
            The most instances of quantified formulas a search holds at once.
          </p>
          <Count
            label="Terms"
            id="st-terms"
            value={defaults().terms}
            fallback={DEFAULT_TERMS}
            set={(terms) => setSearch({ terms })}
          />
          <p class="sub st-help">The most terms a proof's witnesses and eigenvariables may hold.</p>
        </Show>
      </section>
      <section aria-labelledby="st-proving">
        <h2 id="st-proving">Proving</h2>
        <Switch
          label="Mark goals that have no proof"
          id="st-marking"
          checked={s().marking}
          help="After each step a short search looks at each new goal. A goal with no proof gets a red line and a cross, and its ⊢ offers Go back."
          onChange={(marking) => props.prover.setSettings({ marking })}
        />
        <Switch
          label="Apply invertible rules by themselves"
          id="st-invertible"
          checked={s().invertible}
          help="An invertible rule never loses a proof. The page takes them after each of your steps, and Undo takes them back with it."
          tip={INVERTIBLE_TIP}
          onChange={(on) => void props.prover.setInvertible(on)}
        />
        <Count
          label="Steps of cut elimination"
          id="st-cut-steps"
          value={s().cutSteps}
          fallback={DEFAULT_CUT_STEPS}
          set={(cutSteps) => props.prover.setSettings({ cutSteps })}
        />
        <p class="sub st-help">"To the end" stops after this many steps.</p>
      </section>
      <section aria-labelledby="st-keys">
        <h2 id="st-keys">Keys</h2>
        <Switch
          label="Single keys"
          id="st-single-keys"
          checked={s().singleKeys}
          help="Off, only the keys with Ctrl or Cmd, Tab, Enter, Space, the arrows and Escape act. Speech input types letters."
          onChange={(singleKeys) => props.prover.setSettings({ singleKeys })}
        />
      </section>
      <section aria-labelledby="st-browser">
        <h2 id="st-browser">This browser</h2>
        <Row label="Every sequent and its proofs">
          <button type="button" class="btn" onClick={() => props.closeEvery()}>
            Close every sequent
          </button>
        </Row>
        <p class="sub st-help">The open sequents are kept here and come back on your next visit.</p>
      </section>
      <section aria-labelledby="st-about">
        <h2 id="st-about">About</h2>
        <button type="button" class="st-link" onClick={() => setUi("menu", "keys")}>
          <span>Keys</span>
          <Sign name="next" />
        </button>
        <button type="button" class="st-link" onClick={() => setUi("menu", "about")}>
          <span>What deduxit is, its licences</span>
          <Sign name="next" />
        </button>
        <a class="st-link" href="/privacy/">
          <span>Privacy</span>
          <Sign name="next" />
        </a>
      </section>
    </section>
  );
}

/**
 * The engine every search is forced to, or Automatic: the engines that take
 * the current proof's sequent, the others greyed with why they do not.
 */
export function EngineChoice(props: { prover: Prover }) {
  const proof = () => props.prover.current();
  const engine = () => props.prover.settings().engine;
  // An ordinary proof is searched through deduxit's translation, the engine deduxit's choice.
  const linearSession = () => {
    const s = proof()?.session;
    return s && !isOrdinary(s) ? s : null;
  };
  const [listed] = createResource(linearSession, (session) => props.prover.engines(session));
  const refusalOf = (key: string): Failure | null =>
    listed()?.engines.find((e) => e.engine === key)?.refused ?? null;
  return (
    <fieldset class="lbl col">
      <legend>Engine</legend>
      <div class="choices" role="radiogroup" aria-label="Engine">
        <label
          class="seg-b"
          data-tip="deduxit chooses the engine by the sequent's fragment and mode"
        >
          <input
            type="radio"
            name="engine"
            checked={engine() === null}
            onChange={() => props.prover.setSettings({ engine: null })}
          />
          <span>Automatic</span>
          <span class="why">
            {listed()?.automatic ? `here the ${engineName(listed()?.automatic ?? "")}` : ""}
          </span>
        </label>
        <For each={listed()?.engines ?? []}>
          {(e) => (
            <label class="seg-b" data-tip={e.refused ? undefined : engineTip(e.engine)}>
              <input
                type="radio"
                name="engine"
                checked={engine() === e.engine}
                disabled={e.refused !== null}
                onChange={() => props.prover.setSettings({ engine: e.engine })}
              />
              <span>{engineLabel(e.engine)}</span>
              <span class="why">{e.refused ? notTaken(e.refused).keyword : ""}</span>
              <Show when={e.refused}>
                {(refused) => <span class="why-not">{notTaken(refused()).sentence}</span>}
              </Show>
            </label>
          )}
        </For>
      </div>
      <Show when={!proof()?.session}>
        <p class="sub">Start a proof to see which engines take its sequent.</p>
      </Show>
      <Show when={proof()?.calculus.suite === "ordinary"}>
        <p class="sub">
          An ordinary proof's searches run on deduxit's translation into linear logic, where deduxit
          chooses the engine: the engine set here is for linear proofs.
        </p>
      </Show>
      <p class="sub">A forced engine holds for this visit; the page starts on Automatic.</p>
      <Show when={engine() !== null && refusalOf(engine() ?? "")}>
        <p class="sub">
          The {engineName(engine() ?? "")} does not take this proof's sequent: its searches are
          refused at the goal.
        </p>
      </Show>
    </fieldset>
  );
}

export function StepsPanel(props: { prover: Prover }) {
  const proof = () => props.prover.current();
  /**
   * Who took a step at a path: a proof made apart whose steps were taken again here ("apart"),
   * the search ("search"), or the visitor (nothing said).
   */
  const byOf = (path: readonly number[], closed: boolean) =>
    Object.entries(proof()?.engines ?? {}).some(
      ([key, engine]) =>
        engine === APART && within(path, key === "" ? [] : key.split(".").map(Number)),
    )
      ? "apart"
      : closed
        ? "search"
        : "";
  /** Each step, as the list says it: its rule and goal, or the search that closed the goal. */
  const list = () => {
    const session = proof()?.session;
    if (!session) return [];
    if (isOrdinary(session)) {
      const where = paths(session);
      return stepsOf(session).map((step) => {
        const path = where.get(step.goal) ?? [];
        const engine = proof()?.engines[pathKey(path)];
        return engine && engine !== APART
          ? { text: `The ${engineName(engine)} closed goal ${step.goal + 1}`, by: "search" }
          : { text: `${step.rule} on goal ${step.goal + 1}`, by: byOf(path, false) };
      });
    }
    return actions(session, proof()?.view?.cuts, proof()?.view).map((action) =>
      action.kind === "step"
        ? {
            text: `${action.step.rule} on goal ${goalNumber(action.path)}`,
            by: byOf(action.path, false),
          }
        : action.kind === "cut"
          ? {
              text: `cut on ${action.formula} in goal ${goalNumber(action.path)}`,
              by: byOf(action.path, false),
            }
          : {
              text: `The ${engineName(proof()?.engines[pathKey(action.path)] ?? "") || "search"} closed goal ${goalNumber(action.path)}`,
              by: byOf(action.path, true),
            },
    );
  };
  const goalNumber = (path: readonly number[]) => {
    const session = proof()?.session;
    return session ? (goalAt(session, path) ?? 0) + 1 : 0;
  };
  return (
    <div class="cluster menu" role="dialog" aria-label="Steps">
      <p class="kw-label h">Steps</p>
      <ol class="mlist">
        <li>
          <button type="button" class="mi" onClick={() => void props.prover.backTo(0)}>
            <span class="fmt">0</span>
            <span class="fn">The sequent, before any step</span>
          </button>
        </li>
        <For each={list()}>
          {(line, i) => (
            <li>
              <button type="button" class="mi" onClick={() => void props.prover.backTo(i() + 1)}>
                <span class="fmt">{i() + 1}</span>
                <span class="fn">{line.text}</span>
                <Show when={line.by}>
                  <span class="by"> {line.by}</span>
                </Show>
              </button>
            </li>
          )}
        </For>
      </ol>
    </div>
  );
}

/** The licences of what the page sends, each served with it. */
const LICENCES: readonly (readonly [string, string, string])[] = [
  ["The page's code and deduxit", "EUPL-1.2", "/licenses/LICENSE.txt"],
  ["The written content", "CC BY 4.0", "https://creativecommons.org/licenses/by/4.0/"],
  ["deduxit's mark", "CC BY 4.0", "/logo/LICENSE.txt"],
  ["Euler Math, the formulas' font by default", "SIL OFL 1.1", "/fonts/Euler-Math-OFL.txt"],
  ["STIX Two Math, a font of the formulas", "SIL OFL 1.1", "/fonts/STIXTwoMath-OFL.txt"],
  ["Garamond-Math, a font of the formulas", "SIL OFL 1.1", "/fonts/Garamond-Math-OFL.txt"],
  ["Asana Math, a font of the formulas", "SIL OFL 1.1", "/fonts/Asana-Math-OFL.txt"],
  [
    "New Computer Modern Math, a font of the formulas",
    "GUST Font License (LPPL 1.3c)",
    "/fonts/NewCMMath-LICENSE.txt",
  ],
  ["Gentium Book Plus, the headings' font", "SIL OFL 1.1", "/fonts/GentiumBookPlus-OFL.txt"],
  ["Ysabeau Office, the text's font", "SIL OFL 1.1", "/fonts/YsabeauOffice-OFL.txt"],
  ["The JavaScript's packages", "notices", "/licenses/bundle.txt"],
  ["The Rust crates inside deduxit's modules", "notices", "/licenses/THIRD-PARTY-NOTICES.txt"],
  ["Rocq's logo, beside the Rocq export", "the Unlicense", "/licenses/rocq/LICENSE.txt"],
];

/** What the page is, its version, its licences and its privacy, in the About dialog. */
export function AboutPane(props: { prover: Prover }) {
  const [about] = createResource(() => props.prover.api.about());
  return (
    <div class="about">
      <Logo class="large" />
      <p class="dictionary-line">
        <Dictionary />
      </p>
      <Written name="texts/about" />
      <p class="sub">
        deduxit {about()?.deduxit ?? ""}, reading session documents up to level{" "}
        {about()?.level ?? ""}.
      </p>
      <p class="kw-label h">Licences</p>
      <ul class="licences">
        <For each={LICENCES}>
          {([what, licence, href]) => (
            <li>
              {what}: <a href={href}>{licence}</a>
            </li>
          )}
        </For>
      </ul>
      <p class="sub">
        The name deduxit and its mark identify this project, and may not be used to suggest its
        endorsement of anything else.
      </p>
      <p class="sub privacy">
        No cookies, no tracking. GitHub, which serves this site, logs every visitor's IP address for
        security: <a href="/privacy/">the privacy page</a> says what that means, and what your
        browser keeps.
      </p>
    </div>
  );
}

/**
 * The search's settings for one search: on the goal whose menu opened it, or after Unknown on the
 * search that said it, else on every open goal as Close all; the engine and the budget start from
 * Settings' values, the budget changing for this search alone. "Defaults" opens Settings.
 */
export function SearchPanel(props: { prover: Prover; ui: Ui }) {
  const { ui, setUi } = props.ui;
  const target = () => ui.searchFor?.goal ?? "all";
  const [budget, setBudget] = createSignal(
    String(ui.searchFor?.budget ?? props.prover.settings().budget),
  );
  const on = () => {
    const goal = target();
    if (goal === "all") return "Every open goal";
    const formulas =
      props.prover.current()?.view?.goals.find((g) => g.goal === goal)?.formulas ?? [];
    return `Goal ${goal + 1}: ${formulas.map(shown).join(", ")}`;
  };
  const search = () => {
    const units = Number(budget());
    const factor =
      (units > 0 ? units : props.prover.settings().budget) / props.prover.settings().budget;
    const goal = target();
    setUi({ menu: null, searchFor: null, goalMenu: null });
    if (goal === "all") void props.prover.closeAll(factor);
    else void props.prover.close(goal, factor);
  };
  return (
    <div class="cluster menu" role="dialog" aria-label="The search's settings">
      <p class="kw-label h">The search's settings</p>
      <p class="sub search-on">{on()}</p>
      <EngineChoice prover={props.prover} />
      <label class="lbl">
        <span>Budget, in units of work</span>
        <input
          class="field num"
          type="text"
          inputmode="numeric"
          autocomplete="off"
          value={budget()}
          onInput={(event) => setBudget(event.currentTarget.value.replace(/[^0-9]/g, ""))}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              search();
            }
          }}
        />
      </label>
      <p class="row">
        <button
          type="button"
          class="btn btn-primary"
          disabled={props.prover.busy() || !!props.prover.current()?.view?.complete}
          onClick={search}
        >
          Search
        </button>
        <button type="button" class="btn" onClick={() => setUi("menu", "settings")}>
          Defaults
        </button>
      </p>
    </div>
  );
}

/** Reads a file or a pasted text as the page opens it: a hand-in, a session, a sequent; what it opened or why not. */
export async function importText(
  prover: Prover,
  packs: ReturnType<typeof usePacks>,
  content: string,
  from: string,
): Promise<{ text: string; tone: "ok" | "bad" }> {
  // A hand-in file of the page before opens as its pack with its answers, beside the open tabs.
  if (isHandin(content) && packs) {
    const handin = readHandin(content);
    if ("problem" in handin)
      return { text: `Not imported: no hand-in this page reads (${handin.problem}).`, tone: "bad" };
    await packs.arrive(handin.pack, handin.answers);
    return { text: `Opened the hand-in's course pack with its answers${from}.`, tone: "ok" };
  }
  const outcome = await prover.open(content);
  return "kind" in outcome
    ? { text: `Imported a ${outcome.kind}${from}.`, tone: "ok" }
    : {
        text: `${outcome.problem.keyword}: not imported. ${outcome.problem.sentence}`,
        tone: "bad",
      };
}
