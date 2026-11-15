// deduxit © Fabian Lukas Grubmüller 2026
// Licensed under the EUPL

// A classical proof's truth table and tableau: the two tabs beside Tree, what each shows, the
// countermodel they lead to, a table past the bound on atoms, and the proof kept meanwhile.

import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";
import { calculus, goto } from "./prover";

/** Starts a sequent in an ordinary tab of `logic`. */
async function ordinary(page: Page, logic: string, sequent: string) {
  await goto(page);
  await calculus(page, ["Ordinary", logic]);
  await page.getByRole("textbox", { name: "Sequent" }).fill(sequent);
  await page.getByRole("textbox", { name: "Sequent" }).press("Enter");
  await expect(page.locator(".stage .fb").first()).toBeVisible();
}

test("the table and the tableau are offered for a classical proof alone", async ({ page }) => {
  await ordinary(page, "Intuitionistic", "a |- a");
  await expect(page.getByRole("tab", { name: "Table", exact: true })).toHaveCount(0);
  // A new calculus restarts the sequent in it.
  await calculus(page, ["Classical"]);
  await expect(page.getByRole("tab", { name: "Table", exact: true })).toBeVisible();
  await expect(page.getByRole("tab", { name: "Tableau" })).toBeVisible();
});

test("the truth table marks the row that falsifies the sequent and leads to its countermodel", async ({
  page,
}) => {
  await ordinary(page, "Classical", "a -> b |- b -> a");
  await page.getByRole("tab", { name: "Table", exact: true }).click();
  const view = page.getByRole("region", { name: "Truth table" });
  await expect(view.getByRole("status")).toContainText(
    "Not valid With a false, b true, every formula left of ⊢ is true and every formula right of it false: row 3.",
  );
  await expect(view.getByRole("columnheader")).toHaveText([
    "a",
    "b",
    "a → b",
    "b → a",
    "Falsifies the sequent",
  ]);
  const rows = view.locator("tbody tr");
  await expect(rows).toHaveCount(4);
  await expect(rows.nth(2)).toHaveAttribute("data-falsifies", "");
  await expect(rows.nth(1)).not.toHaveAttribute("data-falsifies", "");
  await rows.nth(2).getByRole("button", { name: "× the countermodel" }).click();
  await expect(page.locator(".method-model")).toBeFocused();
  await expect(view.getByRole("img", { name: /^A countermodel of/ })).toBeVisible();
});

test("a valid sequent's table has no falsifying row", async ({ page }) => {
  await ordinary(page, "Classical", "|- a \\/ ~a");
  await page.getByRole("tab", { name: "Table", exact: true }).click();
  const view = page.getByRole("region", { name: "Truth table" });
  await expect(view.getByRole("status")).toContainText("Valid No row makes");
  await expect(view.locator("tbody tr[data-falsifies]")).toHaveCount(0);
  await expect(view.getByRole("img")).toHaveCount(0);
});

test("the tableau numbers its lines, cites their rules and says how each branch ends", async ({
  page,
}) => {
  await ordinary(page, "Classical", "a /\\ b |- b /\\ a");
  await page.getByRole("tab", { name: "Tableau" }).click();
  const view = page.getByRole("region", { name: "Tableau" });
  await expect(view.getByRole("status")).toContainText("Valid Every branch closes");
  const lines = view.locator(".tb-line");
  await expect(lines).toHaveCount(6);
  // Read as "3, true: a, by ∧L from line 1"; seen as 3 T a ∧L 1.
  await expect(lines.nth(2)).toContainText("true:a");
  await expect(lines.nth(2)).toContainText("by ∧L from line 1");
  const ends = view.locator(".tb-end");
  await expect(ends).toHaveCount(2);
  await expect(ends.first()).toContainText("× 4, 5");
  await expect(ends.first()).toContainText("closed: b is true at line 4 and false at line 5");
});

test("an open branch of the tableau gives its assignment and the countermodel", async ({
  page,
}) => {
  await ordinary(page, "Classical", "a -> b |- b -> a");
  await page.getByRole("tab", { name: "Tableau" }).click();
  const view = page.getByRole("region", { name: "Tableau" });
  await expect(view.getByRole("status")).toContainText(
    "Not valid A branch stays open, with a false, b true",
  );
  await expect(view.locator(".tb-end").first()).toContainText("open: a false, b true");
  await expect(view.getByRole("img", { name: /^A countermodel of/ })).toBeVisible();
});

test("a table past the bound on atoms says so and draws on request", async ({ page }) => {
  await ordinary(page, "Classical", "a, b, c, d, e, f, g, h, i, j, k |- a");
  await page.getByRole("tab", { name: "Table", exact: true }).click();
  const view = page.getByRole("region", { name: "Truth table" });
  await expect(view).toContainText("This sequent has 11 atoms, so its truth table has 2048 rows");
  await view.getByRole("button", { name: "Draw all 2048 rows" }).click();
  await expect(view.locator("tbody tr")).toHaveCount(2048);
  await expect(view.getByRole("status")).toContainText("Valid");
});

test("the proof stays as it was behind the table and comes back with Tree", async ({ page }) => {
  await ordinary(page, "Classical", "a /\\ b |- b /\\ a");
  await expect(page.getByRole("button", { name: /^a ∧ b, formula/ })).toBeVisible();
  await page.getByRole("tab", { name: "Table", exact: true }).click();
  await expect(page.getByRole("button", { name: /^a ∧ b, formula/ })).toBeHidden();
  await page.getByRole("tab", { name: "Tree" }).click();
  await expect(page.getByRole("button", { name: /^a ∧ b, formula/ })).toBeVisible();
  await expect(page.getByRole("region", { name: "Truth table" })).toHaveCount(0);
});
