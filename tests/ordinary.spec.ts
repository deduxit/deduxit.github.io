// deduxit © Fabian Lukas Grubmüller 2026
// Licensed under the EUPL

// Ordinary logic on the page: a tab's calculus popover lists the suites, and the Ordinary one
// proves sequents of classical, intuitionistic and minimal logic step by step in LK and LJ, drawn
// as LK and LJ derivations, never as their linear image; undo works per branch; the exports,
// the link and the stored proofs carry the suite.

import { readFile } from "node:fs/promises";
import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";
import { goto, switches } from "./prover";

/** The current tab's calculus mark. */
const mark = (page: Page) => page.locator(".ptab[aria-current=true] .pt-mark");

/** The drawing's texts: its formulas and rule labels, without its title and description. */
const drawn = async (page: Page) =>
  (await page.locator(".stage .drawing svg text").allTextContents()).join(" ");

/** The signs of linear logic, none of which an ordinary derivation shows. */
const LINEAR = /[⊗⅋⊸⊕&!?]/;

/** Opens the page with its tab in ordinary logic, in `logic`, and starts `sequent` there. */
async function ordinary(page: Page, logic: string, sequent: string, fresh = true) {
  if (fresh) await goto(page);
  const pop = await switches(page);
  await pop.getByRole("button", { name: "Ordinary", exact: true }).click();
  const name = `${logic.charAt(0).toUpperCase()}${logic.slice(1)}`;
  await pop.getByRole("button", { name, exact: true }).click();
  await page.keyboard.press("Escape");
  const marks: Record<string, string> = { classical: "LK", intuitionistic: "LJ", minimal: "LM" };
  await expect(mark(page)).toContainText(marks[logic] ?? "");
  await page.getByRole("textbox", { name: "Sequent" }).fill(sequent);
  await page.getByRole("textbox", { name: "Sequent" }).press("Enter");
  await expect(page.locator(".stage .fb").first()).toBeVisible();
}

/** Applies a rule, by its exact name, to the active goal's first formula matching `formula`. */
async function rule(page: Page, formula: RegExp, name: string) {
  await page.getByRole("button", { name: formula }).first().click();
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  await page
    .getByRole("dialog", { name: "Rules" })
    .getByRole("button", { name: new RegExp(`^${escaped}\\s*\\d+$`) })
    .click();
}

test("the calculus popover lists the suites, and an ordinary tab proves in LK", async ({
  page,
}) => {
  await goto(page);
  const pop = await switches(page);
  const suites = pop.getByRole("group", { name: "Suite" });
  await expect(suites.getByRole("button")).toHaveText(["Linear", "Ordinary"]);
  await page.keyboard.press("Escape");
  await ordinary(page, "classical", "a /\\ b |- b /\\ a", false);
  await expect(page.locator(".ptab[aria-current=true] .pt-go")).toHaveText("a ∧ b ⊢ b ∧ a");
  await rule(page, /^b ∧ a, formula/, "∧R");
  await rule(page, /^a ∧ b, formula/, "∧L");
  await rule(page, /^b, formula/, "ax");
  await rule(page, /^a ∧ b, formula/, "∧L");
  await rule(page, /^a, formula 3/, "ax");
  await expect(
    page.getByRole("status").filter({ hasText: "Proved: every goal is closed" }),
  ).toBeVisible();
  const text = (await drawn(page)) ?? "";
  expect(text).toContain("∧R");
  expect(text).toContain("∧L");
  expect(text).not.toMatch(LINEAR);
});

