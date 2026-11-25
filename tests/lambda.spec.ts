// deduxit © Fabian Lukas Grubmüller 2026
// Licensed under the EUPL

// Lambda-terms on the page: the new tab view's logic opens them, a term typed is checked and its
// typing derivation drawn, a type typed gets a term found and its terms listed and counted, an
// ill-typed term says why, and the link keeps the text and the calculus.

import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";
import { calculus as choose, goto, newTab, switches } from "./prover";

/** Opens the page with its tab in lambda-terms, in the calculus given. */
async function lambdaTab(page: Page, calculus = "simple") {
  await goto(page);
  await choose(page, ["Lambda-terms"]);
  const use = (await switches(page)).getByRole("combobox", { name: "Lambda calculus" });
  if (calculus !== "simple") await use.selectOption(calculus);
  await expect(use).toHaveValue(calculus);
}

/** Types `text` into the field and reads it. */
async function read(page: Page, text: string) {
  await page.getByRole("textbox", { name: "Sequent" }).fill(text);
  await page.getByRole("textbox", { name: "Sequent" }).press("Enter");
  await expect(page.locator(".lambda .method-verdict .kw").first()).toBeVisible();
}

test("the page shows nothing of lambda-terms until their logic is chosen", async ({ page }) => {
  await goto(page);
  await expect(page.getByRole("combobox", { name: "Lambda calculus" })).toHaveCount(0);
  await page.getByRole("button", { name: /^Lambda-terms/ }).click();
  await expect(page.getByRole("combobox", { name: "Lambda calculus" })).toHaveValue("simple");
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
  await expect(
    page.getByRole("tablist", { name: "Views of this sequent" }).getByRole("tab").first(),
  ).toHaveAttribute("data-tip", "Lambda-terms, λ→");
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
  await newTab(page);
  await read(page, "((a -> b) -> a) -> a");
  await expect(page.locator(".lambda .kw.bad")).toHaveText("No term");
});

test("a term that uses a variable twice is not well typed in the linear calculus", async ({
  page,
}) => {
  await lambdaTab(page, "linear");
  await read(page, String.raw`\x:a. x * x`);
  await expect(page.locator(".lambda .kw.bad")).toHaveText("Not well typed");
  await expect(page.locator(".lambda .method-verdict").first()).toContainText(
    "The variable x is used more than once",
  );
  // A text that is no term is marked in the field, with its place.
  await page.getByRole("button", { name: "New sequent", exact: true }).click();
  await page.getByRole("textbox", { name: "Sequent" }).fill(String.raw`\x. x`);
  await page.getByRole("textbox", { name: "Sequent" }).press("Enter");
  await expect(page.getByRole("textbox", { name: "Sequent" })).toHaveAttribute(
    "aria-invalid",
    "true",
  );
});
