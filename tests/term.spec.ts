// deduxit © Fabian Lukas Grubmüller 2026
// Licensed under the EUPL

// A finished proof's program: the λ-term view shows the λ-term of an intuitionistic proof as its
// typing judgement and copies it as text, in the linear suite and in the ordinary one, and says
// why a proof has none.

import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";
import { addView, calculus, goto, proved, start, tool } from "./prover";

/** Closes every open goal by the search and waits for the proof to be finished. */
async function closeAll(page: Page) {
  await tool(page, "Close all").click();
  await expect(proved(page)).toBeVisible();
}

/** The λ-term view's judgement. */
const judgementOf = (page: Page) => page.getByRole("region", { name: "λ-term" }).locator(".m");

/** Copies the term the view shows and returns the clipboard's text. */
async function copied(page: Page) {
  await tool(page, "Copy as text").click();
  await expect(
    page.getByRole("status").filter({ hasText: "λ-term copied as text." }),
  ).toBeVisible();
  return page.evaluate(() => navigator.clipboard.readText());
}

test("a finished proof of intuitionistic linear logic shows its λ-term, copied as text", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await start(page, "|- a -o b -o a * b");
  await calculus(page, ["Intuitionistic"]);
  // Only a finished proof has a term: its entry is faint and says why.
  await page.getByRole("button", { name: "Add a view" }).click();
  const entry = page
    .getByRole("dialog", { name: "Add a view" })
    .getByRole("button", { name: "λ-term", exact: true });
  await expect(entry).toHaveAttribute("aria-disabled", "true");
  await expect(page.getByRole("dialog", { name: "Add a view" })).toContainText(
    "Finish the proof first: the term is read off the finished proof.",
  );
  await page.keyboard.press("Escape");
  await closeAll(page);
  await addView(page, "λ-term");
  const judgement = "⊢ λx. λy. x ⊗ y : a ⊸ (b ⊸ (a ⊗ b))";
  await expect(judgementOf(page)).toHaveText(judgement);
  expect(await copied(page)).toBe(judgement);
});

test("a finished derivation of LJ shows its simply typed λ-term", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await goto(page);
  await calculus(page, ["Ordinary", "Intuitionistic"]);
  await page.getByRole("textbox", { name: "Sequent" }).fill("|- (a -> b) -> (b -> c) -> a -> c");
  await page.getByRole("textbox", { name: "Sequent" }).press("Enter");
  await closeAll(page);
  await addView(page, "λ-term");
  const judgement = "⊢ λf. λg. λx. g (f x) : (a → b) → ((b → c) → (a → c))";
  await expect(judgementOf(page)).toHaveText(judgement);
  expect(await copied(page)).toBe(judgement);
});

test("a finished proof without a λ-term says why", async ({ page }) => {
  await start(page, "|- a -o a");
  await closeAll(page);
  await addView(page, "λ-term");
  const view = page.getByRole("region", { name: "λ-term" });
  await expect(view).toContainText(
    "No λ-term: a proof of classical logic has several conclusions at once, and a λ-term has one type.",
  );
  await expect(judgementOf(page)).toHaveCount(0);
  await expect(tool(page, "Copy as text")).toBeDisabled();
});
