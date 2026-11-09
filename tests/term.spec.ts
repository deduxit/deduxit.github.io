// deduxit © Fabian Lukas Grubmüller 2026
// Licensed under the EUPL

// A finished proof's program: the bottom band's Export menu shows the λ-term of an intuitionistic
// proof as its typing judgement and copies it as text, in the linear suite and in the ordinary
// one, and says why a proof has none.

import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";
import { calculus, goto, start, switches } from "./prover";

/** Closes every open goal by the search and waits for the proof to be finished. */
async function closeAll(page: Page) {
  await page.getByRole("button", { name: "Close all" }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Proved: every goal is closed" }),
  ).toBeVisible();
}

/** The Export menu's λ-term item, the menu opened. */
async function termItem(page: Page) {
  await page.getByRole("button", { name: "Export" }).click();
  return page.getByRole("menu", { name: "Export" }).getByRole("menuitem", { name: /^λ-term/ });
}

/** Copies the term the item shows and returns the clipboard's text. */
async function copied(page: Page) {
  await page
    .getByRole("menu", { name: "Export" })
    .getByRole("menuitem", { name: /^λ-term/ })
    .click();
  await expect(page.getByRole("menu", { name: "Export" }).getByRole("status")).toHaveText(
    "λ-term copied as text.",
  );
  return page.evaluate(() => navigator.clipboard.readText());
}

test("a finished proof of intuitionistic linear logic shows its λ-term, copied as text", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await start(page, "|- a -o b -o a * b");
  await calculus(page, ["Intuitionistic"]);
  // Only a finished proof has a term.
  const unfinished = await termItem(page);
  await expect(unfinished).toHaveAttribute("aria-disabled", "true");
  await expect(unfinished).toContainText("A finished proof has a λ-term");
  await page.keyboard.press("Escape");
  await closeAll(page);
  const item = await termItem(page);
  const judgement = "⊢ λx. λy. x ⊗ y : a ⊸ (b ⊸ (a ⊗ b))";
  await expect(item.locator(".judgement")).toHaveText(judgement);
  expect(await copied(page)).toBe(judgement);
});

test("a finished derivation of LJ shows its simply typed λ-term", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await goto(page);
  const pop = await switches(page);
  await pop.getByRole("button", { name: "Ordinary", exact: true }).click();
  await pop.getByRole("button", { name: "Intuitionistic", exact: true }).click();
  await page.keyboard.press("Escape");
  await page.getByRole("textbox", { name: "Sequent" }).fill("|- (a -> b) -> (b -> c) -> a -> c");
  await page.getByRole("textbox", { name: "Sequent" }).press("Enter");
  await closeAll(page);
  const item = await termItem(page);
  const judgement = "⊢ λf. λg. λx. g (f x) : (a → b) → ((b → c) → (a → c))";
  await expect(item.locator(".judgement")).toHaveText(judgement);
  expect(await copied(page)).toBe(judgement);
});

test("a finished proof without a λ-term says why", async ({ page }) => {
  await start(page, "|- a -o a");
  await closeAll(page);
  const item = await termItem(page);
  await expect(item).toContainText(
    "No λ-term: a proof of classical logic has several conclusions at once, and a λ-term has one type.",
  );
  await expect(item).toHaveAttribute("aria-disabled", "true");
  await expect(item.locator(".judgement")).toHaveCount(0);
});
