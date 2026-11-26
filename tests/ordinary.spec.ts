// deduxit © Fabian Lukas Grubmüller 2026
// Licensed under the EUPL

// Ordinary logic on the page: a tab's calculus popover lists the suites, and the Ordinary one
// proves sequents of classical, intuitionistic and minimal logic step by step in LK and LJ, drawn
// as LK and LJ derivations, never as their linear image; undo works per branch; the exports,
// the link and the stored proofs carry the suite.

import { readFile } from "node:fs/promises";
import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";
import { calculus, closeGoal, goalMenu, goto, newTab, saveExport, switches, tool } from "./prover";

/** The chosen sequent's proof, its cell in the rail, whose hover names its calculus. */
const mark = (page: Page) =>
  page.getByRole("tablist", { name: "Views of this sequent" }).getByRole("tab").first();
/** The chosen sequent's chip carries the check of a finished proof. */
const checked = (page: Page) => page.locator(".chip[aria-selected=true] svg.icon-check");

/** The drawing's texts: its formulas and rule labels, without its title and description. */
const drawn = async (page: Page) =>
  (await page.locator(".stage .drawing svg text").allTextContents()).join(" ");

/** The signs of linear logic, none of which an ordinary derivation shows. */
const LINEAR = /[⊗⅋⊸⊕&!?]/;

/** Opens the page on a new sequent in ordinary logic, in `logic`, and starts `sequent` there. */
async function ordinary(page: Page, logic: string, sequent: string, fresh = true) {
  if (fresh) await goto(page);
  const name = `${logic.charAt(0).toUpperCase()}${logic.slice(1)}`;
  await calculus(page, ["Ordinary", name]);
  await page.getByRole("textbox", { name: "Sequent" }).fill(sequent);
  await page.getByRole("textbox", { name: "Sequent" }).press("Enter");
  await expect(page.locator(".stage .fb").first()).toBeVisible();
  const marks: Record<string, string> = { classical: "LK", intuitionistic: "LJ", minimal: "LM" };
  await expect(mark(page)).toHaveAttribute("data-tip", `Sequent calculus, ${marks[logic] ?? ""}`);
}

/** Applies a rule, by its exact name, to the active goal's first formula matching `formula`. */
async function rule(page: Page, formula: RegExp, name: string) {
  await page.getByRole("button", { name: formula }).first().click();
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  await page
    .getByRole("dialog", { name: "Rules" })
    .getByRole("button", { name: new RegExp(`^${escaped}$`) })
    .click();
}

test("the new tab view offers the four logics, ordinary first, and an ordinary sequent proves in LK", async ({
  page,
}) => {
  await goto(page);
  const logics = page.getByRole("region", { name: "New sequent" }).getByRole("group", {
    name: "Logic",
  });
  await expect(logics.getByRole("button")).toHaveText([
    /Ordinary logic/,
    /Linear logic/,
    /Modal logic/,
    /Lambda-terms/,
  ]);
  await ordinary(page, "classical", "a /\\ b |- b /\\ a", false);
  await expect(page.locator(".chip[aria-selected=true]")).toHaveText("a ∧ b ⊢ b ∧ a");
  await rule(page, /^b ∧ a, formula/, "∧R");
  await rule(page, /^a ∧ b, formula/, "∧L");
  await rule(page, /^b, formula/, "ax");
  await rule(page, /^a ∧ b, formula/, "∧L");
  await rule(page, /^a, formula 3/, "ax");
  await expect(
    page.getByRole("status").filter({ hasText: "Proved. Every goal is closed." }),
  ).toBeVisible();
  const text = (await drawn(page)) ?? "";
  expect(text).toContain("∧R");
  expect(text).toContain("∧L");
  expect(text).not.toMatch(LINEAR);
  // Steps names each step as a textbook does: its rule, on the formula it acts on.
  await tool(page, "Steps").click();
  await expect(page.getByRole("dialog", { name: "Steps" }).getByRole("button")).toHaveText([
    /^0/,
    /^1∧R on b ∧ a$/,
    /^2∧L on a ∧ b$/,
    /^3ax on b$/,
    /^4∧L on a ∧ b$/,
    /^5ax on a$/,
  ]);
});

