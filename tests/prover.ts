// deduxit © Fabian Lukas Grubmüller 2026
// Licensed under the EUPL

// The steps the prover's tests share.

import { expect, type Page } from "@playwright/test";

/** Opens the page and waits for the bottom box. */
export async function goto(page: Page) {
  await page.goto("/");
  await expect(page.getByRole("textbox", { name: "Sequent" })).toBeVisible();
}

/** Opens the new tab view from the top row's "+". */
export async function newTab(page: Page) {
  await page.getByRole("button", { name: "New sequent", exact: true }).click();
  await expect(page.getByRole("region", { name: "New sequent" })).toBeVisible();
}

/** Starts a sequent: on a fresh page, or as a new sequent beside the open ones. */
export async function start(page: Page, sequent: string, fresh = true) {
  if (fresh) await goto(page);
  else await newTab(page);
  await page.getByRole("textbox", { name: "Sequent" }).fill(sequent);
  await page.getByRole("textbox", { name: "Sequent" }).press("Enter");
  // Started: the box gave way to the proof, or said why it could not.
  await expect(page.locator(".stage .fb, [role=alert]").first()).toBeVisible();
}

/** The toggles of the view shown: the calculus it is in. */
export async function switches(page: Page) {
  const toggles = page.getByRole("group", { name: "Calculus of this view" });
  await expect(toggles).toBeVisible();
  return toggles;
}

/** The new tab view's logics, by the names the tests give the suites. */
const SUITES: Readonly<Record<string, string>> = {
  Ordinary: "Ordinary logic",
  Linear: "Linear logic",
  "Modal logic": "Modal logic",
  "Lambda-terms": "Lambda-terms",
};
/** The tools that set how a derivation is drawn, by the names the tests give them. */
const TOOLS: Readonly<Record<string, string>> = {
  "Two-sided": "Two-sided",
  "Structural rules": "W C, weakenings and contractions",
};

/**
 * Sets the calculus: a logic on the new tab view (a new one if a sequent is shown), then the
 * toggles of the view and the drawing's tools by their names.
 */
export async function calculus(page: Page, names: readonly string[]) {
  for (const name of names) {
    const suite = SUITES[name];
    if (suite) {
      const logics = page.getByRole("region", { name: "New sequent" });
      if (!(await logics.isVisible())) await newTab(page);
      await logics.getByRole("button", { name: suite }).click();
      continue;
    }
    const tool = TOOLS[name];
    if (tool) {
      await page
        .getByRole("toolbar", { name: "Tools" })
        .getByRole("button", { name: tool })
        .click();
      continue;
    }
    const toggles = await switches(page);
    await toggles
      .getByRole("button", { name: name === "Natural deduction" ? "Natural" : name, exact: true })
      .click();
  }
}

/** Applies a rule to the active goal's formula whose name matches. */
export async function rule(page: Page, formula: RegExp, name: string) {
  await page.getByRole("button", { name: formula }).first().click();
  await page
    .getByRole("dialog", { name: "Rules" })
    .getByRole("button", { name: new RegExp(`^${name}`) })
    .click();
}

/** The chosen sequent's proof, its cell in the rail, whose hover names its calculus. */
export function viewCell(page: Page) {
  return page.getByRole("tablist", { name: "Views of this sequent" }).getByRole("tab").first();
}

/** A tool of the view shown, by its name. */
export function tool(page: Page, name: string) {
  return page.getByRole("toolbar", { name: "Tools" }).getByRole("button", { name, exact: true });
}

/** Adds a view of the sequent shown, by its entry in "+ view". */
export async function addView(page: Page, name: string) {
  await page.getByRole("button", { name: "Add a view" }).click();
  await page
    .getByRole("dialog", { name: "Add a view" })
    .getByRole("button", { name, exact: true })
    .click();
}

/** The note that says the proof is finished. */
export function proved(page: Page) {
  return page.getByRole("status").filter({ hasText: "Proved. Every goal is closed." });
}

/** Opens the menu of the active goal, at its ⊢. */
export async function goalMenu(page: Page) {
  const menu = page.getByRole("dialog", { name: "This goal" });
  if (!(await menu.isVisible())) await page.locator(".stage .gt[data-active]").click();
  await expect(menu).toBeVisible();
  return menu;
}

/** Closes the active goal by the search, from its menu at its ⊢. */
export async function closeGoal(page: Page) {
  await (await goalMenu(page)).getByRole("button", { name: "Close goal" }).click();
}

/** Proves A ⊗ B ⊢ B ⊗ A by the search. */
export async function proveCommuted(page: Page) {
  await start(page, "A * B |- B * A");
  await closeGoal(page);
  await expect(proved(page)).toBeVisible();
}
