// deduxit © Fabian Lukas Grubmüller 2026
// Licensed under the EUPL

// Modal logic on the page: the new tab view's logic opens it, a sequent is decided in the system
// chosen (K by default) with a derivation or a countermodel, a valid sequent is proved step by
// step in its system's labelled calculus, the model is changed and checked again, and the link
// keeps the sequent and the system.

import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";
import {
  addView,
  calculus,
  exportEntry,
  goto,
  saveExport,
  switches,
  system as choose,
  tool,
  viewCell,
} from "./prover";
import { customStep } from "./states";

/** Opens the page with its tab in modal logic, in the system given. */
async function modalTab(page: Page, system = "K") {
  await goto(page);
  await calculus(page, ["Modal logic"]);
  await switches(page);
  if (system !== "K") await choose(page, system);
  await expect(page.getByRole("button", { name: `${system} system` })).toBeVisible();
}

/** Decides `sequent` in the tab's system and waits for its verdict. */
async function decide(page: Page, sequent: string) {
  await page.getByRole("textbox", { name: "Sequent" }).fill(sequent);
  await page.getByRole("textbox", { name: "Sequent" }).press("Enter");
  await expect(page.locator(".modal .method-verdict .kw").first()).toBeVisible();
}

test("the page shows nothing of modal logic until its logic is chosen", async ({ page }) => {
  await goto(page);
  await expect(page.getByRole("button", { name: / system$/ })).toHaveCount(0);
  await page.getByRole("button", { name: /^Modal logic/ }).click();
  await expect(page.getByRole("button", { name: "K system" })).toBeVisible();
});

test("a sequent not valid in K shows a checked countermodel in words of seeing", async ({
  page,
}) => {
  await modalTab(page);
  await decide(page, "[]p -> [][]p");
  await expect(page.locator(".modal .kw.bad")).toHaveText("Not valid");
  await expect(page.locator(".modal figcaption")).toContainText("World 0, outlined");
  const drawing = page.locator(".modal .countermodel-drawing svg");
  await expect(drawing).toBeVisible();
  await expect(drawing.locator("desc")).toContainText("it sees world 1");
  await expect(viewCell(page)).toHaveAttribute("data-tip", "Modal logic, K");
});

test("the system chosen decides again: valid in S4 with its labelled derivation", async ({
  page,
}) => {
  await modalTab(page);
  await decide(page, "[]p -> [][]p");
  await choose(page, "S4");
  await expect(page.locator(".modal .kw.ok")).toHaveText("Valid");
  await expect(page.locator(".modal .custom-drawing svg")).toContainText("Trans");
  await expect(page.getByText("In S4 every world sees itself")).toBeVisible();
});

