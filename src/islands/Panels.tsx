// deduxit © Fabian Lukas Grubmüller 2026
// Licensed under the EUPL

/**
 * The panels the tools open beside them: Steps, the search's settings, Export (a menu of the
 * formats, the link and the finished proof's λ-term, each copied or saved) and Import (a file, a
 * paste, or a drop anywhere under the top row); the Settings page; About.
 */

import { createResource, createSignal, For, Show } from "solid-js";
import { APART, engineLabel, engineName, engineTip } from "../lib/engines";
import {
  failure,
  type Failure,
  MATH_FONTS,
  type MathFont,
  type Outcome,
  type SessionDoc,
  type Termed,
} from "../lib/deduxit";
import { writeLink } from "../lib/link";
import { isHandin, readHandin } from "../lib/pack";
import {
  countermodelOf,
  isOrdinary,
  type OrdinaryOutcome,
  prettyOrdinary,
  stepsOf,
} from "../lib/ordinary";
import { actions, goalAt, paths, within } from "../lib/steps";
import { intuitionistic, parameterOf, suite } from "../lib/suites";
import { noTerm, notTaken, pretty, shown } from "../lib/words";
import type { Theme } from "../lib/theme";
import {
  DEFAULT_BUDGET,
  DEFAULT_CUT_STEPS,
  DEFAULT_INSTANCES,
  DEFAULT_TERMS,
  DEFAULT_WITNESS_DEPTH,
  exportFont,
  DEDUXIT_LOOK,
  lookJson,
  type NetLook,
  type Prover,
  pathKey,
  sameLook,
  TEXTBOOK_LOOK,
  viewJson,
} from "./state";
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

