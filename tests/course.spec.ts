// deduxit © Fabian Lukas Grubmüller 2026
// Licensed under the EUPL

// Learn and Practice by suite: an ordinary tab's tutorial is the ordinary course, a linear
// tab's the linear course as it was with one line naming the other, and a lesson of the
// ordinary course plays its worked proof on the stage from its finished session.

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
  await expect(page.locator(".lessons li").filter({ hasText: "to come" })).toHaveCount(5);
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