test("an ordinary goal's close says not valid, and the field's menu opens the examples", async ({
  page,
}) => {
  await ordinary(page, "intuitionistic", "a |- a");
  await page.getByRole("button", { name: "New proof" }).click();
  // A new tab starts in the calculus last chosen, with its examples beside the field.
  await expect(mark(page)).toContainText("LJ");
  await page.getByRole("button", { name: "Examples" }).click();
  const menu = page.getByRole("dialog", { name: "Examples" });
  await expect(menu.getByRole("button")).toHaveCount(15);
  await menu.getByRole("button", { name: /^Excluded middle, in LJ/ }).click();
  await expect(page.locator(".ptab[aria-current=true] .pt-go")).toHaveText("⊢ a ∨ ¬a");
  await page.getByRole("button", { name: "Close goal" }).click();
  await expect(page.locator(".dock").getByRole("button", { name: /^Not valid/ })).toBeVisible();
  // The same sequent in LK: valid, the derivation found grafted and finished.
  await page.getByRole("button", { name: "New proof" }).click();
  await page.getByRole("button", { name: "Examples" }).click();
  await page
    .getByRole("dialog", { name: "Examples" })
    .getByRole("button", { name: /^Excluded middle, in LK/ })
    .click();
  await expect(mark(page)).toContainText("LK");
  await page.getByRole("button", { name: "Close goal" }).click();
  await expect(page.locator(".ptab[aria-current=true] .dot[data-tone=ok]")).toBeVisible();
  expect(await drawn(page)).toContain("∨R");
  expect(await drawn(page)).not.toMatch(LINEAR);
});

test("undo in an ordinary proof is per branch, and past a split takes the split back", async ({
  page,
}) => {
  await ordinary(page, "intuitionistic", "|- (a -> a) /\\ (b -> b)");
  await rule(page, /^\(a → a\) ∧ \(b → b\), formula/, "∧R");
  await rule(page, /^a → a, formula/, "→R");
  await rule(page, /^b → b, formula/, "→R");
  // The b branch is active: undo takes back its →R alone, the a branch's step stays.
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(page.getByRole("button", { name: /^b → b, formula/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /^a, formula 1 of goal/ })).toBeVisible();
  // On the a branch, undo twice: its →R, then the split, with the b branch's goal it opened.
  await page.getByRole("button", { name: /^a, formula 1 of goal/ }).click();
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(page.getByRole("button", { name: /^a → a, formula/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /^b → b, formula/ })).toBeVisible();
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(page.getByRole("button", { name: /^\(a → a\) ∧ \(b → b\), formula/ })).toBeVisible();
  await expect(page.locator(".stage .fb")).toHaveCount(1);
  // Redo brings the steps back, the last undone first.
  await page.getByRole("button", { name: "Redo", exact: true }).click();
  await expect(page.getByRole("button", { name: /^a → a, formula/ })).toBeVisible();
});

test("the structural rules are drawn on request, and the exports are the derivation's", async ({
  page,
}) => {
  await ordinary(page, "intuitionistic", "a -> b, a |- b");
  await rule(page, /^a → b, formula/, "→L");
  await page.getByRole("button", { name: "Close all" }).click();
  await expect(page.locator(".ptab[aria-current=true] .dot[data-tone=ok]")).toBeVisible();
  // The finished derivation is G3's, its contraction below →L admissible and left out; the
  // switch draws it.
  expect(await drawn(page)).toContain("→L");
  expect(await drawn(page)).not.toContain("CL");
  const pop = await switches(page);
  await pop.locator("label.sw", { hasText: "Structural rules" }).click();
  await page.keyboard.press("Escape");
  await expect.poll(() => drawn(page)).toContain("CL");
  const files: Record<string, string> = {};
  for (const [label, name] of [
    ["LaTeX", /\.tex$/],
    ["Text", /\.txt$/],
    ["Rocq", /\.v$/],
    ["Session", /\.json$/],
    ["SVG", /\.svg$/],
  ] as const) {
    await page.getByRole("button", { name: "Export" }).click();
    const download = page.waitForEvent("download");
    await page.getByRole("menuitem", { name: new RegExp(`^${label}`) }).click();
    const file = await download;
    expect(file.suggestedFilename()).toMatch(name);
    files[label] = await readFile(await file.path(), "utf8");
    await page.keyboard.press("Escape");
  }
  expect(files["LaTeX"]).toContain("\\vdash");
  expect(files["Text"]).toContain("→L");
  expect(files["Rocq"]).toMatch(/Lemma certificate : forall a b : Prop[\s\S]*Qed\./);
  expect(JSON.parse(files["Session"] ?? "{}").logic).toBe("intuitionistic");
  expect(files["SVG"]).toContain("<svg");
  expect(files["Text"]).not.toMatch(LINEAR);
});