export function ExportMenu(props: {
  prover: Prover;
  ui: Ui;
  font: (name: MathFont) => Promise<Uint8Array>;
}) {
  const proof = () => props.prover.current();
  const [said, setSaid] = createSignal<string | null>(null);
  const net = () => props.ui.ui.tab === "net";
  const outcome = (): Outcome | undefined => {
    const p = proof();
    const o = p?.note?.outcome ?? p?.verdict?.outcome;
    return o?.verdict === "unprovable" ? o : undefined;
  };
  /** The ordinary outcome of the note or the verdict, where it is a "not valid" with a countermodel. */
  const refuted = (): OrdinaryOutcome | undefined => {
    const p = proof();
    const o: unknown = p?.note?.outcome ?? p?.verdict?.outcome;
    return countermodelOf(o) ? (o as OrdinaryOutcome) : undefined;
  };
  /**
   * The exports' settings. LaTeX and Typst are fragments to paste into a document unless `whole`
   * asks for a document of their own; a Rocq file always has its import, so that it compiles alone.
   */
  const exportSettings = (whole = false) =>
    JSON.stringify({
      limits: { work: props.prover.settings().budget },
      styles: {
        latex: { form: whole ? "standalone" : "fragment" },
        typst: { form: whole ? "standalone" : "fragment" },
        rocq: { form: "standalone" },
        svg: {
          ids: false,
          essential:
            proof()?.calculus.suite === "linear" &&
            intuitionistic(
              proof()?.calculus ?? { suite: "linear", method: "sequent", mode: "classical" },
            ),
          net: props.prover.settings().net,
          net_look: lookJson(props.prover.settings().netLook),
          font: exportFont(props.prover.settings()),
        },
      },
      ...viewJson(props.prover.settings(), proof()?.calculus),
    });
  const name = () => "deduxit-proof";
  /** The proof's ordinary session, where it is one: its exports are the ordinary calls'. */
  const ordinarySession = () => {
    const s = proof()?.session;
    return s && isOrdinary(s) ? s : undefined;
  };

  async function run(what: () => Promise<void>) {
    setSaid(null);
    try {
      await what();
    } catch (thrown) {
      setSaid(failure(thrown instanceof Error ? thrown.message : thrown).message);
    }
  }

  const session = () => proof()?.session as SessionDoc;
  /** A text export of the proof, a whole document where asked: the ordinary calls' for an ordinary session. */
  const exported = (format: string, whole = false) => {
    const o = ordinarySession();
    return o
      ? props.prover.api.ordinary.exportAs(o, format, exportSettings(whole))
      : props.prover.api.exportAs(session(), format, exportSettings(whole));
  };
  const drawing = () =>
    net() && !ordinarySession()
      ? props.prover.api.drawNet(session(), exportSettings())
      : exported("svg");

  async function rendered(format: "png" | "pdf") {
    const now = new Date();
    const settings = JSON.stringify({
      limits: { work: props.prover.settings().budget },
      styles: {
        pdf: {
          date: {
            year: now.getUTCFullYear(),
            month: now.getUTCMonth() + 1,
            day: now.getUTCDate(),
            hour: now.getUTCHours(),
            minute: now.getUTCMinutes(),
            second: now.getUTCSeconds(),
          },
        },
      },
    });
    const bytes = await props.prover.api.render(
      await drawing(),
      format,
      await props.font(exportFont(props.prover.settings())),
      settings,
    );
    download(
      `${name()}.${format}`,
      bytes as BlobPart,
      format === "png" ? "image/png" : "application/pdf",
    );
  }

  const text =
    (format: string, extension: string, type: string, whole = false) =>
    async () => {
      download(`${name()}.${extension}`, await exported(format, whole), type);
    };

  const complete = () => proof()?.view?.complete === true;

  const items: {
    label: string;
    detail: string;
    act: () => Promise<void>;
    off?: () => string | null;
    /** A second form of the item above it, drawn indented under it. */
    sub?: boolean;
    /** Where the item cannot apply at all: a refuted goal's certificate on a finished proof. */
    hidden?: () => boolean;
  }[] = [
    {
      label: "SVG",
      detail: "The drawing, as a vector image",
      act: async () => download(`${name()}.svg`, await drawing(), "image/svg+xml"),
    },
    { label: "PNG", detail: "The drawing, as an image", act: () => rendered("png") },
    { label: "PDF", detail: "The drawing, as a PDF/A document", act: () => rendered("pdf") },
    {
      label: "LaTeX",
      detail: "The derivation, to paste into a LaTeX document that loads ebproof, cmll and amssymb",
      act: text("latex", "tex", "text/x-tex"),
    },
    {
      label: "Whole document",
      detail:
        "A LaTeX file that compiles alone, cropped to the derivation. It needs ebproof, cmll and amssymb installed",
      act: text("latex", "tex", "text/x-tex", true),
      sub: true,
    },
    {
      label: "Typst",
      detail:
        "The derivation, to paste into a Typst document. It uses the package curryst, or plain Typst when the derivation is tall",
      act: text("typst", "typ", "text/plain"),
    },
    {
      label: "Whole document",
      detail:
        "A Typst file that compiles alone, on a page the size of the derivation. Typst downloads curryst itself",
      act: text("typst", "typ", "text/plain", true),
      sub: true,
    },
    {
      label: "Text",
      detail: "The derivation as plain text",
      act: text("text", "txt", "text/plain"),
    },
    {
      label: "Session",
      detail: "The proof as deduxit's session document (JSON), to import again",
      act: async () =>
        download(
          `${name()}.json`,
          JSON.stringify(proof()?.session ?? null, null, 2),
          "application/json",
        ),
    },
    {
      label: "Rocq",
      get detail() {
        return ordinarySession()
          ? "A Rocq file that checks the finished proof over Prop. It needs no library"
          : "A Rocq file that checks the finished proof, its import first. It needs NanoYalla for classical linear logic without Mix, weakening, cuts or quantifiers, and rocq-deduxit for the rest";
      },
      act: text("rocq", "v", "text/plain"),
      off: () => (complete() ? null : "The certificate is of a finished proof"),
    },
    {
      label: "Not derivable",
      detail:
        "A Rocq file that checks that a refuted goal has no proof, its import first. It needs rocq-deduxit",
      act: async () =>
        download(
          `${name()}-refutation.v`,
          await props.prover.api.certificate(outcome() as Outcome, exportSettings()),
          "text/plain",
        ),
      // An ordinary goal's certificate of non-validity is its countermodel's, the item below.
      hidden: () => complete() || ordinarySession() !== undefined,
      off: () => {
        const kind = outcome()?.refutation?.kind;
        if (!outcome()) return "Close a goal the search refutes first";
        if (kind === "saturated")
          return "A refutation by saturation has no Rocq certificate: deduxit's own checker verified its set";
        if (!kind || kind === "exhausted") return "An exhausted search leaves no certificate";
        return null;
      },
    },
    {
      label: "Countermodel",
      get detail() {
        return refuted()?.logic === "classical"
          ? "A Rocq file that checks, from the countermodel's one world, that the goal is not valid. It needs no library"
          : "A Rocq file that checks, from the countermodel, that the goal has no derivation, its import first. It needs rocq-deduxit";
      },
      act: async () =>
        download(
          `${name()}-countermodel.v`,
          await props.prover.api.ordinary.modelCertificate(
            refuted() as OrdinaryOutcome,
            exportSettings(),
          ),
          "text/plain",
        ),
      hidden: () => complete() || ordinarySession() === undefined,
      off: () => (refuted() ? null : "Close a goal that is not valid first"),
    },
  ];

  // The finished proof's λ-term by its suite's call, keyed on the session document, which every
  // step replaces: a changed proof is read again.
  const [term] = createResource(
    () => (complete() ? proof()?.session : undefined),
    (session): Promise<Termed> =>
      props.prover.api
        .term(suite(isOrdinary(session) ? "ordinary" : "linear").term ?? "term", session, "")
        .catch((thrown: unknown) => ({
          error: failure(thrown instanceof Error ? thrown.message : thrown),
        })),
  );
  /** The term's judgement while the term read is the current proof's. */
  const judgement = () => {
    const t = term();
    return complete() && !term.loading && t && !("error" in t) ? t.judgement : undefined;
  };
  /** Why the item copies nothing: an unfinished proof, a proof without a term, a term being read. */
  const noJudgement = () => {
    const t = term();
    if (!complete()) return "A finished proof has a λ-term";
    if (term.loading || !t) return "Reading the λ-term…";
    return "error" in t ? `No λ-term: ${noTerm(t.error)}.` : null;
  };
  /** The judgement last copied: the status says so only while it is the one shown. */
  const [copiedTerm, setCopiedTerm] = createSignal<string | null>(null);
  async function copyTerm() {
    const text = judgement();
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedTerm(text);
    } catch {
      setSaid("The browser keeps the clipboard closed: select the term to copy it.");
    }
  }

  /** Copies a link to the proof as it stands, or with `bare` to its sequent alone, no step taken. */
  async function copyLink(bare = false) {
    const p = proof();
    if (!p?.session) return;
    const written = await writeLink(
      p.calculus.suite === "ordinary" ? prettyOrdinary(p.input) : pretty(p.input),
      p.calculus.suite,
      parameterOf(p.calculus),
      bare ? undefined : JSON.stringify(p.session),
    );
    const url = `${location.origin}${location.pathname}${written.hash}`;
    try {
      await navigator.clipboard.writeText(url);
      setSaid(
        bare
          ? "Link copied: it opens the sequent with no step taken."
          : written.whole
            ? "Link copied: it holds the proof as it stands."
            : "Link copied, with the sequent alone: the proof is too long for a link, so export the session file to keep it.",
      );
    } catch {
      setSaid(`Copy this link: ${url}`);
    }
  }

  return (
    <div class="cluster menu export" role="menu" aria-label="Export">
      <p class="kw-label h">Export {net() && !ordinarySession() ? "the net" : "the derivation"}</p>
      <ul class="mlist" role="none">
        <For each={items.filter((item) => !item.hidden?.())}>
          {(item) => (
            <li role="none">
              <button
                type="button"
                role="menuitem"
                class={item.sub ? "mi sub" : "mi"}
                aria-disabled={item.off?.() ? "true" : undefined}
                onClick={() => {
                  if (!item.off?.()) void run(item.act);
                }}
              >
                <span class="fmt">{item.label}</span>
                <span class="fn">
                  {item.detail}
                  {/* Why the item is off, in view: a tip follows no touch. */}
                  <Show when={item.off?.()}>{(why) => <span class="off">{why()}.</span>}</Show>
                </span>
              </button>
            </li>
          )}
        </For>
        <li class="msep" aria-hidden="true" />
        <li role="none">
          <fieldset class="font-choice">
            <legend class="kw-label h">Font of SVG, PNG and PDF</legend>
            <div class="mlist fonts">
              <For each={MATH_FONTS}>
                {(font) => (
                  <button
                    type="button"
                    role="menuitemradio"
                    class="mi"
                    aria-checked={exportFont(props.prover.settings()) === font.key}
                    data-tip={font.look}
                    // The stage's font again follows the stage.
                    onClick={() =>
                      props.prover.setSettings({
                        font: font.key === props.prover.settings().stageFont ? null : font.key,
                      })
                    }
                  >
                    <span class="fmt">{font.name}</span>
                  </button>
                )}
              </For>
            </div>
          </fieldset>
        </li>
        <li class="msep" aria-hidden="true" />
        <li role="none">
          <fieldset class="share">
            <legend class="kw-label h">Share a link</legend>
            <ul class="mlist" role="none">
              <li role="none">
                <button
                  type="button"
                  role="menuitem"
                  class="mi"
                  onClick={() => void run(() => copyLink())}
                >
                  <span class="fmt">This proof</span>
                  <span class="fn">A link to this proof as it stands</span>
                </button>
              </li>
              <li role="none">
                <button
                  type="button"
                  role="menuitem"
                  class="mi"
                  onClick={() => void run(() => copyLink(true))}
                >
                  <span class="fmt">The sequent</span>
                  <span class="fn">
                    A link to the sequent alone, with no step taken: an exercise to send
                  </span>
                </button>
              </li>
              <li role="none">
                <button
                  type="button"
                  role="menuitem"
                  class="mi"
                  onClick={() => props.ui.setUi("menu", "pack")}
                >
                  <span class="fmt">Course pack</span>
                  <span class="fn">
                    The open tabs' problems as one link for students, who hand their answers back
                  </span>
                </button>
              </li>
            </ul>
          </fieldset>
        </li>
        <li class="msep" aria-hidden="true" />
        <li role="none">
          <button
            type="button"
            role="menuitem"
            class="mi term"
            aria-disabled={noJudgement() ? "true" : undefined}
            data-tip={noJudgement() ? undefined : "Copy the proof's program, its λ-term, as text"}
            onClick={() => void run(copyTerm)}
          >
            <span class="fmt">λ-term</span>
            <span class={judgement() ? "fn judgement" : "fn"}>{judgement() ?? noJudgement()}</span>
          </button>
        </li>
      </ul>
      <Show when={said()}>
        <p class="said" role="status">
          {said()}
        </p>
      </Show>
      <Show when={copiedTerm() !== null && copiedTerm() === judgement()}>
        <p class="said" role="status">
          λ-term copied as text.
        </p>
      </Show>
    </div>
  );
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

