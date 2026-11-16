// deduxit © Fabian Lukas Grubmüller 2026
// Licensed under the EUPL

/**
 * Course packs on the page. A teacher packs the open tabs' problems into a link (`PackSheet`); a
 * student who opens it gets one tab per problem, in the calculus the pack fixes, with the search
 * barred where the pack says so (`Limits`, asked by the prover itself), a bar to move between
 * the problems (`PackBar`), and a hand-in: the answers packed in a link or a file
 * (`HandinSheet`). A teacher opens a hand-in in the check view (`CheckSheet`), which reads every
 * answer again with deduxit and trusts none of it. The answers are kept in the browser under the
 * pack's code; nothing is sent anywhere.
 */

import {
  createContext,
  createEffect,
  createResource,
  createSignal,
  For,
  type JSX,
  on,
  onMount,
  Show,
  useContext,
} from "solid-js";
import { unwrap } from "solid-js/store";
import { failure } from "../lib/deduxit";
import { kripkeJson } from "../lib/kripke";
import { writeHandinLink, writePackLink } from "../lib/link";
import { frameWords, type Model, prettyModal } from "../lib/modal";
import { isOrdinary, prettyOrdinary } from "../lib/ordinary";
import {
  type Answer,
  HANDIN_VERSION,
  type Handin,
  handinText,
  MOST_PROBLEMS,
  PACK_SUITES,
  PACK_VERSION,
  type Pack,
  type Problem,
  packCode,
  packText,
} from "../lib/pack";
import { calculusOf, markLabel, parameterOf } from "../lib/suites";
import { pretty } from "../lib/words";
import { download } from "./BottomBand";
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

/** A proof's answer: its session, its model, or none yet. */
function answerOf(proof: Proof): Answer {
  if (proof.calculus.suite === "modal") {
    const model = proof.modal?.model;
    return model ? { model: unwrap(model), world: proof.modal?.world ?? null } : null;
  }
  return proof.session ? { session: unwrap(proof.session) } : null;
}