test("an ordinary goal's close says not valid, and the guide offers the logic's examples", async ({
  page,
}) => {
  await ordinary(page, "intuitionistic", "a |- a");
  await page.getByRole("button", { name: "Guide", exact: true }).click();
  await newTab(page);
  // A new sequent starts in the calculus last chosen, with its examples over the bottom box.
  await expect(page.getByRole("button", { name: "Intuitionistic", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page.getByRole("button", { name: /^Example: Excluded middle, in LJ/ }).click();
  await page.getByRole("textbox", { name: "Sequent" }).press("Enter");
  await expect(page.locator(".chip[aria-selected=true]")).toHaveText("⊢ a ∨ ¬a");
  await closeGoal(page);
  await expect(page.locator(".goal-note .kw.bad")).toHaveText("Not valid.");
  // The same sequent in LK: valid, the derivation found grafted and finished.
  await newTab(page);
  await page.getByRole("button", { name: "Classical", exact: true }).click();
  await page.getByRole("button", { name: /^Example: Excluded middle, in LK/ }).click();
  await page.getByRole("textbox", { name: "Sequent" }).press("Enter");
  await expect(mark(page)).toHaveAttribute("data-tip", "Sequent calculus, LK");
  await closeGoal(page);
  await expect(checked(page)).toBeVisible();
  expect(await drawn(page)).toContain("∨R");
  expect(await drawn(page)).not.toMatch(LINEAR);
});

test("a goal that is not valid shows its countermodel drawn, and Export writes its certificate", async ({
  page,
}) => {
  await ordinary(page, "intuitionistic", "((a -> b) -> a) -> a");
  await closeGoal(page);
  const note = page.locator(".goal-note");
  await expect(note.locator(".kw.bad")).toHaveText("Not valid.");
  const model = note.getByRole("img", { name: "A countermodel of ⊢ ((a → b) → a) → a" });
  await expect(model).toBeVisible();
  await expect(model.locator("desc")).toContainText("World 0, the model's world, forces nothing");
  await expect(note.locator("figcaption")).toContainText(
    "World 0, outlined, forces every formula left of ⊢ and not the one right of it.",
  );
  const download = await saveExport(page, "Rocq");
  expect(download.suggestedFilename()).toBe("deduxit-countermodel.v");
  const certificate = await readFile(await download.path(), "utf8");
  expect(certificate).toMatch(
    /^From Stdlib Require[\s\S]*From Deduxit\.Intuitionistic Require Import KripkeCheck\.[\s\S]*Lemma certificate : ~ lj \(atom := string\) intuitionistic \[\][\s\S]*kripke_refutation[\s\S]*Qed\./,
  );
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

test("the invertible rules apply by themselves in LJ, and undo takes them back with a choice", async ({
  page,
}) => {
  await ordinary(page, "intuitionistic", "|- b -> (a -> a) \\/ b");
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.getByRole("checkbox", { name: "Apply invertible rules by themselves" }).check();
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  // Turned on, they apply at once: →R took the implication apart.
  await expect(page.getByRole("button", { name: /^\(a → a\) ∨ b, formula/ })).toBeVisible();
  // ∨R₁ is a choice, LJ's to leave to the visitor; →R and the axiom follow it.
  await rule(page, /^\(a → a\) ∨ b, formula/, "∨R₁");
  await expect(
    page.getByRole("status").filter({ hasText: "Proved. Every goal is closed." }),
  ).toBeVisible();
  // Undo takes back the choice with the steps after it, not the →R before it.
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(page.getByRole("button", { name: /^\(a → a\) ∨ b, formula/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /^b, formula 1 of goal/ })).toBeVisible();
});

test("the structural rules are drawn on request, and the exports are the derivation's", async ({
  page,
}) => {
  await ordinary(page, "intuitionistic", "a -> b, a |- b");
  await rule(page, /^a → b, formula/, "→L");
  await page.getByRole("button", { name: "Close all" }).click();
  await expect(checked(page)).toBeVisible();
  // The finished derivation is G3's, its contraction below →L admissible and left out; the
  // switch draws it.
  expect(await drawn(page)).toContain("→L");
  expect(await drawn(page)).not.toContain("CL");
  await tool(page, "W C, weakenings and contractions").click();
  await expect.poll(() => drawn(page)).toContain("CL");
  const files: Record<string, string> = {};
  for (const [label, name] of [
    ["LaTeX", /\.tex$/],
    ["Text", /\.txt$/],
    ["Rocq", /\.v$/],
    ["Session", /\.json$/],
    ["SVG", /\.svg$/],
  ] as const) {
    const file = await saveExport(page, label);
    expect(file.suggestedFilename()).toMatch(name);
    files[label] = await readFile(await file.path(), "utf8");
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
  // The link is written after each change, the sequent's session first: wait for the step's.
  await expect(page).toHaveURL(/#v=2&u=ordinary&m=minimal&s=.*&d=/);
  const before = page.url();
  await rule(page, /^¬b → ¬a, formula/, "→R");
  await expect(page).not.toHaveURL(before);
  const fresh = await browser.newPage();
  await fresh.goto(page.url());
  await expect(
    fresh.getByRole("tablist", { name: "Views of this sequent" }).getByRole("tab").first(),
  ).toHaveAttribute("data-tip", "Sequent calculus, LM");
  await expect(fresh.getByRole("button", { name: /^¬a, formula/ })).toBeVisible();
  // The stored copy: restored on the next plain visit, in its own logic.
  await fresh.close();
  await page.waitForTimeout(500);
  await page.goto("/");
  await expect(mark(page)).toHaveAttribute("data-tip", "Sequent calculus, LM");
  await expect(page.getByRole("button", { name: /^¬a, formula/ })).toBeVisible();
  // A link of the first version, from before the suites, opens in the linear suite.
  const old = await browser.newPage();
  await old.goto("/#v=1&m=mix&s=A+%E2%8A%A2+A");
  await expect(
    old.getByRole("tablist", { name: "Views of this sequent" }).getByRole("tab").first(),
  ).toHaveAttribute("data-tip", "Classical linear logic, LL+mix");
  await expect(old.getByRole("button", { name: /^A, formula/ }).first()).toBeVisible();
});

test("a search's graft taken back by undo leaves no mark on the steps taken after", async ({
  page,
}) => {
  await ordinary(page, "intuitionistic", "a, b |- a /\\ b");
  await rule(page, /^a ∧ b, formula/, "∧R");
  await rule(page, /^b, formula 3/, "ax");
  await closeGoal(page);
  await expect(checked(page)).toBeVisible();
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
  await expect(checked(page)).toBeVisible();
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
  // `rule` returns once the rule is pressed: the drawing of the step comes after, and read
  // before it, `before` held both goals of ∧R.
  await expect(page.locator(".drawing svg g.open-goal")).toHaveCount(1);
  const before = (await open()).join(" ");
  expect(before).toContain("⊢");
  await tool(page, "W C, weakenings and contractions").click();
  await expect.poll(() => page.locator(".drawing svg text").allTextContents()).toContain("WL");
  await expect.poll(async () => (await open()).join(" ")).toBe(before);
  await expect(page.getByRole("button", { name: /formula 1 of goal/ })).toHaveCount(1);
  await rule(page, /^b, formula 2/, "ax");
  await expect(checked(page)).toBeVisible();
});

test("an ordinary goal is proved apart, never with a proof made in a linear tab", async ({
  page,
}) => {
  await goto(page);
  await page.getByRole("textbox", { name: "Sequent" }).fill("a |- a");
  await calculus(page, ["Intuitionistic"]);
  await page.getByRole("textbox", { name: "Sequent" }).press("Enter");
  await closeGoal(page);
  await expect(checked(page)).toBeVisible();
  await newTab(page);
  await ordinary(page, "intuitionistic", "a |- a", false);
  const menu = await goalMenu(page);
  await expect(menu.getByRole("button", { name: "Prove apart" })).toBeVisible();
  await expect(menu.getByRole("button", { name: "Use its proof" })).toHaveCount(0);
});

test("an ordinary goal an earlier step lost goes back to the last goal still valid", async ({
  page,
}) => {
  await ordinary(page, "intuitionistic", "a |- b \\/ a");
  // Proving b from a cannot work: the step lost the derivation.
  await rule(page, /^b ∨ a, formula/, "∨R₁");
  await closeGoal(page);
  const note = page.locator(".goal-note");
  await expect(note.locator(".kw.bad")).toHaveText("Not valid.");
  await expect(note).toContainText("an earlier step lost it");
  await (await goalMenu(page)).getByRole("button", { name: "Go back" }).click();
  await expect(note.locator(".kw.ok")).toHaveText("Back at a goal with a proof.");
  await rule(page, /^b ∨ a, formula/, "∨R₂");
  await rule(page, /^a, formula 2/, "ax");
  await expect(
    page.getByRole("status").filter({ hasText: "Proved. Every goal is closed." }),
  ).toBeVisible();
  // ¬L's contraction below it is the step's own: Go back reopens the step's goal and says so.
  await ordinary(page, "intuitionistic", "~a, c |- c");
  await rule(page, /^¬a, formula/, "¬L");
  await closeGoal(page);
  await expect(note.locator(".kw.bad")).toHaveText("Not valid.");
  await (await goalMenu(page)).getByRole("button", { name: "Go back" }).click();
  await expect(note.locator(".kw.ok")).toHaveText("Back at a goal with a proof.");
  await expect(page.getByRole("button", { name: /^¬a, formula 1 of goal 1/ })).toBeVisible();
});

test("an ordinary proof is kept where its steps hold in the logic chosen, and closes a goal proved apart", async ({
  page,
}) => {
  await ordinary(page, "classical", "a, a -> b |- b");
  await rule(page, /^a → b, formula/, "→L");
  await rule(page, /^a, formula/, "ax");
  await rule(page, /^b, formula/, "ax");
  await expect(checked(page)).toBeVisible();
  // →L, then an axiom on each premise: every step holds in LJ too.
  await (await switches(page)).getByRole("button", { name: "Intuitionistic" }).click();
  await expect(page.locator(".chip")).toHaveCount(1);
  await expect(mark(page)).toHaveAttribute("data-tip", /LJ/);
  await expect(checked(page)).toBeVisible();
  // The same steps, made apart on a goal, close it.
  await ordinary(page, "intuitionistic", "c, a, a -> b |- b /\\ c");
  await rule(page, /^b ∧ c, formula/, "∧R");
  await (await goalMenu(page)).getByRole("button", { name: "Prove apart" }).click();
  await rule(page, /^a → b, formula/, "→L");
  await rule(page, /^a, formula/, "ax");
  await rule(page, /^b, formula/, "ax");
  await expect(checked(page)).toBeVisible();
  await page.getByRole("tab", { name: /^c, a, a → b ⊢ b ∧ c/ }).click();
  await (await goalMenu(page)).getByRole("button", { name: "Use its proof" }).click();
  await expect(page.getByRole("button", { name: /^b, formula/ })).toHaveCount(0);
  await expect(page.locator(".drawing g.search").first()).toBeAttached();
});
