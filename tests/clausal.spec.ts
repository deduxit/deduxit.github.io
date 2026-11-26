// deduxit © Fabian Lukas Grubmüller 2026
// Licensed under the EUPL

// A classical proof's normal forms and resolution: views offered in "+ view" of a started
// classical proof alone, a normal form's steps as numbered lines stepped back and forth by the
// tools, a refutation's list and graph in step, and a refutation by hand that deduxit checks.

import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";
import { addView, calculus, goto, tool } from "./prover";

/** Starts a sequent in an ordinary tab of `logic`. */
async function ordinary(page: Page, logic: string, sequent: string) {
  await goto(page);
  await calculus(page, ["Ordinary", logic]);
  await page.getByRole("textbox", { name: "Sequent" }).fill(sequent);
  await page.getByRole("textbox", { name: "Sequent" }).press("Enter");
  await expect(page.locator(".stage .fb").first()).toBeVisible();
}

/** Adds a view from "+ view" by its name, and returns it. */
async function sheet(page: Page, name: string) {
  await addView(page, name);
  const opened = page.getByRole("region", { name, exact: true });
  await expect(opened).toBeVisible();
  return opened;
}

/** Chooses how the resolution view refutes, by its toggle. */
const way = (page: Page, name: string) =>
  page
    .getByRole("group", { name: "Resolution" })
    .getByRole("button", { name, exact: true })
    .click();

/** Whether "+ view" offers an entry: listed and not faint. */
async function offered(page: Page, entry: string) {
  await page.getByRole("button", { name: "Add a view" }).click();
  const button = page.getByRole("dialog", { name: "Add a view" }).getByRole("button", {
    name: entry,
    exact: true,
  });
  const yes = (await button.getAttribute("aria-disabled")) !== "true";
  await page.keyboard.press("Escape");
  return yes;
}

/** A clause's button in the sheet's list, by its number. */
const listed = (view: ReturnType<Page["getByRole"]>, n: number) =>
  view.locator(".cl-list").getByRole("button", { name: new RegExp(`^Clause ${n}\\.`) });

/** A clause's node in the sheet's graph, by its number. */
const drawn = (view: ReturnType<Page["getByRole"]>, n: number) =>
  view.locator(".cl-graph").getByRole("button", { name: new RegExp(`^Clause ${n} `) });

test("normal forms and resolution are offered for a started classical proof alone", async ({
  page,
}) => {
  await ordinary(page, "Intuitionistic", "a |- a");
  expect(await offered(page, "Normal form")).toBe(false);
  expect(await offered(page, "Resolution")).toBe(false);
  await calculus(page, ["Classical"]);
  expect(await offered(page, "Normal form")).toBe(true);
  expect(await offered(page, "Resolution")).toBe(true);
});

test("a normal form opens at its last step, each line with its law, and the tools step it", async ({
  page,
}) => {
  await ordinary(page, "Classical", "~(a -> b /\\ c)");
  const view = await sheet(page, "Normal form");
  await expect(view.getByRole("status")).toContainText("Equivalent");
  const lines = view
    .getByRole("list", { name: "The steps to the normal form" })
    .getByRole("listitem");
  await expect(lines).toHaveCount(5);
  await expect(lines.last()).toContainText("⊢ a ∧ (¬b ∨ ¬c)");
  await expect(tool(page, "Next step")).toBeDisabled();
  for (let k = 0; k < 3; k++) await tool(page, "Undo").click();
  await expect(lines).toHaveCount(2);
  await expect(lines.nth(1).locator(".nf-law")).toContainText("A → B ≡ ¬A ∨ B");
  await expect(lines.nth(1).locator(".nf-text")).toHaveText("⊢ ¬(¬a ∨ (b ∧ c))");
  await tool(page, "Next step").click();
  await expect(lines).toHaveCount(3);
  await tool(page, "To the end").click();
  await expect(lines).toHaveCount(5);
  await page
    .getByRole("group", { name: "Normal form" })
    .getByRole("button", { name: "Tseitin" })
    .click();
  await expect(view.getByRole("status")).toContainText("Same verdict");
  await expect(lines.nth(1).locator(".nf-what")).toContainText("moves left of ⊢");
});

