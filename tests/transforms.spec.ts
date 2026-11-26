// deduxit © Fabian Lukas Grubmüller 2026
// Licensed under the EUPL

// A classical proof's translations and interpolants: offered in "+ view" of a started
// classical proof alone, each sheet's verdict first, the translated sequent opened as a proof of
// its own, and the interpolant's checks as the partition changes.

import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";
import { addView, calculus, goto, viewCell } from "./prover";

/** Starts a sequent in an ordinary tab of `logic`. */
async function ordinary(page: Page, logic: string, sequent: string) {
  await goto(page);
  await calculus(page, ["Ordinary", logic]);
  await page.getByRole("textbox", { name: "Sequent" }).fill(sequent);
  await page.getByRole("textbox", { name: "Sequent" }).press("Enter");
  await expect(page.locator(".stage .fb").first()).toBeVisible();
}

/** The entry of "+ view" that opens each sheet, by the sheet's name. */
const ENTRIES: Readonly<Record<string, string>> = {
  "Translate into intuitionistic logic": "Into intuitionistic logic",
  "Find an interpolant": "Interpolant",
  "Rewrite into a normal form": "Normal form",
  "Refute by resolution": "Resolution",
};

/** Opens a sheet from "+ view" by its name, and returns it. */
async function sheet(page: Page, name: string) {
  await addView(page, ENTRIES[name] ?? name);
  const opened = page.getByRole("dialog", { name });
  await expect(opened).toBeVisible();
  return opened;
}

/** Whether "+ view" offers an entry: listed and not faint. */
async function offered(page: Page, entry: string) {
  await page.getByRole("button", { name: "Add a view" }).click();
  const button = page.getByRole("dialog", { name: "Add a view" }).getByRole("button", {
    name: entry,
    exact: true,
  });
  const yes = (await button.getAttribute("aria-disabled")) !== "true";
  await page.keyboard.press("Escape");
  return yes;
}

test("a translation and an interpolant are offered for a started classical proof alone", async ({
  page,
}) => {
  await ordinary(page, "Intuitionistic", "a |- a");
  expect(await offered(page, "Into intuitionistic logic")).toBe(false);
  expect(await offered(page, "Interpolant")).toBe(false);
  await calculus(page, ["Classical"]);
  expect(await offered(page, "Into intuitionistic logic")).toBe(true);
  expect(await offered(page, "Interpolant")).toBe(true);
});

test("a translation says both verdicts first, and the translated sequent", async ({ page }) => {
  await ordinary(page, "Classical", "a -> b |- ~b -> ~a");
  const view = await sheet(page, "Translate into intuitionistic logic");
  await expect(view.getByRole("heading")).toBeFocused();
  await expect(view.getByRole("button", { name: "Glivenko" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(view.getByRole("status")).toHaveText(
    "Both valid The sequent is valid in classical logic, and its translation is valid in intuitionistic logic. A negative translation keeps the verdict, so the two agree.",
  );
  await expect(view.locator(".tf-to")).toHaveText("a → b ⊢ ¬¬(¬b → ¬a)");
  await view.getByRole("button", { name: "Kolmogorov" }).click();
  await expect(view).toContainText("It translates into minimal logic.");
  await expect(view.getByRole("status")).toContainText("its translation is valid in minimal logic");
  await expect(view.locator(".tf-to")).toContainText("¬¬(¬¬a → ¬¬b) ⊢");
});

test("a translation that is not valid shows the falsifying values and the Kripke model", async ({
  page,
}) => {
  await ordinary(page, "Classical", "a \\/ b |- a");
  const view = await sheet(page, "Translate into intuitionistic logic");
  await expect(view.getByRole("status")).toContainText("Both not valid");
  await expect(view.locator(".tf-evidence")).toContainText(
    "not valid: with a false, b true, every formula left of ⊢ is true",
  );
  await expect(view.getByRole("img", { name: /^A countermodel of/ })).toBeVisible();
});

test("the translated sequent opens as a proof of its own in its logic", async ({ page }) => {
  await ordinary(page, "Classical", "a -> b |- ~b -> ~a");
  const view = await sheet(page, "Translate into intuitionistic logic");
  await view.getByRole("button", { name: "Gödel–Gentzen" }).click();
  await expect(view.getByRole("status")).toContainText("minimal logic");
  await view.getByRole("button", { name: "Prove it in minimal logic" }).click();
  await expect(view).toBeHidden();
  await expect(page.locator(".chip")).toHaveCount(2);
  const tab = page.locator(".chip[aria-selected=true]");
  await expect(tab).toContainText("¬¬a → ¬¬b ⊢");
  await expect(viewCell(page)).toHaveAttribute("data-tip", "Sequent calculus, LM");
  // The proof it came from is kept as it was.
  await page.locator(".chip").first().click();
  await expect(page.locator(".chip[aria-selected=true]")).toContainText("a → b ⊢ ¬b → ¬a");
});

test("an interpolant comes with its three checks, and follows the partition", async ({ page }) => {
  await ordinary(page, "Classical", "a /\\ b |- b \\/ c");
  const view = await sheet(page, "Find an interpolant");
  await expect(view.getByRole("button", { name: "Part 1 a ∧ b" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(view.getByRole("status")).toHaveText("Interpolant All three of its checks pass.");
  await expect(view.locator(".tf-to")).toHaveText("b");
  await expect(view.locator(".tf-check")).toHaveText([
    "Its one atom, b, occurs in both parts.",
    "a ∧ b ⊢ b is valid: the first part proves it.",
    "b ⊢ b ∨ c is valid: with it, the second part proves the rest.",
  ]);
  await view.getByRole("button", { name: "Part 2 b ∨ c" }).click();
  await expect(view.getByRole("button", { name: "Part 1 b ∨ c" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(view.locator(".tf-to")).toHaveText("⊥");
  await expect(view.locator(".tf-check").first()).toHaveText(
    "It has no atoms, so it needs none from either part.",
  );
  await page.keyboard.press("Escape");
  await expect(view).toBeHidden();
});

test("a sequent that is not valid has no interpolant, and shows its countermodel", async ({
  page,
}) => {
  await ordinary(page, "Classical", "a |- b");
  const view = await sheet(page, "Find an interpolant");
  await expect(view.getByRole("status")).toHaveText(
    "No interpolant The sequent is not valid, and only a valid sequent has one.",
  );
  await expect(view.getByRole("img", { name: /^A countermodel of/ })).toBeVisible();
});
