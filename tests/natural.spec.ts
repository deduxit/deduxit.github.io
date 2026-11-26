// deduxit © Fabian Lukas Grubmüller 2026
// Licensed under the EUPL

// Natural deduction on the page: a method of the ordinary tab, chosen by one button of the
// calculus popover, built backwards from a goal and forwards from numbered lines, each step
// checked by deduxit, drawn as Gentzen's tree or as Fitch's lines and saved in either. A visitor
// who never presses the button sees none of it.

import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";
import { calculus, goto, start } from "./prover";
import { customStep, deduce, deriveLine } from "./states";

/** Opens the page with its tab in ordinary intuitionistic logic, by natural deduction. */
async function natural(page: Page) {
  await goto(page);
  await calculus(page, ["Ordinary", "Intuitionistic", "Natural deduction"]);
}

test("an ordinary proof shows nothing of natural deduction until its button is pressed", async ({
  page,
}) => {
  await goto(page);
  await calculus(page, ["Ordinary", "Intuitionistic"]);
  await start(page, "a ∧ b ⊢ b ∧ a", false);
  await expect(page.locator(".stage .fb").first()).toBeVisible();
  await expect(page.getByRole("region", { name: "Natural deduction" })).toHaveCount(0);
  await expect(page.getByText(/natural deduction/i).locator("visible=true")).toHaveCount(0);
});

test("a proof is built backwards and forwards, and a line out of reach is refused", async ({
  page,
}) => {
  await natural(page);
  await deduce(page, "⊢ (a → b) ∧ (b → a) → (b ↔ a)");
  const view = page.getByRole("region", { name: "Natural deduction" });
  await expect(view).toContainText("an introduction rule builds a connective");
  await expect(
    page.getByRole("tablist", { name: "Views of this sequent" }).getByRole("tab").first(),
  ).toHaveAttribute("data-tip", "Natural deduction, NJ");

  // Backwards: →I opens a subproof whose hypothesis is line 1.
  await customStep(page, "→I");
  await expect(view.getByRole("list", { name: "Lines in force" })).toContainText(
    "(a → b) ∧ (b → a)",
  );
  await customStep(page, "↔I");
  // ↔I opens two subproofs, with b and with a, each in force in its own goal alone. The lines
  // are the Fitch drawing's: b is line 2, and the line derived under it line 3.
  await expect(view.getByText("Open goal 1 of 2")).toBeVisible();
  await page.getByRole("button", { name: "From lines" }).click();
  await deriveLine(page, "∧E₂", "1");
  await deriveLine(page, "→E", "3, 2");
  await page.getByRole("button", { name: "Close the goal by line 4" }).click();
  // The other subproof's goal: line 2 lies in the closed subproof, out of its reach.
  const lines = view.getByRole("list", { name: "Lines in force" }).getByRole("listitem");
  await expect(lines).toHaveCount(2);
  await deriveLine(page, "∧E₁", "2");
  await expect(view.getByRole("alert")).toContainText("Line 2 is not in force here");

  // An undo of a forward step removes its line; the goal stays open.
  await deriveLine(page, "∧E₁", "1");
  await expect(lines).toHaveCount(3);
  await view.getByRole("button", { name: "Undo" }).click();
  await expect(lines).toHaveCount(2);
  await deriveLine(page, "∧E₁", "1");
  await deriveLine(page, "→E", "6, 5");
  await page.getByRole("button", { name: "Close the goal by line 7" }).click();
  await view.getByRole("button", { name: "Check the proof" }).click();
  await expect(view.getByRole("status")).toContainText("Valid in NJ");
});

test("the toggles' Natural and Fitch draw one proof, and each is saved as it is drawn", async ({
  page,
}) => {
  await natural(page);
  await deduce(page, "a ∧ b ⊢ b ∧ a");
  await customStep(page, "∧I");
  await page.getByRole("button", { name: "From lines" }).click();
  await deriveLine(page, "∧E₂", "1");
  await page.getByRole("button", { name: "Close the goal by line 2" }).click();
  const drawing = page.locator(".custom-drawing svg");
  await expect(drawing.locator("#i0")).toBeAttached();
  await page.getByRole("button", { name: "Fitch" }).click();
  // Line 3 is the open goal a, drawn with its question mark; line 2 is cited by ∧I.
  await expect(drawing.locator("#l3")).toBeAttached();
  await expect(drawing.locator("desc")).toContainText("Line 2, b: by ∧E₂ from line 1.");
  const saved = page.waitForEvent("download");
  await page.getByRole("button", { name: "LaTeX" }).click();
  const file = await saved;
  expect(file.suggestedFilename()).toBe("natural-deduction.tex");
  const text = await file.createReadStream().then(async (stream) => {
    let all = "";
    for await (const chunk of stream) all += chunk;
    return all;
  });
  expect(text).toContain("\\begin{nd}");
  await page.getByRole("button", { name: "Natural", exact: true }).click();
  await expect(drawing.locator("#i0")).toBeAttached();
});

test("a goal closed by its assumption is drawn in both views", async ({ page }) => {
  await natural(page);
  await deduce(page, "a ⊢ a");
  await page.getByRole("button", { name: "Fitch" }).click();
  await page.getByRole("button", { name: "Close the goal by line 1" }).click();
  const view = page.getByRole("region", { name: "Natural deduction" });
  await expect(view.locator(".custom-drawing svg desc")).toContainText("Line 1, a");
  await expect(view.getByText("no Fitch proof")).toHaveCount(0);
  await view.getByRole("button", { name: "Check the proof" }).click();
  await expect(view.getByRole("status")).toContainText("Valid in NJ");
});

test("a change of logic with steps taken opens the new logic beside, and ? proves a goal apart", async ({
  page,
}) => {
  await natural(page);
  await deduce(page, "a ∧ b ⊢ b ∧ a");
  await customStep(page, "∧I");
  await page.getByRole("button", { name: "Classical", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "opened beside" })).toBeVisible();
  // The new logic is a view of the same sequent, beside the NJ proof in its chip's rail.
  await expect(page.locator(".chip")).toHaveCount(1);
  await expect(page.getByRole("tab", { name: /^Natural deduction, NK/ })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  // The NJ proof keeps its step.
  await page.locator(".chip").first().click();
  await page.getByRole("button", { name: "?, this goal: its actions" }).click();
  await page
    .getByRole("group", { name: "This goal" })
    .getByRole("button", { name: "Prove apart" })
    .click();
  await expect(page.locator(".chip")).toHaveCount(2);
});
