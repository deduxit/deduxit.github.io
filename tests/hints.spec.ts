// deduxit © Fabian Lukas Grubmüller 2026
// Licensed under the EUPL

// Every rule label carries a hint: the rule's full name, its schema and what it does. It opens
// on hover, on the keyboard's focus and on a click, Escape dismisses it, and a screen reader
// reads its words as the label's description. The tap is phone.spec.ts's.

import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";
import { calculus, closeGoal, goto, rule, start, tool } from "./prover";

const hint = (page: Page) => page.locator(".rule-tip");

test("a rule of the popover shows its card on hover: the rule drawn, premises over conclusion", async ({
  page,
}) => {
  await start(page, "A * B |- B * A");
  await page.getByRole("button", { name: /^A⊥ ⅋ B⊥, formula/ }).click();
  const par = page.getByRole("dialog", { name: "Rules" }).getByRole("button", { name: "⅋" });
  await page.locator(".stage").hover({ position: { x: 5, y: 5 } });
  await par.blur();
  await par.hover();
  const card = page.locator(".rule-card");
  await expect(card.getByRole("img", { name: "⊢ Γ, A, B, over ⊢ Γ, A ⅋ B" })).toBeVisible();
  // The card draws the rule alone: no name, no sentence.
  await expect(card).not.toContainText("par");
});

test("the keyboard's focus on a rule shows its card, and Escape closes the popover", async ({
  page,
}) => {
  await start(page, "A * B |- B * A");
  await page.getByRole("button", { name: /^A⊥ ⅋ B⊥, formula/ }).click();
  const rules = page.getByRole("dialog", { name: "Rules" });
  await expect(rules.getByRole("button", { name: "⅋" })).toBeFocused();
  await expect(page.locator(".rule-card")).toContainText("⊢ Γ, A ⅋ B");
  await page.keyboard.press("Escape");
  await expect(rules).toHaveCount(0);
  await expect(page.getByRole("button", { name: /^A⊥ ⅋ B⊥, formula/ })).toBeFocused();
});

test("a label of the derivation opens its hint on a click, and a press elsewhere closes it", async ({
  page,
}) => {
  await start(page, "A * B |- B * A");
  await rule(page, /^A⊥ ⅋ B⊥/, "⅋");
  const label = page.getByRole("button", { name: /^Rule ⅋, step \d+$/ });
  await label.click();
  await expect(hint(page)).toContainText("⅋: par");
  // It stays while the pointer moves away, until a press elsewhere.
  await page.mouse.move(5, 5);
  await expect(hint(page)).toBeVisible();
  await page.locator(".top-row").click({ position: { x: 300, y: 5 } });
  await expect(hint(page)).toHaveCount(0);
});

test("each label is named by its step, as the drawing's description numbers the inferences", async ({
  page,
}) => {
  await start(page, "A * B |- B * A");
  await closeGoal(page);
  await expect(
    page.getByRole("status").filter({ hasText: "Proved. Every goal is closed." }),
  ).toBeVisible();
  const steps = (await page.locator(".drawing svg desc").textContent())?.split("\n") ?? [];
  const names = await page
    .locator(".hits .lb")
    .evaluateAll((all) => all.map((b) => b.getAttribute("aria-label") ?? ""));
  // ⅋, ⊗ and two axioms, each label once.
  expect(names).toHaveLength(4);
  expect(steps).toHaveLength(4);
  for (const name of names) {
    const [, rule, step] = /^Rule (.+), step (\d+)$/.exec(name) ?? [];
    expect(steps[Number(step) - 1], name).toMatch(
      new RegExp(`^${step}\\. .*, by ${rule}( from .*)?\\.$`),
    );
  }
  expect(new Set(names).size).toBe(4);
});

test("drawn two-sided, a classical label shows its two-sided rule", async ({ page }) => {
  await start(page, "A * B |- B * A");
  await closeGoal(page);
  await expect(
    page.getByRole("status").filter({ hasText: "Proved. Every goal is closed." }),
  ).toBeVisible();
  await tool(page, "Two-sided").click();
  await page.getByRole("button", { name: /^Rule ⊗L, step \d+$/ }).hover();
  await expect(hint(page)).toContainText("⊗L: tensor, left");
  await expect(
    hint(page).getByRole("img", { name: "⊗L: from Γ, A, B ⊢ Δ to Γ, A ⊗ B ⊢ Δ" }),
  ).toBeVisible();
});

test("an ordinary sequent's labels show LJ's rules", async ({ page }) => {
  await goto(page);
  await calculus(page, ["Ordinary", "Intuitionistic"]);
  await page.getByRole("textbox", { name: "Sequent" }).fill("a -> b, a |- b");
  await page.getByRole("textbox", { name: "Sequent" }).press("Enter");
  await closeGoal(page);
  await page.getByRole("button", { name: /^Rule →L, step \d+$/ }).hover();
  await expect(hint(page)).toContainText("→L: implication, left");
  await expect(
    hint(page).getByRole("img", { name: "→L: from Γ ⊢ A and Δ, B ⊢ C to Γ, Δ, A → B ⊢ C" }),
  ).toBeVisible();
});
