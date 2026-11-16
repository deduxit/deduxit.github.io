// deduxit © Fabian Lukas Grubmüller 2026
// Licensed under the EUPL

// Modal logic on the page: the calculus popover's button opens it, a sequent is decided in the
// system chosen (K by default) with a derivation or a countermodel, the model is changed and
// checked again, and the link keeps the sequent and the system. A visitor who never presses the
// button sees none of it.

import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";
import { goto, switches } from "./prover";

/** Opens the page with its tab in modal logic, in the system given. */
async function modalTab(page: Page, system = "K") {
  await goto(page);
  const pop = await switches(page);
  await pop.getByRole("button", { name: "Modal logic" }).click();
  if (system !== "K") await pop.getByRole("combobox", { name: "System" }).selectOption(system);
  await page.keyboard.press("Escape");
  await expect(page.getByText(/Modal logic adds □A/)).toBeVisible();
}

/** Decides `sequent` in the tab's system and waits for its verdict. */
async function decide(page: Page, sequent: string) {
  await page.getByRole("textbox", { name: "Sequent" }).fill(sequent);
  await page.getByRole("textbox", { name: "Sequent" }).press("Enter");
  await expect(page.locator(".modal .method-verdict .kw").first()).toBeVisible();
}

test("the page shows nothing of modal logic until its button is pressed", async ({ page }) => {
  await goto(page);
  await expect(page.getByText(/Modal logic adds □A/)).toHaveCount(0);
  const pop = await switches(page);
  await expect(pop.getByRole("group", { name: "Suite" }).getByRole("button")).toHaveText([
    "Linear",
    "Ordinary",
  ]);
  await expect(pop.getByRole("combobox", { name: "System" })).toHaveCount(0);
  await expect(pop.getByRole("button", { name: "Modal logic" })).toBeVisible();
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
  await expect(page.locator(".ptab[aria-current=true] .pt-mark")).toContainText("Modal (K)");
});

test("the system chosen decides again: valid in S4 with its labelled derivation", async ({
  page,
}) => {
  await modalTab(page);
  await decide(page, "[]p -> [][]p");
  const pop = await switches(page);
  await pop.getByRole("combobox", { name: "System" }).selectOption("S4");
  await page.keyboard.press("Escape");
  await expect(page.locator(".modal .kw.ok")).toHaveText("Valid");
  await expect(page.locator(".modal .custom-drawing svg")).toContainText("Trans");
  await expect(page.getByText("In S4 every world sees itself")).toBeVisible();
});

test("a changed model is checked: the failing world's values and the frame condition named", async ({
  page,
}) => {
  await modalTab(page);
  await decide(page, "[]p -> [][]p");
  await page.getByText("Change the model and check it").click();
  await page.getByRole("button", { name: "Check the model" }).click();
  const check = page.locator(".modal-check");
  await expect(check).toContainText("Fails");
  await expect(check).toContainText("□□p is false: world 1 shows it");
  await expect(check.locator(".countermodel-drawing svg")).toBeVisible();
  // World 1 no longer forces p: □p is false at world 0, so the sequent holds there.
  await page.getByRole("textbox", { name: "Atoms world 1 forces" }).fill("");
  await page.getByRole("textbox", { name: "Atoms world 1 forces" }).press("Tab");
  await page.getByRole("button", { name: "Check the model" }).click();
  await expect(check).toContainText("Holds");
  // In T every world must see itself.
  const pop = await switches(page);
  await pop.getByRole("combobox", { name: "System" }).selectOption("T");
  await page.keyboard.press("Escape");
  await expect(page.locator(".modal .kw.bad")).toHaveText("Not valid");
  await page.getByText("Change the model and check it").click();
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
  await expect(page.locator(".ptab[aria-current=true] .pt-mark")).toContainText("Modal (KD45)");
});

test("a copy is linked: it follows a change of the system, and Undo takes the change back", async ({
  page,
}) => {
  await modalTab(page);
  await decide(page, "[]p -> [][]p");
  const pop = await switches(page);
  await pop.getByRole("button", { name: "Duplicate this proof" }).click();
  await expect(page.locator(".ptab")).toHaveCount(2);
  // The panel docks by itself at the visit's first link.
  const panel = page.getByRole("region", { name: "Workspace" });
  await expect(panel.locator(".ws-row")).toHaveCount(2);
  await expect(panel.locator(".ws-row").nth(1)).toContainText("Copy of");
  await page.locator(".ptab").first().locator(".pt-go").click();
  const again = await switches(page);
  await again.getByRole("combobox", { name: "System" }).selectOption("S4");
  await page.keyboard.press("Escape");
  await expect(page.locator(".modal .kw.ok")).toHaveText("Valid");
  // The copy is the same decision of the same statement: it follows.
  await expect(panel.locator(".ws-row").nth(1)).toContainText("Valid · S4");
  await panel.getByRole("button", { name: "Undo system change" }).click();
  await expect(panel.locator(".ws-row").nth(0)).toContainText("Not valid · K");
  await expect(panel.locator(".ws-row").nth(1)).toContainText("Not valid · K");
});

test("a linked tab switched to ordinary logic leaves the workspace, and Undo links it again", async ({
  page,
}) => {
  await modalTab(page);
  await decide(page, "p -> p");
  const pop = await switches(page);
  await pop.getByRole("button", { name: "Duplicate this proof" }).click();
  const panel = page.getByRole("region", { name: "Workspace" });
  await expect(panel.locator(".ws-row")).toHaveCount(2);
  await page.locator(".ptab").nth(1).locator(".pt-go").click();
  const again = await switches(page);
  await again.getByRole("button", { name: "Ordinary", exact: true }).click();
  await page.keyboard.press("Escape");
  await expect(
    page.getByText(/is no longer linked: its tab is now in another suite/),
  ).toBeVisible();
  await expect(page.getByText(/The workspace refused/)).toHaveCount(0);
  await expect(panel.locator(".ws-row")).toHaveCount(1);
  await panel.getByRole("button", { name: "Undo unlinking" }).click();
  await expect(panel.locator(".ws-row")).toHaveCount(2);
  await expect(page.locator(".ptab")).toHaveCount(2);
});
