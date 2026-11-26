// deduxit © Fabian Lukas Grubmüller 2026
// Licensed under the EUPL

// axe-core's rules for WCAG 2.2 at levels A and AA, and its best practices,
// on every page of the site and in every state of the prover's walk
// (tests/states.ts), in both colour schemes at a desktop's and a phone's
// width. A test fails on any violation; what axe cannot decide by itself
// (its "incomplete" results) is checked by hand and not asserted here.

import AxeBuilder from "@axe-core/playwright";
import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";
import { goto, proveCommuted, start } from "./prover";
import {
  clausal,
  cutting,
  deducing,
  exporting,
  fonts,
  lambdaing,
  linking,
  menus,
  framePages,
  methods,
  modalising,
  ordinary,
  packing,
  pixel,
  proving,
  reasons,
  restoring,
  touring,
  transforms,
  type Visit,
  witnessing,
  countermodeling,
} from "./states";

/** The rule sets run: WCAG 2.0, 2.1 and 2.2 at A and AA, and axe's best practices. */
const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22a", "wcag22aa", "best-practice"];

/** axe's violations on the page as it stands, one line per rule and element, with axe's reason. */
async function violations(page: Page, state: string): Promise<string[]> {
  const results = await new AxeBuilder({ page }).withTags(TAGS).analyze();
  return results.violations.flatMap((rule) =>
    rule.nodes.map((node) => {
      const why = [...node.any, ...node.all, ...node.none].map((check) => check.message);
      return `${state}: ${rule.id} at ${node.target.join(" ")}: ${why.join("; ") || rule.help}`;
    }),
  );
}

/** Every violation in each state the walk `through` visits. */
async function audited(
  page: Page,
  through: (page: Page, visit: Visit) => Promise<void>,
): Promise<string[]> {
  const found: string[] = [];
  await through(page, async (state) => {
    found.push(...(await violations(page, state)));
  });
  return found;
}

/** The pages beside the prover: privacy, the 404 page, and the Rocq library's old address. */
async function pages(page: Page, visit: Visit) {
  await page.goto("/privacy/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await visit("privacy");
  await page.goto("/no/such/page");
  await expect(page.getByRole("heading", { name: "Not found" })).toBeVisible();
  await visit("404");
  // The old address forwards at once; its refresh is taken out so that the page stays to be read.
  await page.route("**/rocq-linlog/", async (route) => {
    const response = await route.fetch();
    const body = (await response.text()).replace(/<meta http-equiv="refresh"[^>]*>/, "");
    await route.fulfill({ response, body });
  });
  await page.goto("/rocq-linlog/");
  await expect(page.getByRole("link", { name: "its documentation" })).toBeVisible();
  await visit("rocq-linlog");
}

/** A proof begun, then the new tab view's "Restore N proofs" and "Close every sequent". */
async function restored(page: Page, visit: Visit) {
  await start(page, "A * B |- B * A");
  await restoring(page, visit);
}

/** The tools' panels and the list of views, on a proof closed. */
async function panels(page: Page, visit: Visit) {
  await proveCommuted(page);
  await menus(page, visit);
}

/** Settings, the keys, the guide, the restart warning, the new tab view's examples and About. */
async function settled(page: Page, visit: Visit) {
  await proveCommuted(page);
  await framePages(page, visit);
}

/** The tour, from the new tab view. */
async function toured(page: Page, visit: Visit) {
  await proveCommuted(page);
  await touring(page, visit);
}

/** The stage in each math font, from the empty page. */
async function typeset(page: Page, visit: Visit) {
  await goto(page);
  await fonts(page, visit);
}

/** The walks, each a test of its own so that each stays within the time a test has. */
const WALKS: readonly (readonly [string, (page: Page, visit: Visit) => Promise<void>])[] = [
  ["the other pages", pages],
  ["a proof and its popovers", proving],
  ["the tools' panels and the list of views", panels],
  ["the Export panel", exporting],
  ["Settings, the keys, the guide and About", settled],
  ["the tour", toured],
  ["restoring and closing every sequent", restored],
  ["a goal's reasons", reasons],
  ["an ordinary sequent", ordinary],
  ["a classical proof's truth table and tableau", methods],
  ["a classical proof's translations and interpolants", transforms],
  ["a classical proof's normal forms and resolution", clausal],
  ["a translation proved and a copy", linking],
  ["modal logic", modalising],
  ["lambda-terms", lambdaing],
  ["course packs", packing],
  ["natural deduction", deducing],
  ["the witness's box", witnessing],
  ["the countermodel view of a first-order sequent", countermodeling],
  ["the cut chooser and the elimination", cutting],
  ["the stage in each math font", typeset],
];

for (const colorScheme of ["light", "dark"] as const) {
  test.describe(`in the ${colorScheme} scheme`, () => {
    test.use({ colorScheme });
    for (const [what, walk] of WALKS)
      test(`axe finds no violation in ${what}, at a desktop's width`, async ({ page }) => {
        expect(await audited(page, walk)).toEqual([]);
      });

    test.describe("at a phone's width", () => {
      test.use(pixel);
      for (const [what, walk] of WALKS)
        test(`axe finds no violation in ${what}`, async ({ page }) => {
          expect(await audited(page, walk)).toEqual([]);
        });
    });
  });
}
