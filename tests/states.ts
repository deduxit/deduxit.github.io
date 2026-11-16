// deduxit © Fabian Lukas Grubmüller 2026
// Licensed under the EUPL

// The states the page can be put in, walked in order, each handed to
// `visit` once the page shows it. tests/targets.spec.ts measures the
// controls in every state, tests/accessibility.spec.ts runs axe in every
// state: a new control, popover or state gets a step here, and both see it.

import { devices, expect, type Page } from "@playwright/test";
import { calculus, goto, rule, start, switches } from "./prover";

/** Called in each state, with the state's name. */
export type Visit = (state: string) => Promise<void>;

const { defaultBrowserType: _, ...phone } = devices["Pixel 7"];
/** Pixel 7 without its browser type, which `test.use` refuses inside a project. */
export const pixel = phone;

/** Presses a button of the bottom band, through More's sheet where a phone keeps it there. */
async function band(page: Page, name: string, visit?: Visit) {
  const button = page.locator("footer").getByRole("button", { name, exact: true });
  if (!(await button.isVisible())) {
    await page.locator("footer").getByRole("button", { name: "More" }).click();
    await visit?.("more");
    await page.getByRole("dialog", { name: "More" }).getByRole("button", { name }).click();
  } else {
    await button.click();
  }
}

/**
 * The empty page, a field's parse error, a proof with the rule popover, the
 * split chooser, a refusal, a hint, and a proof closed and its net.
 */
export async function proving(page: Page, visit: Visit) {
  await goto(page);
  await visit("empty");
  await page.getByRole("textbox", { name: "Sequent" }).fill("A *");
  await page.getByRole("textbox", { name: "Sequent" }).press("Enter");
  await expect(page.getByRole("alert")).toBeVisible();
  await visit("parse error");
  await start(page, "A * B |- B * A", false);
  await visit("started");
  await page.getByRole("button", { name: /^A⊥ ⅋ B⊥, formula/ }).click();
  await expect(page.getByRole("dialog", { name: "Rules" })).toBeVisible();
  await visit("rules");
  await page.keyboard.press("Escape");
  await rule(page, /^A⊥ ⅋ B⊥, formula/, "⅋");
  await rule(page, /^B ⊗ A, formula/, "⊗");
  await page.getByRole("button", { name: /^B⊥, formula/ }).click();
  await expect(page.getByRole("dialog", { name: "Split" })).toContainText("Passes");
  await visit("split");
  await page.getByRole("dialog", { name: "Split" }).getByRole("button", { name: "Cancel" }).click();
  await rule(page, /^A⊥, formula/, "ax");
  await expect(page.locator(".dline .kw.bad")).toBeVisible();
  await visit("refusal");
  await band(page, "Hint", visit);
  await expect(page.locator(".dline.hint")).toContainText("Work on this goal");
  await visit("hint");
  await page.locator("footer").getByRole("button", { name: "Close all" }).click();
  await expect(page.getByText("Proved: every goal is closed")).toBeVisible();
  await visit("proved");
  await page.getByRole("tab", { name: "Net" }).click();
  await visit("net");
  await page.getByRole("tab", { name: "Tree" }).click();
}

/**
 * On a proof closed, every menu of the band, the status and the calculus, and the restart
 * warning.
 */
export async function menus(page: Page, visit: Visit) {
  for (const menu of ["Export", "Steps", "Import", "Settings", "Keys", "About"]) {
    await band(page, menu, visit);
    await expect(
      page.getByRole(menu === "Export" ? "menu" : "dialog", { name: menu }),
    ).toBeVisible();
    await visit(menu);
    await page.keyboard.press("Escape");
  }
  const tab = page.locator(".ptab[aria-current=true]");
  await tab.getByRole("button", { name: /^Status/ }).click();
  await visit("status");
  await page.keyboard.press("Escape");
  await tab.getByRole("button", { name: /^Logic/ }).click();
  await visit("calculus mark");
  await page.keyboard.press("Escape");
  // The switches are the tab's mark's alone.
  await tab.getByRole("button", { name: /^Logic/ }).click();
  await page.getByRole("button", { name: "Intuitionistic", exact: true }).click();
  await expect(page.getByRole("alertdialog", { name: "Restart the proof" })).toBeVisible();
  await visit("restart warning");
  await page.getByRole("button", { name: "Keep the proof" }).click();
  await page.keyboard.press("Escape");
}

