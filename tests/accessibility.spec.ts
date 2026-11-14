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
  answers,
  cutting,
  learning,
  menus,
  ordinary,
  pixel,
  practising,
  proving,
  reasons,
  restoring,
  touring,
  type Visit,
  witnessing,
} from "./states";

/** The rule sets run: WCAG 2.0, 2.1 and 2.2 at A and AA, and axe's best practices. */
const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22a", "wcag22aa", "best-practice"];

/**
 * Whether a violation is the exception this audit lists: a rule label's button over a drawing
 * fitted to a phone overlaps its neighbours (SC 2.5.8). What it opens, the rule's hint, is
 * also in Learn's Reference, whose controls meet the criterion: SC 2.5.8's "equivalent"
 * exception. A screen reader hears the hint as the label's description.
 */
const excepted = (rule: string, html: string) =>
  rule === "target-size" && /^<button[^>]* class="lb"/.test(html);

/** axe's violations on the page as it stands, one line per rule and element, with axe's reason. */
async function violations(page: Page, state: string): Promise<string[]> {
  const results = await new AxeBuilder({ page }).withTags(TAGS).analyze();
  return results.violations.flatMap((rule) =>
    rule.nodes
      .filter((node) => !excepted(rule.id, node.html))
      .map((node) => {
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

/** A proof begun, then the restore bar after a reload. */
async function restored(page: Page, visit: Visit) {
  await start(page, "A * B |- B * A");
  await restoring(page, visit);
}

/** The band's menus, the status and the calculus, on a proof closed. */
async function band(page: Page, visit: Visit) {
  await proveCommuted(page);
  await menus(page, visit);
}

/** Practice and the tour, from the empty page. */
async function studying(page: Page, visit: Visit) {
  await goto(page);
  await practising(page, visit);
  await touring(page, visit);
}

/** Learn's states, from the empty page. */
async function lessons(page: Page, visit: Visit) {
  await goto(page);
  await learning(page, visit);
}

/** The walks, each a test of its own so that each stays within the time a test has. */
const WALKS: readonly (readonly [string, (page: Page, visit: Visit) => Promise<void>])[] = [
  ["the other pages", pages],
  ["a proof and its popovers", proving],
  ["the band's menus, the status and the calculus", band],
  ["Practice and the tour", studying],
  ["Learn", lessons],
  ["the restore bar", restored],
  ["a goal's reasons", reasons],
  ["Learn's answers", answers],
  ["an ordinary tab", ordinary],
  ["the witness chooser", witnessing],
  ["the cut chooser and the elimination", cutting],
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
