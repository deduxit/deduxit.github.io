// deduxit © Fabian Lukas Grubmüller 2026
// Licensed under the EUPL

// A tableau written by hand: asked for in the calculus popover of a started classical sequent,
// begun with the sequent's own lines, reviewed by deduxit: closed, a wrong step named and
// selected in the text, a text that is no tableau with its place, an open tableau's countermodel
// opened in the model editor.

import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";
import { calculus, goto, switches } from "./prover";

/** Starts `sequent` in classical logic and opens the tableau to write. */
async function written(page: Page, sequent: string) {
  await goto(page);
  await calculus(page, ["Ordinary", "Classical"]);
  await page.getByRole("textbox", { name: "Sequent" }).fill(sequent);
  await page.getByRole("textbox", { name: "Sequent" }).press("Enter");
  await expect(page.locator(".stage .fb").first()).toBeVisible();
  const pop = await switches(page);
  await pop.getByRole("button", { name: "Check a tableau" }).click();
  await expect(page.getByRole("tab", { name: "Your tableau" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  return page.getByRole("textbox", { name: "Your tableau, a line each" });
}

test("a tableau typed in full closes, and a wrong mark is named and selected", async ({ page }) => {
  const field = await written(page, "p \\/ q |- q \\/ p");
  await expect(field).toHaveValue("1 T p ∨ q\n2 F q ∨ p");
  await expect(page.locator(".tb")).toHaveCount(0);
  await field.fill(
    "1 T p ∨ q\n2 F q ∨ p\n3 F q 2\n4 F p 2\n- 5 T p 1\n  × 4, 5\n- 6 T q 1\n  × 3, 6",
  );
  await page.getByRole("button", { name: "Check the tableau" }).click();
  await expect(page.locator(".written .kw")).toHaveText("Closed");
  await field.fill(
    "1 T p ∨ q\n2 F q ∨ p\n3 F q 2\n4 F p 2\n- 5 T q 1\n  × 4, 5\n- 6 T q 1\n  × 3, 6",
  );
  await page.getByRole("button", { name: "Check the tableau" }).click();
  await expect(page.locator(".written .kw")).toHaveText("Wrong step");
  await expect(page.locator(".written [role=status]")).toContainText("Line 6:");
  await expect(field).toBeFocused();
  expect(
    await field.evaluate((el) => {
      const t = el as HTMLTextAreaElement;
      return t.value.slice(t.selectionStart, t.selectionEnd);
    }),
  ).toBe("  × 4, 5");
});

test("a text that is no tableau says where; an open one opens its countermodel", async ({
  page,
}) => {
  const field = await written(page, "p |- q");
  await field.fill("1 T p ∨\n");
  await page.getByRole("button", { name: "Check the tableau" }).click();
  await expect(page.locator(".written .kw")).toHaveText("Not read");
  await field.fill("1 T p\n2 F q\nopen");
  await page.getByRole("button", { name: "Check the tableau" }).click();
  await expect(page.locator(".written .kw")).toHaveText("Open");
  await page.getByRole("button", { name: "Check its countermodel" }).click();
  await expect(page.getByRole("region", { name: "Model" })).toContainText("p ⊢ q");
});
