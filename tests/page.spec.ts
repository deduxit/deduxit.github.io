// deduxit © Fabian Lukas Grubmüller 2026
// Licensed under the EUPL

import type { Locator } from "@playwright/test";
import { expect, test } from "./fixtures";

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

test("the header and the 404 page show deduxit's word mark, its long marks in lapis", async ({
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
    ["light", "rgb(36, 86, 201)", "rgb(18, 26, 46)"],
    ["dark", "rgb(122, 167, 255)", "rgb(227, 232, 244)"],
  ] as const) {
    await page.emulateMedia({ colorScheme: scheme });
    await page.goto("/");
    const mark = page.locator("header.band.top").getByRole("button", { name: "deduxit" });
    await expect(mark).toBeVisible();
    expect((await mark.boundingBox())?.height).toBeCloseTo(30, 0);
    expect(await macrons(mark)).toEqual([lapis, lapis]);
    expect(await letters(mark)).toBe(ink);
    await page.goto("/no-such-page");
    const home = page.getByRole("link", { name: "deduxit", exact: true });
    await expect(home).toHaveAttribute("href", "/");
    await expect(home.getByRole("img", { name: "deduxit" })).toBeVisible();
    expect(await macrons(home)).toEqual([lapis, lapis]);
  }
});

/** The dictionary line of the mark's word, as the page sets it. */
const DICTIONARY =
  'dēdūxit [deːˈduːk.sɪt] Latin, verb: "it has derived", the perfect of dēdūcō, to lead down, derive.';

test("the band's mark shows its dictionary line on hover, keeps it under the pointer, and Escape dismisses it", async ({
  page,
}) => {
  await page.goto("/");
  const mark = page.locator("header.band.top").getByRole("button", { name: "deduxit" });
  const card = page.getByRole("tooltip").filter({ hasText: "dēdūxit" });
  await expect(card).toBeHidden();
  await mark.hover();
  await expect(card).toBeVisible();
  await expect(card).toHaveText(DICTIONARY);
  // The pointer moves from the mark onto the card, across the gap, and back, and the card stays.
  const from = await mark.boundingBox();
  const to = await card.boundingBox();
  if (!from || !to) throw new Error("the mark or its card has no box");
  const onMark = [from.x + from.width / 2, from.y + from.height / 2] as const;
  await page.mouse.move(...onMark);
  await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 8 });
  await expect(card).toBeVisible();
  await page.mouse.move(...onMark, { steps: 8 });
  await expect(card).toBeVisible();
  // Escape dismisses it with the pointer still on the mark, until the pointer leaves.
  await page.keyboard.press("Escape");
  await expect(card).toBeHidden();
  await page.mouse.move(onMark[0] + 4, onMark[1]);
  await expect(card).toBeHidden();
  await page.getByRole("textbox", { name: "Sequent" }).hover();
  await mark.hover();
  await expect(card).toBeVisible();
});

test("the band's mark is reached by the keyboard and by a click, describes itself by its dictionary line, and Escape dismisses it", async ({
  page,
}) => {
  await page.goto("/");
  const mark = page.locator("header.band.top").getByRole("button", { name: "deduxit" });
  await expect(mark).toHaveAccessibleDescription(DICTIONARY);
  const card = page.getByRole("tooltip").filter({ hasText: "dēdūxit" });
  // The keyboard reaches the mark back from the sequent field, which the page opens with.
  await page.getByRole("textbox", { name: "Sequent" }).focus();
  const focused = () => mark.evaluate((el) => el === document.activeElement);
  for (let stops = 0; stops < 10 && !(await focused()); stops++)
    await page.keyboard.press("Shift+Tab");
  await expect(mark).toBeFocused();
  await expect(card).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(card).toBeHidden();
  await expect(mark).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(mark).not.toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(card).toBeVisible();
  // A click keeps the card under the mark until the focus leaves.
  await page.getByRole("textbox", { name: "Sequent" }).click();
  await expect(card).toBeHidden();
  await mark.click();
  await page.getByRole("textbox", { name: "Sequent" }).hover();
  await expect(card).toBeVisible();
  await page.getByRole("textbox", { name: "Sequent" }).click();
  await expect(card).toBeHidden();
});

test("the Rocq library's old address forwards to its new one", async ({ page }) => {
  const forward = await page.goto("/rocq-linlog/");
  expect(forward?.status()).toBe(200);
  await page.waitForURL("/rocq-deduxit/");
  await expect(page.getByRole("heading", { name: "rocq-deduxit's documentation" })).toBeVisible();
});

test("the pictograms are Lucide's, hidden from a screen reader, each action named", async ({
  page,
}) => {
  await page.goto("/");
  const icons = page.locator(".band svg.lucide");
  expect(await icons.count()).toBeGreaterThanOrEqual(14);
  for (const icon of await icons.all()) {
    await expect(icon).toHaveAttribute("aria-hidden", "true");
    await expect(icon).toHaveAttribute("class", /lucide-[a-z0-9-]+/);
  }
  // An icon alone names its action, and shows its tip on focus as on hover.
  for (const name of ["Undo", "Redo", "New proof"]) {
    await expect(page.getByRole("button", { name, exact: true })).toBeAttached();
  }
  await page.getByRole("button", { name: "New proof" }).focus();
  await expect(page.getByRole("tooltip")).toHaveText(/A new proof/);
});

test("the privacy page is served, names who is responsible, cites a source for each statement, and About and the band link it", async ({
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
  await page.locator("footer").getByRole("link", { name: "Privacy" }).click();
  await expect(page).toHaveURL(/\/privacy\/$/);
  await page.goto("/");
  await page.locator("footer").getByRole("button", { name: "About" }).click();
  const line = page.getByRole("dialog", { name: "About" }).locator(".privacy");
  await expect(line).toContainText("logs every visitor's IP address");
  await line.getByRole("link", { name: "the privacy page" }).click();
  await expect(page).toHaveURL(/\/privacy\/$/);
  await page.goto("/no/such/page");
  await expect(page.getByRole("link", { name: "Privacy" })).toHaveAttribute("href", "/privacy/");
});
