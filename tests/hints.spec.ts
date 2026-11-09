// deduxit © Fabian Lukas Grubmüller 2026
// Licensed under the EUPL

// Every rule label carries a hint: the rule's full name, its schema and what it does. It opens
// on hover, on the keyboard's focus and on a click, Escape dismisses it, and a screen reader
// reads its words as the label's description. The tap is phone.spec.ts's.

import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";
import { goto, rule, start, switches } from "./prover";

const hint = (page: Page) => page.locator(".rule-tip");

test("a rule of the popover shows its hint on hover, with Learn off", async ({ page }) => {
  await start(page, "A * B |- B * A");
  await page.getByRole("button", { name: /^A⊥ ⅋ B⊥, formula/ }).click();
  const par = page.getByRole("dialog", { name: "Rules" }).getByRole("button", { name: /^⅋/ });
  await expect(par).toHaveAccessibleDescription(/^⅋, par: from ⊢ Γ, A, B to ⊢ Γ, A ⅋ B\. Puts A/);
  await par.hover();
  await expect(hint(page)).toBeVisible();
  await expect(hint(page)).toContainText("⅋: par");
  await expect(
    hint(page).getByRole("img", { name: "⅋: from ⊢ Γ, A, B to ⊢ Γ, A ⅋ B" }),
  ).toBeVisible();
  await expect(hint(page)).toContainText("It never loses a proof");
});

test("the keyboard's focus opens a rule's hint, and Escape closes it alone", async ({ page }) => {
  await start(page, "A * B |- B * A");
  await page.getByRole("button", { name: /^A⊥ ⅋ B⊥, formula/ }).click();
  const rules = page.getByRole("dialog", { name: "Rules" });
  await rules.getByRole("button", { name: /^⅋/ }).focus();
  await page.keyboard.press("Tab");
  await expect(rules.getByRole("button", { name: "About par" })).toBeFocused();
  await expect(hint(page)).toContainText("⅋: par");
  await page.keyboard.press("Escape");
  await expect(hint(page)).toHaveCount(0);
  await expect(rules).toBeVisible();
});

test("a label of the derivation opens its hint on a click, and a press elsewhere closes it", async ({
  page,
}) => {
  await start(page, "A * B |- B * A");
  await rule(page, /^A⊥ ⅋ B⊥/, "⅋");
  const label = page.getByRole("button", { name: "Rule ⅋", exact: true });
  await label.click();
  await expect(hint(page)).toContainText("⅋: par");
  // It stays while the pointer moves away, until a press elsewhere.
  await page.mouse.move(5, 5);
  await expect(hint(page)).toBeVisible();
  await page.locator("footer").click({ position: { x: 5, y: 5 } });
  await expect(hint(page)).toHaveCount(0);
});

test("drawn two-sided, a classical label shows its two-sided rule", async ({ page }) => {
  await start(page, "A * B |- B * A");
  await page.getByRole("button", { name: "Close goal" }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Proved: every goal is closed" }),
  ).toBeVisible();
  await (await switches(page)).getByRole("checkbox", { name: "Two-sided" }).check();
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Rule ⊗L", exact: true }).hover();
  await expect(hint(page)).toContainText("⊗L: tensor, left");
  await expect(
    hint(page).getByRole("img", { name: "⊗L: from Γ, A, B ⊢ Δ to Γ, A ⊗ B ⊢ Δ" }),
  ).toBeVisible();
});

test("an ordinary tab's labels show LJ's rules", async ({ page }) => {
  await goto(page);
  const pop = await switches(page);
  await pop.getByRole("button", { name: "Ordinary", exact: true }).click();
  await pop.getByRole("button", { name: "Intuitionistic", exact: true }).click();
  await page.keyboard.press("Escape");
  await page.getByRole("textbox", { name: "Sequent" }).fill("a -> b, a |- b");
  await page.getByRole("textbox", { name: "Sequent" }).press("Enter");
  await page.getByRole("button", { name: "Close goal" }).click();
  await page.getByRole("button", { name: "Rule →L", exact: true }).hover();
  await expect(hint(page)).toContainText("→L: implication, left");
  await expect(
    hint(page).getByRole("img", { name: "→L: from Γ ⊢ A and Γ, B ⊢ C to Γ, A → B ⊢ C" }),
  ).toBeVisible();
});

test("a lesson's step names its rule with the hint", async ({ page }) => {
  await goto(page);
  await page.locator("footer").getByRole("button", { name: "Learn" }).click();
  const frame = page.getByRole("complementary", { name: "Learn" });
  await frame.getByRole("button", { name: "Lesson 2: The multiplicatives" }).click();
  await frame.getByRole("button", { name: "Start the worked proof" }).click();
  await frame.getByRole("button", { name: "Predict ⅋" }).click();
  await frame.locator(".said").getByRole("button", { name: "⅋" }).click();
  await expect(hint(page)).toContainText("⅋: par");
});
