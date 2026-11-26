// deduxit © Fabian Lukas Grubmüller 2026
// Licensed under the EUPL

// The views of a sequent (the design guide's "+ view", boards D3, D13, D14, D19): the grouped
// list, each view added as a cell of the rail, a view made from the proof joined to it, a view out
// of date with Update, the graph of views, a calculus or a copy beside the proof as a cell, and a
// chip's close with its Undo.

import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";
import { addView, goto, rule, start, switches, tool } from "./prover";

/** Starts an ordinary sequent in classical logic. */
async function ordinary(page: Page, sequent: string) {
  await goto(page);
  await page
    .getByRole("region", { name: "New sequent" })
    .getByRole("button", { name: "Ordinary logic" })
    .click();
  const box = page.getByRole("textbox", { name: "Sequent" });
  await box.fill(sequent);
  await box.press("Enter");
  await expect(page.getByRole("tab", { name: /^Sequent calculus, LK/ })).toBeVisible();
}

/** The rail's cell named so. */
const cell = (page: Page, name: RegExp) =>
  page.getByRole("tablist", { name: "Views of this sequent" }).getByRole("tab", { name });

test("+ view lists the guide's groups, a faint entry with its reason, and a check on a view there", async ({
  page,
}) => {
  await ordinary(page, "a /\\ b |- b /\\ a");
  await page.getByRole("button", { name: "Add a view" }).click();
  const list = page.getByRole("dialog", { name: "Add a view" });
  for (const group of ["Prove", "Decide", "Translate", "Read off", "From this proof"])
    await expect(list.getByRole("heading", { name: group })).toBeVisible();
  // A proof not finished has no cuts to eliminate: the entry is faint and says why.
  const elim = list.getByRole("button", { name: "Cut elimination" });
  await expect(elim).toHaveAttribute("aria-disabled", "true");
  await expect(elim).toHaveAccessibleDescription(/Finish the proof first/);
  await list.getByRole("button", { name: "Truth table", exact: true }).click();
  await expect(cell(page, /^Truth table/)).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("table")).toBeVisible();
  await page.getByRole("button", { name: "Add a view" }).click();
  await expect(list.getByRole("button", { name: "Truth table added" })).toBeVisible();
});