test("the conditions on what a world sees make the system, and its name opens the list", async ({
  page,
}) => {
  await modalTab(page);
  const conditions = page.getByRole("group", { name: "Conditions on what a world sees" });
  await conditions.getByRole("button", { name: "Reflexive" }).click();
  await expect(page.getByRole("button", { name: "T system" })).toBeVisible();
  // Reflexive makes every world see some world: Serial follows, pressed but not the system's own.
  await expect(conditions.getByRole("button", { name: "Serial" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await conditions.getByRole("button", { name: "Transitive" }).click();
  await expect(page.getByRole("button", { name: "S4 system" })).toBeVisible();
  await conditions.getByRole("button", { name: "Reflexive" }).click();
  await expect(page.getByRole("button", { name: "K4 system" })).toBeVisible();
  // The list of the fifteen closes on Escape and on a press outside.
  await page.getByRole("button", { name: "K4 system" }).click();
  await expect(page.getByRole("listbox", { name: "Systems" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("listbox", { name: "Systems" })).toBeHidden();
  await page.getByRole("button", { name: "K4 system" }).click();
  await page.getByRole("textbox", { name: "Sequent" }).click();
  await expect(page.getByRole("listbox", { name: "Systems" })).toBeHidden();
});

test("a valid sequent is proved step by step in its system's labelled calculus", async ({
  page,
}) => {
  await modalTab(page, "T");
  await decide(page, "[]p |- p");
  await expect(page.locator(".modal .kw.ok")).toHaveText("Valid");
  await tool(page, "Prove step by step").click();
  await expect(page.getByText("Open goal 1 of 1")).toBeVisible();
  await expect(page.locator(".custom-drawing svg title")).toHaveText("w0 : □p ⊢ w0 : p");
  // The labelled calculus is a view beside the decision, in the same chip.
  await expect(page.locator(".chip")).toHaveCount(1);
  await expect(page.getByRole("tab", { name: /^G3T/ })).toHaveAttribute("aria-selected", "true");
  await customStep(page, "Ref");
  const form = page.getByRole("form", { name: /^Give what Ref needs/ });
  await form.getByRole("textbox").first().fill("w0");
  await form.getByRole("button", { name: "Apply Ref" }).click();
  await customStep(page, "L□ on w0 : □p, w0 R w0");
  await customStep(page, "ax on w0 : p");
  await expect(page.getByText("Every goal is closed")).toBeVisible();
  await page.getByRole("button", { name: "Check the derivation" }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Valid in the calculus given" }),
  ).toBeVisible();
});

test("a changed model is checked: the failing world's values and the frame condition named", async ({
  page,
}) => {
  await modalTab(page);
  await decide(page, "[]p -> [][]p");
  await page.getByRole("button", { name: "Change this model and check it" }).click();
  await page.getByRole("button", { name: "Check the model" }).click();
  const check = page.locator(".modal-check");
  await expect(check).toContainText("Fails");
  await expect(check).toContainText("□□p is false: world 1 shows it");
  await expect(page.locator('.kripke-world[data-world="0"]')).toHaveAttribute("data-failing", "");
  // World 1 no longer forces p: □p is false at world 0, so the sequent holds there.
  await page.locator('.kripke-world[data-world="1"]').click();
  await page.getByRole("textbox", { name: "Atoms world 1 forces" }).fill("");
  await page.getByRole("textbox", { name: "Atoms world 1 forces" }).press("Tab");
  await page.getByRole("button", { name: "Check the model" }).click();
  await expect(check).toContainText("Holds");
  // In T every world must see itself.
  await choose(page, "T");
  await expect(page.locator(".modal .kw.bad")).toHaveText("Not valid");
  await page.getByRole("checkbox", { name: "World 0 sees world 0" }).uncheck();
  await page.getByRole("button", { name: "Check the model" }).click();
  await expect(check).toContainText("Not reflexive: world 0 does not see itself.");
});

test("the link keeps the sequent and the system, decided again on arrival", async ({ page }) => {
  await modalTab(page, "KD45");
  await decide(page, "[]p -> <>p");
  await expect(page.locator(".modal .kw.ok")).toHaveText("Valid");
  await expect(page).toHaveURL(/u=modal&m=KD45/);
  await page.reload();
  await expect(page.locator(".modal .kw.ok")).toHaveText("Valid");
  await expect(viewCell(page)).toHaveAttribute("data-tip", "Modal logic, KD45");
});

test("a copy is a view beside the decision, with the same decision", async ({ page }) => {
  await modalTab(page);
  await decide(page, "[]p -> [][]p");
  await addView(page, "A copy of this proof");
  await expect(page.locator(".chip")).toHaveCount(1);
  await expect(page.getByRole("tab", { name: /^Modal logic, K, a copy/ })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await expect(page.locator(".modal .kw.bad")).toHaveText("Not valid");
});

test("Export writes a valid sequent's derivation, and draws a countermodel where there is none", async ({
  page,
}) => {
  await modalTab(page, "S4");
  await decide(page, "[]p -> [][]p");
  await expect(page.locator(".modal .kw.ok")).toHaveText("Valid");
  const panel = await exportEntry(page, "LaTeX");
  await expect(panel.locator("pre")).toContainText("\\");
  expect((await saveExport(page, "Typst")).suggestedFilename()).toBe("deduxit-proof.typ");
  await page.keyboard.press("Escape");
  await choose(page, "K");
  await expect(page.locator(".modal .kw.bad")).toHaveText("Not valid");
  await exportEntry(page, "LaTeX");
  await expect(panel.getByText("Only a valid sequent has a derivation to write.")).toBeVisible();
  expect((await saveExport(page, "SVG")).suggestedFilename()).toBe("deduxit-countermodel.svg");
  // The link holds the sequent and the system, decided again on arrival.
  await exportEntry(page, "This proof");
  await expect(panel.locator(".ex-link")).toContainText("u=modal&m=K");
});
