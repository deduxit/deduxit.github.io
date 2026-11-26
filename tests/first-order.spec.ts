// deduxit © Fabian Lukas Grubmüller 2026
// Licensed under the EUPL

import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";
import { calculus, closeGoal, goalMenu, start, tool } from "./prover";

/** Opens the rules of the formula whose button's name starts with `formula` and picks `name`. */
async function pick(page: Page, formula: string, name: string) {
  await page
    .getByRole("button", { name: new RegExp(`^${formula.replace(/[().$*+?]/g, "\\$&")}, formula`) })
    .first()
    .click();
  // A greyed rule is aria-disabled, which Playwright will not press unforced; a visitor can.
  await page
    .getByRole("dialog", { name: "Rules" })
    .getByRole("button", { name: new RegExp(`^${name}`) })
    .click({ force: true });
}

/** The witness's box in the rule popover. */
const witness = (page: Page) => page.getByRole("dialog", { name: "Rules" }).locator("form.witness");

/** Starts an intuitionistic tab on `sequent`. */
async function intuitionistic(page: Page, sequent: string) {
  await start(page, sequent);
  await calculus(page, ["Intuitionistic"]);
}

test("a sequent with quantifiers and terms is proved with a witness typed and one left open", async ({
  page,
}) => {
  await intuitionistic(page, "exists y. forall x. r(x, y) |- forall x. exists y. r(x, y)");
  await pick(page, "∃y. (∀x. r(x, y))", "∃L");
  await pick(page, "∀x. (∃y. r(x, y))", "∀R");
  // ∀L takes a witness: its box opens in the popover beside the rule, which stays pressed.
  await pick(page, "∀x. r(x, a)", "∀L");
  const rules = page.getByRole("dialog", { name: "Rules" });
  const box = witness(page);
  await expect(box).toContainText("x =");
  await expect(rules.getByRole("button", { name: /^∀L/ })).toHaveAttribute("aria-pressed", "true");
  await expect(box.getByRole("textbox")).toBeFocused();
  // Escape closes the box and leaves the popover, the rule focused.
  await page.keyboard.press("Escape");
  await expect(box).toBeHidden();
  await expect(rules.getByRole("button", { name: /^∀L/ })).toBeFocused();
  // Another formula picked gives the rules of that one, the box closed.
  await rules.getByRole("button", { name: /^∀L/ }).click();
  await page.getByRole("button", { name: /^∃y\. r\(b, y\), formula/ }).click();
  await expect(box).toBeHidden();
  await expect(rules).toBeVisible();
  await pick(page, "∀x. r(x, a)", "∀L");
  await box.getByRole("button", { name: /^\$1, leave the witness open/ }).click();
  await expect(box).toBeHidden();
  await expect(page.getByRole("button", { name: /^r\(\$1, a\), formula/ })).toBeVisible();
  // ∃R with a term that does not read, refused under the field; then with b.
  await pick(page, "∃y. r(b, y)", "∃R");
  await box.getByRole("textbox").fill("g(b)");
  await box.getByRole("textbox").press("Enter");
  await expect(box.getByRole("alert")).toContainText("no such term");
  await expect(box.getByRole("textbox")).toHaveAttribute("aria-invalid", "true");
  await box.getByRole("textbox").fill("a");
  await box.getByRole("button", { name: /^Apply ∃R with this term for y/ }).click();
  await expect(box).toBeHidden();
  await pick(page, "r(b, a)", "ax");
  await expect(
    page.getByRole("status").filter({ hasText: "Proved. Every goal is closed." }),
  ).toBeVisible();
  // The derivation is drawn with its instances, the open witness filled.
  const drawing = page.locator(".drawing svg");
  await expect(drawing).toContainText("∀L");
  await expect(drawing).toContainText("r(b, a)");
});

test("the eigenvariable condition is refused in words", async ({ page }) => {
  await intuitionistic(page, "forall x. exists y. r(x, y) |- exists y. forall x. r(x, y)");
  await pick(page, "∃y. (∀x. r(x, y))", "∃R");
  await witness(page)
    .getByRole("button", { name: /^\$1, leave/ })
    .click();
  await pick(page, "∀x. r(x, $1)", "∀R");
  await pick(page, "∀x. (∃y. r(x, y))", "∀L");
  await witness(page).getByRole("textbox").fill("a");
  await witness(page).getByRole("textbox").press("Enter");
  await pick(page, "∃y. r(a, y)", "∃L");
  // The axiom is greyed, its step not legal here; a press says why under its drawing.
  await pick(page, "r(a, b)", "ax");
  const card = page.locator('.rule-card[role="note"]');
  await expect(card).toContainText("ax refused: the eigenvariable condition");
  await expect(card).toContainText("The eigenvariable b cannot stand here");
});

test("a cut at first order names an eigenvariable made below its goal", async ({ page }) => {
  await intuitionistic(page, "forall x. (p(x) -o q(x)), forall x. p(x) |- forall y. q(y)");
  await pick(page, "∀y. q(y)", "∀R");
  await tool(page, "Cut").click();
  const chooser = page.getByRole("dialog", { name: "Cut" });
  await chooser.getByRole("textbox").fill("r(a)");
  await expect(chooser.getByRole("alert")).toContainText("r is not in the sequent");
  await chooser.getByRole("textbox").fill("p(a)");
  await page.getByRole("button", { name: /^∀x\. p\(x\), formula/ }).click();
  await page.getByRole("button", { name: "Apply the cut" }).click();
  await expect(chooser).toBeHidden();
  await expect(page.locator(".gt")).toHaveCount(2);
  await page.getByRole("button", { name: "Close all" }).first().click();
  await expect(
    page.getByRole("status").filter({ hasText: "Proved. Every goal is closed." }),
  ).toBeVisible();
  await expect(page.locator(".drawing svg")).toContainText("cut");
  await expect(page.locator(".drawing svg")).toContainText("p(a) ⊢ p(a)");
});

