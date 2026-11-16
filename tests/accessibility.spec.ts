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
  attempting,
  cutting,
  fonts,
  learning,
  menus,
  methods,
  transforms,
  linking,
  coursing,
  customising,
  deducing,
  modalising,
  ordinary,
  pixel,
  practising,
  proving,
  reasons,
  restoring,
  toLessons,
  touring,
  type Visit,
  witnessing,
} from "./states";

/** The rule sets run: WCAG 2.0, 2.1 and 2.2 at A and AA, and axe's best practices. */
const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22a", "wcag22aa", "best-practice"];

/** The names of the rules Learn's Reference draws, read once from the built page. */
let drawn: Promise<ReadonlySet<string>> | undefined;

/**
 * The names of the rules Learn's Reference draws, each schema's name, read in a context of its
 * own (a second page of the same context would set the first one's proofs aside).
 */
function inTheReference(page: Page): Promise<ReadonlySet<string>> {
  drawn ??= (async () => {
    const context = await page.context().browser()?.newContext();
    if (!context) throw new Error("no browser to read the Reference in");
    try {
      const reference = await context.newPage();
      await reference.goto(new URL("/", page.url()).href);
      await reference.getByRole("button", { name: "Learn" }).click();
      const frame = reference.getByRole("complementary", { name: "Learn" });
      await frame.getByRole("tab", { name: "Reference" }).click();
      // Every place of the text that holds rules has its list.
      await reference.waitForFunction(() => {
        const places = [...document.querySelectorAll(".frame div")].filter((d) =>
          d.getAttributeNames().some((a) => a.startsWith("data-rules")),
        );
        return places.length > 0 && places.every((d) => d.querySelector(".rule-list > li"));
      });
      const names = await frame
        .locator(".rule-list .schema")
        .evaluateAll((schemas) => schemas.map((s) => s.getAttribute("aria-label") ?? ""));
      return new Set(names.map((name) => name.slice(0, name.indexOf(": from "))));
    } finally {
      await context.close();
    }
  })();
  return drawn;
}

/**
 * Whether a violation is one SC 2.5.8 excepts: a rule label's button under 24 pixels, or partly
 * under the stage's view controls or a sheet over the stage, whose rule Learn's Reference also
 * draws (`reference`, by name; `rules.test.ts` holds each label to the same hint there). The Reference's controls meet the criterion, so the label's function is achieved
 * through an equivalent control (the criterion's "equivalent" exception). A label's button
 * that overlaps another button of the drawing is never excepted: each label shares the gap with
 * its neighbours (`spread`), and `crowded` names those that overlap, measured here, since axe
 * names no covering element for a target under 24 pixels. A screen reader hears the hint as the
 * label's description in every case.
 */
const excepted = (
  rule: string,
  html: string,
  crowded: readonly string[],
  reference: ReadonlySet<string>,
) => {
  const name = /^<button[^>]* class="lb"[^>]* aria-label="([^"]*)"/
    .exec(html)?.[1]
    ?.replaceAll("&amp;", "&");
  const label = name === undefined ? undefined : /^Rule (.+), step \d+$/.exec(name)?.[1];
  return (
    rule === "target-size" &&
    name !== undefined &&
    label !== undefined &&
    reference.has(label) &&
    !crowded.includes(name)
  );
};

/** The names of the rule labels' buttons that overlap another button over the drawing. */
async function crowding(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const drawn = [...document.querySelectorAll<HTMLElement>(".hits button")].map((b) => ({
      b,
      r: b.getBoundingClientRect(),
    }));
    const across = (a: number, b: number, c: number, d: number) => Math.min(b, d) - Math.max(a, c);
    return drawn
      .filter(
        ({ b, r }) =>
          b.classList.contains("lb") &&
          drawn.some(
            (o) =>
              o.b !== b &&
              across(r.left, r.right, o.r.left, o.r.right) > 0.5 &&
              across(r.top, r.bottom, o.r.top, o.r.bottom) > 0.5,
          ),
      )
      .map(({ b }) => b.getAttribute("aria-label") ?? "");
  });
}

/** axe's violations on the page as it stands, one line per rule and element, with axe's reason. */
async function violations(page: Page, state: string): Promise<string[]> {
  const results = await new AxeBuilder({ page }).withTags(TAGS).analyze();
  const crowded = await crowding(page);
  const reference = await inTheReference(page);
  return results.violations.flatMap((rule) =>
    rule.nodes
      .filter((node) => !excepted(rule.id, node.html, crowded, reference))
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

/** Learn's places and a worked lesson, from the empty page. */
async function lessons(page: Page, visit: Visit) {
  await goto(page);
  await learning(page, visit);
}

/** The lessons on an attempt, a cut's elimination and a refusal, from Learn's list. */
async function attempts(page: Page, visit: Visit) {
  await goto(page);
  await toLessons(page);
  await attempting(page, visit);
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
  ["the band's menus, the status and the calculus", band],
  ["Practice and the tour", studying],
  ["Learn", lessons],
  ["Learn's attempts", attempts],
  ["the restore bar", restored],
  ["a goal's reasons", reasons],
  ["Learn's answers", answers],
  ["an ordinary tab", ordinary],
  ["a classical proof's truth table and tableau", methods],
  ["a classical proof's translations and interpolants", transforms],
  ["the workspace of linked tabs", linking],
  ["a calculus of one's own", customising],
  ["modal logic", modalising],
  ["natural deduction", deducing],
  ["the ordinary course", coursing],
  ["the witness chooser", witnessing],
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