test("a refutation's list and graph stay in step, by mouse and by keyboard", async ({ page }) => {
  await ordinary(page, "Classical", "a -> b, b -> c |- a -> c");
  const view = await sheet(page, "Resolution");
  await expect(view.getByRole("status")).toContainText("Valid");
  await expect(view.locator(".cl-list li")).toHaveCount(7);
  await expect(view.locator(".cl-graph").getByRole("button")).toHaveCount(7);
  await expect(drawn(view, 7)).toContainText("□");
  await drawn(view, 5).click();
  await expect(listed(view, 5)).toHaveAttribute("aria-pressed", "true");
  await expect(drawn(view, 5)).toHaveAttribute("aria-pressed", "true");
  // Two edges come into the chosen resolvent.
  await expect(view.locator(".cl-edges line[data-on]")).toHaveCount(2);
  await listed(view, 6).focus();
  await page.keyboard.press("Enter");
  await expect(drawn(view, 6)).toHaveAttribute("aria-pressed", "true");
  await expect(drawn(view, 5)).toHaveAttribute("aria-pressed", "false");
  await drawn(view, 6).focus();
  await page.keyboard.press("Space");
  await expect(listed(view, 6)).toHaveAttribute("aria-pressed", "false");
  await way(page, "DPLL");
  await expect(view.locator(".cl-trace")).toContainText("conflict at clause");
});

test("a sequent that is not valid has a model of its clauses", async ({ page }) => {
  await ordinary(page, "Classical", "a \\/ b |- a");
  const view = await sheet(page, "Resolution");
  await expect(view.getByRole("status")).toContainText("Not valid");
  await expect(view.getByRole("status")).toContainText("b true and every other atom false");
  await expect(view.locator(".cl-graph")).toHaveCount(0);
});

test("a refutation by hand adds only what resolution allows, and reaches □", async ({ page }) => {
  await ordinary(page, "Classical", "a -> b, a |- b");
  const view = await sheet(page, "Resolution");
  await way(page, "By hand");
  await expect(view.getByRole("status")).toContainText("Choose two clauses");
  // The clauses are ¬a ∨ b, a and ¬b: a and ¬b share no atom to resolve on.
  await listed(view, 2).click();
  await listed(view, 3).click();
  await expect(view.getByRole("status")).toContainText("share no atom");
  await expect(view.getByRole("button", { name: /^Resolve on/ })).toHaveCount(0);
  // Clause 3 off, clause 1 on: a and ¬a ∨ b clash on a.
  await listed(view, 3).click();
  await listed(view, 1).click();
  await view.getByRole("button", { name: "Resolve on a" }).click();
  await expect(view.getByText("Clause 4, b, added.")).toBeVisible();
  await expect(drawn(view, 4)).toBeVisible();
  await view.getByRole("button", { name: "Undo" }).click();
  await expect(view.locator(".cl-list li")).toHaveCount(3);
  await listed(view, 1).click();
  await listed(view, 2).click();
  await view.getByRole("button", { name: "Resolve on a" }).click();
  await listed(view, 3).click();
  await view.getByRole("button", { name: "Resolve on b" }).click();
  await expect(view.getByRole("status")).toContainText("You derived □");
  await expect(drawn(view, 5)).toContainText("□");
  // The focus stays in the sheet: on the new clause after a step, on Undo after an undo.
  await expect(listed(view, 5)).toBeFocused();
  await view.getByRole("button", { name: "Undo" }).click();
  await expect(view.getByRole("button", { name: "Undo" })).toBeFocused();
  await expect(view.getByRole("status")).not.toContainText("You derived □");
});

test("a set that holds □ already says so, and claims no step", async ({ page }) => {
  await ordinary(page, "Classical", "|- true");
  const view = await sheet(page, "Resolution");
  await way(page, "By hand");
  await expect(view.getByRole("status")).toContainText("is □ already");
  await expect(view.getByRole("status")).not.toContainText("You derived");
});
