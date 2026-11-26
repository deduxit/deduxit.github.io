// deduxit © Fabian Lukas Grubmüller 2026
// Licensed under the EUPL

// First-order logic on the page beside the witness's box: the countermodel view of a first-order
// sequent, changed press by press and checked by deduxit at once; a witness typed in LK; and a
// proof made apart whose witness names an eigenvariable, used on the goal it was made for.

import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";
import { addView, calculus, closeGoal, goalMenu, goto, proved, rule, start, tool } from "./prover";

/** Opens the page on a sequent of classical ordinary logic. */
async function classical(page: Page, sequent: string) {
  await goto(page);
  await calculus(page, ["Ordinary", "Classical"]);
  await page.getByRole("textbox", { name: "Sequent" }).fill(sequent);
  await page.getByRole("textbox", { name: "Sequent" }).press("Enter");
  await expect(page.locator(".stage .fb").first()).toBeVisible();
}

/** The sign between the sequent's sides in the countermodel view. */
const sign = (page: Page) =>
  page.getByRole("region", { name: "Countermodel" }).locator(".valued .turn");

test("a first-order sequent's countermodel is changed press by press, and undone", async ({
  page,
}) => {
  await classical(page, "exists x. p(x) |- forall x. p(x)");
  await closeGoal(page);
  await expect(page.locator(".goal-note")).toContainText("deduxit found a finite structure");
  await page.getByRole("button", { name: "See the countermodel" }).click();
  await expect(page.getByRole("tab", { name: "Countermodel, ⊭" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  const view = page.getByRole("region", { name: "Countermodel" });
  await expect(sign(page)).toHaveAccessibleName("This structure refutes the sequent");
  await expect(sign(page)).toHaveText("⊭");
  // p made to hold of every element: ∀x. p(x) is true, so the structure no longer refutes.
  const off = view.getByRole("button", { name: /^p does not hold of \d$/ });
  await off.click();
  await expect(sign(page)).toHaveText("⊨");
  await expect(view.locator(".valued-formula").last()).toHaveAttribute("data-holds", "");
  await tool(page, "Undo").click();
  await expect(sign(page)).toHaveText("⊭");
  await tool(page, "Redo").click();
  await expect(sign(page)).toHaveText("⊨");
  // A new element where p does not hold refutes it again; taken away, it does not.
  await view.getByRole("button", { name: "Add an element" }).click();
  await expect(view.locator(".element")).toHaveCount(3);
  await expect(sign(page)).toHaveText("⊭");
  await view.getByRole("button", { name: "Remove element 2" }).click();
  await expect(sign(page)).toHaveText("⊨");
  // The keys undo here too, the structure's changes and not the proof's.
  await page.keyboard.press("ControlOrMeta+z");
  await expect(view.locator(".element")).toHaveCount(3);
});

test("a model of one's own of a first-order sequent starts from one element", async ({ page }) => {
  await classical(page, "forall x. (p(x) -> r(x, f(x))), p(a) |- exists y. r(a, y)");
  await addView(page, "A model of your own");
  const view = page.getByRole("region", { name: "Countermodel" });
  await expect(page.getByRole("tab", { name: "A model of your own, M" })).toBeVisible();
  await expect(view.locator(".element")).toHaveCount(1);
  await expect(view.getByRole("button", { name: "a is 0" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(view.getByRole("button", { name: "f(0) is 0" })).toBeVisible();
  // p(a) made true: the hypothesis ∀x. (p(x) → r(x, f(x))) is false now.
  await view.getByRole("button", { name: "p does not hold of 0" }).click();
  await expect(view.locator(".valued-formula").nth(1)).toHaveAttribute("data-holds", "");
  await expect(view.locator(".valued-formula").first()).not.toHaveAttribute("data-holds", "");
  await view.getByRole("button", { name: "r does not hold of 0, 0" }).click();
  await expect(sign(page)).toHaveText("⊨");
});

test("a witness typed in LK's popover closes the proof", async ({ page }) => {
  await classical(page, "p(c) |- exists x. p(x)");
  await rule(page, /^∃x\. p\(x\), formula/, "∃R");
  const box = page.getByRole("dialog", { name: "Rules" }).locator("form.witness");
  await expect(box).toContainText("x =");
  await box.getByRole("textbox").fill("c");
  await box.getByRole("textbox").press("Enter");
  await expect(box).toBeHidden();
  await rule(page, /^p\(c\), formula 2/, "ax");
  await expect(proved(page)).toBeVisible();
});

test("a proof made apart whose witness names its eigenvariable is used on its goal", async ({
  page,
}) => {
  await start(page, "|- (forall x. p(x)) -o (forall y. p(y))");
  await rule(page, /⅋/, "⅋");
  await (await goalMenu(page)).getByRole("button", { name: "Prove apart" }).click();
  await expect(page.locator(".chip")).toHaveCount(2);
  await rule(page, /^∀y\. p\(y\), formula/, "∀");
  await rule(page, /^∃x\. p⊥\(x\), formula/, "∃");
  const box = page.getByRole("dialog", { name: "Rules" }).locator("form.witness");
  await box.getByRole("textbox").fill("a");
  await box.getByRole("textbox").press("Enter");
  await expect(box).toBeHidden();
  await tool(page, "Close all").click();
  await expect(proved(page)).toBeVisible();
  // Taken again on the goal, the witness names the eigenvariable the goal's own ∀ step made.
  await page.locator(".chip").first().click();
  await (await goalMenu(page)).getByRole("button", { name: "Use its proof" }).click();
  await expect(proved(page)).toBeVisible();
});

test("a goal's countermodel is checked after an eigenvariable was made elsewhere in the proof", async ({
  page,
}) => {
  await classical(page, "p(c) |- q(c) /\\ forall x. p(x)");
  await rule(page, /^q\(c\) ∧ \(∀x\. p\(x\)\), formula/, "∧R");
  await rule(page, /^∀x\. p\(x\), formula/, "∀R");
  // The first premise, p(c) ⊢ q(c), has a finite countermodel; the arena holds the ∀R's a.
  await page.locator(".gt").first().click();
  await (await goalMenu(page)).getByRole("button", { name: "Close goal" }).click();
  await page.getByRole("button", { name: "See the countermodel" }).click();
  await expect(sign(page)).toHaveText("⊭");
});

test("a countermodel goes with its sequent when another is typed in its place", async ({
  page,
}) => {
  await classical(page, "exists x. p(x) |- forall x. p(x)");
  await closeGoal(page);
  await page.getByRole("button", { name: "See the countermodel" }).click();
  await expect(page.getByRole("tab", { name: "Countermodel, ⊭" })).toBeVisible();
  await page.getByRole("tab", { name: /^Sequent calculus/ }).click();
  await page.getByRole("textbox", { name: "Sequent" }).fill("p(c) |- p(c)");
  await page.getByRole("textbox", { name: "Sequent" }).press("Enter");
  await expect(page.getByRole("button", { name: /^p\(c\), formula 1/ })).toBeVisible();
  await expect(page.getByRole("tab", { name: "Countermodel, ⊭" })).toHaveCount(0);
});

test("a Kripke model with growing domains is named as what decided the goal", async ({ page }) => {
  await goto(page);
  await calculus(page, ["Ordinary", "Intuitionistic"]);
  await page.getByRole("textbox", { name: "Sequent" }).fill("|- p(a) \\/ ~p(a)");
  await page.getByRole("textbox", { name: "Sequent" }).press("Enter");
  await closeGoal(page);
  await expect(page.locator(".goal-note")).toContainText("growing domains");
  await expect(page.locator(".goal-note")).not.toContainText("translating");
});