/** Practice and its filters. */
export async function practising(page: Page, visit: Visit) {
  await band(page, "Practice", visit);
  const practice = page.getByRole("dialog", { name: "Practice" });
  await expect(practice.locator(".pr-row").first()).toBeVisible();
  await visit("Practice");
  await practice.getByRole("checkbox", { name: "Additives" }).check();
  await practice.getByRole("checkbox", { name: "Hard", exact: true }).check();
  await visit("Practice filtered");
  await page.keyboard.press("Escape");
}

/** The tour's first stop. */
export async function touring(page: Page, visit: Visit) {
  await band(page, "Tour", visit);
  await expect(page.getByRole("dialog", { name: "Tour" })).toBeVisible();
  await visit("tour");
  await page.keyboard.press("Escape");
}

/**
 * Learn's two places and a lesson's parts: a worked proof, its dead end, its
 * prompt, its faded proof and its check. It ends on the list of lessons,
 * where `attempting` goes on.
 */
export async function learning(page: Page, visit: Visit) {
  await band(page, "Learn", visit);
  for (const place of ["Tutorial", "Reference"]) {
    await page.getByRole("tab", { name: place }).click();
    await visit(`Learn ${place}`);
  }
  await page.getByRole("tab", { name: "Tutorial" }).click();
  await page.getByRole("button", { name: "Lesson 2: The multiplicatives" }).click();
  await visit("lesson");
  await page.getByRole("button", { name: "Start the worked proof" }).click();
  await page.getByRole("button", { name: "Show the step" }).click();
  await page.getByRole("button", { name: "Play this split" }).click();
  await expect(page.locator(".detour").getByRole("status")).toContainText("Cannot close");
  await visit("lesson's dead end");
  await page.getByRole("button", { name: "Predict ⊗" }).click();
  await expect(page.getByRole("note", { name: "Why this step" })).toBeVisible();
  await visit("lesson's worked proof");
  await page.getByRole("button", { name: "Finish the proof yourself" }).click();
  await visit("lesson's faded proof");
  await page.getByRole("region", { name: "Check" }).getByRole("radio").nth(1).check();
  await visit("lesson's check");
  await page.getByRole("button", { name: "All lessons" }).click();
}

/** Learn opened on the list of lessons, where `attempting` starts. */
export async function toLessons(page: Page) {
  await band(page, "Learn");
  await page.getByRole("tab", { name: "Tutorial" }).click();
}

/**
 * From Learn's list of lessons: lesson 7's attempt, its question, and the
 * search that gives up; lesson 9's elimination; lesson 10's refusal. It ends
 * with Learn turned off.
 */
export async function attempting(page: Page, visit: Visit) {
  await page.getByRole("button", { name: "Lesson 7: When there is no proof" }).click();
  await page.getByRole("button", { name: "Play the attempt" }).click();
  await visit("lesson's attempt");
  for (let step = 0; step < 5; step++)
    await page.getByRole("button", { name: "Next step of the attempt" }).click();
  await page.getByRole("radio", { name: "Step 2, ⊕₁" }).check();
  await visit("lesson's wrong step");
  await page.getByRole("button", { name: "Ask deduxit about A false case" }).click();
  await page.getByRole("button", { name: "Search it with a budget of 20 units" }).click();
  await expect(page.getByRole("button", { name: "Try 40 units" })).toBeVisible();
  await visit("lesson's unknown");
  await page.getByRole("button", { name: "All lessons" }).click();
  await page.getByRole("button", { name: "Lesson 9: Cut and its elimination" }).click();
  await page.getByRole("button", { name: "Show the finished proof" }).click();
  await page.getByRole("button", { name: "Eliminate the cuts" }).click();
  await page.getByRole("button", { name: "Next step" }).click();
  await expect(page.getByRole("note", { name: "Why this elimination step" })).toBeVisible();
  await visit("lesson's elimination");
  await page.getByRole("button", { name: "All lessons" }).click();
  await page.getByRole("button", { name: "Lesson 10: The quantifiers" }).click();
  await page.getByRole("button", { name: "Play the attempt" }).click();
  for (let step = 0; step < 4; step++)
    await page.getByRole("button", { name: "Next step of the attempt" }).click();
  await page.getByRole("button", { name: "Try the last step" }).click();
  await expect(
    page.getByRole("region", { name: "A step deduxit refuses" }).getByRole("status"),
  ).toBeVisible();
  await visit("lesson's refusal");
  await page.getByRole("button", { name: "All lessons" }).click();
  await page.getByRole("button", { name: "Turn Learn off" }).click();
}

