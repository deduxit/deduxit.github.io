// deduxit © Fabian Lukas Grubmüller 2026
// Licensed under the EUPL

/**
 * Course packs on the page (boards D17 and D18). A teacher makes one in the Export panel's entry
 * "Course pack" (`PackForm`): a title and the sequents at the top as problems, then its link, its
 * embed code and its printed sheet. A student who opens the link gets the pack as one chip at the
 * top with its count done (`PackChip`) and a page of its problems (`PackPage`); a problem opens
 * in the calculus the pack fixes (`Limits`, asked by the prover itself), and Hint and Close all
 * work as anywhere. The answers are kept in the browser under the pack's code; nothing is sent
 * anywhere. A hand-in, from a link or a file of the page before, opens as its pack with its
 * answers.
 */

import {
  createContext,
  createEffect,
  createResource,
  createSignal,
  For,
  on,
  Show,
  useContext,
} from "solid-js";
import { Portal } from "solid-js/web";
import { unwrap } from "solid-js/store";
import { writePackLink } from "../lib/link";
import { type Model, prettyModal } from "../lib/modal";
import { prettyOrdinary } from "../lib/ordinary";
import {
  type Answer,
  MOST_PROBLEMS,
  PACK_SUITES,
  PACK_VERSION,
  type Pack,
  type Problem,
  packCode,
  packText,
} from "../lib/pack";
import { calculusOf, markLabel, markOf, parameterOf } from "../lib/suites";
import { pretty } from "../lib/words";
import { Sign } from "./Signs";
import { NO_LIMITS, type Proof, type Prover } from "./state";
import type { Ui } from "./ui";

/** The browser's storage, where it may be used. */
const storage = (): Storage | null => {
  try {
    return localStorage;
  } catch {
    return null;
  }
};

/** Where a pack's answers are kept in the browser, by its code. */
const answersKey = (code: string) => `deduxit-pack:${code.replaceAll(" ", "")}`;

/** The answers kept for a pack, or none. */
function keptAnswers(code: string, count: number): (Answer | undefined)[] {
  try {
    const kept = JSON.parse(storage()?.getItem(answersKey(code)) ?? "null") as unknown;
    return Array.isArray(kept) && kept.length === count ? (kept as Answer[]) : [];
  } catch {
    return [];
  }
}

/** A problem's calculus. */
const calculusOfProblem = (p: Problem) => calculusOf(p.suite, "sequent", p.parameter);

/** A problem's calculus as its tab's mark reads, "Ordinary (LJ)". */
const calculusLabel = (p: Problem): string => {
  const c = calculusOfProblem(p);
  return c ? markLabel(c) : p.parameter;
};

/** A problem's calculus by its short name, "LJ". */
const calculusMark = (p: Problem): string => {
  const c = calculusOfProblem(p);
  return c ? markOf(c) : p.parameter;
};

/** A proof's answer: its session, its model, or none yet. */
function answerOf(proof: Proof): Answer {
  if (proof.calculus.suite === "modal") {
    const model = proof.modal?.model;
    return model ? { model: unwrap(model), world: proof.modal?.world ?? null } : null;
  }
  return proof.session ? { session: unwrap(proof.session) } : null;
}

/**
 * Whether a proof answers its problem: a finished proof, or a model where the sequent fails (the
 * countermodel deduxit found, or one the check found failing). A valid modal sequent has no
 * model to hand in, so it is never done.
 */
function finished(proof: Proof | undefined): boolean {
  if (!proof) return false;
  if (proof.calculus.suite === "modal") {
    const e = proof.modal?.evaluation;
    const found = proof.modal?.outcome?.verdict === "not_valid" && !!proof.modal?.model;
    return found || (!!e && !e.frame && !e.holds && e.failing !== undefined);
  }
  return proof.view?.complete === true;
}

/** A tab's problem for a pack: its sequent in its calculus, where a pack takes it. */
export function problemOf(proof: Proof): Problem | null {
  const c = proof.calculus;
  const suite = PACK_SUITES.find((s) => s === c.suite);
  if (!suite || c.method !== "sequent" || !proof.input.trim()) return null;
  const started = !!proof.session || !!proof.modal?.statement;
  if (!started) return null;
  const sequent =
    suite === "ordinary"
      ? prettyOrdinary(proof.input)
      : suite === "modal"
        ? prettyModal(proof.input)
        : pretty(proof.input);
  return { suite, parameter: parameterOf(c), sequent: sequent.trim() };
}

/** An open pack: the pack, its code, and the tab of each problem (null for none open). */
interface Open {
  readonly pack: Pack;
  readonly code: string;
  readonly tabs: readonly (string | null)[];
}

