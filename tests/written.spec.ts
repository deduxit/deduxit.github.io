// deduxit © Fabian Lukas Grubmüller 2026
// Licensed under the EUPL

// A tableau built by hand: the tableau view's "By hand" for a started classical sequent, begun
// with the sequent's own lines, a press on a line expanding it on every open branch below, a
// branch closed by itself, deduxit's review after every press, Undo, and an open tableau's
// countermodel opened in the countermodel view.

import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";
import { addView, calculus, goto, tool } from "./prover";

/** Starts `sequent` in classical logic and opens the tableau by hand. */
async function byHand(page: Page, sequent: string) {
  await goto(page);
  await calculus(page, ["Ordinary", "Classical"]);
  await page.getByRole("textbox", { name: "Sequent" }).fill(sequent);
  await page.getByRole("textbox", { name: "Sequent" }).press("Enter");
  await expect(page.locator(".stage .fb").first()).toBeVisible();
  await addView(page, "Tableau");
  await page
    .getByRole("group", { name: "Tableau" })
    .getByRole("button", { name: "By hand" })
    .click();
  return page.getByRole("region", { name: "Your tableau" });
}

/** A line's button, by its number. */
const line = (view: ReturnType<Page["getByRole"]>, n: number) =>
  view.getByRole("button", { name: new RegExp(`^${n} [TF] `) });

test("a press expands a line on every branch below it, and the tableau closes by itself", async ({
  page,
}) => {
  const view = await byHand(page, "p \\/ q |- q \\/ p");
  await expect(view.locator(".tb-line")).toHaveCount(2);
  await expect(view.getByRole("status")).toContainText("Unfinished");
  await line(view, 2).click();
  await expect(line(view, 3)).toContainText("F");
  await expect(line(view, 4)).toBeVisible();
  // An atom has nothing to expand: a press says so.
  await line(view, 3).click();
  await expect(view.getByRole("alert")).toContainText("nothing to expand");
  await line(view, 1).click();
  await expect(view.locator(".tb-branch")).toHaveCount(2);
  await expect(view.locator(".tb-end[data-closed]")).toHaveCount(2);
  await expect(view.getByRole("status")).toContainText("Closed");
  // Undo takes the last press back.
  await tool(page, "Undo").click();
  await expect(view.locator(".tb-branch")).toHaveCount(0);
  await expect(view.getByRole("status")).toContainText("Unfinished");
});

test("an open tableau says so, and opens its countermodel", async ({ page }) => {
  const view = await byHand(page, "p -> q |- q -> p");
  await line(view, 2).click();
  await line(view, 1).click();
  await expect(view.getByRole("status")).toContainText("Open");
  await page.getByRole("button", { name: "Check its countermodel" }).click();
  await expect(page.getByRole("tab", { name: "Countermodel, ⊭" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
});