/** What an invertible rule is and why applying one never loses a proof: the switch's tip. */
export const INVERTIBLE_TIP =
  "An invertible rule never loses a proof: when its goal has a proof, so do its premises. ⅋, ⊥, & and ⊤ are always invertible; ! is when every other formula is under ?; 1, ⊗ and the axiom are when their formulas are the whole goal. In LK every rule of a connective is; in LJ all but →L, ¬L and the two ∨R.";

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
    <div class="lbl">
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

/**
 * The Settings page, in the stage's place: one column of rows. Look (the scheme, the net's
 * drawing, the formulas' font), Search, Proving, Keys, This browser and About.
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
  return (
    <section class="settings-page" aria-labelledby="settings-title">
      <h1 id="settings-title">Settings</h1>
      <div class="form">
        <h2>Search</h2>
        <label class="lbl col">
          <span>Budget</span>
          <input
            class="num-in"
            type="number"
            min="1"
            step="1"
            value={props.prover.settings().budget}
            onChange={(event) => {
              const value = Math.floor(Number(event.currentTarget.value));
              props.prover.setSettings({ budget: value > 0 ? value : DEFAULT_BUDGET });
            }}
          />
        </label>
        <p class="sub">
          Units of work a search may do.{" "}
          {Math.round(props.prover.settings().budget / 68e6) >= 1
            ? `About ${Math.round(props.prover.settings().budget / 68e6)} second${props.prover.settings().budget >= 1.36e8 ? "s" : ""} here.`
            : "Less than a second here."}
        </p>
        <label class="lbl col">
          <span>Elimination steps</span>
          <input
            class="num-in"
            type="number"
            min="1"
            step="1"
            value={props.prover.settings().cutSteps}
            onChange={(event) => {
              const value = Math.floor(Number(event.currentTarget.value));
              props.prover.setSettings({ cutSteps: value > 0 ? value : DEFAULT_CUT_STEPS });
            }}
          />
        </label>
        <p class="sub">"To the end" stops after this many steps of cut elimination.</p>
        <p class="kw-label">First-order search</p>
        <label class="lbl col">
          <span>Witness depth</span>
          <input
            class="num-in"
            type="number"
            min="1"
            step="1"
            value={props.prover.settings().witnessDepth}
            onChange={(event) => {
              const value = Math.floor(Number(event.currentTarget.value));
              props.prover.setSettings({
                witnessDepth: value > 0 ? value : DEFAULT_WITNESS_DEPTH,
              });
            }}
          />
        </label>
        <p class="sub">How deeply a search nests the terms it tries for ∃R and ∀L.</p>
        <label class="lbl col">
          <span>Instances</span>
          <input
            class="num-in"
            type="number"
            min="1"
            step="1"
            value={props.prover.settings().instances}
            onChange={(event) => {
              const value = Math.floor(Number(event.currentTarget.value));
              props.prover.setSettings({ instances: value > 0 ? value : DEFAULT_INSTANCES });
            }}
          />
        </label>
        <p class="sub">The most instances of quantified formulas a search holds at once.</p>
        <label class="lbl col">
          <span>Terms</span>
          <input
            class="num-in"
            type="number"
            min="1"
            step="1"
            value={props.prover.settings().terms}
            onChange={(event) => {
              const value = Math.floor(Number(event.currentTarget.value));
              props.prover.setSettings({ terms: value > 0 ? value : DEFAULT_TERMS });
            }}
          />
        </label>
        <p class="sub">The most terms a proof's witnesses and eigenvariables may hold.</p>
        <EngineChoice prover={props.prover} />
        <h2>Proving</h2>
        <label class="sw" data-tip={INVERTIBLE_TIP}>
          <input
            type="checkbox"
            checked={props.prover.settings().invertible}
            aria-describedby="invertible-sub"
            onChange={(event) => void props.prover.setInvertible(event.currentTarget.checked)}
          />
          <span class="sw-t" aria-hidden="true" />
          Apply invertible rules by themselves
        </label>
        <p class="sub" id="invertible-sub">
          The page takes them after each of your steps, and undo takes them back with it.
        </p>
        <Show
          when={
            props.prover.settings().invertible &&
            !props.prover.invertibleOn(props.prover.current()?.id)
          }
        >
          <p class="sub">This pack asks for every step by hand.</p>
        </Show>
        <label class="sw">
          <input
            type="checkbox"
            checked={props.prover.settings().marking}
            aria-describedby="marking-sub"
            onChange={(event) => props.prover.setSettings({ marking: event.currentTarget.checked })}
          />
          <span class="sw-t" aria-hidden="true" />
          Mark goals that have no proof
        </label>
        <p class="sub" id="marking-sub">
          After each step a short search asks whether each new goal has a proof. A goal with none
          gets a red line and a cross, and its ⊢ offers Go back.
        </p>
        <h2>Look</h2>
        <fieldset class="lbl col">
          <legend>Theme</legend>
          <fieldset class="seg" aria-label="Theme">
            <For each={["system", "light", "dark"] as const}>
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
        </fieldset>
        <fieldset class="lbl col">
          <legend>Net drawing</legend>
          <fieldset class="seg" aria-label="Net drawing">
            <For each={["formulas", "compact"] as const}>
              {(net) => (
                <button
                  type="button"
                  class="seg-b"
                  aria-pressed={props.prover.settings().net === net}
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
          <LookRow
            prover={props.prover}
            label="Look"
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
          <p class="sub">
            Textbook draws every edge plain, every conclusion at the bottom and a ? as the nodes of
            its rules: ?d, ?c and ?w.
          </p>
        </fieldset>
        <fieldset class="lbl col">
          <legend>Font of the formulas</legend>
          <div class="choices" role="radiogroup" aria-label="Font of the formulas">
            <For each={MATH_FONTS}>
              {(font) => (
                <label class="seg-b" data-tip={font.look}>
                  <input
                    type="radio"
                    name="stage-font"
                    checked={props.prover.settings().stageFont === font.key}
                    onChange={() => props.prover.setSettings({ stageFont: font.key })}
                  />
                  <span>{font.name}</span>
                  <span class="why" />
                </label>
              )}
            </For>
          </div>
          <p class="sub">
            The drawing, its formulas and the exports, unless Export chooses another.
          </p>
        </fieldset>
        <h2>Keys</h2>
        <label class="sw">
          <input
            type="checkbox"
            checked={props.prover.settings().singleKeys}
            aria-describedby="single-keys-sub"
            onChange={(event) =>
              props.prover.setSettings({ singleKeys: event.currentTarget.checked })
            }
          />
          <span class="sw-t" aria-hidden="true" />
          Single keys
        </label>
        <p class="sub" id="single-keys-sub">
          Off, only the keys with Ctrl or Cmd, Tab, Enter, Space, the arrows and Escape act: speech
          input types letters.
        </p>
        <p class="row">
          <button type="button" class="btn" onClick={() => setUi("menu", "keys")}>
            The list of keys
          </button>
        </p>
        <h2>This browser</h2>
        <p class="sub">
          The open sequents are kept in this browser and come back on the next visit.
        </p>
        <p class="row">
          <button type="button" class="btn" onClick={() => props.closeEvery()}>
            Close every sequent
          </button>
        </p>
        <h2>About</h2>
        <p class="row">
          <button type="button" class="btn" onClick={() => setUi("menu", "about")}>
            About deduxit and its licences
          </button>
          <a class="btn" href="/privacy/">
            Privacy
          </a>
        </p>
      </div>
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
  ["The JavaScript's packages, Lucide's icons among them", "notices", "/licenses/bundle.txt"],
  ["The Rust crates inside deduxit's modules", "notices", "/licenses/THIRD-PARTY-NOTICES.txt"],
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
  // A hand-in file opens in the check view, the open tabs left as they are.
  if (isHandin(content) && packs) {
    const handin = readHandin(content);
    if ("problem" in handin)
      return { text: `Not imported: no hand-in this page reads (${handin.problem}).`, tone: "bad" };
    await packs.check(handin);
    return { text: `Imported the hand-in${from}.`, tone: "ok" };
  }
  const outcome = await prover.open(content);
  return "kind" in outcome
    ? { text: `Imported a ${outcome.kind}${from}.`, tone: "ok" }
    : {
        text: `${outcome.problem.keyword}: not imported. ${outcome.problem.sentence}`,
        tone: "bad",
      };
}