/** Creates the page's course pack: the one a student works on. */
export function createPacks(prover: Prover, view: Ui) {
  const [open, setOpen] = createSignal<Open | null>(null);
  /** The answers kept from an earlier visit or a hand-in, for the problems whose tab is closed. */
  let kept: (Answer | undefined)[] = [];

  const indexOf = (id: string) => open()?.tabs.indexOf(id) ?? -1;
  /** Whether a proof is a problem of the open pack. */
  const isProblem = (id: string | null | undefined) => !!id && indexOf(id) >= 0;

  // The pack's limits, asked by the prover at every action that would break one.
  createEffect(() => {
    const o = open();
    prover.restrict(
      o
        ? {
            fixed: (id) => {
              const at = o.tabs.indexOf(id);
              const p = prover.store.proofs.find((q) => q.id === id);
              if (at < 0 || !p || (!p.session && !p.modal?.statement)) return null;
              return `This is problem ${String(at + 1)} of the pack: its sequent and calculus are fixed. A new sequent takes another.`;
            },
          }
        : NO_LIMITS,
    );
  });

  /** Each problem's answer: its open tab's, else the one kept. */
  const answers = (): Answer[] => {
    const o = open();
    if (!o) return [];
    return o.tabs.map((id, i) => {
      const proof = id ? prover.store.proofs.find((p) => p.id === id) : undefined;
      return proof ? answerOf(proof) : (kept[i] ?? null);
    });
  };

  // The answers kept in the browser as they change, under the pack's code.
  createEffect(
    on(
      () => JSON.stringify(answers()),
      (text) => {
        const o = open();
        if (!o) return;
        try {
          storage()?.setItem(answersKey(o.code), text);
        } catch {
          // A full or closed storage keeps nothing: the work stays on its tabs for this visit.
        }
      },
      { defer: true },
    ),
  );

  /** Opens problem `at` on a tab of its own, from its kept answer where there is one. */
  async function openProblem(at: number): Promise<string | null> {
    const o = open();
    const problem = o?.pack.problems[at];
    const calculus = problem && calculusOfProblem(problem);
    if (!o || !problem || !calculus) return null;
    const answer = kept[at];
    let id: string | null = null;
    if (answer && "session" in answer) {
      const opened = await prover.open(JSON.stringify(answer.session), calculus);
      if (!("problem" in opened)) id = prover.current()?.id ?? null;
      // The tab reads as the problem was written, not as the session's sequent prints.
      if (id) prover.setInput(id, problem.sequent);
    }
    if (!id) {
      id = prover.add();
      setOpen({ ...o, tabs: o.tabs.map((t, i) => (i === at ? id : t)) });
      await prover.setCalculus(id, calculus);
      prover.setInput(id, problem.sequent);
      await prover.submit(id);
      if (answer && "model" in answer) {
        prover.setModalModel(id, answer.model as Model);
        prover.setModalWorld(id, answer.world);
        // The check is not kept: run again, it says what the kept model shows.
        await prover.modalCheck(id);
      }
    }
    const now = open();
    if (now) setOpen({ ...now, tabs: now.tabs.map((t, i) => (i === at ? id : t)) });
    return id;
  }

  /**
   * Opens a pack: a tab per problem, from the answers given (a hand-in's) or else those kept for
   * it in this browser; then its page.
   */
  async function arrive(pack: Pack, given?: readonly Answer[]) {
    const code = await packCode(pack);
    kept = given ? [...given] : keptAnswers(code, pack.problems.length);
    setOpen({ pack, code, tabs: pack.problems.map(() => null) });
    for (let at = 0; at < pack.problems.length; at++) await openProblem(at);
    const first = open()?.tabs[0];
    if (first) prover.activate(first);
    view.setUi({ packPage: true, menu: null, tab: "tree" });
  }

  /** Shows problem `at`: its tab, or a new one where it was closed. */
  async function show(at: number) {
    const id = open()?.tabs[at];
    if (id && prover.store.proofs.some((p) => p.id === id)) prover.activate(id);
    else {
      kept = answers().map((a, i) => (i === at ? (kept[i] ?? a) : a));
      const opened = await openProblem(at);
      if (opened) prover.activate(opened);
    }
    view.setUi({ packPage: false, menu: null, tab: "tree" });
  }

  /**
   * Closes the pack with its problems' tabs, whose answers stay kept in the browser; the
   * function returned opens it again as it was.
   */
  function close(): () => void {
    const o = open();
    if (!o) return () => undefined;
    const backs = o.tabs.flatMap((id) =>
      id && prover.store.proofs.some((p) => p.id === id) ? [prover.closeChip(id)] : [],
    );
    setOpen(null);
    view.setUi("packPage", false);
    return () => {
      for (const back of backs.reverse()) back();
      setOpen(o);
      view.setUi({ packPage: true, menu: null, tab: "tree" });
    };
  }

  /** How many of the pack's problems are done. */
  const done = () => {
    const o = open();
    return o ? o.pack.problems.filter((_, at) => finished(proofOf(at))).length : 0;
  };
  /** Each problem's tab. */
  const proofOf = (at: number) => {
    const id = open()?.tabs[at];
    return id ? prover.store.proofs.find((p) => p.id === id) : undefined;
  };

  return { open, arrive, show, close, indexOf, isProblem, done, proofOf };
}

