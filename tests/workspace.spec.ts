// deduxit © Fabian Lukas Grubmüller 2026
// Licensed under the EUPL

// Sequents made from one another: "Prove it in" opens a translation as a sequent of its own, a
// copy of a proof is one too, and a link of either opens the whole group, the linked one shown.
// The workspace document links them as before; the page shows them as chips.

import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";
import { addView, calculus, goto } from "./prover";

/** Starts a sequent in classical ordinary logic. */
async function classical(page: Page, sequent: string) {
  await goto(page);
  await calculus(page, ["Ordinary", "Classical"]);
  await page.getByRole("textbox", { name: "Sequent" }).fill(sequent);
  await page.getByRole("textbox", { name: "Sequent" }).press("Enter");
  await expect(page.locator(".stage .fb").first()).toBeVisible();
}

/** Opens the translation's sheet from "+ view" and proves the translation as a new sequent. */
async function proveTranslation(page: Page) {
  await addView(page, "Into intuitionistic logic");
  const sheet = page.getByRole("dialog", { name: "Translate into intuitionistic logic" });
  await expect(sheet.getByRole("status")).toContainText("Both valid");
  await sheet.getByRole("button", { name: "Prove it in intuitionistic logic" }).click();
  await expect(page.locator(".chip")).toHaveCount(2);
}

test("a translation proved opens as a sequent of its own, chosen at the top", async ({ page }) => {
  await classical(page, "|- a \\/ ~a");
  await proveTranslation(page);
  await expect(page.locator(".chip[aria-selected=true]")).toContainText("¬¬(a ∨ ¬a)");
  await expect(page.getByRole("tab", { name: /^Sequent calculus, LJ/ })).toBeVisible();
});

test("a copy of a proof opens as a sequent of its own, with the same sequent", async ({ page }) => {
  await classical(page, "|- a \\/ ~a");
  await addView(page, "A copy of this proof");
  await expect(page.locator(".chip")).toHaveCount(2);
  await expect(page.locator(".chip").nth(1)).toContainText("a ∨ ¬a");
});

test("a link of a translation's sequent opens its group, the linked one shown", async ({
  page,
}) => {
  await classical(page, "|- a \\/ ~a");
  await proveTranslation(page);
  // The link is written a moment after each change: the last one names the translation's tab.
  await expect.poll(() => page.evaluate(() => location.hash)).toMatch(/^#v=3&/);
  await page.waitForTimeout(600);
  const hash = await page.evaluate(() => location.hash);
  const fresh = await page.context().newPage();
  await fresh.goto(`/${hash}`);
  await expect(fresh.locator(".chip")).toHaveCount(2);
  await expect(fresh.locator(".chip[aria-selected=true]")).toContainText("¬¬(a ∨ ¬a)");
  await expect(fresh.getByText("This link holds 2 linked tabs.")).toBeVisible();
});

test("a link holds the shown sequent's whole group", async ({ page }) => {
  await classical(page, "|- a \\/ ~a");
  await proveTranslation(page);
  await page.locator(".chip").first().click();
  await addView(page, "A copy of this proof");
  await expect(page.locator(".chip")).toHaveCount(3);
  await expect.poll(() => page.evaluate(() => location.hash)).toMatch(/^#v=3&/);
  await page.waitForTimeout(600);
  const hash = await page.evaluate(() => location.hash);
  const fresh = await page.context().newPage();
  await fresh.goto(`/${hash}`);
  await expect(fresh.locator(".chip")).toHaveCount(3);
});
