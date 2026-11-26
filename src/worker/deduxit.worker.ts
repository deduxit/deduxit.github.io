// deduxit © Fabian Lukas Grubmüller 2026
// Licensed under the EUPL

/**
 * The module worker that runs deduxit's WebAssembly module, so that no call
 * blocks the page. It answers the page's requests (src/lib/protocol.ts) with
 * the module's calls, plus the step tree's two that a replay is made of
 * (src/lib/steps.ts), run here so that one request rebuilds a session and
 * one terminate() stops it. The module keeps nothing between calls.
 *
 * `render`, PNG and PDF from a drawing, is the call of a second module,
 * deduxit's renderers, loaded on the first such request and kept for the
 * next: most visitors never export a PNG or a PDF, and the renderers are
 * two fifths of what the two modules weigh.
 */

import init, * as deduxit from "deduxit-web/deduxit_web.js";
import wasm from "deduxit-web/deduxit_web_bg.wasm?url";
import renderWasm from "deduxit-web/deduxit_web_render_bg.wasm?url";
import type { Played, SessionDoc } from "../lib/deduxit";
import { answer, type Request, type Response } from "../lib/protocol";
import { type Action, play, replay } from "../lib/steps";

const calls = {
  about: deduxit.about,
  defaults: deduxit.defaults,
  read: deduxit.read,
  read_as: deduxit.read_as,
  start: deduxit.start,
  view: deduxit.view,
  rules: deduxit.rules,
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
  hint: deduxit.hint,
  proof: deduxit.proof,
  term: deduxit.term,
  prove: deduxit.prove,
  draw: deduxit.draw,
  draw_net: deduxit.draw_net,
  export_as: deduxit.export_as,
  certificate: deduxit.certificate,
  ordinary_start: deduxit.ordinary_start,
  ordinary_view: deduxit.ordinary_view,
  ordinary_rules: deduxit.ordinary_rules,
  ordinary_apply: deduxit.ordinary_apply,
  ordinary_invert_all: deduxit.ordinary_invert_all,
  ordinary_undo: deduxit.ordinary_undo,
  ordinary_close: deduxit.ordinary_close,
  ordinary_hint: deduxit.ordinary_hint,
  ordinary_term: deduxit.ordinary_term,
  ordinary_draw: deduxit.ordinary_draw,
  ordinary_export: deduxit.ordinary_export,
  ordinary_model: deduxit.ordinary_model,
  ordinary_structure: deduxit.ordinary_structure,
  ordinary_model_drawing: deduxit.ordinary_model_drawing,
  ordinary_read: deduxit.ordinary_read,
  ordinary_model_certificate: deduxit.ordinary_model_certificate,
  ordinary_table: deduxit.ordinary_table,
  ordinary_tableau: deduxit.ordinary_tableau,
  ordinary_tableau_review: deduxit.ordinary_tableau_review,
  ordinary_translate: deduxit.ordinary_translate,
  ordinary_interpolate: deduxit.ordinary_interpolate,
  ordinary_normalize: deduxit.ordinary_normalize,
  ordinary_resolve: deduxit.ordinary_resolve,
  ordinary_clauses: deduxit.ordinary_clauses,
  ordinary_resolve_step: deduxit.ordinary_resolve_step,
  ordinary_refutation_check: deduxit.ordinary_refutation_check,
  rules_calculus: deduxit.rules_calculus,
  rules_read: deduxit.rules_read,
  rules_start: deduxit.rules_start,
  rules_view: deduxit.rules_view,
  rules_rules: deduxit.rules_rules,
  rules_apply: deduxit.rules_apply,
  rules_derive: deduxit.rules_derive,
  rules_cite: deduxit.rules_cite,
  rules_assume: deduxit.rules_assume,
  rules_undo: deduxit.rules_undo,
  rules_check: deduxit.rules_check,
  rules_draw: deduxit.rules_draw,
  rules_export: deduxit.rules_export,
  lambda_read: deduxit.lambda_read,
  lambda_check: deduxit.lambda_check,
  lambda_draw: deduxit.lambda_draw,
  lambda_export: deduxit.lambda_export,
  lambda_read_type: deduxit.lambda_read_type,
  lambda_inhabit: deduxit.lambda_inhabit,
  lambda_enumerate: deduxit.lambda_enumerate,
  modal_read: deduxit.modal_read,
  modal_decide: deduxit.modal_decide,
  modal_countermodel: deduxit.modal_countermodel,
  modal_evaluate: deduxit.modal_evaluate,
  modal_draw: deduxit.modal_draw,
  modal_export: deduxit.modal_export,
  modal_calculus: deduxit.modal_calculus,
  workspace_statement: deduxit.workspace_statement,
  workspace_open: deduxit.workspace_open,
  workspace_edit: deduxit.workspace_edit,
  workspace_undo: deduxit.workspace_undo,
  workspace_redo: deduxit.workspace_redo,
  workspace_compute: deduxit.workspace_compute,
  workspace_accept: deduxit.workspace_accept,
  workspace_run: deduxit.workspace_run,
  workspace_view: deduxit.workspace_view,
  workspace_pack: deduxit.workspace_pack,
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

type Renderers = typeof import("deduxit-web/deduxit_web_render.js");
let renderers: Promise<Renderers> | undefined;

/**
 * The renderers' module, loaded on the first call and kept. One that failed to load is tried
 * again at the next call; a browser may keep a failed import of the glue for this worker's life.
 */
function loadRenderers(): Promise<Renderers> {
  renderers ??= import("deduxit-web/deduxit_web_render.js").then(async (module) => {
    await module
      .default({ module_or_path: renderWasm })
      .catch(() => module.default({ module_or_path: fetch(renderWasm, { cache: "no-store" }) }));
    return module;
  });
  renderers.catch(() => {
    renderers = undefined;
  });
  return renderers;
}

scope.onmessage = async (event) => {
  if (event.data.call === "render") {
    let module: Renderers;
    try {
      module = await loadRenderers();
    } catch (thrown) {
      scope.postMessage({
        id: event.data.id,
        ok: false,
        error: `the PNG and PDF renderers did not load: ${String(thrown)}`,
      });
      return;
    }
    reply(answer({ render: module.render }, event.data));
    return;
  }
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
  reply(answer(calls, event.data));
};

/** Posts an answer to the page, a render's bytes transferred, not copied. */
function reply(response: Response) {
  const transfer =
    response.ok && response.value instanceof Uint8Array
      ? [response.value.buffer as ArrayBuffer]
      : [];
  scope.postMessage(response, transfer);
}
