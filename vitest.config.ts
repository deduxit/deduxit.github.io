// linlog © Fabian Lukas Grubmüller 2026
// Licensed under the EUPL

// Unit tests: plain TypeScript next to the code it tests (src/**/*.test.ts),
// in Node. Some run deduxit's real module, through the same alias the site
// uses (.cache/deduxit-web, linked by the dev shell and the sandbox). The
// browser-level tests are Playwright's (tests/).
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "deduxit-web": fileURLToPath(new URL(".cache/deduxit-web", import.meta.url)),
    },
  },
  test: {
    include: ["src/**/*.test.ts"],
  },
});
