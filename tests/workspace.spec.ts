// deduxit © Fabian Lukas Grubmüller 2026
// Licensed under the EUPL

// Sequents made from one another: "Prove it in" opens a translation as a sequent of its own, a
// copy of a proof is a view beside it in its chip's rail, and a link of either opens the whole
// group, the linked one shown. The workspace document links them.

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

/** Adds Glivenko's translation from "+ view" and proves the translation as a new sequent. */
async function proveTranslation(page: Page) {
  await addView(page, "Glivenko");
  const view = page.getByRole("region", { name: "Glivenko's translation" });
  await expect(view.getByRole("status")).toContainText("Both valid");
  await view.getByRole("button", { name: "Prove it in LJ" }).click();
  await expect(page.locator(".chip")).toHaveCount(2);
}

test("a translation proved opens as a sequent of its own, chosen at the top", async ({ page }) => {
  await classical(page, "|- a \\/ ~a");
  await proveTranslation(page);
  await expect(page.locator(".chip[aria-selected=true]")).toContainText("¬¬(a ∨ ¬a)");
  await expect(page.getByRole("tab", { name: /^Sequent calculus, LJ/ })).toBeVisible();
});

test("a copy of a proof is a view beside it, of the same sequent", async ({ page }) => {
  await classical(page, "|- a \\/ ~a");
  await addView(page, "A copy of this proof");
  await expect(page.locator(".chip")).toHaveCount(1);
  await expect(page.getByRole("tab", { name: /^Sequent calculus, LK, a copy/ })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await expect(page.getByRole("textbox", { name: "Sequent" })).toHaveValue("⊢ a ∨ ¬a");
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
  await expect(page.locator(".chip")).toHaveCount(2);
  await expect.poll(() => page.evaluate(() => location.hash)).toMatch(/^#v=3&/);
  await page.waitForTimeout(600);
  const hash = await page.evaluate(() => location.hash);
  const fresh = await page.context().newPage();
  await fresh.goto(`/${hash}`);
  // The copy joins the proof it was copied from, as a view beside it.
  await expect(fresh.locator(".chip")).toHaveCount(2);
  await expect(fresh.getByRole("tab", { name: /, a copy/ })).toBeVisible();
});
