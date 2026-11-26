// deduxit © Fabian Lukas Grubmüller 2026
// Licensed under the EUPL

import type { Locator, Page } from "@playwright/test";
import { expect, test } from "./fixtures";
import { start } from "./prover";

test("the page loads without an error in both schemes", async ({ page }) => {
  for (const colorScheme of ["light", "dark"] as const) {
    const errors: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });
    page.on("pageerror", (error) => errors.push(error.message));
    await page.emulateMedia({ colorScheme });
    await page.goto("/");
    await expect(page.getByRole("textbox", { name: "Sequent" })).toBeVisible();
    expect(errors).toEqual([]);
  }
});

test("a path that holds no page answers 404 with the site's own page", async ({ page }) => {
  const response = await page.goto("/no/such/page");
  expect(response?.status()).toBe(404);
  await expect(page.getByRole("heading", { name: "Not found" })).toBeVisible();
  await page.getByRole("link", { name: "The prover" }).click();
  await expect(page.getByRole("textbox", { name: "Sequent" })).toBeVisible();
});

test("a page under the Rocq library's old path forwards to its new path", async ({ page }) => {
  await page.goto("/rocq-linlog/Linlog.Calculus.html#ll");
  await page.waitForURL("**/rocq-deduxit/Linlog.Calculus.html#ll");
});

test("the policy is in force: inline code the build did not hash is refused", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("textbox", { name: "Sequent" })).toBeVisible();
  const outcome = await page.evaluate(async () => {
    const script = document.createElement("script");
    script.textContent = "window.__ran = true";
    document.body.append(script);
    const box = document.createElement("div");
    box.innerHTML = '<p style="color: red">x</p>';
    document.body.append(box);
    await new Promise((resolve) => setTimeout(resolve, 100));
    const state = window as unknown as { __ran?: boolean; __blocked: string[] };
    const blocked = state.__blocked.splice(0);
    return { ran: state.__ran === true, blocked: blocked.map((b) => b.split(" ")[0]) };
  });
  expect(outcome.ran).toBe(false);
  expect(outcome.blocked).toEqual(expect.arrayContaining(["script-src-elem", "style-src-attr"]));
});

test("the top row and the 404 page show deduxit's word mark, its long marks in lapis", async ({
  page,
}) => {
  const macrons = (mark: Locator) =>
    mark
      .locator("rect")
      .evaluateAll((rects: Element[]) => rects.map((rect) => getComputedStyle(rect).fill));
  const letters = (mark: Locator) =>
    mark
      .locator("path")
      .first()
      .evaluate((path: Element) => getComputedStyle(path).fill);
  for (const [scheme, lapis, ink] of [
    ["light", "rgb(36, 86, 201)", "rgb(21, 24, 33)"],
    ["dark", "rgb(122, 167, 255)", "rgb(236, 238, 243)"],
  ] as const) {
    await page.emulateMedia({ colorScheme: scheme });
    await page.goto("/");
    const mark = page.locator("header.top-row .mark-word");
    await expect(mark).toBeVisible();
    expect((await mark.locator("svg").boundingBox())?.height).toBeCloseTo(30, 0);
    expect(await macrons(mark)).toEqual([lapis, lapis]);
    expect(await letters(mark)).toBe(ink);
    await page.goto("/no-such-page");
    const home = page.getByRole("link", { name: "deduxit", exact: true });
    await expect(home).toHaveAttribute("href", "/");
    await expect(home.getByRole("img", { name: "deduxit" })).toBeVisible();
    expect(await macrons(home)).toEqual([lapis, lapis]);
  }
});

test("the Rocq library's old address forwards to its new one", async ({ page }) => {
  const forward = await page.goto("/rocq-linlog/");
  expect(forward?.status()).toBe(200);
  await page.waitForURL("/rocq-deduxit/");
  await expect(page.getByRole("heading", { name: "rocq-deduxit's documentation" })).toBeVisible();
});

test("the signs are the page's own, hidden from a screen reader, each control named", async ({
  page,
}) => {
  await start(page, "A * B |- B * A");
  const icons = page.locator(":is(.top-row, .tools) svg.icon");
  expect(await icons.count()).toBeGreaterThanOrEqual(14);
  for (const icon of await icons.all()) {
    await expect(icon).toHaveAttribute("aria-hidden", "true");
    await expect(icon).toHaveAttribute("class", /icon-[a-zA-Z]+/);
    await expect(icon).toHaveAttribute("viewBox", "0 0 18 18");
  }
  // An icon alone names its control, and shows its tip on focus as on hover.
  for (const name of ["Undo", "Redo", "New sequent"]) {
    await expect(page.getByRole("button", { name, exact: true })).toBeAttached();
  }
  await page.getByRole("button", { name: "New sequent", exact: true }).focus();
  await expect(page.getByRole("tooltip")).toHaveText(/New sequent/);
});

