// deduxit © Fabian Lukas Grubmüller 2026
// Licensed under the EUPL

/**
 * The module worker that runs deduxit's WebAssembly module, so that no call
 * blocks the page. It answers the page's requests (src/lib/protocol.ts) with
 * the module's calls, plus the step tree's two that a replay is made of
 * (src/lib/steps.ts), run here so that one request rebuilds a session and
 * one terminate() stops it. The module keeps nothing between calls.
 */

import init, * as deduxit from "deduxit-web/deduxit_web.js";
import wasm from "deduxit-web/deduxit_web_bg.wasm?url";
import type { Played, SessionDoc } from "../lib/deduxit";
import { answer, type Request } from "../lib/protocol";
import { type Action, play, replay } from "../lib/steps";

const calls = {
  about: deduxit.about,
  defaults: deduxit.defaults,
  read: deduxit.read,
  read_as: deduxit.read_as,
  start: deduxit.start,
  view: deduxit.view,
  rules: deduxit.rules,
  split_passes: deduxit.split_passes,
  apply: deduxit.apply,
  cut: deduxit.cut,
  cuts: deduxit.cuts,
  cut_step: deduxit.cut_step,
  eliminate: deduxit.eliminate,
  net_cuts: deduxit.net_cuts,
  net_cut_step: deduxit.net_cut_step,
  net_eliminate: deduxit.net_eliminate,
  undo: deduxit.undo,
  invert_all: deduxit.invert_all,
  close: deduxit.close,
  close_all: deduxit.close_all,
  fill: deduxit.fill,
  hint: deduxit.hint,
  proof: deduxit.proof,
  term: deduxit.term,
  prove: deduxit.prove,
  draw: deduxit.draw,
  draw_net: deduxit.draw_net,
  export_as: deduxit.export_as,
  render: deduxit.render,
  certificate: deduxit.certificate,
  ordinary_start: deduxit.ordinary_start,
  ordinary_view: deduxit.ordinary_view,
  ordinary_rules: deduxit.ordinary_rules,
  ordinary_apply: deduxit.ordinary_apply,
  ordinary_undo: deduxit.ordinary_undo,
  ordinary_close: deduxit.ordinary_close,
  ordinary_hint: deduxit.ordinary_hint,
  ordinary_term: deduxit.ordinary_term,
  ordinary_draw: deduxit.ordinary_draw,
  ordinary_export: deduxit.ordinary_export,
  replay: (session: string, todo: string, settings: string) =>
    JSON.stringify(
      replay(deduxit, JSON.parse(session) as SessionDoc, JSON.parse(todo) as Action[], settings),
    ),
  play: (start: string, todo: string, settings: string) =>
    JSON.stringify(
      play(deduxit, JSON.parse(start) as Played, JSON.parse(todo) as Action[], settings),
    ),
};

const scope = self as unknown as {
  onmessage: ((event: MessageEvent<Request>) => void) | null;
  postMessage(message: unknown, transfer?: Transferable[]): void;
};

// Chromium sometimes fails to write the module's response to its HTTP cache
// (net::ERR_CACHE_WRITE_FAILURE, seen with the 6.9 MB module), which aborts the
// streaming compile: the module is fetched once more, past the cache.
const ready = init({ module_or_path: wasm }).catch(() =>
  init({ module_or_path: fetch(wasm, { cache: "no-store" }) }),
);

scope.onmessage = async (event) => {
  try {
    await ready;
  } catch (thrown) {
    scope.postMessage({
      id: event.data.id,
      ok: false,
      error: `the module did not load: ${String(thrown)}`,
    });
    return;
  }
  const response = answer(calls, event.data);
  const transfer =
    response.ok && response.value instanceof Uint8Array
      ? [response.value.buffer as ArrayBuffer]
      : [];
  scope.postMessage(response, transfer);
};