/** The restore bar, after a reload of a page with a proof begun. */
export async function restoring(page: Page, visit: Visit) {
  await page.reload();
  await expect(page.getByRole("region", { name: "Restore" })).toBeVisible();
  await visit("restore");
}

/** A goal's reasons: a goal an earlier step lost, with Go back, and a long reason with its "more". */
export async function reasons(page: Page, visit: Visit) {
  await start(page, "A * B |- A");
  await rule(page, /^A⊥ ⅋ B⊥, formula/, "⅋");
  await page.getByRole("button", { name: "Close goal" }).click();
  await expect(page.getByRole("button", { name: "Go back" })).toBeVisible();
  await visit("lost goal");
  await start(page, "!(a -o a * a * a), !(a -o a), a |- a * (a + 0)", false);
  await calculus(page, ["Intuitionistic"]);
  await page.getByRole("button", { name: "Close goal" }).click();
  await expect(page.locator(".dock .note").getByRole("button", { name: "more" })).toBeVisible();
  await visit("long reason");
}

/** Learn's answers: lesson 1's rewrite, a wrong check answer's sequent to try, a practice row answered. */
export async function answers(page: Page, visit: Visit) {
  await goto(page);
  await band(page, "Learn");
  await page.getByRole("button", { name: "Lesson 1: Reading a sequent" }).click();
  await page.getByRole("button", { name: "Start the worked proof" }).click();
  await page.getByRole("button", { name: "Turn on Two-sided" }).click();
  await expect(page.getByRole("button", { name: "Turn it off" })).toBeVisible();
  // Visited once the stage has redrawn the sequent two-sided, and zoomed to it.
  await expect(page.locator(".drawing svg title")).toHaveText("A ⊢ A");
  await visit("lesson's rewrite");
  await page.getByRole("region", { name: "Check" }).getByRole("radio", { name: "⊢ A, A" }).check();
  await expect(page.getByRole("button", { name: "Try ⊢ A, A yourself" })).toBeVisible();
  await visit("check's sequent to try");
  const card = page.locator(".exercise").filter({ hasText: "A entails A" });
  await card.getByRole("button", { name: "Has a proof" }).click();
  await expect(card.getByRole("button", { name: "Watch the proof of A entails A" })).toBeVisible();
  await visit("practice answered");
}

/**
 * An ordinary tab: its calculus's switches, the field's examples, a proof's rules, and a goal
 * that is not valid with its countermodel drawn.
 */
export async function ordinary(page: Page, visit: Visit) {
  await goto(page);
  await page
    .locator(".ptab[aria-current=true]")
    .getByRole("button", { name: /^Logic/ })
    .click();
  await page
    .getByRole("dialog", { name: "Logic" })
    .getByRole("button", { name: "Ordinary", exact: true })
    .click();
  await visit("ordinary calculus");
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Examples" }).click();
  await visit("examples");
  await page
    .getByRole("dialog", { name: "Examples" })
    .getByRole("button", { name: /^Modus ponens/ })
    .click();
  await page.getByRole("button", { name: /^a → b, formula/ }).click();
  await expect(page.getByRole("dialog", { name: "Rules" })).toBeVisible();
  await visit("ordinary rules");
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "New proof" }).click();
  await page.getByRole("textbox", { name: "Sequent" }).fill("|- a \\/ ~a");
  await page.getByRole("textbox", { name: "Sequent" }).press("Enter");
  await page.getByRole("button", { name: "Close goal" }).click();
  await expect(page.getByRole("img", { name: /^A countermodel of/ })).toBeVisible();
  await visit("ordinary countermodel");
  await band(page, "Practice", visit);
  const practice = page.getByRole("dialog", { name: "Practice" });
  await expect(practice.getByRole("checkbox", { name: "Minimal" })).toBeVisible();
  await visit("ordinary practice");
  await page.keyboard.press("Escape");
}

