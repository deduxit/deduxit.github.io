// deduxit © Fabian Lukas Grubmüller 2026
// Licensed under the EUPL

/**
 * The Export panel (board D16): at its left the entries under "Picture", "Text", "Proof" and
 * "Link", each with its sign; at its right the chosen entry's settings, what a text format
 * writes, and "Copy" and "Save". Every setting is one of deduxit's `--style` options, kept with
 * the page's settings. The entry "Course pack" has the pack's form in that place (`PackForm`).
 * In a compact window the entries wrap in rows above the rest.
 *
 * Each view writes through its own suite's calls: a derivation of linear or ordinary logic
 * through `export_as` and `ordinary_export`, natural deduction through `rules_export` (its tree
 * or its Fitch lines, as shown), a modal decision through `modal_export` and `modal_draw`, a
 * lambda-term's typing through `lambda_export` and `lambda_draw`.
 */

import { createResource, createSignal, For, type JSX, Show } from "solid-js";
import type { CustomSession } from "../lib/custom";
import { failure, MATH_FONTS, type Outcome, type SessionDoc } from "../lib/deduxit";
import { writeLink } from "../lib/link";
import { type ModalOutcome, prettyModal } from "../lib/modal";
import { countermodelOf, isOrdinary, type OrdinaryOutcome, prettyOrdinary } from "../lib/ordinary";
import { intuitionistic, isNatural, markOf, parameterOf } from "../lib/suites";
import { pretty } from "../lib/words";
import { PackForm } from "./Packs";
import { layout, naturalSession } from "./Natural";
import { download } from "./Panels";
import { RocqLogo, Sign, type SignName } from "./Signs";
import { type ExportLook, exportFont, lookJson, type Prover, SCALES, viewJson } from "./state";
import type { Ui } from "./ui";

/** An entry of the panel. */
type Entry =
  | "svg"
  | "png"
  | "pdf"
  | "latex"
  | "typst"
  | "text"
  | "session"
  | "rocq"
  | "proof-link"
  | "sequent-link"
  | "pack";

/** The entries by their group, each with its name. */
const GROUPS: readonly (readonly [string, readonly (readonly [Entry, string])[]])[] = [
  [
    "Picture",
    [
      ["svg", "SVG"],
      ["png", "PNG"],
      ["pdf", "PDF"],
    ],
  ],
  [
    "Text",
    [
      ["latex", "LaTeX"],
      ["typst", "Typst"],
      ["text", "Text"],
    ],
  ],
  [
    "Proof",
    [
      ["session", "Session"],
      ["rocq", "Rocq"],
    ],
  ],
  [
    "Link",
    [
      ["proof-link", "This proof"],
      ["sequent-link", "The sequent"],
      ["pack", "Course pack"],
    ],
  ],
];

/** Each file's extension and type. */
const FILES: Partial<Record<Entry, readonly [string, string]>> = {
  svg: ["svg", "image/svg+xml"],
  png: ["png", "image/png"],
  pdf: ["pdf", "application/pdf"],
  latex: ["tex", "text/x-tex"],
  typst: ["typ", "text/plain"],
  text: ["txt", "text/plain"],
  session: ["json", "application/json"],
  rocq: ["v", "text/plain"],
};

/** The settings each entry has, in the order the panel shows them. */
type Setting = "font" | "background" | "scale" | "labels" | "whole" | "bar" | "lemma";
const HAS: Partial<Record<Entry, readonly Setting[]>> = {
  svg: ["font", "background", "labels"],
  png: ["font", "background", "scale", "labels"],
  pdf: ["font", "labels"],
  latex: ["whole", "labels"],
  typst: ["whole", "labels"],
  text: ["bar", "labels"],
  rocq: ["lemma"],
};

/** The entries that write text, shown in the panel before they are copied or saved. */
const TEXTS: ReadonlySet<Entry> = new Set(["latex", "typst", "text", "session", "rocq"]);

/** The entry chosen, kept for the visit as the panel opens and closes. */
const [chosen, setChosen] = createSignal<Entry>("latex");

