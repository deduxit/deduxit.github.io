// deduxit © Fabian Lukas Grubmüller 2026
// Licensed under the EUPL

// Learn and Practice by suite: an ordinary tab's tutorial is the ordinary course, a linear
// tab's the linear course as it was with one line naming the other, and a lesson of the
// ordinary course plays its worked proof on the stage from its finished session.

import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";
import { calculus, goto } from "./prover";

test("a linear tab's tutorial is the linear course, one line at its end naming the ordinary one", async ({
  page,
}) => {
  await goto(page);
  await page.locator("footer").getByRole("button", { name: "Learn", exact: true }).click();
  await page.getByRole("tab", { name: "Tutorial" }).click();
  await expect(page.getByRole("button", { name: /^Lesson 2: The multiplicatives/ })).toBeVisible();
  await expect(page.getByText("The course on ordinary logic")).toHaveCount(0);
  await page.getByRole("button", { name: "Open it on a new tab" }).click();
  await expect(page.locator(".ptab[aria-current=true] .pt-mark")).toContainText("LK");
  await expect(page.getByText("The course on ordinary logic")).toBeVisible();
  await expect(
    page.getByRole("button", { name: /^Lesson 3: The sequent calculus LK/ }),
  ).toBeVisible();
  await expect(page.locator(".lessons li").filter({ hasText: "to come" })).toHaveCount(0);
});

test("an ordinary lesson plays its worked proof on the stage, step by step", async ({ page }) => {
  await goto(page);
  await calculus(page, ["Ordinary", "Classical"]);
  await page.locator("footer").getByRole("button", { name: "Learn", exact: true }).click();
  await page.getByRole("tab", { name: "Tutorial" }).click();
  await page.getByRole("button", { name: /^Lesson 3: The sequent calculus LK/ }).click();
  await page.getByRole("button", { name: "Start the worked proof" }).click();
  // The sequent, no step yet: one open goal on the stage.
  await expect(page.locator(".stage .fb").first()).toBeVisible();
  await page.getByRole("button", { name: "Predict ¬R" }).click();
  const why = page.getByRole("note", { name: "Why this step" });
  await expect(why).toContainText("The step is ∨R, not ¬R.");
  await expect(page.getByText("Why can LK take it?")).toBeVisible();
  await page.getByRole("button", { name: "Predict ¬R" }).click();
  await expect(why).toContainText("Right");
  await page.getByRole("button", { name: "Show the step" }).click();
  await expect(page.locator(".lesson-view .kw.ok").filter({ hasText: "Proved" })).toBeVisible();
  // The faded proof opens on a tab of its own, its first step played.
  const tabs = await page.locator(".ptab").count();
  await page.getByRole("button", { name: "Finish the proof yourself" }).click();
  await expect(page.locator(".ptab")).toHaveCount(tabs + 1);
  // The hinge's right answer.
  await page
    .getByRole("region", { name: "Check" })
    .getByRole("radio", { name: /^LK lets two formulas/ })
    .check();
  await expect(page.getByRole("region", { name: "Check" }).getByRole("status")).toContainText(
    "Right",
  );
});

/** Opens an ordinary tab in `logic`, Learn's tutorial, and lesson `n` of the ordinary course. */
async function lesson(page: Page, logic: string, name: RegExp) {
  await goto(page);
  await calculus(page, ["Ordinary", logic]);
  await page.locator("footer").getByRole("button", { name: "Learn", exact: true }).click();
  await page.getByRole("tab", { name: "Tutorial" }).click();
  await page.getByRole("button", { name }).click();
}

test("the truth table's lesson reads its rows one at a time, then draws the whole table", async ({
  page,
}) => {
  await lesson(page, "Classical", /^Lesson 1: Valid, by the truth table/);
  await page.getByRole("button", { name: "Start with the first row" }).click();
  await expect(
    page.getByText("Row 1 of 4, a true, b true: does it falsify the sequent?"),
  ).toBeVisible();
  const why = page.getByRole("note", { name: "Why this step" });
  await page.getByRole("button", { name: "Predict holds" }).click();
  await expect(why).toContainText("Right");
  await page.getByRole("button", { name: "Show the answer" }).click();
  await expect(page.getByText("Row 3 of 4, a false, b true")).toBeVisible();
  await page.getByRole("button", { name: "Predict holds" }).click();
  await expect(why).toContainText("The row falsifies, not holds.");
  await page.getByRole("button", { name: "Show the answer" }).click();
  await page.getByRole("button", { name: "See the whole table" }).click();
  await expect(page.getByRole("region", { name: "Truth table" })).toBeVisible();
});

test("the tableau's lesson builds the tableau on the stage, step by step", async ({ page }) => {
  await lesson(page, "Classical", /^Lesson 2: Signed tableaux/);
  await page.getByRole("button", { name: "Start the worked proof" }).click();
  const panel = page.getByRole("region", { name: "Your own calculus" });
  await expect(panel).toContainText("Open goal 1 of 1");
  for (const rule of ["T¬", "F¬", "×"])
    await page.getByRole("button", { name: `Predict ${rule}` }).click();
  await expect(panel).toContainText("Every goal is closed");
  // The course stays in Learn on the tableau's own tab.
  await page.getByRole("button", { name: "All lessons" }).click();
  await expect(page.getByText("The course on ordinary logic")).toBeVisible();
});

test("a natural deduction lesson plays on the stage's natural deduction view", async ({ page }) => {
  await lesson(page, "Intuitionistic", /^Lesson 4: Natural deduction, backwards/);
  await page.getByRole("button", { name: "Start the worked proof" }).click();
  const view = page.getByRole("region", { name: "Natural deduction" });
  await expect(view).toContainText("Open goal 1 of 1");
  // The lesson plays in the drawing its reasons cite: Fitch's numbered lines.
  await expect(view.locator(".custom-drawing svg #l1")).toBeAttached();
  await page.getByRole("button", { name: "Predict →I" }).click();
  await page.getByRole("button", { name: "Predict →I" }).click();
  await expect(view.getByRole("list", { name: "Lines in force" })).toContainText("b");
  await page.getByRole("button", { name: "Predict a line in force" }).click();
  await expect(view).toContainText("Every goal is closed");
  // Its practice opens by natural deduction too.
  await page.getByRole("region", { name: "Practice" }).getByRole("button").first().click();
  await expect(page.getByRole("region", { name: "Natural deduction" })).toBeVisible();
});

test("the lesson on the three logics draws a countermodel of excluded middle", async ({ page }) => {
  await lesson(page, "Classical", /^Lesson 6: Classical, intuitionistic, minimal/);
  await page.getByRole("button", { name: "Decide it and draw its countermodel" }).click();
  await expect(page.getByRole("img", { name: /^A countermodel of/ })).toBeVisible();
});