/**
 * A classical proof's other views: its truth table with the countermodel, its tableau with an
 * open branch, and a table past the bound on atoms with the way to draw it.
 */
export async function methods(page: Page, visit: Visit) {
  await goto(page);
  await calculus(page, ["Ordinary", "Classical"]);
  await page.getByRole("textbox", { name: "Sequent" }).fill("a -> b |- b -> a");
  await page.getByRole("textbox", { name: "Sequent" }).press("Enter");
  await page.getByRole("tab", { name: "Table", exact: true }).click();
  await expect(page.getByRole("img", { name: /^A countermodel of/ })).toBeVisible();
  await visit("truth table");
  await page.getByRole("tab", { name: "Tableau" }).click();
  await expect(page.locator(".tb-end").first()).toBeVisible();
  await visit("tableau");
  await page.getByRole("button", { name: "New proof" }).click();
  await page.getByRole("textbox", { name: "Sequent" }).fill("a, b, c, d, e, f, g, h, i, j, k |- a");
  await page.getByRole("textbox", { name: "Sequent" }).press("Enter");
  await page.getByRole("tab", { name: "Table", exact: true }).click();
  await expect(page.getByRole("button", { name: "Draw all 2048 rows" })).toBeVisible();
  await visit("table refused");
  await page.getByRole("tab", { name: "Tree" }).click();
}

/**
 * A classical proof's translations and interpolants: the Logic popover that offers them, a
 * translation whose verdicts agree, one that is not valid with its countermodel, and an
 * interpolant before and after a formula is moved to the other part.
 */
export async function transforms(page: Page, visit: Visit) {
  await goto(page);
  await calculus(page, ["Ordinary", "Classical"]);
  await page.getByRole("textbox", { name: "Sequent" }).fill("p /\\ (p -> q), s |- q \\/ t");
  await page.getByRole("textbox", { name: "Sequent" }).press("Enter");
  let pop = await switches(page);
  await visit("logic, classical");
  await pop.getByRole("button", { name: "Translate into intuitionistic logic" }).click();
  const translation = page.getByRole("dialog", { name: "Translate into intuitionistic logic" });
  await expect(translation.getByRole("status")).toContainText("Both valid");
  await visit("translation");
  pop = await switches(page);
  await pop.getByRole("button", { name: "Find an interpolant" }).click();
  const interpolant = page.getByRole("dialog", { name: "Find an interpolant" });
  await expect(interpolant.getByRole("status")).toContainText("Interpolant");
  await visit("interpolant");
  await interpolant.getByRole("button", { name: "Part 1 s" }).click();
  await expect(interpolant.getByRole("button", { name: "Part 2 s" })).toBeVisible();
  await expect(interpolant.getByRole("status")).toContainText("Interpolant");
  await visit("interpolant, a formula moved");
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "New proof" }).click();
  await page.getByRole("textbox", { name: "Sequent" }).fill("a \\/ b |- a");
  await page.getByRole("textbox", { name: "Sequent" }).press("Enter");
  pop = await switches(page);
  await pop.getByRole("button", { name: "Translate into intuitionistic logic" }).click();
  await expect(page.getByRole("img", { name: /^A countermodel of/ })).toBeVisible();
  await visit("translation, not valid");
  await page.keyboard.press("Escape");
}

/** The witness chooser with a term typed, and its refusal. */
export async function witnessing(page: Page, visit: Visit) {
  await start(page, "|- exists x. p(x), ~p(c)");
  await page.getByRole("button", { name: /^∃x\. p\(x\), formula/ }).click();
  await page.getByRole("dialog", { name: "Rules" }).getByRole("button", { name: /^∃/ }).click();
  const chooser = page.getByRole("dialog", { name: "Witness" });
  await chooser.getByRole("textbox").fill("g(c)");
  await visit("witness");
  await chooser.getByRole("button", { name: "Apply" }).click();
  await expect(chooser.getByRole("alert")).toBeVisible();
  await visit("witness refused");
}

