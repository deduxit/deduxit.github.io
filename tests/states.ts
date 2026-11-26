// deduxit © Fabian Lukas Grubmüller 2026
// Licensed under the EUPL

// The states the page can be put in, walked in order, each handed to
// `visit` once the page shows it. tests/targets.spec.ts measures the
// controls in every state, tests/accessibility.spec.ts runs axe in every
// state: a new control, popover or state gets a step here, and both see it.

import { devices, expect, type Page } from "@playwright/test";
import {
  addView,
  calculus,
  closeGoal,
  goalMenu,
  goto,
  newTab,
  proveCommuted,
  rule,
  start,
  switches,
  tool,
  system,
} from "./prover";

/** Called in each state, with the state's name. */
export type Visit = (state: string) => Promise<void>;

const { defaultBrowserType: _, ...phone } = devices["Pixel 7"];
/** Pixel 7 without its browser type, which `test.use` refuses inside a project. */
export const pixel = phone;

/** Presses a tool, through More's row where a compact window keeps it there. */
async function press(page: Page, name: string, visit?: Visit) {
  const button = tool(page, name);
  // Only a compact or short window keeps tools behind More; elsewhere the tool comes by itself.
  const more = tool(page, "More");
  if ((await more.isVisible()) && !(await button.isVisible())) {
    await more.click();
    await visit?.("more");
  }
  await button.click();
}

/** Turns the guide on or off by its button in the top row. */
async function guide(page: Page) {
  await page.getByRole("button", { name: "Guide", exact: true }).click();
}

/**
 * The new tab view, a parse error, a proof with the rule popover and a rule's card, a greyed rule
 * with its reason, the premises of a split, the goal's menu, a hint, and a proof closed and its net.
 */
