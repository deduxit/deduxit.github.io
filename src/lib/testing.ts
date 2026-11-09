// deduxit © Fabian Lukas Grubmüller 2026
// Licensed under the EUPL

/**
 * deduxit's real module in Node, for the unit tests: the bindings the site
 * loads (.cache/deduxit-web), instantiated from their bytes.
 */

import { readFileSync } from "node:fs";
import * as deduxit from "deduxit-web/deduxit_web.js";

deduxit.initSync({
  module: readFileSync(new URL("../../.cache/deduxit-web/deduxit_web_bg.wasm", import.meta.url)),
});

export { deduxit };