test("an ordinary proof's link and stored copy carry its suite; an old link opens linear", async ({
  page,
  browser,
}) => {
  await ordinary(page, "minimal", "a -> b |- ~b -> ~a");
  await rule(page, /^¬b → ¬a, formula/, "→R");
  await expect(page).toHaveURL(/#v=2&u=ordinary&m=minimal&s=.*&d=/);
  const fresh = await browser.newPage();
  await fresh.goto(page.url());
  await expect(fresh.locator(".ptab[aria-current=true] .pt-mark")).toContainText("LM");
  await expect(fresh.getByRole("button", { name: /^¬a, formula/ })).toBeVisible();
  // The stored copy: restored on the next visit, in its own logic.
  await page.waitForTimeout(500);
  await page.goto("/");
  await page.getByRole("button", { name: "Restore" }).click();
  await expect(mark(page)).toContainText("LM");
  await expect(page.getByRole("button", { name: /^¬a, formula/ })).toBeVisible();
  // A link of the first version, from before the suites, opens in the linear suite.
  const old = await browser.newPage();
  await old.goto("/#v=1&m=mix&s=A+%E2%8A%A2+A");
  await expect(old.locator(".ptab[aria-current=true] .pt-mark")).toContainText("LL+mix");
  await expect(old.getByRole("button", { name: /^A, formula/ }).first()).toBeVisible();
});

test("a search's graft taken back by undo leaves no mark on the steps taken after", async ({
  page,
}) => {
  await ordinary(page, "intuitionistic", "a, b |- a /\\ b");
  await rule(page, /^a ∧ b, formula/, "∧R");
  await rule(page, /^b, formula 3/, "ax");
  await page.getByRole("button", { name: "Close goal" }).click();
  await expect(page.locator(".ptab[aria-current=true] .dot[data-tone=ok]")).toBeVisible();
  const marked = page.locator(".drawing g.search");
  await expect(marked.first()).toBeAttached();
  // Undo takes the search's graft back with its mark; redo brings both back.
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(marked).toHaveCount(0);
  await page.getByRole("button", { name: "Redo", exact: true }).click();
  await expect(marked.first()).toBeAttached();
  // A step taken by hand where the graft was is the visitor's.
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await rule(page, /^a, formula 3/, "ax");
  await expect(page.locator(".ptab[aria-current=true] .dot[data-tone=ok]")).toBeVisible();
  await expect(marked).toHaveCount(0);
  await page.getByRole("button", { name: "Steps" }).click();
  await expect(page.getByRole("dialog", { name: "Steps" })).not.toContainText("closed goal");
});

test("the structural switch with a goal open marks and buttons that goal in the new drawing", async ({
  page,
}) => {
  await ordinary(page, "intuitionistic", "a, b |- a /\\ b");
  await rule(page, /^a ∧ b, formula/, "∧R");
  await rule(page, /^a, formula 3/, "ax");
  const open = () => page.locator(".drawing svg g.open-goal").allTextContents();
  const before = (await open()).join(" ");
  expect(before).toContain("⊢");
  const pop = await switches(page);
  await pop.locator("label.sw", { hasText: "Structural rules" }).click();
  await page.keyboard.press("Escape");
  await expect.poll(() => page.locator(".drawing svg text").allTextContents()).toContain("WL");
  await expect.poll(async () => (await open()).join(" ")).toBe(before);
  await expect(page.getByRole("button", { name: /formula 1 of goal/ })).toHaveCount(1);
  await rule(page, /^b, formula 2/, "ax");
  await expect(page.locator(".ptab[aria-current=true] .dot[data-tone=ok]")).toBeVisible();
});

test("an ordinary goal is never offered a fill from a linear tab", async ({ page }) => {
  await goto(page);
  await page.getByRole("textbox", { name: "Sequent" }).fill("a |- a");
  const pop = await switches(page);
  await pop.getByRole("button", { name: "Intuitionistic", exact: true }).click();
  await page.keyboard.press("Escape");
  await page.getByRole("textbox", { name: "Sequent" }).press("Enter");
  await page.getByRole("button", { name: "Close goal" }).click();
  await expect(page.locator(".ptab[aria-current=true] .dot[data-tone=ok]")).toBeVisible();
  await page.getByRole("button", { name: "New proof" }).click();
  await ordinary(page, "intuitionistic", "a |- a", false);
  await expect(page.getByRole("button", { name: "Open this goal in a new tab" })).toBeVisible();
  await expect(page.getByRole("button", { name: /^Fill from/ })).toHaveCount(0);
});