test("an undo on one branch replays the other with its eigenvariable's new letter", async ({
  page,
}) => {
  await intuitionistic(
    page,
    "forall x. p(x), forall x. q(x) |- (forall y. p(y)) * (forall y. q(y))",
  );
  await page.getByRole("button", { name: /^\(∀y\. p\(y\)\) ⊗ \(∀y\. q\(y\)\), formula/ }).click();
  await page.getByRole("dialog", { name: "Rules" }).getByRole("button", { name: /^⊗R/ }).click();
  await page
    .getByRole("button", { name: /^∀x\. p\(x\), formula/ })
    .first()
    .click();
  await page.getByRole("button", { name: /^Apply ⊗/ }).click();
  await pick(page, "∀y. p(y)", "∀R");
  await pick(page, "∀y. q(y)", "∀R");
  await pick(page, "∀x. q(x)", "∀L");
  await witness(page).getByRole("textbox").fill("b");
  await witness(page).getByRole("textbox").press("Enter");
  await expect(page.getByRole("button", { name: /^q\(b\), formula/ }).first()).toBeVisible();
  // Undo the first branch's ∀R: the second's eigenvariable is a now, its witness with it.
  await page
    .getByRole("button", { name: /^p\(a\), formula/ })
    .first()
    .click();
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(page.getByRole("button", { name: /^q\(a\), formula/ }).first()).toBeVisible();
  await expect(page.getByRole("button", { name: /^q\(b\), formula/ })).toHaveCount(0);
});

test("the first-order bounds are settings, and a search says which one stopped it", async ({
  page,
}) => {
  await start(page, "forall x. p(x) |- p(f(f(c)))");
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  const depth = page.getByRole("textbox", { name: "Witness depth" });
  await expect(depth).toHaveValue("64");
  await expect(page.getByRole("textbox", { name: "Instances" })).toHaveValue("65536");
  await expect(page.getByRole("textbox", { name: "Terms" })).toHaveValue("1000000");
  await depth.fill("1");
  await depth.press("Enter");
  // Settings is a page: its own button leaves it.
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await closeGoal(page);
  const note = page.locator(".goal-note .kw.warn");
  await expect(note).toHaveText("Unknown: gave up.");
  await expect(page.locator(".goal-note")).toContainText("Settings' witness depth");
});

test("a proof made apart in another order is used where the goal's eigenvariables take other letters", async ({
  page,
}) => {
  await start(page, "|- (forall y. (q(y) | ~q(y))) * ((forall x. (p(x) | ~p(x))) | bot)");
  await pick(page, "(∀y. (q(y) ⅋ q⊥(y))) ⊗ ((∀x. (p(x) ⅋ p⊥(x))) ⅋ ⊥)", "⊗");
  await page.getByRole("button", { name: "Apply ⊗" }).click();
  // A ∀ on the first premise takes the letter a, so the goal's ∀ below will take b.
  await pick(page, "∀y. (q(y) ⅋ q⊥(y))", "∀");
  await pick(page, "(∀x. (p(x) ⅋ p⊥(x))) ⅋ ⊥", "⅋");
  // The goal ⊢ ∀x. (p(x) ⅋ p(x)⊥), ⊥, proved apart in another order, where its ∀ takes a.
  await start(page, "|- bot, forall x. (p(x) | ~p(x))", false);
  await pick(page, "∀x. (p(x) ⅋ p⊥(x))", "∀");
  await pick(page, "p(a) ⅋ p⊥(a)", "⅋");
  await tool(page, "Close all").click();
  await expect(page.getByText("Proved. Every goal is closed.")).toBeVisible();
  await page.locator(".chip").first().click();
  await page.getByRole("button", { name: /^⊥, formula/ }).click();
  await page.keyboard.press("Escape");
  await (await goalMenu(page)).getByRole("button", { name: "Use its proof" }).click();
  await expect(page.getByRole("button", { name: /^⊥, formula/ })).toHaveCount(0);
  await expect(page.getByText("Not used")).toHaveCount(0);
  await expect(page.getByRole("button", { name: /^q\(a\) ⅋/ })).toBeVisible();
});

test("Steps names a formula with the letter the session gave it, after a search's graft", async ({
  page,
}) => {
  await start(page, "|- (forall x. (p(x) | ~p(x))) * (forall y. (q(y) | ~q(y)))");
  await pick(page, "(∀x. (p(x) ⅋ p⊥(x))) ⊗ (∀y. (q(y) ⅋ q⊥(y)))", "⊗");
  await page.getByRole("button", { name: "Apply ⊗" }).click();
  await page.getByRole("button", { name: /^∀x\. \(p\(x\) ⅋ p⊥\(x\)\), formula/ }).click();
  await page.keyboard.press("Escape");
  await closeGoal(page);
  // The search's ∀ took a letter first; the ∀ by hand takes the next.
  await pick(page, "∀y. (q(y) ⅋ q⊥(y))", "∀");
  const formula = page.getByRole("button", { name: /^q\([a-z]\) ⅋ q⊥\([a-z]\), formula/ });
  const name = (await formula.getAttribute("aria-label")) ?? (await formula.textContent()) ?? "";
  const shown = /^q\(([a-z])\)/.exec(name)?.[1] ?? "";
  await pick(page, `q(${shown}) ⅋ q⊥(${shown})`, "⅋");
  await tool(page, "Steps").click();
  await expect(page.getByRole("dialog", { name: "Steps" })).toContainText(
    `⅋ on q(${shown}) ⅋ q⊥(${shown})`,
  );
});