/** Whether a proof answers its problem: a finished proof, or a model where the sequent fails. */
function finished(proof: Proof | undefined): boolean {
  if (!proof) return false;
  if (proof.calculus.suite === "modal") {
    const e = proof.modal?.evaluation;
    const decided = proof.modal?.outcome?.verdict;
    return (
      decided === "valid" ||
      decided === "not_valid" ||
      (!!e && !e.frame && !e.holds && e.failing !== undefined)
    );
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

/** Creates the page's course packs: the one a student works on, and the hand-in a teacher checks. */
export function createPacks(prover: Prover, view: Ui) {
  const [open, setOpen] = createSignal<Open | null>(null);
  /** The hand-in the check view shows, with its pack's code. */
  const [checking, setChecking] = createSignal<{ handin: Handin; code: string } | null>(null);
  /** The answers kept from an earlier visit, for the problems whose tab is closed. */
  let kept: (Answer | undefined)[] = [];

  const indexOf = (id: string) => open()?.tabs.indexOf(id) ?? -1;

  // The pack's limits, asked by the prover at every action that would break one.
  createEffect(() => {
    const o = open();
    prover.restrict(
      o
        ? {
            search: (id) =>
              o.pack.search || !o.tabs.includes(id)
                ? null
                : "This pack asks for the proof by hand: the search closes no goal and gives no hint in its problems.",
            fixed: (id) => {
              const at = o.tabs.indexOf(id);
              const p = prover.store.proofs.find((q) => q.id === id);
              if (at < 0 || !p || (!p.session && !p.modal?.statement)) return null;
              return `This is problem ${String(at + 1)} of the pack: its sequent and calculus are fixed. A new tab takes another sequent.`;
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
          // A full or closed storage keeps nothing: the hand-in still has the answers.
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

  /** Opens a pack: a tab per problem, the first shown, the answers kept for it restored. */
  async function arrive(pack: Pack) {
    const code = await packCode(pack);
    kept = keptAnswers(code, pack.problems.length);
    setOpen({ pack, code, tabs: pack.problems.map(() => null) });
    for (let at = 0; at < pack.problems.length; at++) await openProblem(at);
    const first = open()?.tabs[0];
    if (first) prover.activate(first);
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
  }

  /** Closes the pack: its tabs stay, as tabs of their own. */
  function leave() {
    setOpen(null);
  }

  /** The hand-in of the open pack. */
  const handin = (): Handin | null => {
    const o = open();
    return o ? { handin: HANDIN_VERSION, pack: o.pack, answers: answers() } : null;
  };

  /** Shows a hand-in in the check view. */
  async function check(h: Handin) {
    setChecking({ handin: h, code: await packCode(h.pack) });
    view.setUi("menu", "check");
  }

  return {
    open,
    checking,
    arrive,
    show,
    leave,
    handin,
    check,
    indexOf,
    /** Each problem's tab, for the bar. */
    proofOf: (at: number) => {
      const id = open()?.tabs[at];
      return id ? prover.store.proofs.find((p) => p.id === id) : undefined;
    },
  };
}

/** The page's course packs. */
export type Packs = ReturnType<typeof createPacks>;

export const PacksContext = createContext<Packs>();

/** The page's course packs; every component under the app has them. */
export const usePacks = () => useContext(PacksContext);

/** The open pack's bar: its title, its problems to move between, how many are done, the hand-in. */
export function PackBar(props: { packs: Packs; prover: Prover; ui: Ui }) {
  return (
    <Show when={props.packs.open()}>
      {(o) => {
        const done = () =>
          o().pack.problems.filter((_, at) => finished(props.packs.proofOf(at))).length;
        return (
          <section class="pack-bar cluster" aria-label="Course pack">
            <span class="pk-title">{o().pack.title || "Course pack"}</span>
            <ol class="pk-problems">
              <For each={o().pack.problems}>
                {(problem, at) => {
                  const proof = () => props.packs.proofOf(at());
                  const shown = () => !!proof() && props.prover.current()?.id === proof()?.id;
                  return (
                    <li>
                      <button
                        type="button"
                        class="pk-problem"
                        aria-current={shown() ? "true" : undefined}
                        data-done={finished(proof()) ? "" : undefined}
                        aria-label={`Problem ${String(at() + 1)}: ${problem.sequent}${finished(proof()) ? ", done" : ""}`}
                        onClick={() => void props.packs.show(at())}
                      >
                        {String(at() + 1)}
                      </button>
                    </li>
                  );
                }}
              </For>
            </ol>
            <span class="pk-done">
              {done()} of {o().pack.problems.length} done
            </span>
            <button
              type="button"
              class="btn btn-primary"
              onClick={() => props.ui.setUi("menu", "handin")}
            >
              Hand in
            </button>
          </section>
        );
      }}
    </Show>
  );
}

/** A sheet over the stage with its title, which takes the focus when it opens. */
function Sheet(props: { title: string; intro: string; children: JSX.Element }) {
  let title: HTMLHeadingElement | undefined;
  onMount(() => title?.focus());
  return (
    <div class="cluster menu transform pack-sheet" role="dialog" aria-label={props.title}>
      <h2 class="pr-title" tabindex="-1" ref={title}>
        {props.title}
      </h2>
      <p class="sub tf-intro">{props.intro}</p>
      {props.children}
    </div>
  );
}

/** Copies text to the clipboard, and says so or why not. */
async function copied(text: string, what: string): Promise<string> {
  try {
    await navigator.clipboard.writeText(text);
    return `${what} copied.`;
  } catch {
    return `The browser keeps the clipboard closed: select the ${what.toLowerCase()} to copy it.`;
  }
}

/** The page's address with a fragment. */
const address = (hash: string) => `${location.origin}${location.pathname}${hash}`;

/** The frame a course's page embeds: the link, with a title for screen readers. */
export const embedCode = (url: string, title: string) =>
  `<iframe src="${url.replaceAll('"', "%22")}" title="${title.replaceAll('"', "&quot;")}" width="100%" height="560" loading="lazy"></iframe>`;

/** The teacher's sheet: the open tabs' problems as a pack, its link, its embed and its handout. */
export function PackSheet(props: { prover: Prover; ui: Ui }) {
  const candidates = () =>
    props.prover.store.proofs.flatMap((proof) => {
      const problem = problemOf(proof);
      return problem ? [{ id: proof.id, problem }] : [];
    });
  const [left, setLeft] = createSignal<ReadonlySet<string>>(new Set());
  const [title, setTitle] = createSignal("");
  const [search, setSearch] = createSignal(false);
  const [said, setSaid] = createSignal("");
  const pack = (): Pack | null => {
    const problems = candidates()
      .filter((c) => !left().has(c.id))
      .map((c) => c.problem)
      .slice(0, MOST_PROBLEMS);
    return problems.length
      ? { pack: PACK_VERSION, title: title().trim(), search: search(), problems }
      : null;
  };
  const [made] = createResource(
    () => pack() ?? undefined,
    async (p) => {
      const text = packText(p);
      return {
        code: await packCode(p),
        link: address(await writePackLink(text)),
        embed: address(await writePackLink(text, true)),
      };
    },
  );
  return (
    <Sheet
      title="Course pack"
      intro="The open tabs' problems as one link: a student who opens it gets a tab per problem, in its calculus, and hands the answers back as a link or a file. Nothing is stored anywhere but in the link and the student's browser."
    >
      <Show
        when={candidates().length}
        fallback={
          <p class="method-verdict">
            Start a sequent on a tab first: each started tab of linear, ordinary or modal logic is a
            problem of the pack.
          </p>
        }
      >
        <label class="custom-field pk-field">
          <span>Title</span>
          <input
            class="field"
            maxLength={120}
            placeholder="Week 3: the intuitionistic connectives"
            value={title()}
            onInput={(event) => setTitle(event.currentTarget.value)}
          />
        </label>
        <fieldset class="pk-list">
          <legend class="kw-label h">Problems</legend>
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
                <span class="m">{c.problem.sequent}</span>
                <span class="pk-calc">{calculusLabel(c.problem)}</span>
              </label>
            )}
          </For>
        </fieldset>
        <label class="sw">
          <input
            type="checkbox"
            checked={search()}
            onChange={(event) => setSearch(event.currentTarget.checked)}
          />
          <span class="sw-t" aria-hidden="true" />
          The search may close goals and give hints
        </label>
        <Show when={made()}>
          {(m) => (
            <>
              <p class="method-verdict">
                Pack code <span class="pk-code">{m().code}</span>: a hand-in of this pack shows the
                same code.
              </p>
              <p class="row">
                <button
                  type="button"
                  class="btn btn-primary"
                  onClick={async () => setSaid(await copied(m().link, "Link"))}
                >
                  Copy the link
                </button>
                <button
                  type="button"
                  class="btn"
                  onClick={async () =>
                    setSaid(
                      await copied(
                        embedCode(m().embed, `deduxit: ${title().trim() || "course pack"}`),
                        "Embed code",
                      ),
                    )
                  }
                >
                  Copy the embed code
                </button>
                <button type="button" class="btn" onClick={() => window.print()}>
                  Print the problems
                </button>
              </p>
              <Handout pack={pack() as Pack} link={m().link} code={m().code} />
            </>
          )}
        </Show>
        <Show when={said()}>
          <p class="said" role="status">
            {said()}
          </p>
        </Show>
      </Show>
    </Sheet>
  );
}

/** The pack's problems as a handout: shown in print alone. */
function Handout(props: { pack: Pack; link: string; code: string }) {
  return (
    <section class="pk-handout print-only" aria-hidden="true">
      <h1>{props.pack.title || "Course pack"}</h1>
      <ol>
        <For each={props.pack.problems}>
          {(p) => {
            return (
              <li>
                <span class="m">{p.sequent}</span> <span>({calculusLabel(p)})</span>
              </li>
            );
          }}
        </For>
      </ol>
      <p>
        Open the problems on deduxit: {props.link} (pack code {props.code}).
      </p>
    </section>
  );
}

/** The student's sheet: the answers as a link or a file for the teacher. */
export function HandinSheet(props: { packs: Packs; prover: Prover }) {
  const [said, setSaid] = createSignal("");
  const [made] = createResource(
    () => props.packs.handin() ?? undefined,
    async (h) => {
      const text = handinText(h);
      const hash = await writeHandinLink(text);
      return { text, link: hash ? address(hash) : null, code: await packCode(h.pack) };
    },
  );
  const done = () => {
    const o = props.packs.open();
    return o ? o.pack.problems.filter((_, at) => finished(props.packs.proofOf(at))).length : 0;
  };
  return (
    <Sheet
      title="Hand in"
      intro="Your answers as a link or a file: send it to your teacher, who opens it on this page and has every answer checked again. This page sends nothing itself."
    >
      <Show when={props.packs.open()}>
        {(o) => (
          <p class="method-verdict">
            {o().pack.title || "Course pack"}: {done()} of {o().pack.problems.length} problems done.
          </p>
        )}
      </Show>
      <Show when={made()}>
        {(m) => (
          <>
            <p class="method-verdict">
              Pack code <span class="pk-code">{m().code}</span>
            </p>
            <Show
              when={m().link}
              fallback={
                <p class="method-verdict">The answers are too long for a link: send the file.</p>
              }
            >
              {(link) => (
                <p class="row">
                  <button
                    type="button"
                    class="btn btn-primary"
                    onClick={async () => setSaid(await copied(link(), "Link"))}
                  >
                    Copy the link
                  </button>
                </p>
              )}
            </Show>
            <p class="row">
              <button
                type="button"
                class="btn"
                onClick={() =>
                  download(
                    `hand-in-${m().code.replaceAll(" ", "")}.json`,
                    m().text,
                    "application/json",
                  )
                }
              >
                Download the file
              </button>
            </p>
          </>
        )}
      </Show>
      <Show when={said()}>
        <p class="said" role="status">
          {said()}
        </p>
      </Show>
    </Sheet>
  );
}

/** What the check view says of one answer: a tone, a keyword and a sentence. */
interface Checked {
  readonly tone: "ok" | "bad" | "warn";
  readonly keyword: string;
  readonly sentence: string;
}

/**
 * Checks an answer against its problem with deduxit, trusting nothing the hand-in says: a proof
 * is read again (deduxit replays and checks every step it holds), its sequent and calculus held to
 * the problem's, and its goals counted; a model is checked against the problem's sequent.
 */
export async function checkAnswer(
  prover: Prover,
  problem: Problem,
  answer: Answer,
): Promise<Checked> {
  const api = prover.api;
  if (answer === null) return { tone: "warn", keyword: "No answer", sentence: "" };
  try {
    if (problem.suite === "modal") {
      if (!("model" in answer))
        return {
          tone: "bad",
          keyword: "Not an answer",
          sentence: "A modal problem's answer is a model.",
        };
      const statement = await api.modal.read(problem.sequent, problem.parameter, "{}");
      const e = await api.modal.evaluate(
        statement,
        kripkeJson(answer.model as Model, "modal"),
        answer.world ?? undefined,
        "{}",
      );
      if (e.frame)
        return {
          tone: "bad",
          keyword: `No model of ${problem.parameter}`,
          sentence: frameWords(e.frame),
        };
      return e.holds
        ? {
            tone: "warn",
            keyword: "No countermodel",
            sentence: "The sequent holds in the model handed in.",
          }
        : {
            tone: "ok",
            keyword: "Countermodel",
            sentence: `The sequent fails at world ${String(e.failing ?? 0)} of the model handed in: deduxit checked it.`,
          };
    }
    if (!("session" in answer))
      return {
        tone: "bad",
        keyword: "Not an answer",
        sentence: "This problem's answer is a proof.",
      };
    const session = answer.session as Record<string, unknown> | null;
    const sequent = JSON.stringify(session?.["sequent"] ?? null);
    if (problem.suite === "ordinary") {
      if (!isOrdinary(session) || session.logic !== problem.parameter)
        return {
          tone: "bad",
          keyword: "Another calculus",
          sentence: "The proof is not in the problem's logic.",
        };
      const [own, theirs] = await Promise.all([
        api.ordinary.read(problem.sequent, problem.parameter, "{}"),
        api.ordinary.read(sequent, problem.parameter, "{}"),
      ]);
      if (own.text !== theirs.text)
        return {
          tone: "bad",
          keyword: "Another sequent",
          sentence: `The proof is of ${theirs.text}.`,
        };
      const view = await api.ordinary.view(session, "{}");
      return finishedWords(view.complete, view.goals.length);
    }
    const mode = problem.parameter as never;
    if (session?.["mode"] !== problem.parameter)
      return {
        tone: "bad",
        keyword: "Another calculus",
        sentence: "The proof is not in the problem's mode.",
      };
    const [own, theirs] = await Promise.all([
      api.readAs(problem.sequent, mode, "{}"),
      api.readAs(sequent, mode, "{}"),
    ]);
    if (own.text !== theirs.text)
      return {
        tone: "bad",
        keyword: "Another sequent",
        sentence: `The proof is of ${theirs.text}.`,
      };
    const view = await api.view(session as never, "{}");
    if (view.complete) await api.proof(session as never, "{}");
    return finishedWords(view.complete, view.goals.length);
  } catch (thrown) {
    return {
      tone: "bad",
      keyword: "Refused",
      sentence: `deduxit does not read the answer: ${failure(thrown instanceof Error ? thrown.message : thrown).message}`,
    };
  }
}

/** What a proof read again says: finished and checked, or the goals left open. */
const finishedWords = (complete: boolean, open: number): Checked =>
  complete
    ? {
        tone: "ok",
        keyword: "Proved",
        sentence: "deduxit read every step again: the proof is finished and checked.",
      }
    : {
        tone: "warn",
        keyword: "Not finished",
        sentence: `${String(open)} ${open === 1 ? "goal is" : "goals are"} still open.`,
      };

/** The teacher's check view: a hand-in's problems, each answer checked again by deduxit. */
export function CheckSheet(props: { packs: Packs; prover: Prover; ui: Ui }) {
  return (
    <Show when={props.packs.checking()}>
      {(c) => (
        <Sheet
          title="Check a hand-in"
          intro="Every answer is read again by deduxit here: what the hand-in claims counts for nothing. Compare the pack code with your pack's to see that these are your problems."
        >
          <p class="method-verdict">
            {c().handin.pack.title || "Course pack"}, pack code{" "}
            <span class="pk-code">{c().code}</span>
            {c().handin.pack.search ? ", the search allowed" : ", the search barred"}.
          </p>
          <ol class="pk-checks">
            <For each={c().handin.pack.problems}>
              {(problem, at) => {
                const answer = () => c().handin.answers[at()] ?? null;
                const [said] = createResource(
                  () => [problem, answer()] as const,
                  ([p, a]) => checkAnswer(props.prover, p, a),
                );
                return (
                  <li class="pk-check">
                    <p class="method-verdict">
                      <span class="m">{problem.sequent}</span>{" "}
                      <span class="pk-calc">{calculusLabel(problem)}</span>
                    </p>
                    <p class="method-verdict" role="status">
                      <Show when={said()} fallback={<>Checking…</>}>
                        {(s) => (
                          <>
                            <span class={`kw ${s().tone}`}>{s().keyword}</span> {s().sentence}
                          </>
                        )}
                      </Show>
                    </p>
                    <Show when={answer()}>
                      <p class="row">
                        <button
                          type="button"
                          class="btn btn-s"
                          aria-label={`Open the answer to problem ${String(at() + 1)}`}
                          onClick={() => void openAnswer(props.prover, props.ui, problem, answer())}
                        >
                          Open the answer
                        </button>
                      </p>
                    </Show>
                  </li>
                );
              }}
            </For>
          </ol>
        </Sheet>
      )}
    </Show>
  );
}

/** Opens an answer on a tab of its own: a proof's session, or the problem with the model. */
async function openAnswer(prover: Prover, ui: Ui, problem: Problem, answer: Answer) {
  const calculus = calculusOfProblem(problem);
  if (!calculus || answer === null) return;
  ui.setUi("menu", null);
  if ("session" in answer) {
    await prover.open(JSON.stringify(answer.session), calculus);
    return;
  }
  const id = prover.add();
  await prover.setCalculus(id, calculus);
  prover.setInput(id, problem.sequent);
  await prover.submit(id);
  prover.setModalModel(id, answer.model as Model);
  prover.setModalWorld(id, answer.world);
}
