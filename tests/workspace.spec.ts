// deduxit © Fabian Lukas Grubmüller 2026
// Licensed under the EUPL

// The workspace of linked tabs: nothing of it before the first link; "Prove it in" links the
// translation's tab to the tab it came from, under a line that says how; a changed sequent puts
// the tab made from it out of date until Start again; the workspace's Undo takes back whole
// changes by name; a copy is a link too; the graph shows the same tabs in columns.

import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";
import { calculus, goto, switches } from "./prover";

/** Starts a sequent in a classical ordinary tab. */
async function classical(page: Page, sequent: string) {
  await goto(page);
  await calculus(page, ["Ordinary", "Classical"]);
  await page.getByRole("textbox", { name: "Sequent" }).fill(sequent);
  await page.getByRole("textbox", { name: "Sequent" }).press("Enter");
  await expect(page.locator(".stage .fb").first()).toBeVisible();
}

/** Opens the translation's sheet and proves the translation on a new tab. */
async function proveTranslation(page: Page) {
  const pop = await switches(page);
  await pop.getByRole("button", { name: "Translate into intuitionistic logic" }).click();
  const sheet = page.getByRole("dialog", { name: "Translate into intuitionistic logic" });
  await expect(sheet.getByRole("status")).toContainText("Both valid");
  await sheet.getByRole("button", { name: "Prove it in intuitionistic logic" }).click();
  await expect(page.locator(".ptab")).toHaveCount(2);
}

/** The panel of linked tabs where it docks. */
const panel = (page: Page) => page.getByRole("region", { name: "Workspace" });

test("one sequent shows nothing of the workspace", async ({ page }) => {
  await classical(page, "|- a \\/ ~a");
  await expect(page.getByRole("button", { name: /^Workspace/ })).toHaveCount(0);
  await expect(page.locator(".ws-stage[data-docked]")).toHaveCount(0);
});

test("a translation proved on a new tab is linked under a line that says how", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await classical(page, "|- a \\/ ~a");
  await proveTranslation(page);
  await expect(page.getByRole("button", { name: "Workspace, 2 linked tabs" })).toBeVisible();
  const ws = panel(page);
  await expect(ws).toBeVisible();
  await expect(ws).toContainText(
    "These are your linked tabs. The line above a tab says what it was made from.",
  );
  await expect(ws.locator(".ws-line")).toHaveCount(1);
  await expect(ws.locator(".ws-line")).toContainText("Glivenko's translation");
  await expect(ws.locator(".ws-line")).toContainText("Both valid, so the verdicts agree.");
  await expect(ws.locator(".ws-row").nth(1)).toContainText("¬¬(a ∨ ¬a)");
  await expect(ws.getByRole("button", { name: "Undo translation" })).toBeVisible();
  await expect(page.locator(".ptab[aria-current=true]")).toContainText("¬¬(a ∨ ¬a)");
});

test("a changed sequent puts the tab made from it out of date until Start again, and Undo takes it back", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await classical(page, "|- a \\/ ~a");
  await proveTranslation(page);
  const ws = panel(page);
  // The first tab's sequent changed.
  await ws.locator(".ws-row").first().locator(".ws-tab").click();
  await page.locator(".ptab[aria-current=true] .pt-go").click();
  await page.getByRole("textbox", { name: "Sequent" }).fill("|- a -> b \\/ ~b");
  await page.getByRole("textbox", { name: "Sequent" }).press("Enter");
  await expect(ws.locator(".ws-row").nth(1)).toContainText("Out of date");
  await expect(
    page.getByRole("button", { name: "Workspace, 2 linked tabs, 1 out of date" }),
  ).toBeVisible();
  await expect(ws.locator(".ws-line[data-stale]")).toHaveCount(1);
  await ws.getByRole("button", { name: "Update" }).click();
  await expect(ws.locator(".ws-row").nth(1)).not.toContainText("Out of date");
  await expect(page.locator(".ptab[aria-current=true]")).toContainText("¬¬(a → (b ∨ ¬b))");
  await ws.getByRole("button", { name: "Undo restart" }).click();
  await expect(ws.locator(".ws-row").nth(1)).toContainText("Out of date");
  await ws.getByRole("button", { name: "Undo sequent change" }).click();
  await expect(ws.locator(".ws-row").nth(1)).not.toContainText("Out of date");
  await expect(page.locator(".ptab").first()).toContainText("a ∨ ¬a");
});

test("a duplicated proof is a linked copy, and three linked tabs show as a graph", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await classical(page, "|- a \\/ ~a");
  await proveTranslation(page);
  await page.locator(".ptab").first().click();
  const pop = await switches(page);
  await pop.getByRole("button", { name: "Duplicate this proof" }).click();
  await expect(page.locator(".ptab")).toHaveCount(3);
  const ws = panel(page);
  await expect(ws.locator(".ws-line[data-kind=copy]")).toContainText("Copy of");
  await ws.getByRole("button", { name: "Show as graph" }).click();
  const graph = page.getByRole("region", { name: "Workspace graph" });
  await expect(graph.locator(".ws-card")).toHaveCount(3);
  await graph.locator(".ws-card").nth(2).locator(".ws-tab").click();
  await expect(graph).toBeHidden();
});

test("a narrow window shows the workspace as a sheet from its button", async ({ page }) => {
  await page.setViewportSize({ width: 800, height: 800 });
  await classical(page, "|- a \\/ ~a");
  await proveTranslation(page);
  await expect(page.locator(".ws-stage[data-docked]")).toHaveCount(0);
  await page.getByRole("button", { name: "Workspace, 2 linked tabs" }).click();
  await expect(page.getByRole("dialog", { name: "Workspace" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog", { name: "Workspace" })).toBeHidden();
});

test("a link of a linked tab opens its linked tabs, the shown one shown, the panel closed", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await classical(page, "|- a \\/ ~a");
  await proveTranslation(page);
  // The link is written a moment after the change.
  await expect.poll(() => page.evaluate(() => location.hash)).toMatch(/^#v=3&/);
  const hash = await page.evaluate(() => location.hash);
  const fresh = await page.context().newPage();
  await fresh.setViewportSize({ width: 1280, height: 800 });
  await fresh.goto(`/${hash}`);
  await expect(fresh.locator(".ptab")).toHaveCount(2);
  await expect(fresh.locator(".ptab[aria-current=true]")).toContainText("¬¬(a ∨ ¬a)");
  await expect(fresh.getByText("This link holds 2 linked tabs.")).toBeVisible();
  await expect(fresh.getByRole("region", { name: "Workspace" })).toHaveCount(0);
  await fresh.getByRole("button", { name: "Workspace, 2 linked tabs" }).click();
  const ws = fresh.getByRole("region", { name: "Workspace" });
  await expect(ws.locator(".ws-line")).toContainText("Glivenko's translation");
});