/** The cut chooser with a formula typed, and the elimination's panel stepping and at its end. */
export async function cutting(page: Page, visit: Visit) {
  await start(page, "A, A -o B |- B");
  await page.getByRole("button", { name: "Cut", exact: true }).click();
  await page.getByRole("dialog", { name: "Cut" }).getByRole("textbox").fill("A -o B");
  await visit("cut");
  await page.getByRole("button", { name: /^A ⊗ B⊥, formula 2/ }).click();
  await page.getByRole("dialog", { name: "Cut" }).getByRole("button", { name: "Cut" }).click();
  await page.getByRole("button", { name: "Close all" }).first().click();
  const panel = page.getByRole("region", { name: "Cut elimination" });
  await panel.getByRole("button", { name: "Eliminate the cuts" }).click();
  await visit("elimination");
  await panel.getByRole("button", { name: "To the end" }).click();
  await expect(panel.getByRole("status")).toContainText("Cut-free");
  await panel.locator("summary").click();
  await visit("cut-free");
}

/** The stage in each math font: a proof started, and the split chooser. */
export async function fonts(page: Page, visit: Visit) {
  for (const font of ["stix-two", "garamond", "asana", "new-computer-modern"]) {
    await page.evaluate(
      (f) => localStorage.setItem("deduxit-settings", JSON.stringify({ stageFont: f })),
      font,
    );
    await start(page, "A * B |- B * A");
    await expect(page.locator(".drawing svg")).not.toHaveAttribute("font-family", /Euler/);
    await visit(`${font}, started`);
    await rule(page, /^A⊥ ⅋ B⊥, formula/, "⅋");
    await rule(page, /^B ⊗ A, formula/, "⊗");
    await expect(page.getByRole("dialog", { name: "Split" })).toBeVisible();
    await visit(`${font}, split`);
  }
}

/** Takes the step of a custom calculus's goal whose button starts with `words`. */
export async function customStep(page: Page, words: string) {
  const escaped = words.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  await page
    .getByRole("list", { name: "Steps that apply" })
    .getByRole("button", { name: new RegExp(`^${escaped}`) })
    .first()
    .click();
}

/**
 * A calculus of one's own: the popover's entry, the panel's start and its rule file, a
 * derivation in LJ by steps, a step asking what it needs, and the verdict.
 */
export async function customising(page: Page, visit: Visit) {
  await goto(page);
  const pop = await switches(page);
  await pop.getByRole("button", { name: "Your own calculus" }).click();
  await visit("custom entry");
  await page.keyboard.press("Escape");
  await expect(page.getByText("A rule file is a calculus written down")).toBeVisible();
  await page.getByText("The rule file", { exact: true }).click();
  await expect(page.getByRole("textbox", { name: "The rule file" })).toHaveValue(/"LJ"/);
  await visit("custom start");
  await page.getByRole("textbox", { name: "Sequent" }).fill("a ∧ b ⊢ b ∧ a");
  await page.getByRole("textbox", { name: "Sequent" }).press("Enter");
  await customStep(page, "∧R on b ∧ a");
  await expect(page.getByText("Open goal 1 of 2")).toBeVisible();
  await visit("custom steps");
  await customStep(page, "cut");
  await expect(page.getByRole("form", { name: /^Give what cut needs/ })).toBeVisible();
  await visit("custom giving");
  await page.getByRole("button", { name: "Other steps" }).click();
  await customStep(page, "∧L₂ on a ∧ b");
  await customStep(page, "ax");
  await customStep(page, "∧L₁ on a ∧ b");
  await customStep(page, "ax");
  await page.getByRole("button", { name: "Check the derivation" }).click();
  await expect(page.getByRole("status").filter({ hasText: "in the calculus given" })).toBeVisible();
  await visit("custom valid");
}

