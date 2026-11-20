// deduxit © Fabian Lukas Grubmüller 2026
// Licensed under the EUPL

// Lambda-terms on the page: the calculus popover's button opens them, a term typed is checked and
// its typing derivation drawn, a type typed gets a term found and its terms listed and counted, an
// ill-typed term says why, and the link keeps the text and the calculus. A visitor who never
// presses the button sees none of it.

import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";
import { goto, switches } from "./prover";

/** Opens the page with its tab in lambda-terms, in the calculus given. */
async function lambdaTab(page: Page, calculus = "simple") {
  await goto(page);
  const pop = await switches(page);
  await pop.getByRole("button", { name: "Lambda-terms" }).click();
  if (calculus !== "simple")
    await pop.getByRole("combobox", { name: "Lambda calculus" }).selectOption(calculus);
  await page.keyboard.press("Escape");
  await expect(page.getByText(/A λ-term is a small program/)).toBeVisible();
}

/** Types `text` into the field and reads it. */
async function read(page: Page, text: string) {
  await page.getByRole("textbox", { name: "Sequent" }).fill(text);
  await page.getByRole("textbox", { name: "Sequent" }).press("Enter");
  await expect(page.locator(".lambda .method-verdict .kw").first()).toBeVisible();
}

test("the page shows nothing of lambda-terms until their button is pressed", async ({ page }) => {
  await goto(page);
  await expect(page.getByText(/A λ-term is a small program/)).toHaveCount(0);
  const pop = await switches(page);
  await expect(pop.getByRole("group", { name: "Suite" }).getByRole("button")).toHaveText([
    "Linear",
    "Ordinary",
  ]);
  await expect(pop.getByRole("combobox", { name: "Lambda calculus" })).toHaveCount(0);
  await expect(pop.getByRole("button", { name: "Lambda-terms" })).toBeVisible();
});

test("a term is checked and its typing derivation drawn by natural deduction's rules", async ({
  page,
}) => {
  await lambdaTab(page);
  await read(page, String.raw`\f:a -> b. \x:a. f x`);
  await expect(page.locator(".lambda .kw.ok")).toHaveText("Well typed");
  await expect(page.locator(".lambda .method-verdict").first()).toContainText(
    "Its type is (a → b) → (a → b).",
  );
  const drawing = page.locator(".lambda .custom-drawing svg");
  await expect(drawing.locator("desc")).toContainText("f x : b, by →E from 1 and 2.");
  await expect(page.locator(".ptab[aria-current=true] .pt-mark")).toContainText(
    "Lambda-terms (λ→)",
  );
  // The link keeps the term and the calculus, and the term is checked again on arrival.
  await expect(page).toHaveURL(/u=lambda&m=simple/);
  await page.reload();
  await expect(page.locator(".lambda .kw.ok")).toHaveText("Well typed");
});

test("a type's term is found, and its terms listed and counted", async ({ page }) => {
  await lambdaTab(page);
  await read(page, "a -> a -> a");
  await expect(page.locator(".lambda .kw.ok")).toHaveText("Has a term");
  await expect(page.locator(".lambda .custom-drawing svg")).toBeVisible();
  await page.getByRole("button", { name: "List its terms" }).click();
  await expect(page.locator(".lambda-terms")).toContainText("Exactly 2 terms, up to βη-equality.");
  await expect(page.locator(".lambda-terms li")).toHaveText(["λx:a. λy:a. x", "λx:a. λy:a. y"]);
  await page.getByRole("button", { name: "New proof" }).click();
  await read(page, "((a -> b) -> a) -> a");
  await expect(page.locator(".lambda .kw.bad")).toHaveText("No term");
});

test("a term that uses a variable twice is not well typed in the linear calculus", async ({
  page,
}) => {
  await lambdaTab(page, "linear");
  await expect(page.getByText("Every variable is used exactly once.")).toBeVisible();
  await read(page, String.raw`\x:a. x * x`);
  await expect(page.locator(".lambda .kw.bad")).toHaveText("Not well typed");
  await expect(page.locator(".lambda .method-verdict").first()).toContainText(
    "The variable x is used more than once",
  );
  // A text that is no term is marked in the field, with its place.
  await page.getByRole("button", { name: "New proof" }).click();
  await page.getByRole("textbox", { name: "Sequent" }).fill(String.raw`\x. x`);
  await page.getByRole("textbox", { name: "Sequent" }).press("Enter");
  await expect(page.getByRole("textbox", { name: "Sequent" })).toHaveAttribute(
    "aria-invalid",
    "true",
  );
});
