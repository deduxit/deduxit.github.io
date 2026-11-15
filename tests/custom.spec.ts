// deduxit © Fabian Lukas Grubmüller 2026
// Licensed under the EUPL

// A calculus of one's own on the page: the calculus popover's button opens it, a derivation is
// built in a built-in calculus or a rule file the visitor writes, each step checked by deduxit,
// and the finished one is "valid in the calculus given"; the link and the stored proofs keep the
// rule file with the proof. A visitor who never presses the button sees none of it.

import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";
import { goto, switches } from "./prover";
import { customStep } from "./states";

/** Opens the page with its tab in a calculus of one's own, LJ to start from. */
async function own(page: Page) {
  await goto(page);
  const pop = await switches(page);
  await pop.getByRole("button", { name: "Your own calculus" }).click();
  await page.keyboard.press("Escape");
  await expect(page.getByText("A rule file is a calculus written down")).toBeVisible();
}

/** Starts `goal` in the tab's calculus. */
async function begin(page: Page, goal: string) {
  await page.getByRole("textbox", { name: "Sequent" }).fill(goal);
  await page.getByRole("textbox", { name: "Sequent" }).press("Enter");
  await expect(page.getByRole("list", { name: "Steps that apply" })).toBeVisible();
}

test("the page shows nothing of a calculus of one's own until its button is pressed", async ({
  page,
}) => {
  await goto(page);
  await expect(page.getByText("A rule file is a calculus written down")).toHaveCount(0);
  const pop = await switches(page);
  await expect(pop.getByRole("group", { name: "Suite" }).getByRole("button")).toHaveText([
    "Linear",
    "Ordinary",
  ]);
  await expect(pop.getByRole("button", { name: "Your own calculus" })).toBeVisible();
});

test("a derivation in LJ is built by steps, a refused step says why, and it is checked whole", async ({
  page,
}) => {
  await own(page);
  await expect(page.locator(".ptab[aria-current=true] .pt-mark")).toContainText("LJ");
  await begin(page, "a ∧ b ⊢ b ∧ a");
  await expect(page.locator(".custom-drawing svg title")).toHaveText("a ∧ b ⊢ b ∧ a");
  await customStep(page, "∧R on b ∧ a");
  await expect(page.getByText("Open goal 1 of 2")).toBeVisible();
  await customStep(page, "∧L₂ on a ∧ b");
  await customStep(page, "ax");
  await page.locator("footer").getByRole("button", { name: "Undo", exact: true }).click();
  await customStep(page, "ax");
  await customStep(page, "∧L₁ on a ∧ b");
  await customStep(page, "ax");
  await expect(page.getByText("Every goal is closed")).toBeVisible();
  await page.getByRole("button", { name: "Check the derivation" }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Valid in the calculus given" }),
  ).toBeVisible();
  // The drawing names each step by its rule in LJ's rule file.
  const texts = (await page.locator(".custom-drawing svg text").allTextContents()).join(" ");
  expect(texts).toContain("∧R");
});

test("a step that needs a value asks for it by name, and a wrong value is refused", async ({
  page,
}) => {
  await own(page);
  await begin(page, "a ⊢ a");
  await customStep(page, "cut");
  const form = page.getByRole("form", { name: /^Give what cut needs/ });
  await expect(form).toBeVisible();
  await form.getByRole("textbox").first().fill("a ∧");
  await form.getByRole("button", { name: "Apply cut" }).click();
  await expect(page.locator(".custom-problem")).toBeVisible();
  await page.getByRole("button", { name: "Other steps" }).click();
  await customStep(page, "ax");
  await expect(page.getByText("Every goal is closed")).toBeVisible();
});

test("a rule file of one's own is read, refused with its reason, and proved in", async ({
  page,
}) => {
  await own(page);
  await page.getByText("The rule file", { exact: true }).click();
  const file = page.getByRole("textbox", { name: "The rule file" });
  await file.fill('{"version": 15, "name": "Broken"}');
  await page.getByRole("textbox", { name: "Sequent" }).fill("p ⊢ p");
  await page.getByRole("textbox", { name: "Sequent" }).press("Enter");
  await expect(page.locator(".custom-problem")).toBeVisible();
  await file.fill(
    JSON.stringify({
      version: 15,
      name: "Mini",
      connectives: [{ name: "&", arity: 2, fixity: "infix" }],
      sequent: [
        { name: "left", discipline: "multiset" },
        { name: "right", mark: "⊢", discipline: "multiset" },
      ],
      variables: { formula: ["A", "B"] },
      contexts: ["Γ"],
      rules: [
        { name: "id", conclusion: { left: ["Γ", "A"], right: ["A"] } },
        {
          name: "&R",
          premises: [
            { left: ["Γ"], right: ["A"] },
            { left: ["Γ"], right: ["B"] },
          ],
          conclusion: { left: ["Γ"], right: [["&", "A", "B"]] },
        },
      ],
    }),
  );
  await expect(page.locator(".ptab[aria-current=true] .pt-mark")).toContainText("Mini");
  await begin(page, "p, q ⊢ q & p");
  await customStep(page, "&R");
  await customStep(page, "id");
  await customStep(page, "id");
  await page.getByRole("button", { name: "Check the derivation" }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Valid in the calculus given" }),
  ).toBeVisible();
});

test("the link and the stored proofs keep the calculus and its steps", async ({
  page,
  context,
}) => {
  await own(page);
  await begin(page, "a ∧ b ⊢ b ∧ a");
  await customStep(page, "∧R on b ∧ a");
  await expect(page).toHaveURL(/u=rules&m=LJ/);
  await expect(page).toHaveURL(/&d=/);
  const linked = await context.newPage();
  await linked.goto(page.url());
  await expect(linked.getByText("Open goal 1 of 2")).toBeVisible();
  await linked.close();
  // The page without the link: the proof is in the restore bar, from the stored proofs.
  await page.goto("/");
  await page.getByRole("button", { name: "Restore" }).click();
  await expect(page.getByText("Open goal 1 of 2")).toBeVisible();
});