/**
 * Each control of the top row and of the tools that overlaps another, or whose icon or name is
 * drawn outside it or over another of its parts, described.
 */
async function frameClashes(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const name = (b: Element) => b.getAttribute("aria-label") ?? b.textContent?.trim() ?? "";
    const across = (a: number, b: number, c: number, d: number) => Math.min(b, d) - Math.max(a, c);
    const overlap = (r: DOMRect, q: DOMRect) =>
      across(r.left, r.right, q.left, q.right) > 0.5 &&
      across(r.top, r.bottom, q.top, q.bottom) > 0.5;
    /** A control's box as it is seen: cut to every ancestor that scrolls (the row of chips). */
    const seen = (b: Element) => {
      const r = b.getBoundingClientRect();
      let [left, right] = [r.left, r.right];
      for (let a = b.parentElement; a; a = a.parentElement) {
        if (getComputedStyle(a).overflowX === "visible") continue;
        const c = a.getBoundingClientRect();
        left = Math.max(left, c.left);
        right = Math.min(right, c.right);
      }
      return new DOMRect(left, r.top, Math.max(0, right - left), r.height);
    };
    const actions = [...document.querySelectorAll(":is(.top-row, .tools) :is(button, a[href])")]
      .filter((b) => b.checkVisibility({ visibilityProperty: true }))
      .map((b) => ({ b, r: b.getBoundingClientRect(), v: seen(b) }))
      .filter(({ v }) => v.width > 0);
    const clashes: string[] = [];
    for (const { b, r } of actions) {
      // A label kept for a screen reader alone is clipped away and draws nothing.
      const parts = [...b.children]
        .filter(
          (p) =>
            p.checkVisibility({ visibilityProperty: true }) &&
            getComputedStyle(p).clipPath === "none",
        )
        .map((p) => ({ p, q: p.getBoundingClientRect() }));
      for (const [i, { p, q }] of parts.entries()) {
        const part = `${p.tagName.toLowerCase()}.${p.getAttribute("class")} of ${name(b)}`;
        if (q.left < r.left - 0.5 || q.right > r.right + 0.5) clashes.push(`${part} outside it`);
        for (const { p: o, q: s } of parts.slice(i + 1))
          if (overlap(q, s)) clashes.push(`${part} over its ${o.tagName.toLowerCase()}`);
      }
      for (const { b: o, v: q } of actions)
        if (o !== b && !b.contains(o) && !o.contains(b) && overlap(seen(b), q))
          clashes.push(`${name(b)} over ${name(o)}`);
    }
    return clashes;
  });
}

test("the top row's and the tools' controls and their names stand apart at every width, the guide off and on", async ({
  page,
}) => {
  const widths = [320, 412, 599, 600, 800, 839, 840, 1024, 1280, 1920, 2560];
  await start(page, "A * B |- B * A");
  for (const guide of [false, true]) {
    if (guide) await page.getByRole("button", { name: "Guide", exact: true }).click();
    for (const width of widths) {
      await page.setViewportSize({ width, height: 800 });
      expect(await frameClashes(page), `${width}, the guide ${guide ? "on" : "off"}`).toEqual([]);
    }
  }
});

test("the privacy page is served, names who is responsible, cites a source for each statement, and About and Settings link it", async ({
  page,
}) => {
  const response = await page.goto("/privacy/");
  expect(response?.status()).toBe(200);
  await expect(page.getByRole("heading", { level: 1, name: "Privacy" })).toBeVisible();
  const main = page.locator("main");
  await expect(main).toContainText("Fabian Lukas Grubmüller");
  await expect(page.getByRole("link", { name: "privacy@grubmueller.dev" })).toHaveAttribute(
    "href",
    "mailto:privacy@grubmueller.dev",
  );
  await expect(main).not.toContainText("Impressum");
  // Every citation leads to a listed source, and every source is cited.
  const cited = new Set(
    await page.locator("a.cite").evaluateAll((links) => links.map((a) => a.getAttribute("href"))),
  );
  const listed = await page
    .locator(".sources li")
    .evaluateAll((items) => items.map((li) => `#${li.id}`));
  expect([...cited].sort()).toEqual([...listed].sort());
  await expect(main).toContainText("information, not legal advice");

  await page.goto("/");
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.getByRole("link", { name: "Privacy" }).click();
  await expect(page).toHaveURL(/\/privacy\/$/);
  await page.goto("/");
  await page
    .getByRole("region", { name: "New sequent" })
    .getByRole("button", { name: "About" })
    .click();
  const line = page.getByRole("dialog", { name: "About" }).locator(".privacy");
  await expect(line).toContainText("logs every visitor's IP address");
  await line.getByRole("link", { name: "the privacy page" }).click();
  await expect(page).toHaveURL(/\/privacy\/$/);
  await page.goto("/no/such/page");
  await expect(page.getByRole("link", { name: "Privacy" })).toHaveAttribute("href", "/privacy/");
});