export async function proving(page: Page, visit: Visit) {
  await goto(page);
  await visit("new tab");
  await page.getByRole("textbox", { name: "Sequent" }).fill("A *");
  await page.getByRole("textbox", { name: "Sequent" }).press("Enter");
  await expect(page.getByRole("alert")).toBeVisible();
  await visit("parse error");
  await start(page, "|- 1, A", false);
  await page.getByRole("button", { name: /^1, formula/ }).click();
  // A greyed rule is aria-disabled, which Playwright will not press unforced; a visitor can.
  await page.getByRole("button", { name: "1, does not apply" }).click({ force: true });
  await expect(page.locator(".rule-card")).toContainText("1 refused");
  await visit("a greyed rule's reason");
  await page.keyboard.press("Escape");
  await start(page, "A * B |- B * A", false);
  await visit("started");
  await page.getByRole("button", { name: /^A⊥ ⅋ B⊥, formula/ }).click();
  await expect(page.locator(".rule-card")).toBeVisible();
  await visit("rules");
  await page.keyboard.press("Escape");
  await rule(page, /^A⊥ ⅋ B⊥, formula/, "⅋");
  await rule(page, /^B ⊗ A, formula/, "⊗");
  const split = page.getByRole("group", { name: /^Split for ⊗/ });
  await split.getByRole("button", { name: "B⊥", exact: true }).click();
  await expect(split.getByRole("button", { name: "B⊥", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await visit("split");
  await split.getByRole("button", { name: "Apply ⊗" }).click();
  await goalMenu(page);
  await visit("goal menu");
  await page.keyboard.press("Escape");
  await press(page, "Hint", visit);
  await expect(page.locator(".fb[data-hinted]")).toBeVisible();
  await visit("hint");
  await press(page, "Close all");
  await expect(page.getByText("Proved. Every goal is closed.")).toBeVisible();
  await visit("proved");
  await press(page, "Steps", visit);
  await expect(page.getByRole("dialog", { name: "Steps" })).toContainText("⊗ on B ⊗ A");
  await visit("steps by rule and formula");
  await page.keyboard.press("Escape");
  await page.getByRole("tab", { name: "Proof net" }).click();
  await visit("net");
  await page.getByRole("tab", { name: /^Classical linear logic/ }).click();
  // Two proofs made apart of a goal's formulas, each in another order: the goal's menu offers both.
  await start(page, "A * B |- B * A", false);
  await rule(page, /^A⊥ ⅋ B⊥, formula/, "⅋");
  for (const apart of ["|- B * A, ~B, ~A", "|- ~B, B * A, ~A"]) {
    await start(page, apart, false);
    await press(page, "Close all");
    await expect(page.getByText("Proved. Every goal is closed.")).toBeVisible();
  }
  await page.locator(".chip").filter({ hasText: "A ⊗ B ⊢ B ⊗ A" }).last().click();
  await expect(
    (await goalMenu(page)).getByRole("button", { name: /^Use the proof of / }),
  ).toHaveCount(2);
  await visit("goal menu with proofs made apart");
  await page.keyboard.press("Escape");
}

/** On a proof closed: the tools' panels and the list of views to add. */
export async function menus(page: Page, visit: Visit) {
  for (const [name, role] of [
    ["Export", "dialog"],
    ["Steps", "dialog"],
    ["Import", "dialog"],
    ["The search's settings", "dialog"],
  ] as const) {
    await press(page, name, visit);
    await expect(page.getByRole(role, { name })).toBeVisible();
    await visit(name);
    await page.keyboard.press("Escape");
  }
  await page.getByRole("button", { name: "Add a view" }).click();
  await expect(page.getByRole("dialog", { name: "Add a view" })).toBeVisible();
  await visit("views to add");
  await page.keyboard.press("Escape");
}

/**
 * The frame at the window sizes where its regions met: the new tab view and a proved sequent with
 * Steps open in a medium window, Steps beside the drawing at 840, a short window as 200 % zoom
 * makes one, and a compact one 200 high (400 %), whose page scrolls.
 */
export async function windowSizes(page: Page, visit: Visit) {
  await page.setViewportSize({ width: 700, height: 900 });
  await goto(page);
  await visit("new tab, a medium window");
  await start(page, "A * B |- B * A", false);
  await tool(page, "Close all").click();
  await expect(page.getByRole("status").filter({ hasText: "Proved." })).toBeVisible();
  await visit("proved, a medium window");
  await tool(page, "Steps").click();
  await expect(page.getByRole("dialog", { name: "Steps" })).toBeVisible();
  await visit("Steps, a medium window");
  await page.setViewportSize({ width: 840, height: 900 });
  await visit("Steps, an expanded window 840 wide");
  await page.keyboard.press("Escape");
  await page.setViewportSize({ width: 640, height: 400 });
  await visit("proved, a short window");
  await page.setViewportSize({ width: 320, height: 200 });
  await visit("proved, a compact window 200 high");
}

/**
 * The Export panel on a finished proof: a text format with what it writes, a picture's settings,
 * the Rocq lemma's name refused, a link; then a refuted goal, which Rocq says it cannot write.
 */
export async function exporting(page: Page, visit: Visit) {
  await proveCommuted(page);
  await press(page, "Export", visit);
  const panel = page.getByRole("dialog", { name: "Export" });
  await panel.getByRole("button", { name: "LaTeX", exact: true }).click();
  await expect(panel.locator("pre")).toContainText("prooftree");
  await visit("Export, LaTeX");
  await panel.getByRole("button", { name: "PNG", exact: true }).click();
  await expect(panel.getByRole("group", { name: "Scale" })).toBeVisible();
  await visit("Export, PNG");
  await panel.getByRole("button", { name: "Rocq", exact: true }).click();
  await panel.getByRole("textbox", { name: "Lemma's name" }).fill("2x");
  await expect(panel).toContainText("Not a name");
  await visit("Export, Rocq, a name refused");
  await panel.getByRole("textbox", { name: "Lemma's name" }).fill("certificate");
  await panel.getByRole("button", { name: "This proof", exact: true }).click();
  await expect(panel.locator(".ex-link")).toContainText("#v=2");
  await visit("Export, this proof's link");
  await page.keyboard.press("Escape");
  await start(page, "A * B |- B * A", false);
  await press(page, "Export", visit);
  await panel.getByRole("button", { name: "Text", exact: true }).click();
  await panel.getByRole("button", { name: "Rocq", exact: true }).click();
  await expect(panel).toContainText("Nothing to export");
  await visit("Export, Rocq of an unfinished proof");
  await page.keyboard.press("Escape");
}

/**
 * The Settings page, the list of keys, the guide on, the restart warning, the new tab view in
 * ordinary logic with the guide's examples, and About.
 */
export async function framePages(page: Page, visit: Visit) {
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Settings", exact: true })).toBeVisible();
  await visit("Settings");
  await page
    .getByRole("region", { name: "Settings" })
    .getByRole("button", { name: "Keys", exact: true })
    .click();
  await expect(page.getByRole("dialog", { name: "Keys" })).toBeVisible();
  await visit("Keys");
  // The list of keys took the Settings page's place; Escape closes it and leaves the proof shown.
  await page.keyboard.press("Escape");
  await guide(page);
  await visit("guide on");
  // A step of the visitor's own that holds only in affine logic: without Affine, it opens beside.
  await start(page, "A, B |- A", false);
  await expect(page.locator(".guide-line")).toBeVisible();
  await visit("guide's sentence");
  await (await switches(page)).getByRole("button", { name: "Affine" }).click();
  await rule(page, /^B⊥, formula/, "wk");
  await (await switches(page)).getByRole("button", { name: "Affine" }).click();
  await expect(page.getByRole("status").filter({ hasText: "opened beside" })).toBeVisible();
  await visit("a view opened beside");
  await newTab(page);
  await page.getByRole("button", { name: /^Ordinary logic/ }).click();
  await expect(page.getByRole("button", { name: /^Example: / }).first()).toBeVisible();
  await visit("new tab, ordinary, the guide's examples");
  await page.getByRole("button", { name: "About" }).click();
  await expect(page.getByRole("dialog", { name: "About" })).toBeVisible();
  await visit("About");
  await page.keyboard.press("Escape");
  await guide(page);
}

/** The tour's first stop, from the tools with the guide on. */
export async function touring(page: Page, visit: Visit) {
  // The tour is among the tools, which a sequent entered shows.
  await start(page, "A |- A", false);
  await guide(page);
  await press(page, "Tour", visit);
  await expect(page.getByRole("dialog", { name: "Tour" })).toBeVisible();
  await visit("tour");
  await page.keyboard.press("Escape");
  await guide(page);
}

/**
 * The new tab view's "Restore N proofs", after a link opened on a page whose earlier proofs were
 * not restored by themselves, and "Close every sequent" with its notice to undo it.
 */
export async function restoring(page: Page, visit: Visit) {
  await page.goto("/#v=2&u=linear&m=classical&s=A%20%E2%8A%A2%20A");
  await expect(page.getByRole("tab", { name: /^A ⊢ A/ })).toBeVisible();
  await newTab(page);
  await expect(page.getByRole("button", { name: /^Restore \d+ proofs?$/ })).toBeVisible();
  await visit("restore");
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.getByRole("button", { name: "Close every sequent" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Every sequent closed." })).toBeVisible();
  await visit("every sequent closed");
}

/** A goal's reasons: a goal an earlier step lost, with Go back, and a long reason with its "more". */
export async function reasons(page: Page, visit: Visit) {
  await start(page, "A * B |- B * A");
  await rule(page, /^A⊥ ⅋ B⊥, formula/, "⅋");
  await rule(page, /^B ⊗ A, formula/, "⊗");
  await page
    .getByRole("group", { name: /^Split for ⊗/ })
    .getByRole("button", { name: "A⊥" })
    .click();
  await page.getByRole("button", { name: "Apply ⊗" }).click();
  await closeGoal(page);
  await expect(page.locator(".goal-line[data-dead]").first()).toBeVisible();
  await expect((await goalMenu(page)).getByRole("button", { name: "Go back" })).toBeVisible();
  await visit("lost goal");
  await page.keyboard.press("Escape");
  await newTab(page);
  await calculus(page, ["Intuitionistic"]);
  await page
    .getByRole("textbox", { name: "Sequent" })
    .fill("!(a -o a * a * a), !(a -o a), a |- a * (a + 0)");
  await page.getByRole("textbox", { name: "Sequent" }).press("Enter");
  await closeGoal(page);
  await expect(page.locator(".goal-note").getByRole("button", { name: "more" })).toBeVisible();
  await visit("long reason");
}

/**
 * An ordinary sequent: its toggles on the new tab view, a proof's rules, a goal that is not valid
 * with its countermodel drawn, and that model in the editor, checked and refused.
 */
export async function ordinary(page: Page, visit: Visit) {
  await goto(page);
  await calculus(page, ["Ordinary"]);
  await visit("ordinary calculus");
  await page.getByRole("textbox", { name: "Sequent" }).fill("a -> b, a |- b");
  await page.getByRole("textbox", { name: "Sequent" }).press("Enter");
  await page.getByRole("button", { name: /^a → b, formula/ }).click();
  await expect(page.getByRole("dialog", { name: "Rules" })).toBeVisible();
  await visit("ordinary rules");
  await page.keyboard.press("Escape");
  await newTab(page);
  await calculus(page, ["Intuitionistic"]);
  await page.getByRole("textbox", { name: "Sequent" }).fill("|- a \\/ ~a");
  await page.getByRole("textbox", { name: "Sequent" }).press("Enter");
  await closeGoal(page);
  await expect(page.getByRole("img", { name: /^A countermodel of/ })).toBeVisible();
  await visit("ordinary countermodel");
  await page.getByRole("button", { name: "Change this model and check it" }).click();
  await expect(page.locator(".kripke-canvas")).toBeVisible();
  await visit("ordinary model editor");
  await page.getByRole("button", { name: "Check the model" }).click();
  await expect(page.locator(".modal-check")).toContainText("Fails");
  await visit("ordinary model check");
  await page.getByRole("textbox", { name: "Atoms world 0 forces" }).fill("b");
  await page.getByRole("textbox", { name: "Atoms world 0 forces" }).press("Tab");
  await page.getByRole("button", { name: "Check the model" }).click();
  await expect(page.locator(".modal-check")).toContainText("No model of intuitionistic logic");
  await visit("ordinary model refused");
  await page.getByRole("tab", { name: /^Sequent calculus/ }).click();
}

/**
 * A classical proof's other views: its truth table with the countermodel, its tableau with an
 * open branch, a tableau by hand, and a table past the bound on atoms with the way to draw it.
 */
export async function methods(page: Page, visit: Visit) {
  await goto(page);
  await calculus(page, ["Ordinary", "Classical"]);
  await page.getByRole("textbox", { name: "Sequent" }).fill("a -> b |- b -> a");
  await page.getByRole("textbox", { name: "Sequent" }).press("Enter");
  await addView(page, "Truth table");
  await expect(page.getByRole("img", { name: /^A countermodel of/ })).toBeVisible();
  await visit("truth table");
  await addView(page, "Tableau");
  await expect(page.locator(".tb-end").first()).toBeVisible();
  await visit("tableau");
  await page
    .getByRole("group", { name: "Tableau" })
    .getByRole("button", { name: "By hand" })
    .click();
  const hand = page.getByRole("region", { name: "Your tableau" });
  await expect(hand.getByRole("status")).toContainText("Unfinished");
  await visit("tableau by hand");
  await hand.getByRole("button", { name: /^2 [TF] / }).click();
  await hand.getByRole("button", { name: /^1 [TF] / }).click();
  await expect(hand.locator(".tb-branch").first()).toBeVisible();
  await visit("tableau by hand, a split");
  await newTab(page);
  await page.getByRole("textbox", { name: "Sequent" }).fill("a, b, c, d, e, f, g, h, i, j, k |- a");
  await page.getByRole("textbox", { name: "Sequent" }).press("Enter");
  await addView(page, "Truth table");
  await expect(page.getByRole("button", { name: "Draw all 2048 rows" })).toBeVisible();
  await visit("table refused");
  await page.getByRole("tab", { name: /^Sequent calculus/ }).click();
}

/**
 * A classical proof's translations and interpolants: a translation whose verdicts agree, one
 * that is not valid with its countermodel, and an interpolant before and after a formula is moved
 * to the other part.
 */
export async function transforms(page: Page, visit: Visit) {
  await goto(page);
  await calculus(page, ["Ordinary", "Classical"]);
  await page.getByRole("textbox", { name: "Sequent" }).fill("p /\\ (p -> q), s |- q \\/ t");
  await page.getByRole("textbox", { name: "Sequent" }).press("Enter");
  await addView(page, "Glivenko");
  const translation = page.getByRole("region", { name: "Glivenko's translation" });
  await expect(translation.getByRole("status")).toContainText("Both valid");
  await visit("translation");
  await addView(page, "Interpolant");
  const interpolant = page.getByRole("region", { name: "Interpolant" });
  await expect(interpolant.getByRole("status")).toContainText("Interpolant");
  await visit("interpolant");
  await interpolant.getByRole("button", { name: "Part 1 s" }).click();
  await expect(interpolant.getByRole("button", { name: "Part 2 s" })).toBeVisible();
  await expect(interpolant.getByRole("status")).toContainText("Interpolant");
  await visit("interpolant, a formula moved");
  await addView(page, "Linear logic");
  await expect(
    page.getByRole("region", { name: "Into linear logic" }).locator(".strip"),
  ).toBeVisible();
  await visit("embedding");
  await newTab(page);
  await page.getByRole("textbox", { name: "Sequent" }).fill("a \\/ b |- a");
  await page.getByRole("textbox", { name: "Sequent" }).press("Enter");
  await addView(page, "Kuroda");
  await expect(page.getByRole("img", { name: /^A countermodel of/ })).toBeVisible();
  await visit("translation, not valid");
}

/**
 * A classical proof's normal form stepped through, and its clauses refuted: by search with the
 * graph, by DPLL with its steps, and by hand to □.
 */
export async function clausal(page: Page, visit: Visit) {
  await goto(page);
  await calculus(page, ["Ordinary", "Classical"]);
  await page.getByRole("textbox", { name: "Sequent" }).fill("a -> b, b -> c |- a -> c");
  await page.getByRole("textbox", { name: "Sequent" }).press("Enter");
  await addView(page, "Normal form");
  const normal = page.getByRole("region", { name: "Normal form" });
  await expect(normal.getByRole("status")).toContainText("Equivalent");
  await visit("normal form");
  await press(page, "Undo");
  await visit("normal form, a step back");
  const forms = page.getByRole("group", { name: "Normal form" });
  await forms.getByRole("button", { name: "Tseitin" }).click();
  await expect(normal.getByRole("status")).toContainText("Same verdict");
  await visit("normal form, Tseitin's clauses");
  await addView(page, "Resolution");
  const resolution = page.getByRole("region", { name: "Resolution" });
  await expect(resolution.getByRole("status")).toContainText("Valid");
  await resolution.locator(".cl-graph").getByRole("button").first().click();
  await visit("resolution, a clause chosen");
  const ways = page.getByRole("group", { name: "Resolution" });
  await ways.getByRole("button", { name: "DPLL", exact: true }).click();
  await expect(resolution.getByText("DPLL's steps")).toBeVisible();
  await visit("resolution, DPLL");
  await ways.getByRole("button", { name: "By hand" }).click();
  const list = resolution.locator(".cl-list");
  const clause = (n: number) => list.getByRole("button", { name: new RegExp(`^Clause ${n}\\.`) });
  // The clauses are ¬a ∨ b, ¬b ∨ c, a and ¬c; each resolvent stays chosen after its step.
  await clause(1).click();
  await clause(3).click();
  await resolution.getByRole("button", { name: "Resolve on a" }).click();
  await visit("by hand, a step");
  await clause(2).click();
  await resolution.getByRole("button", { name: "Resolve on b" }).click();
  await clause(4).click();
  await resolution.getByRole("button", { name: "Resolve on c" }).click();
  await expect(resolution.getByRole("status")).toContainText("You derived □");
  await visit("by hand, □ derived");
}

/**
 * A translation proved as a sequent of its own, a chip at the top; a copy of a proof, a cell of its
 * rail; the graph of views; a view out of date; a sequent's chip closed with its Undo.
 */
export async function linking(page: Page, visit: Visit) {
  await goto(page);
  await calculus(page, ["Ordinary", "Classical"]);
  await page.getByRole("textbox", { name: "Sequent" }).fill("|- a \\/ ~a");
  await page.getByRole("textbox", { name: "Sequent" }).press("Enter");
  await addView(page, "Glivenko");
  const translation = page.getByRole("region", { name: "Glivenko's translation" });
  await expect(translation.getByRole("status")).toContainText("Both valid");
  await translation.getByRole("button", { name: "Prove it in LJ" }).click();
  await expect(page.locator(".chip")).toHaveCount(2);
  await visit("translation proved");
  await addView(page, "A copy of this proof");
  await expect(page.locator(".chip")).toHaveCount(2);
  await expect(page.getByRole("tab", { name: /, a copy/ })).toBeVisible();
  await visit("copy");
  await page.locator(".chip").first().click();
  await page.keyboard.press("g");
  await expect(page.getByRole("region", { name: "How the views hang together" })).toBeVisible();
  await visit("graph of views");
  await page.getByRole("textbox", { name: "Sequent" }).fill("|- a \\/ ~a \\/ b");
  await page.getByRole("textbox", { name: "Sequent" }).press("Enter");
  await page.getByRole("tab", { name: /^Glivenko's translation/ }).click();
  await expect(page.getByRole("status").filter({ hasText: "Out of date." })).toBeVisible();
  await visit("a view out of date");
  await page.keyboard.press("w");
  await expect(page.getByRole("status").getByRole("button", { name: "Undo" })).toBeVisible();
  await visit("a sequent closed");
}

/** Opens the page on a new sequent of classical ordinary logic and starts `sequent` there. */
async function classical(page: Page, sequent: string, fresh = true) {
  // A second sequent opens beside the first: a fresh visit would race the restore of the first.
  if (fresh) await goto(page);
  else await newTab(page);
  await calculus(page, ["Ordinary", "Classical"]);
  await page.getByRole("textbox", { name: "Sequent" }).fill(sequent);
  await page.getByRole("textbox", { name: "Sequent" }).press("Enter");
  await expect(page.locator(".stage .fb").first()).toBeVisible();
}

/** The witness's box in the rule popover with a term typed, and its refusal; linear, then LK. */
export async function witnessing(page: Page, visit: Visit) {
  await start(page, "|- exists x. p(x), ~p(c)");
  await page.getByRole("button", { name: /^∃x\. p\(x\), formula/ }).click();
  const rules = page.getByRole("dialog", { name: "Rules" });
  await rules.getByRole("button", { name: /^∃/ }).click();
  const box = rules.locator("form.witness");
  await box.getByRole("textbox").fill("g(c)");
  await visit("witness");
  await box.getByRole("textbox").press("Enter");
  await expect(box.getByRole("alert")).toBeVisible();
  await visit("witness refused");
  await classical(page, "p(c) |- exists x. p(x)", false);
  await page.getByRole("button", { name: /^∃x\. p\(x\), formula/ }).click();
  await rules.getByRole("button", { name: /^∃R/ }).click();
  await box.getByRole("textbox").fill("d");
  await box.getByRole("textbox").press("Enter");
  await expect(box.getByRole("alert")).toBeVisible();
  await visit("witness refused in LK");
}

/**
 * The countermodel view of a first-order sequent: deduxit's structure, which refutes it; a dot
 * pressed, so that it no longer does; an element added; and a model of one's own from one element.
 */
export async function countermodeling(page: Page, visit: Visit) {
  await classical(page, "exists x. p(x) |- forall x. p(x)");
  await page.locator(".gt").first().click();
  await page
    .getByRole("dialog", { name: "This goal" })
    .getByRole("button", { name: "Close goal" })
    .click();
  await page.getByRole("button", { name: "See the countermodel" }).click();
  const view = page.getByRole("region", { name: "Countermodel" });
  await expect(view.getByRole("img", { name: "This structure refutes the sequent" })).toBeVisible();
  await visit("countermodel");
  await view.getByRole("button", { name: /^p (holds|does not hold) of 0$/ }).click();
  await expect(view.getByRole("status")).toBeVisible();
  await visit("countermodel changed");
  await view.getByRole("button", { name: "Add an element" }).click();
  await visit("countermodel with an element added");
  await classical(page, "forall x. (p(x) -> q(f(x))), p(a) |- q(f(a))", false);
  await addView(page, "A model of your own");
  await expect(page.getByRole("region", { name: "Countermodel" })).toBeVisible();
  await visit("a structure of one's own");
}

/** The cut chooser with a formula typed, and the elimination's panel stepping and at its end. */
export async function cutting(page: Page, visit: Visit) {
  await start(page, "A, A -o B |- B");
  await press(page, "Cut");
  await page.getByRole("dialog", { name: "Cut" }).getByRole("textbox").fill("A -o B");
  const premises = page.getByRole("group", { name: /^Cut/ });
  await premises.getByRole("button", { name: "A ⊗ B⊥", exact: true }).click();
  await visit("cut");
  await premises.getByRole("button", { name: "Apply the cut" }).click();
  await press(page, "Close all");
  // "Eliminate cuts" comes once the proof is finished.
  await expect(page.getByRole("status").filter({ hasText: "Proved." })).toBeVisible();
  await press(page, "Eliminate cuts");
  const panel = page.getByRole("region", { name: "Cut elimination" });
  await expect(panel.getByRole("status")).toHaveText("1 cut left");
  await visit("elimination");
  await press(page, "To the end");
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
    await expect(page.getByRole("group", { name: /^Split for ⊗/ })).toBeVisible();
    await visit(`${font}, split`);
  }
}

/** Takes the step of a goal in a view of steps (natural deduction) whose button starts with `words`. */
export async function customStep(page: Page, words: string) {
  const escaped = words.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  await page
    .getByRole("list", { name: "Steps that apply" })
    .getByRole("button", { name: new RegExp(`^${escaped}`) })
    .first()
    .click();
}

/**
 * Lambda-terms: the new tab view with its toggle, a term checked with its typing derivation, a
 * type's term found and its terms listed, and an ill-typed term.
 */
export async function lambdaing(page: Page, visit: Visit) {
  await goto(page);
  await calculus(page, ["Lambda-terms"]);
  await expect(
    (await switches(page)).getByRole("button", { name: "Unrestricted" }),
  ).toHaveAttribute("aria-pressed", "true");
  await visit("lambda entry");
  await page.getByRole("textbox", { name: "Sequent" }).fill(String.raw`\f:a -> b. \x:a. f x`);
  await page.getByRole("textbox", { name: "Sequent" }).press("Enter");
  await expect(page.locator(".lambda .kw.ok", { hasText: "Well typed" })).toBeVisible();
  await expect(page.locator(".lambda .custom-drawing svg")).toBeVisible();
  await visit("lambda term checked");
  await press(page, "Export", visit);
  await expect(page.getByRole("dialog", { name: "Export" }).locator("pre")).toContainText("\\");
  await visit("Export, a term's typing");
  await page.keyboard.press("Escape");
  await newTab(page);
  await page.getByRole("textbox", { name: "Sequent" }).fill("a -> a -> a");
  await page.getByRole("textbox", { name: "Sequent" }).press("Enter");
  await expect(page.locator(".lambda .kw.ok", { hasText: "Has a term" })).toBeVisible();
  await press(page, "List its terms");
  await expect(page.locator(".lambda-terms li")).toHaveCount(2);
  await visit("lambda terms listed");
  await newTab(page);
  await page.getByRole("textbox", { name: "Sequent" }).fill(String.raw`\x:a. x x`);
  await page.getByRole("textbox", { name: "Sequent" }).press("Enter");
  await expect(page.locator(".lambda .kw.bad", { hasText: "Not well typed" })).toBeVisible();
  await visit("lambda ill typed");
}

/**
 * Modal logic: the new tab view with its system, a countermodel in K, the model checked where it
 * fails and where it holds, a valid sequent's derivation in S4, a model that is none of S4, a
 * copy, and a parse error.
 */
export async function modalising(page: Page, visit: Visit) {
  await goto(page);
  await calculus(page, ["Modal logic"]);
  await expect((await switches(page)).getByRole("button", { name: "K system" })).toBeVisible();
  await visit("modal entry");
  await page.getByRole("textbox", { name: "Sequent" }).fill("[]p -> [][]p");
  await page.getByRole("textbox", { name: "Sequent" }).press("Enter");
  await expect(page.locator(".modal .kw.bad", { hasText: "Not valid" })).toBeVisible();
  await expect(page.locator(".modal .countermodel-drawing svg")).toBeVisible();
  await visit("modal countermodel");
  await page.getByRole("button", { name: "Change this model and check it" }).click();
  await page.getByRole("button", { name: "Check the model" }).click();
  await expect(page.locator(".modal-check")).toContainText("□□p is false: world 1 shows it");
  await visit("modal check");
  await page.getByRole("combobox", { name: "The world to check the sequent at" }).selectOption("2");
  await page.getByRole("button", { name: "Check the model" }).click();
  await expect(page.locator(".modal-check")).toContainText("Holds");
  await visit("modal holds");
  await system(page, "S4");
  await expect(page.locator(".modal .kw.ok", { hasText: "Valid" })).toBeVisible();
  await expect(page.locator(".modal .custom-drawing svg")).toBeVisible();
  await visit("modal valid");
  await press(page, "Export", visit);
  await expect(page.getByRole("dialog", { name: "Export" }).locator("pre")).toContainText("\\");
  await visit("Export, a modal derivation");
  await page.keyboard.press("Escape");
  await page.getByText("Check a model").click();
  await page.getByRole("button", { name: "Start from one world" }).click();
  await page.getByRole("button", { name: "Check the model" }).click();
  await expect(page.locator(".modal-check")).toContainText("does not see itself");
  await expect(page.locator(".kripke-arrow.missing")).toHaveCount(1);
  await visit("modal frame");
  await page.getByRole("button", { name: "Add a world" }).click();
  await expect(page.locator(".kripke-form legend")).toHaveText("World 1");
  await visit("modal editor, a world added");
  await addView(page, "A copy of this proof");
  await expect(page.getByRole("tab", { name: /, a copy/ })).toBeVisible();
  await visit("modal copy");
  await newTab(page);
  await page.getByRole("textbox", { name: "Sequent" }).fill("[]p ->");
  await page.getByRole("textbox", { name: "Sequent" }).press("Enter");
  await expect(page.getByRole("alert")).toBeVisible();
  await visit("modal parse error");
}

/** Starts `sequent` in the view's calculus, set to natural deduction, and waits for its goal. */
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
 * Natural deduction, a method of ordinary logic: its toggle, a proof begun backwards, a line
 * derived forwards, a refused citation, both drawings, and the verdict.
 */
export async function deducing(page: Page, visit: Visit) {
  await goto(page);
  await calculus(page, ["Ordinary", "Intuitionistic", "Natural deduction"]);
  await visit("natural calculus");
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
  await press(page, "Export", visit);
  await expect(page.getByRole("dialog", { name: "Export" }).locator("pre")).toContainText("nd");
  await visit("Export, natural deduction's Fitch lines");
  await page.keyboard.press("Escape");
}

/**
 * Course packs: the Export panel's form, a pack's page as a student meets it, one of its
 * problems open, a hand-in of the page before opened as its pack, and a pack embedded in a
 * course's page.
 */
export async function packing(page: Page, visit: Visit) {
  await start(page, "A * B |- B * A");
  await press(page, "Export");
  const panel = page.getByRole("dialog", { name: "Export" });
  await panel.getByRole("button", { name: "Course pack", exact: true }).click();
  await panel.getByRole("textbox", { name: "Title" }).fill("Week 3");
  await visit("course pack's form");
  const handout = (await page.locator(".pk-handout p").textContent()) ?? "";
  const link = handout.match(/https?:\S+#v=4&k=\S+/)?.[0] ?? "";
  await page.goto(link);
  const pagePack = page.getByRole("region", { name: "Week 3" });
  await expect(pagePack).toBeVisible();
  await visit("pack's page");
  await pagePack.getByRole("button", { name: /^Problem 1:/ }).click();
  await expect(page.locator(".calc-fixed")).toContainText("problem 1 of the pack");
  await visit("pack's problem, its calculus fixed");
  // Only the fragment changes: a reload opens the link as a course's page would.
  await page.goto(`${link}&e=1`);
  await page.reload();
  await expect(page.getByRole("link", { name: "Open in deduxit" })).toBeVisible();
  await visit("pack embedded");
}
