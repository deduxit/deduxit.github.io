// deduxit © Fabian Lukas Grubmüller 2026
// Licensed under the EUPL

/**
 * Course packs and hand-ins: a teacher's set of problems, and a student's answers to them, each
 * a JSON document carried in a link's fragment (or a file), never sent anywhere.
 *
 * A pack is `{"pack": 1, "title", "search", "problems": [{"suite", "parameter", "sequent"}]}`:
 * each problem fixes its calculus (a suite of the registry and its mode, logic or system), and
 * `search` says whether the search may close goals and give hints. A hand-in is `{"handin": 1,
 * "pack", "answers"}`, one answer per problem: the proof's session document, a Kripke model with
 * the world it is checked at, or null. A hand-in is the student's claim and nothing more: the
 * check view reads every answer again with deduxit, and shows the pack's code so that the teacher
 * sees it is their pack.
 *
 * Both are read key by key within bounds, since a link is anyone's text.
 */

import { calculusOf } from "./suites";

/** The pack format's version. */
export const PACK_VERSION = 1;

/** The hand-in format's version. */
export const HANDIN_VERSION = 1;

/** The most problems a pack holds: a week's set, few enough to check in one view. */
export const MOST_PROBLEMS = 30;

/** The longest title, and the longest sequent, a pack takes. */
export const LONGEST_TITLE = 120;
export const LONGEST_SEQUENT = 1000;

/** The suites a pack's problem may be in: those whose answer the check view reads. */
export const PACK_SUITES = ["linear", "ordinary", "modal"] as const;

/** A problem of a pack: a sequent in a fixed calculus. */
export interface Problem {
  readonly suite: (typeof PACK_SUITES)[number];
  readonly parameter: string;
  readonly sequent: string;
}

/** A course pack. */
export interface Pack {
  readonly pack: typeof PACK_VERSION;
  readonly title: string;
  readonly search: boolean;
  readonly problems: readonly Problem[];
}

/** A student's answer to one problem: a proof's session, a model and its world, or none. */
export type Answer =
  | { readonly session: unknown }
  | { readonly model: unknown; readonly world: number | null }
  | null;

/** A hand-in: the pack and an answer per problem. */
export interface Handin {
  readonly handin: typeof HANDIN_VERSION;
  readonly pack: Pack;
  readonly answers: readonly Answer[];
}

/** Thrown by the readers below with what is wrong, where. */
class Unread extends Error {}

/** An object's own keys, held to exactly `keys`. */
function record(value: unknown, keys: readonly string[], where: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Unread(`${where} is not an object`);
  const own = Object.keys(value);
  const odd = own.find((k) => !keys.includes(k));
  if (odd) throw new Unread(`${where} has a key of its own, "${odd}"`);
  const missing = keys.find((k) => !own.includes(k));
  if (missing) throw new Unread(`${where} has no "${missing}"`);
  return value as Record<string, unknown>;
}

/** A string of at most `most` characters, trimmed; at least one where `least` is 1. */
function text(value: unknown, most: number, least: number, where: string): string {
  if (typeof value !== "string") throw new Unread(`${where} is not text`);
  const trimmed = value.trim();
  if (trimmed.length < least || trimmed.length > most)
    throw new Unread(`${where} is not ${String(least)} to ${String(most)} characters long`);
  return trimmed;
}

/** A list of `least` to `most` items. */
function list(value: unknown, least: number, most: number, where: string): unknown[] {
  if (!Array.isArray(value)) throw new Unread(`${where} is not a list`);
  if (value.length < least || value.length > most)
    throw new Unread(`${where} does not hold ${String(least)} to ${String(most)} items`);
  return value;
}

