// deduxit © Fabian Lukas Grubmüller 2026
// Licensed under the EUPL

// Lambda-terms on the page: the new tab view's logic opens them, a term typed is checked and its
// typing derivation drawn, a type typed gets a term found and its terms listed and counted, an
// ill-typed term says why, and the link keeps the text and the calculus.

import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";
import {
  calculus as choose,
  exportEntry,
  goto,
  newTab,
  saveExport,
  switches,
  tool,
  viewCell,
} from "./prover";

/** Each lambda calculus's toggle, by the calculus. */
const USE = { simple: "Unrestricted", linear: "Linear", affine: "Affine" } as const;

/** Opens the page with its tab in lambda-terms, in the calculus given. */
async function lambdaTab(page: Page, calculus = "simple") {
  await goto(page);
  await choose(page, ["Lambda-terms"]);
  const use = (await switches(page))
    .getByRole("group", { name: "How often a term may use each variable" })
    .getByRole("button", { name: USE[calculus as keyof typeof USE] });
  if (calculus !== "simple") await use.click();
  await expect(use).toHaveAttribute("aria-pressed", "true");
}

/** Types `text` into the field and reads it. */
async function read(page: Page, text: string) {
  await page.getByRole("textbox", { name: "Sequent" }).fill(text);
  await page.getByRole("textbox", { name: "Sequent" }).press("Enter");
  await expect(page.locator(".lambda .method-verdict .kw").first()).toBeVisible();
}

test("the page shows nothing of lambda-terms until their logic is chosen", async ({ page }) => {
  await goto(page);
  await expect(page.getByRole("button", { name: "Unrestricted" })).toHaveCount(0);
  await page.getByRole("button", { name: /^Lambda-terms/ }).click();
  await expect(page.getByRole("button", { name: "Unrestricted" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  // Untyped terms wait for deduxit: the toggle is inactive and says so when pressed.
  // An inactive control is aria-disabled, which Playwright presses only when forced.
  await page.getByRole("button", { name: "Untyped" }).click({ force: true });
  await expect(page.getByRole("status").filter({ hasText: "coming soon" })).toBeVisible();
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
  await expect(viewCell(page)).toHaveAttribute("data-tip", "Lambda-terms, λ→");
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
  await tool(page, "List its terms").click();
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

test("Export writes a checked term's typing derivation as LaTeX, Typst or a picture", async ({
  page,
}) => {
  await lambdaTab(page);
  await read(page, String.raw`\f:a -> b. \x:a. f x`);
  await expect(page.locator(".lambda .kw.ok")).toHaveText("Well typed");
  const panel = await exportEntry(page, "LaTeX");
  await expect(panel.locator("pre")).toContainText("\\");
  expect((await saveExport(page, "SVG")).suggestedFilename()).toBe("deduxit-typing.svg");
  await exportEntry(page, "Rocq");
  await expect(
    panel.getByText("deduxit writes a term's typing as LaTeX, Typst or a picture."),
  ).toBeVisible();
});