/** A Rocq lemma's name as Rocq reads one: a letter or `_` first, then letters, digits, `_` and `'`. */
const ROCQ_NAME = /^[A-Za-z_][A-Za-z0-9_']*$/;

/** Rocq's keywords, which deduxit refuses as a lemma's name (its `rocq::KEYWORDS`). */
const ROCQ_KEYWORDS: ReadonlySet<string> = new Set([
  "_",
  "Axiom",
  "CoFixpoint",
  "Definition",
  "Fixpoint",
  "Hypothesis",
  "IF",
  "Lemma",
  "Parameter",
  "Proof",
  "Prop",
  "Qed",
  "SProp",
  "Set",
  "Theorem",
  "Type",
  "Variable",
  "as",
  "at",
  "by",
  "cofix",
  "discriminated",
  "else",
  "end",
  "exists",
  "exists2",
  "fix",
  "for",
  "forall",
  "fun",
  "if",
  "in",
  "lazymatch",
  "let",
  "match",
  "multimatch",
  "return",
  "then",
  "using",
  "where",
  "with",
]);

/** Whether Rocq reads a text as a lemma's name: its form, and no keyword. */
const rocqName = (name: string) => ROCQ_NAME.test(name) && !ROCQ_KEYWORDS.has(name);

export function ExportPanel(props: {
  prover: Prover;
  ui: Ui;
  font: (name: (typeof MATH_FONTS)[number]["key"]) => Promise<Uint8Array>;
}) {
  const proof = () => props.prover.current();
  const look = () => props.prover.settings().exports;
  const setLook = (change: Partial<ExportLook>) =>
    props.prover.setSettings({ exports: { ...look(), ...change } });
  const ordinarySession = () => {
    const s = proof()?.session;
    return s && isOrdinary(s) ? s : undefined;
  };
  /** Whether the view shown is a linear proof's net, which the pictures draw. */
  const net = () => props.ui.ui.tab === "net" && !ordinarySession();
  /** What the view shown is a proof in: a sequent calculus, natural deduction, modal logic, lambda-terms. */
  const kind = (): "sequent" | "natural" | "modal" | "lambda" => {
    const p = proof();
    if (p?.calculus.suite === "modal") return "modal";
    if (p?.calculus.suite === "lambda") return "lambda";
    if (p && isNatural(p.calculus) && props.ui.ui.tab === "tree") return "natural";
    return "sequent";
  };
  /** What the entries write from: the session, natural deduction's, the modal outcome, the typing. */
  const subject = (): unknown => {
    const p = proof();
    if (!p) return undefined;
    switch (kind()) {
      case "natural":
        return naturalSession(p);
      case "modal":
        return p.modal?.outcome ?? undefined;
      case "lambda":
        return p.lambda?.typing ?? undefined;
      default:
        return p.session ?? undefined;
    }
  };
  const complete = () => proof()?.view?.complete === true;
  /** A linear goal's refutation the search found, for its certificate. */
  const refutation = (): Outcome | undefined => {
    const p = proof();
    const o = p?.note?.outcome ?? p?.verdict?.outcome;
    return o?.verdict === "unprovable" ? o : undefined;
  };
  /** An ordinary goal's countermodel, for its certificate. */
  const countermodel = (): OrdinaryOutcome | undefined => {
    const p = proof();
    const o: unknown = p?.note?.outcome ?? p?.verdict?.outcome;
    return countermodelOf(o) ? (o as OrdinaryOutcome) : undefined;
  };
  /** The Rocq file this proof gives: of the finished proof, or that a refuted goal has none. */
  const rocqKind = (): "proof" | "refutation" | "countermodel" | null => {
    if (complete()) return "proof";
    if (ordinarySession()) return countermodel() ? "countermodel" : null;
    const kind = refutation()?.refutation?.kind;
    return kind && kind !== "saturated" && kind !== "exhausted" ? "refutation" : null;
  };

  /** Why an entry has nothing to give for the view shown, or null. */
  const off = (entry: Entry): string | null => {
    const own = kind() === "sequent" ? undefined : offOther(entry);
    if (own !== undefined) return own;
    if (net() && (entry === "latex" || entry === "typst" || entry === "text"))
      return "A net is a picture. Choose SVG, PNG or PDF, or show the proof to export its derivation as text.";
    if (entry === "rocq" && !rocqKind()) {
      const kind = refutation()?.refutation?.kind;
      if (!ordinarySession() && kind === "saturated")
        return "A refutation by saturation has no Rocq certificate: deduxit's own checker verified its set.";
      if (!ordinarySession() && kind === "exhausted")
        return "An exhausted search leaves no certificate. Finish the proof, or let another engine refute the goal.";
      return ordinarySession()
        ? "Rocq needs a finished proof, or a goal the search showed not valid. Finish the proof, or close such a goal."
        : "Rocq needs a finished proof, or a goal the search refuted. Finish the proof first.";
    }
    return null;
  };

  /**
   * Why an entry has nothing to give for natural deduction, a modal decision or a lambda-term, or
   * null; undefined for an entry these views share with every proof (the links, the pack).
   */
  const offOther = (entry: Entry): string | null | undefined => {
    if (entry.endsWith("-link") || entry === "pack") return undefined;
    const k = kind();
    if (k === "lambda" && proof()?.lambda?.untyped)
      return "An untyped term has no typing derivation to write. Copy its link instead.";
    if (entry === "text" || entry === "session" || entry === "rocq")
      return k === "natural"
        ? "deduxit writes natural deduction as LaTeX, Typst or a picture."
        : k === "modal"
          ? "deduxit writes a modal decision as LaTeX, Typst or a picture."
          : "deduxit writes a term's typing as LaTeX, Typst or a picture.";
    const p = proof();
    if (k === "modal") {
      const outcome = p?.modal?.outcome;
      if (!outcome) return "The sequent is not decided yet. Enter it first.";
      // modal_draw draws a derivation or a countermodel; an outcome with neither has no picture.
      if (!outcome.derivation && !outcome.countermodel)
        return "deduxit found neither a derivation nor a countermodel, so there is nothing to draw.";
      if ((entry === "latex" || entry === "typst") && !outcome.derivation)
        return "Only a valid sequent has a derivation to write. Save its countermodel as a picture.";
    }
    if (k === "lambda" && !p?.lambda?.typing)
      return "Export writes a well-typed term's typing derivation. Enter such a term first.";
    return null;
  };

  /** The settings as deduxit reads them, each export setting one of its `--style` options. */
  const settings = () => {
    const s = props.prover.settings();
    const l = look();
    const form = l.whole ? "standalone" : "fragment";
    const now = new Date();
    return JSON.stringify({
      limits: { work: s.budget },
      styles: {
        latex: { form, labels: l.labels },
        typst: { form, labels: l.labels },
        text: { labels: l.labels, bar: l.bar },
        // A name Rocq does not read would refuse every format's settings: deduxit's stands in.
        rocq: { form: "standalone", ...(rocqName(l.lemma) ? { lemma: l.lemma } : {}) },
        svg: {
          ids: false,
          labels: l.labels,
          ...(l.background === "white" ? { background: "white" } : {}),
          essential:
            proof()?.calculus.suite === "linear" &&
            intuitionistic(
              proof()?.calculus ?? { suite: "linear", method: "sequent", mode: "classical" },
            ),
          net: s.net,
          net_look: lookJson(s.netLook),
          font: exportFont(s),
        },
        png: { scale: l.scale },
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
      ...view(),
    });
  };
  /** The view's settings: the stage's, and natural deduction's tree or Fitch lines as shown. */
  const view = () => {
    const shown = viewJson(props.prover.settings(), proof()?.calculus);
    return kind() === "natural" ? { view: { ...shown.view, layout: layout() } } : shown;
  };

  const session = () => proof()?.session as SessionDoc;
  /** A text the proof is written as: deduxit's export, or the session itself. */
  async function written(entry: Entry, json: string): Promise<string> {
    if (entry === "session") return JSON.stringify(proof()?.session ?? null, null, 2);
    if (entry === "rocq") {
      const kind = rocqKind();
      if (kind === "refutation") return props.prover.api.certificate(refutation() as Outcome, json);
      if (kind === "countermodel")
        return props.prover.api.ordinary.modelCertificate(countermodel() as OrdinaryOutcome, json);
    }
    const api = props.prover.api;
    switch (kind()) {
      case "natural":
        return api.custom.exportAs(subject() as CustomSession, entry, json);
      case "modal":
        return api.modal.exportAs(subject() as ModalOutcome, entry, json);
      case "lambda":
        return api.lambda.exportAs(subject() as string, entry, json);
    }
    const o = ordinarySession();
    return o ? api.ordinary.exportAs(o, entry, json) : api.exportAs(session(), entry, json);
  }
  /** The drawing the pictures are made from: the net shown, or the derivation (or countermodel). */
  const drawing = (json: string) => {
    const api = props.prover.api;
    if (kind() === "modal") return api.modal.draw(subject() as ModalOutcome, json);
    if (kind() === "lambda") return api.lambda.draw(subject() as string, json);
    return net() ? api.drawNet(session(), json) : written("svg", json);
  };

  // What a text entry writes, read again whenever the proof, the entry or a setting changes.
  const [text] = createResource(
    () => {
      const entry = chosen();
      if (!TEXTS.has(entry) || off(entry) || !subject()) return undefined;
      if (entry === "rocq" && !rocqName(look().lemma)) return undefined;
      return { entry, json: settings(), subject: subject() };
    },
    ({ entry, json }) =>
      written(entry, json)
        .then((value) => ({ value }))
        .catch((thrown: unknown) => ({
          error: failure(thrown instanceof Error ? thrown.message : thrown).message,
        })),
  );

  /** The link an entry of "Link" copies: the proof as it stands, or its sequent alone. */
  const [link] = createResource(
    () => {
      const entry = chosen();
      const p = proof();
      if (entry !== "proof-link" && entry !== "sequent-link") return undefined;
      // A modal or lambda tab's link holds its sequent or term alone, decided again on arrival.
      const decided = p?.calculus.suite === "modal" || p?.calculus.suite === "lambda";
      if (!p || !(decided ? (p.modal?.outcome ?? p.lambda?.statement) : p.session))
        return undefined;
      return { bare: entry === "sequent-link" || decided, p, session: p.session };
    },
    async ({ bare, p }) => {
      const suite = p.calculus.suite;
      const made = await writeLink(
        suite === "ordinary"
          ? prettyOrdinary(p.input)
          : suite === "modal"
            ? prettyModal(p.input)
            : suite === "lambda"
              ? p.input
              : pretty(p.input),
        suite,
        parameterOf(p.calculus),
        bare ? undefined : JSON.stringify(p.session),
      );
      return { url: `${location.origin}${location.pathname}${made.hash}`, whole: made.whole };
    },
  );

  /** Says what was done in the notes over the bottom box, and to a screen reader. */
  const say = (words: string) => props.ui.setUi({ notice: { text: words }, live: words });
  const name = () => FILES[chosen()]?.[0] ?? "";
  const fileName = () =>
    chosen() === "rocq" && rocqKind() === "refutation"
      ? "deduxit-refutation.v"
      : chosen() === "rocq" && rocqKind() === "countermodel"
        ? "deduxit-countermodel.v"
        : `deduxit-${stem()}.${name()}`;
  /** What a file holds, for its name. */
  const stem = () =>
    net()
      ? "net"
      : kind() === "lambda"
        ? "typing"
        : kind() === "modal" && proof()?.modal?.outcome?.countermodel
          ? "countermodel"
          : kind() === "natural"
            ? "natural-deduction"
            : "proof";
  const label = (entry: Entry) =>
    GROUPS.flatMap(([, entries]) => entries).find(([e]) => e === entry)?.[1] ?? entry;

  async function copy() {
    const entry = chosen();
    const value = entry === "proof-link" || entry === "sequent-link" ? link()?.url : textValue();
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      say(
        entry === "proof-link"
          ? link()?.whole === false
            ? "Link copied, with the sequent alone: the proof is too long for a link. Save the session to keep it."
            : "Link to this proof copied."
          : entry === "sequent-link"
            ? "Link to the sequent copied."
            : `${label(entry)} copied.`,
      );
    } catch {
      say("The browser keeps the clipboard closed: select the text to copy it.");
    }
  }

  async function save() {
    const entry = chosen();
    const file = FILES[entry];
    if (!file) return;
    try {
      const json = settings();
      if (entry === "png" || entry === "pdf") {
        const bytes = await props.prover.api.render(
          await drawing(json),
          entry,
          await props.font(exportFont(props.prover.settings())),
          json,
        );
        download(fileName(), bytes as BlobPart, file[1]);
      } else if (entry === "svg") download(fileName(), await drawing(json), file[1]);
      else {
        const value = textValue() ?? (await written(entry, json));
        download(fileName(), value, file[1]);
      }
      say(`Saved ${fileName()}.`);
    } catch (thrown) {
      say(`Not saved: ${failure(thrown instanceof Error ? thrown.message : thrown).message}`);
    }
  }

  const textValue = () => {
    const t = text();
    return t && "value" in t && !text.loading ? t.value : undefined;
  };

  /** A row of the settings: its label and its control. */
  const Row = (row: { label: string; children: JSX.Element }) => (
    <div class="ex-row">
      <span class="ex-label">{row.label}</span>
      {row.children}
    </div>
  );
  /** A choice of one value among a few, as a toggle's box. */
  const Choice = <T extends string | number>(c: {
    label: string;
    options: readonly (readonly [T, string])[];
    value: T;
    pick: (value: T) => void;
  }) => (
    <Row label={c.label}>
      <fieldset class="seg" aria-label={c.label}>
        <For each={c.options}>
          {([value, words]) => (
            <button
              type="button"
              class="seg-b"
              aria-pressed={c.value === value}
              onClick={() => c.pick(value)}
            >
              {words}
            </button>
          )}
        </For>
      </fieldset>
    </Row>
  );

  const control = (setting: Setting) => {
    switch (setting) {
      case "font":
        return (
          <Row label="Font">
            <select
              class="field"
              aria-label="Font"
              value={exportFont(props.prover.settings())}
              onChange={(event) => {
                const key = event.currentTarget.value;
                // The stage's font again follows the stage.
                props.prover.setSettings({
                  font:
                    key === props.prover.settings().stageFont
                      ? null
                      : (MATH_FONTS.find((f) => f.key === key)?.key ?? null),
                });
              }}
            >
              <For each={MATH_FONTS}>{(f) => <option value={f.key}>{f.name}</option>}</For>
            </select>
          </Row>
        );
      case "background":
        return (
          <Choice
            label="Background"
            options={[
              ["none", "None"],
              ["white", "White"],
            ]}
            value={look().background}
            pick={(background) => setLook({ background })}
          />
        );
      case "scale":
        return (
          <Choice
            label="Scale"
            options={SCALES.map((n) => [n, `${n}×`] as const)}
            value={look().scale}
            pick={(scale) => setLook({ scale })}
          />
        );
      case "labels":
        return (
          <Choice
            label="Rule names"
            options={[
              ["upright", "Upright"],
              ["subscript", "Subscript"],
              ["off", "Off"],
            ]}
            value={look().labels}
            pick={(labels) => setLook({ labels })}
          />
        );
      case "bar":
        return (
          <Choice
            label="Rule line"
            options={[
              ["─", "─"],
              ["=", "="],
            ]}
            value={look().bar}
            pick={(bar) => setLook({ bar })}
          />
        );
      case "whole":
        return (
          <label class="sw ex-row">
            <input
              type="checkbox"
              checked={look().whole}
              aria-describedby="ex-whole-sub"
              onChange={(event) => setLook({ whole: event.currentTarget.checked })}
            />
            <span class="sw-t" aria-hidden="true" />
            Whole document
            <span class="sub" id="ex-whole-sub">
              {look().whole
                ? "A file that compiles alone."
                : "A part to paste into a document of your own."}
            </span>
          </label>
        );
      case "lemma":
        return (
          <>
            <Row label="Lemma's name">
              <input
                class="field ex-lemma"
                type="text"
                aria-label="Lemma's name"
                autocomplete="off"
                spellcheck={false}
                value={look().lemma}
                onInput={(event) => setLook({ lemma: event.currentTarget.value })}
              />
            </Row>
            <Show when={!rocqName(look().lemma)}>
              <p class="said-why">
                <span class="kw bad">Not a name</span> A Rocq name starts with a letter or _, then
                letters, digits, _ and ', and is none of Rocq's keywords.
              </p>
            </Show>
          </>
        );
    }
  };

  const signOf = (entry: Entry): SignName =>
    entry === "proof-link" ? "proof" : entry === "sequent-link" ? "sequent" : (entry as SignName);

  return (
    <div class="cluster menu export" role="dialog" aria-label="Export">
      <div class="ex-list">
        <For each={GROUPS}>
          {([head, entries]) => (
            <fieldset class="ex-group">
              <legend class="ex-head">{head}</legend>
              <For each={entries}>
                {([entry, words]) => (
                  <button
                    type="button"
                    class="ex-entry"
                    aria-current={chosen() === entry ? "true" : undefined}
                    data-off={off(entry) ? "" : undefined}
                    onClick={() => setChosen(entry)}
                  >
                    <Show when={entry === "rocq"} fallback={<Sign name={signOf(entry)} />}>
                      <RocqLogo />
                    </Show>
                    <span>{words}</span>
                  </button>
                )}
              </For>
            </fieldset>
          )}
        </For>
      </div>
      <div class="ex-side">
        <Show
          when={chosen() !== "pack"}
          fallback={<PackForm prover={props.prover} ui={props.ui} />}
        >
          <p class="ex-title">
            <span class="ex-file">
              {chosen() === "proof-link" || chosen() === "sequent-link" ? "A link" : fileName()}
            </span>
            <Show when={props.ui.ui.tab !== "tree" && props.ui.ui.tab !== "net" && proof()}>
              {(p) => <span class="ex-note">The proof in {markOf(p().calculus)}</span>}
            </Show>
          </p>
          <Show
            when={!off(chosen())}
            fallback={
              <p class="said-why">
                <span class="kw">Nothing to export</span> {off(chosen())}
              </p>
            }
          >
            <Show when={HAS[chosen()]}>
              {(settings) => (
                <fieldset class="ex-settings">
                  <legend class="sr-only">Settings of this format</legend>
                  <For each={settings()}>{(setting) => control(setting)}</For>
                </fieldset>
              )}
            </Show>
            <Show when={TEXTS.has(chosen())}>
              <Show
                when={text() && "error" in (text() ?? {})}
                fallback={
                  <pre class="ex-text" tabindex="0">
                    {textValue() ?? (text.loading ? "Writing…" : "")}
                  </pre>
                }
              >
                <p class="said-why">
                  <span class="kw bad">Not written</span>{" "}
                  {(text() as { error: string } | undefined)?.error}
                </p>
              </Show>
            </Show>
            <Show when={chosen() === "proof-link" || chosen() === "sequent-link"}>
              <p class="ex-link">{link()?.url ?? "Writing the link…"}</p>
              <Show when={chosen() === "proof-link" && link()?.whole === false}>
                <p class="sub">
                  The proof is too long for a link: it holds the sequent alone. Save the session to
                  keep the proof.
                </p>
              </Show>
            </Show>
            <p class="ex-acts">
              <Show when={TEXTS.has(chosen()) || chosen().endsWith("-link")}>
                <button
                  type="button"
                  class="btn"
                  disabled={chosen().endsWith("-link") ? !link() : !textValue()}
                  onClick={() => void copy()}
                >
                  <Sign name="copy" />
                  Copy
                </button>
              </Show>
              <Show when={FILES[chosen()]}>
                <button
                  type="button"
                  class="btn btn-primary"
                  disabled={chosen() === "rocq" && !rocqName(look().lemma)}
                  onClick={() => void save()}
                >
                  <Sign name="save" />
                  Save
                </button>
              </Show>
            </p>
          </Show>
        </Show>
      </div>
    </div>
  );
}