/** The page's course packs. */
export type Packs = ReturnType<typeof createPacks>;

export const PacksContext = createContext<Packs>();

/** The page's course packs; every component under the app has them. */
export const usePacks = () => useContext(PacksContext);

/** The pack's words at the top: its title, else "Course pack". */
const titleOf = (pack: Pack) => pack.title || "Course pack";

/**
 * The open pack's chip at the top: its title and its count done. A press shows its page; it is
 * chosen while its page or one of its problems is shown.
 */
export function PackChip(props: { packs: Packs; prover: Prover; ui: Ui; close: () => void }) {
  const { ui, setUi } = props.ui;
  return (
    <Show when={props.packs.open()}>
      {(o) => {
        const chosen = () =>
          ui.menu !== "settings" &&
          (ui.packPage || props.packs.isProblem(props.prover.store.active));
        const count = () => `${props.packs.done()}/${o().pack.problems.length}`;
        const all = () => props.packs.done() === o().pack.problems.length;
        return (
          <div class="chip-wrap" role="presentation">
            <button
              type="button"
              role="tab"
              class="chip pack-chip"
              data-rove=""
              data-pack=""
              aria-selected={chosen()}
              aria-keyshortcuts={chosen() ? "W Delete" : "Delete"}
              tabindex={chosen() ? 0 : -1}
              aria-label={`${titleOf(o().pack)}, ${count()}, course pack, ${props.packs.done()} of ${o().pack.problems.length} done`}
              data-tip={`${titleOf(o().pack)}: its problems`}
              onKeyDown={(event) => {
                if (event.key !== "Delete" || event.altKey || event.ctrlKey || event.metaKey)
                  return;
                event.preventDefault();
                props.close();
              }}
              onClick={() => setUi({ packPage: true, menu: null, tab: "tree" })}
            >
              <Sign name="pack" class="pack-sign" />
              <span class="chip-text">
                {titleOf(o().pack)}, {count()}
              </span>
              <Show when={all()}>
                <Sign name="close" class="sign good" />
              </Show>
            </button>
            <span
              class="chip-close"
              aria-hidden="true"
              data-tip={`Close ${titleOf(o().pack)}`}
              onClick={() => props.close()}
            >
              <Sign name="shut" />
            </span>
          </div>
        );
      }}
    </Show>
  );
}

/**
 * The open pack's page, in the stage's place: its title, its problems with their calculus and
 * state, and how many are done. A press on a problem opens it. No bottom box, no tools.
 */
export function PackPage(props: { packs: Packs; prover: Prover }) {
  return (
    <Show when={props.packs.open()}>
      {(o) => (
        <section class="pack-page" aria-labelledby="pack-title">
          <h1 id="pack-title">{titleOf(o().pack)}</h1>
          <ol class="pk-rows">
            <For each={o().pack.problems}>
              {(problem, at) => {
                const isDone = () => finished(props.packs.proofOf(at()));
                return (
                  <li>
                    <button
                      type="button"
                      class="pk-row"
                      aria-label={`Problem ${String(at() + 1)}: ${problem.sequent}, ${calculusMark(problem)}, ${isDone() ? "done" : "open"}`}
                      onClick={() => void props.packs.show(at())}
                    >
                      <span class="pk-n">{at() + 1}</span>{" "}
                      <span class="m pk-sequent">{problem.sequent}</span>{" "}
                      <span class="pk-calc">{calculusMark(problem)}</span>{" "}
                      <span class="pk-state">
                        <Show when={isDone()} fallback={<span class="pk-open" />}>
                          <Sign name="close" class="sign good" />
                        </Show>
                      </span>
                    </button>
                  </li>
                );
              }}
            </For>
          </ol>
          <p class="pk-progress">
            {props.packs.done()} of {o().pack.problems.length} done
          </p>
          <Show when={props.prover.settings().guide}>
            <p class="guide-line">
              A course pack is a set of problems from your teacher. Press one to work on it. Your
              work stays in this browser.
            </p>
          </Show>
        </section>
      )}
    </Show>
  );
}

/** The page's address with a fragment. */
const address = (hash: string) => `${location.origin}${location.pathname}${hash}`;

/** The frame a course's page embeds: the link, with a title for screen readers. */
export const embedCode = (url: string, title: string) =>
  `<iframe src="${url.replaceAll('"', "%22")}" title="${title.replaceAll('"', "&quot;")}" width="100%" height="560" loading="lazy"></iframe>`;