test("a translation is a view whose sequent opens at the top by Prove it in", async ({ page }) => {
  await ordinary(page, "|- a \\/ ~a");
  await addView(page, "Glivenko");
  await expect(cell(page, /^Glivenko's translation/)).toHaveAttribute("aria-selected", "true");
  await page.getByRole("button", { name: "Prove it in LJ" }).click();
  await expect(page.locator(".chip")).toHaveCount(2);
  await expect(page.getByRole("tab", { name: /^⊢ ¬¬\(a ∨ ¬a\)/ })).toHaveAttribute(
    "aria-selected",
    "true",
  );
});

test("the embedding into linear logic is a view, and its sequent opens in linear logic", async ({
  page,
}) => {
  await ordinary(page, "a /\\ b |- b /\\ a");
  await addView(page, "Linear logic");
  const panel = page.getByRole("region", { name: "Into linear logic" });
  await expect(panel.locator(".strip .m")).toContainText("⊢");
  await panel.getByRole("button", { name: /^Prove it in LL/ }).click();
  await expect(page.locator(".chip")).toHaveCount(2);
  await expect(page.getByRole("tab", { name: /^Classical linear logic/ })).toBeVisible();
});

test("a normal form opens at its last step; Undo steps back, Next step and To the end go on", async ({
  page,
}) => {
  await ordinary(page, "a -> b |- ~b -> ~a");
  await addView(page, "Normal form");
  const steps = page.getByRole("list", { name: "The steps to the normal form" });
  await expect(steps.getByRole("listitem").first()).toBeVisible();
  const all = await steps.getByRole("listitem").count();
  expect(all).toBeGreaterThan(1);
  await tool(page, "Undo").click();
  await expect(steps.getByRole("listitem")).toHaveCount(all - 1);
  await tool(page, "Next step").click();
  await expect(steps.getByRole("listitem")).toHaveCount(all);
  await tool(page, "Undo").click();
  await tool(page, "Undo").click();
  await tool(page, "To the end").click();
  await expect(steps.getByRole("listitem")).toHaveCount(all);
  // The toggle chooses the form, which starts at its own last step.
  await page
    .getByRole("group", { name: "Normal form" })
    .getByRole("button", { name: "NNF" })
    .click();
  await expect(steps).toBeVisible();
});

test("resolution and the tableau have their own toggles", async ({ page }) => {
  await ordinary(page, "a /\\ b |- b /\\ a");
  await addView(page, "Resolution");
  const ways = page.getByRole("group", { name: "Resolution" });
  await ways.getByRole("button", { name: "DPLL" }).click();
  await expect(ways.getByRole("button", { name: "DPLL" })).toHaveAttribute("aria-pressed", "true");
  await addView(page, "Tableau");
  const tableau = page.getByRole("group", { name: "Tableau" });
  await tableau.getByRole("button", { name: "By hand" }).click();
  await expect(page.locator(".stage")).toHaveAttribute("data-method", "written");
});

test("a view of the sequent goes out of date when the sequent changes, and Update makes it again", async ({
  page,
}) => {
  await ordinary(page, "a /\\ b |- b /\\ a");
  await addView(page, "Truth table");
  const box = page.getByRole("textbox", { name: "Sequent" });
  await box.fill("a |- a \\/ b");
  await box.press("Enter");
  await cell(page, /^Truth table/).click();
  await expect(cell(page, /^Truth table, TT, out of date$/)).toHaveAttribute("data-stale", "");
  await expect(page.getByRole("status").filter({ hasText: "Out of date." })).toBeVisible();
  await page.getByRole("button", { name: "Update" }).click();
  await expect(cell(page, /^Truth table, TT$/)).not.toHaveAttribute("data-stale", "");
});

test("the graph of views is the rail's first cell, and a press on the chosen chip opens it", async ({
  page,
}) => {
  await ordinary(page, "a /\\ b |- b /\\ a");
  await expect(cell(page, /^How the views hang together/)).toHaveCount(0);
  await addView(page, "Truth table");
  const graph = cell(page, /^How the views hang together/);
  await expect(graph).toBeVisible();
  await page.getByRole("tab", { name: /^a ∧ b ⊢ b ∧ a/ }).click();
  await page.getByRole("tab", { name: /^a ∧ b ⊢ b ∧ a/ }).click();
  await expect(graph).toHaveAttribute("aria-selected", "true");
  const view = page.getByRole("region", { name: "How the views hang together" });
  await expect(
    view.getByRole("button", { name: /^LK Sequent calculus, 1 goal open$/ }),
  ).toBeVisible();
  await view.getByRole("button", { name: /^TT Truth table, / }).click();
  await expect(cell(page, /^Truth table/)).toHaveAttribute("aria-selected", "true");
  await page.keyboard.press("g");
  await expect(graph).toHaveAttribute("aria-selected", "true");
});

test("a finished proof's λ-term is a view made from it, out of date once the proof changes", async ({
  page,
}) => {
  await ordinary(page, "a /\\ b |- b /\\ a");
  await page
    .getByRole("group", { name: "Logic" })
    .getByRole("button", { name: "Intuitionistic" })
    .click();
  await expect(page.getByRole("tab", { name: /^Sequent calculus, LJ/ })).toBeVisible();
  await tool(page, "Close all").click();
  await addView(page, "λ-term");
  await expect(page.getByRole("region", { name: "λ-term" }).locator(".m")).toContainText("⊢");
  await cell(page, /^Sequent calculus, LJ/).click();
  await tool(page, "Undo").click();
  await expect(cell(page, /^λ-term, λ, out of date$/)).toBeVisible();
});

test("a copy of the proof is a cell beside it, joined to it", async ({ page }) => {
  await ordinary(page, "a /\\ b |- b /\\ a");
  await addView(page, "A copy of this proof");
  await expect(page.locator(".chip")).toHaveCount(1);
  const copy = cell(page, /^Sequent calculus, LK, a copy/);
  await expect(copy).toHaveAttribute("data-tied", "");
  await expect(copy).toHaveAttribute("aria-selected", "true");
});

test("a calculus that cannot keep the steps opens beside the proof, as a cell of its rail", async ({
  page,
}) => {
  await start(page, "A, B |- A");
  await (await switches(page)).getByRole("button", { name: "Affine" }).click();
  await rule(page, /^B⊥, formula/, "wk");
  await (await switches(page)).getByRole("button", { name: "Affine" }).click();
  await expect(page.getByRole("status").filter({ hasText: "opened beside" })).toBeVisible();
  await expect(page.locator(".chip")).toHaveCount(1);
  await expect(cell(page, /^Classical linear logic, LL, /)).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await cell(page, /^Classical linear logic, LL\+aff/).click();
  await expect(page.getByRole("button", { name: /^B⊥, formula/ })).toHaveCount(0);
});

test("a chip's close button closes the sequent, Undo brings it back, and W closes the chosen one", async ({
  page,
}) => {
  await ordinary(page, "a /\\ b |- b /\\ a");
  const chip = page.getByRole("tab", { name: /^a ∧ b ⊢ b ∧ a/ });
  await chip.hover();
  await page.locator(".chip-close").first().click();
  await expect(chip).toHaveCount(0);
  await page.getByRole("status").getByRole("button", { name: "Undo" }).click();
  await expect(chip).toBeVisible();
  await chip.click();
  await page.keyboard.press("w");
  await expect(chip).toHaveCount(0);
  await expect(page.getByRole("status").filter({ hasText: "closed." })).toBeVisible();
});