/** Starts `sequent` in the tab's calculus, set to natural deduction, and waits for its goal. */
export async function deduce(page: Page, sequent: string) {
  await page.getByRole("textbox", { name: "Sequent" }).fill(sequent);
  await page.getByRole("textbox", { name: "Sequent" }).press("Enter");
  await expect(page.getByRole("list", { name: "Steps that apply" })).toBeVisible();
}

/** Derives a line from lines in force, by the rule's name and the lines' numbers as typed. */
export async function deriveLine(page: Page, rule: string, lines: string) {
  const form = page.getByRole("form", { name: "A step from lines" });
  await form.getByRole("combobox", { name: "Rule" }).selectOption(rule);
  await form.getByRole("textbox", { name: "From lines" }).fill(lines);
  await form.getByRole("button", { name: "Derive a line" }).click();
}

/**
 * Natural deduction, a method of the ordinary tab: the calculus popover's button, a proof begun
 * backwards, a line derived forwards, a refused citation, both drawings, and the verdict.
 */
export async function deducing(page: Page, visit: Visit) {
  await goto(page);
  await calculus(page, ["Ordinary", "Intuitionistic"]);
  const pop = await switches(page);
  await pop.getByRole("button", { name: "Natural deduction" }).click();
  await visit("natural calculus");
  await page.keyboard.press("Escape");
  await deduce(page, "a ∧ b ⊢ b ∧ a");
  await visit("natural start");
  await customStep(page, "∧I");
  await page.getByRole("button", { name: "From lines" }).click();
  await deriveLine(page, "∧E₂", "9");
  await expect(page.getByRole("alert")).toContainText("Line 9 is not in force here");
  await visit("natural refused");
  await deriveLine(page, "∧E₂", "1");
  await page.getByRole("button", { name: "Close the goal by line 2" }).click();
  await deriveLine(page, "∧E₁", "1");
  await page.getByRole("button", { name: "Close the goal by line 3" }).click();
  await page.getByRole("button", { name: "Fitch" }).click();
  await expect(page.locator(".custom-drawing svg #l3")).toBeAttached();
  await page.getByRole("button", { name: "Check the proof" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Valid in NJ" })).toBeVisible();
  await visit("natural valid");
}

/**
 * The ordinary course, in an ordinary tab's Learn: its list, lesson 3's worked proof played
 * with a prediction, its self-explanation prompt, the finished proof and the hinge answered.
 */
export async function coursing(page: Page, visit: Visit) {
  await goto(page);
  await calculus(page, ["Ordinary", "Classical"]);
  await band(page, "Learn", visit);
  await page.getByRole("tab", { name: "Tutorial" }).click();
  await expect(page.getByText("The course on ordinary logic")).toBeVisible();
  await visit("ordinary course");
  await page.getByRole("button", { name: /^Lesson 3: The sequent calculus LK/ }).click();
  await page.getByRole("button", { name: "Start the worked proof" }).click();
  await page.getByRole("button", { name: "Predict ∨R", exact: true }).click();
  await expect(page.getByRole("note", { name: "Why this step" })).toContainText("Right");
  await visit("ordinary lesson's step");
  await page.getByRole("button", { name: "Show the step" }).click();
  await page.getByRole("button", { name: "Show the step" }).click();
  await expect(page.locator(".lesson-view .kw.ok").filter({ hasText: "Proved" })).toBeVisible();
  await page.getByRole("region", { name: "Check" }).getByRole("radio").nth(1).check();
  await visit("ordinary lesson's check");
  await page.getByRole("button", { name: "All lessons" }).click();
  await page.getByRole("button", { name: /^Lesson 1: Valid, by the truth table/ }).click();
  await page.getByRole("button", { name: "Start with the first row" }).click();
  await page.getByRole("button", { name: "Predict falsifies" }).click();
  await visit("table lesson's row");
  await page.getByRole("button", { name: "All lessons" }).click();
  await page.getByRole("button", { name: /^Lesson 5: Natural deduction, forwards/ }).click();
  await page.getByRole("button", { name: "Start the worked proof" }).click();
  await page.getByRole("button", { name: "Predict ∧E₂" }).click();
  await expect(page.getByRole("region", { name: "Natural deduction" })).toBeVisible();
  await visit("natural lesson's step");
}