function problemOf(value: unknown, where: string): Problem {
  const r = record(value, ["suite", "parameter", "sequent"], where);
  const suite = PACK_SUITES.find((s) => s === r["suite"]);
  if (!suite) throw new Unread(`${where} is of a suite a pack does not take`);
  const parameter = text(r["parameter"], 40, 1, `${where}'s parameter`);
  if (!calculusOf(suite, "sequent", parameter))
    throw new Unread(`${where} is in a calculus the page does not know`);
  return {
    suite,
    parameter,
    sequent: text(r["sequent"], LONGEST_SEQUENT, 1, `${where}'s sequent`),
  };
}

function packOf(value: unknown): Pack {
  const r = record(value, ["pack", "title", "search", "problems"], "the pack");
  if (r["pack"] !== PACK_VERSION) throw new Unread("the pack is of another version");
  if (typeof r["search"] !== "boolean") throw new Unread("the pack's search is not true or false");
  return {
    pack: PACK_VERSION,
    title: text(r["title"], LONGEST_TITLE, 0, "the pack's title"),
    search: r["search"],
    problems: list(r["problems"], 1, MOST_PROBLEMS, "the pack's problems").map((p, i) =>
      problemOf(p, `problem ${String(i + 1)}`),
    ),
  };
}

function answerOf(value: unknown, where: string): Answer {
  if (value === null) return null;
  if (value && typeof value === "object" && "session" in value)
    return { session: record(value, ["session"], where)["session"] };
  const r = record(value, ["model", "world"], where);
  const world = r["world"];
  if (world !== null && !(Number.isInteger(world) && (world as number) >= 0))
    throw new Unread(`${where}'s world is no world`);
  return { model: r["model"], world: world as number | null };
}

function handinOf(value: unknown): Handin {
  const r = record(value, ["handin", "pack", "answers"], "the hand-in");
  if (r["handin"] !== HANDIN_VERSION) throw new Unread("the hand-in is of another version");
  const pack = packOf(r["pack"]);
  const answers = list(r["answers"], pack.problems.length, pack.problems.length, "the answers");
  return {
    handin: HANDIN_VERSION,
    pack,
    answers: answers.map((a, i) => answerOf(a, `answer ${String(i + 1)}`)),
  };
}

/** A pack read from JSON text, or why it is none. */
export function readPack(json: string): Pack | { problem: string } {
  return read(packOf, json);
}

/** A hand-in read from JSON text, or why it is none. */
export function readHandin(json: string): Handin | { problem: string } {
  return read(handinOf, json);
}

function read<T>(reader: (value: unknown) => T, json: string): T | { problem: string } {
  let value: unknown;
  try {
    value = JSON.parse(json);
  } catch {
    return { problem: "it is not JSON" };
  }
  try {
    return reader(value);
  } catch (thrown) {
    if (thrown instanceof Unread) return { problem: thrown.message };
    throw thrown;
  }
}

/** A pack's JSON with its keys in one order, so that equal packs are equal text. */
export function packText(p: Pack): string {
  return JSON.stringify({
    pack: p.pack,
    title: p.title,
    search: p.search,
    problems: p.problems.map((q) => ({
      suite: q.suite,
      parameter: q.parameter,
      sequent: q.sequent,
    })),
  });
}

/**
 * A pack's code: the first 48 bits of the SHA-256 of its JSON, as three groups of four
 * hexadecimal digits. A teacher compares a hand-in's code with their pack's: a student who changed
 * a problem would have to try some 2^47 packs to find one with the same code.
 */
export async function packCode(p: Pack): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(packText(p)));
  const hex = Array.from(new Uint8Array(digest).subarray(0, 6), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");
  return `${hex.slice(0, 4)} ${hex.slice(4, 8)} ${hex.slice(8)}`;
}

/** A hand-in's JSON. */
export const handinText = (h: Handin): string =>
  JSON.stringify({ handin: h.handin, pack: JSON.parse(packText(h.pack)), answers: h.answers });

/** Whether a document's text is a hand-in, by its first key: what an import opens in the check view. */
export const isHandin = (text: string): boolean => /^\s*\{\s*"handin"\s*:/.test(text);