/**
 * The Export panel's form of a course pack (board D18): a title, the sequents at the top as
 * problems to tick, then "Copy the link", "Copy the embed code" and "Print". A sequent need not
 * be proved to go in.
 */
export function PackForm(props: { prover: Prover; ui: Ui }) {
  const packs = usePacks();
  /** The sequents at the top that a pack takes: each chip's own proof, started. */
  const candidates = () =>
    props.prover.store.proofs.flatMap((proof) => {
      if (props.prover.chipOf(proof.id) !== proof.id || packs?.isProblem(proof.id)) return [];
      const problem = problemOf(proof);
      return problem ? [{ id: proof.id, problem }] : [];
    });
  const [left, setLeft] = createSignal<ReadonlySet<string>>(new Set());
  const [title, setTitle] = createSignal("");
  const picked = () => candidates().filter((c) => !left().has(c.id));
  const pack = (): Pack | null => {
    const problems = picked()
      .map((c) => c.problem)
      .slice(0, MOST_PROBLEMS);
    // The search is never barred: the field stays for the readers of earlier packs.
    return problems.length
      ? { pack: PACK_VERSION, title: title().trim(), search: true, problems }
      : null;
  };
  const [made] = createResource(
    () => pack() ?? undefined,
    async (p) => {
      const text = packText(p);
      return {
        link: address(await writePackLink(text)),
        embed: address(await writePackLink(text, true)),
      };
    },
  );
  const say = (words: string) => props.ui.setUi({ notice: { text: words }, live: words });
  async function copy(text: string | undefined, what: string) {
    if (!text) return say("Choose at least one problem.");
    try {
      await navigator.clipboard.writeText(text);
      say(`${what} copied.`);
    } catch {
      say(`The browser keeps the clipboard closed: ${what.toLowerCase()} not copied.`);
    }
  }
  const count = () => picked().length;
  return (
    <div class="pack-form">
      <p class="ex-title">
        <span class="ex-file">Course pack</span>
        <span class="ex-note">{count() === 1 ? "1 problem" : `${count()} problems`}</span>
      </p>
      <Show
        when={candidates().length}
        fallback={
          <p class="sub">
            Enter a sequent first. Each sequent at the top in linear, ordinary or modal logic can be
            a problem of the pack.
          </p>
        }
      >
        <label class="ex-row">
          <span class="ex-label">Title</span>
          <input
            class="field pk-title-in"
            maxLength={120}
            placeholder="Week 3: implication"
            value={title()}
            onInput={(event) => setTitle(event.currentTarget.value)}
          />
        </label>
        <fieldset class="pk-list">
          <legend class="sr-only">Problems</legend>
          <For each={candidates()}>
            {(c) => (
              <label class="pk-item">
                <input
                  type="checkbox"
                  checked={!left().has(c.id)}
                  onChange={(event) => {
                    const next = new Set(left());
                    if (event.currentTarget.checked) next.delete(c.id);
                    else next.add(c.id);
                    setLeft(next);
                  }}
                />
                <span class="m">{c.problem.sequent}</span>{" "}
                <span class="pk-calc">{calculusMark(c.problem)}</span>
              </label>
            )}
          </For>
        </fieldset>
        <p class="pk-acts">
          <button
            type="button"
            class="btn btn-primary pk-copy"
            onClick={() => void copy(made()?.link, "Link to the pack")}
          >
            <Sign name="share" />
            Copy the link
          </button>
          <button
            type="button"
            class="btn"
            onClick={() =>
              void copy(
                made() &&
                  embedCode(made()?.embed ?? "", `deduxit: ${title().trim() || "course pack"}`),
                "Embed code",
              )
            }
          >
            <Sign name="copy" />
            Copy the embed code
          </button>
          <button
            type="button"
            class="btn"
            onClick={() => {
              if (!pack()) return say("Choose at least one problem.");
              window.print();
            }}
          >
            <Sign name="print" />
            Print
          </button>
        </p>
        <Show when={pack() && made()}>
          {(m) => <Handout pack={pack() as Pack} link={m().link} />}
        </Show>
      </Show>
    </div>
  );
}

/** The pack's problems as a printed sheet: shown in print alone. */
function Handout(props: { pack: Pack; link: string }) {
  return (
    <Portal>
      <section class="pk-handout print-only" aria-hidden="true">
        <h1>{titleOf(props.pack)}</h1>
        <ol>
          <For each={props.pack.problems}>
            {(p) => (
              <li>
                <span class="m">{p.sequent}</span> <span>({calculusLabel(p)})</span>
              </li>
            )}
          </For>
        </ol>
        <p>Open the problems on deduxit: {props.link}</p>
      </section>
    </Portal>
  );
}
