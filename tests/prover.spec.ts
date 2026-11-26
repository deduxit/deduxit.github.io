// deduxit © Fabian Lukas Grubmüller 2026
// Licensed under the EUPL

// One test per interaction of the island, against the built site with
// deduxit's real module in its worker.

import { readFile } from "node:fs/promises";
import { expect, test } from "./fixtures";
import {
  calculus,
  closeGoal,
  exportEntry,
  goalMenu,
  goto,
  newTab,
  proveCommuted,
  rule,
  saveExport,
  start,
  switches,
  tool,
  viewCell,
} from "./prover";

test("the sequent field starts a proof, and marks where a sequent does not parse", async ({
  page,
}) => {
  await goto(page);
  await expect(page.getByRole("textbox", { name: "Sequent" })).toBeFocused();
  await page.getByRole("textbox", { name: "Sequent" }).fill("A * * B");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("alert")).toContainText("Unexpected * at column 5");
  await expect(page.locator(".caret .at")).toHaveText("*");
  await page.getByRole("textbox", { name: "Sequent" }).fill("A * B |- B * A");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("button", { name: /^A⊥ ⅋ B⊥, formula 1 of goal 1/ })).toBeVisible();
});

test("a formula's popover holds one button per rule, a rule that does not apply greyed with its reason", async ({
  page,
}) => {
  await start(page, "A * B |- B * A");
  await page.getByRole("button", { name: /^B ⊗ A, formula 2/ }).click();
  const rules = page.getByRole("dialog", { name: "Rules" });
  await expect(rules.locator("button.rule")).toHaveText(["⊗"]);
  // The rule's card draws it, premises over conclusion, while the focus is on it.
  await expect(page.locator(".rule-card")).toContainText("⊢ Γ, Δ, A ⊗ B");
  await page.keyboard.press("Escape");
  await start(page, "|- A, B", false);
  await page.getByRole("button", { name: /^A, formula 1/ }).click();
  const ax = rules.getByRole("button", { name: "ax, does not apply" });
  await expect(ax).toHaveAttribute("aria-disabled", "true");
  await ax.hover();
  await expect(page.locator(".rule-card")).toContainText("ax refused: no dual partner");
  // A press, which a touch has instead of a hover, keeps the reason shown and takes no step.
  // A greyed rule is aria-disabled, which Playwright will not press unforced; a visitor can.
  await ax.click({ force: true });
  await page.mouse.move(0, 0);
  await expect(page.locator('.rule-card[role="note"]')).toContainText("no dual partner");
  await expect(page.getByRole("button", { name: /^A, formula 1 of goal 1/ })).toBeVisible();
});

test("the digits pick a rule in the popover and the arrows move along it", async ({ page }) => {
  await start(page, "|- (A * B) + C");
  await page.getByRole("button", { name: /^\(A ⊗ B\) ⊕ C, formula 1/ }).click();
  const rules = page.getByRole("dialog", { name: "Rules" }).locator("button.rule");
  await expect(rules).toHaveCount(2);
  await expect(rules.first()).toBeFocused();
  await page.keyboard.press("ArrowRight");
  await expect(rules.nth(1)).toBeFocused();
  await page.keyboard.press("2");
  await expect(page.getByRole("button", { name: /^C, formula 1 of goal 2/ })).toBeVisible();
});

test("a split shows its two premises over the goal; a chip pressed moves, and the arrow applies it", async ({
  page,
}) => {
  await start(page, "A * B |- B * A");
  await rule(page, /^A⊥ ⅋ B⊥/, "⅋");
  await rule(page, /^B ⊗ A/, "⊗");
  const split = page.getByRole("group", { name: /^Split for ⊗/ });
  const premises = split.locator(".prem");
  await expect(premises.nth(0)).toHaveText(/⊢\s*B$/);
  await expect(premises.nth(1)).toContainText("A⊥");
  await split.getByRole("button", { name: "B⊥", exact: true }).click();
  await expect(premises.nth(0).getByRole("button", { name: "B⊥" })).toBeVisible();
  // Nothing says whether a split can be closed: every split is a legal step.
  await expect(split.getByRole("button", { name: "Apply ⊗" })).toBeEnabled();
  await split.getByRole("button", { name: "Apply ⊗" }).click();
  await expect(split).toBeHidden();
  await tool(page, "Steps").click();
  await expect(page.getByRole("dialog", { name: "Steps" })).toContainText("⊗ on B ⊗ A");
});

test("undo takes back the last step on the active branch only, and redo puts it back", async ({
  page,
}) => {
  await start(page, "|- (~A | A) & (~B | B)");
  await rule(page, /^\(A⊥ ⅋ A\) & \(B⊥ ⅋ B\)/, "&");
  // The right premise first, then the left: the session's last step is on the left branch.
  await rule(page, /^B⊥ ⅋ B, formula 1 of goal 3/, "⅋");
  await page.getByRole("button", { name: /^A⊥ ⅋ A, formula 1 of goal 2/ }).click();
  await page.getByRole("dialog", { name: "Rules" }).getByRole("button", { name: /⅋/ }).click();
  await expect(page.getByRole("button", { name: /^A⊥, formula 1 of goal 5/ })).toBeVisible();
  // Back to the right branch's goal and undo there: the left branch's later step stays.
  await page.getByRole("button", { name: /^B⊥, formula 1 of goal 4/ }).click();
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(page.getByRole("button", { name: /^B⊥ ⅋ B, formula 1/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /^A⊥, formula 1/ })).toBeVisible();
  await page.getByRole("button", { name: "Redo", exact: true }).click();
  await expect(page.getByRole("button", { name: /^B⊥, formula 1/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /^B⊥ ⅋ B, formula 1/ })).toHaveCount(0);
});

test("a goal's close grafts the search's proof, and close all closes the rest", async ({
  page,
}) => {
  await start(page, "A * B |- B * A");
  await closeGoal(page);
  await expect(
    page.getByRole("status").filter({ hasText: "Proved. Every goal is closed." }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await rule(page, /^A⊥ ⅋ B⊥/, "⅋");
  await page.getByRole("button", { name: "Close all" }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Proved. Every goal is closed." }),
  ).toBeVisible();
  await expect(page.locator(".drawing g.search").first()).toBeAttached();
});

test("an unprovable goal's close says why, checked; a search that gives up offers to search longer", async ({
  page,
}) => {
  await start(page, "A * B |- A");
  await closeGoal(page);
  const note = page.locator(".goal-note");
  await expect(note.locator(".kw.bad")).toHaveText("Unprovable, checked: atom balance.");
  await expect(note).toContainText("do not pair off");
  // The sequent itself has no proof: there is no step to go back over.
  await expect((await goalMenu(page)).getByRole("button", { name: "Go back" })).toHaveCount(0);
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.getByRole("textbox", { name: "Budget, in units of work" }).fill("1");
  await page.getByRole("textbox", { name: "Budget, in units of work" }).press("Enter");
  // Settings is a page: its own button leaves it.
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await start(page, "!A |- A * A", false);
  await closeGoal(page);
  await expect(note.locator(".kw.warn")).toHaveText("Unknown: gave up.");
  await note.getByRole("button", { name: "Search longer (2)" }).click();
  await expect(note.locator(".kw.warn")).toHaveText("Unknown: gave up.");
  await expect(note.getByRole("button", { name: "Search longer (4)" })).toBeVisible();
  // The caret opens that one search's settings, its budget the doubled one.
  await note.getByRole("button", { name: "This search's settings" }).click();
  const panel = page.getByRole("dialog", { name: "The search's settings" });
  await expect(panel.getByRole("textbox", { name: "Budget, in units of work" })).toHaveValue("4");
});

test("a goal with no proof is marked, and its ⊢ goes back to where every goal had one", async ({
  page,
}) => {
  await start(page, "A * B |- B * A");
  await rule(page, /^A⊥ ⅋ B⊥/, "⅋");
  await rule(page, /^B ⊗ A/, "⊗");
  // A⊥ goes to the first premise with B: neither premise has a proof any more.
  await page
    .getByRole("group", { name: /^Split for ⊗/ })
    .getByRole("button", { name: "A⊥" })
    .click();
  await page.getByRole("button", { name: "Apply ⊗" }).click();
  await expect(page.locator(".goal-line[data-dead]")).toHaveCount(2);
  await expect(page.locator(".goal-cross")).toHaveCount(2);
  await expect(page.locator(".gt").first()).toHaveAccessibleName(/no proof/);
  await (await goalMenu(page)).getByRole("button", { name: "Go back" }).click();
  // The split is undone: its goal is open again, and the search found it a proof.
  await expect(page.getByRole("button", { name: /^B ⊗ A, formula 3 of goal 2/ })).toBeVisible();
  const note = page.locator(".goal-note");
  await expect(note.locator(".kw.ok")).toHaveText("Back at a goal with a proof.");
  await expect(page.locator(".goal-line[data-dead]")).toHaveCount(0);
  // Redo takes the split again.
  await page.getByRole("button", { name: "Redo", exact: true }).click();
  await expect(page.getByRole("button", { name: /^B ⊗ A/ })).toHaveCount(0);
  // The marking is a setting, on at first: off, no goal is marked.
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.getByRole("checkbox", { name: "Mark goals that have no proof" }).uncheck();
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await expect(page.locator(".goal-line[data-dead]")).toHaveCount(0);
  // A sequent with no proof is marked at the top, and its goals' ⊢ offers no way back.
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.getByRole("checkbox", { name: "Mark goals that have no proof" }).check();
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await start(page, "A * B |- A", false);
  await expect(page.getByRole("tab", { name: /^A ⊗ B ⊢ A/ })).toHaveAccessibleName(/refuted/);
  await rule(page, /^A⊥ ⅋ B⊥/, "⅋");
  await expect(page.locator(".goal-line[data-dead]")).toHaveCount(1);
  await expect((await goalMenu(page)).getByRole("button", { name: "Go back" })).toHaveCount(0);
});

test("the hint points at the next press from where the visitor is, and takes no step", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Guide", exact: true }).click();
  await start(page, "A * B |- B * A", false);
  const hint = tool(page, "Hint");
  const line = page.locator(".hint-line");
  await hint.click();
  await expect(line).toHaveText("Hint. Focused search Press A⊥ ⅋ B⊥ and take ⅋.");
  await expect(page.locator(".fb[data-hinted]")).toHaveAccessibleName(/^A⊥ ⅋ B⊥/);
  await page.getByRole("button", { name: /^A⊥ ⅋ B⊥/ }).click();
  await expect(line).toHaveText("Hint. Focused search Take ⅋.");
  await expect(page.locator("button.rule[data-hinted]")).toHaveText("⅋");
  await page.locator("button.rule[data-hinted]").click();
  await hint.click();
  await expect(line).toHaveText("Hint. Focused search Press B ⊗ A and take ⊗.");
  await rule(page, /^B ⊗ A/, "⊗");
  await expect(line).toContainText("to the other premise");
  const split = page.getByRole("group", { name: /^Split for ⊗/ });
  await split.locator(".chip-f[data-hinted]").click();
  await expect(line).toHaveText(
    "Hint. Focused search This split works. Press the arrow to apply it.",
  );
  await expect(split.locator(".apply-step[data-hinted]")).toBeVisible();
  // The hint applied nothing: the split is still the visitor's to make.
  await expect(page.getByRole("button", { name: /^B ⊗ A, formula 3/ })).toBeVisible();
});

test("the finished MLL and MELL proofs' nets are drawn, and + view says why a net is not there", async ({
  page,
}) => {
  /** The "+ view" entry of the net: whether it is faint, and the reason under it. */
  const netEntry = async () => {
    await page.getByRole("button", { name: "Add a view" }).click();
    const list = page.getByRole("dialog", { name: "Add a view" });
    const entry = list.getByRole("button", { name: "Proof net" });
    const faint = (await entry.getAttribute("aria-disabled")) === "true";
    const why = faint ? await entry.locator("xpath=..").locator(".entry-why").textContent() : "";
    await page.keyboard.press("Escape");
    return { faint, why: why ?? "" };
  };
  await start(page, "A & B |- A");
  expect(await netEntry()).toEqual({ faint: true, why: expect.stringContaining("exist for") });
  await start(page, "!A |- A", false);
  await closeGoal(page);
  await page.getByRole("tab", { name: "Proof net" }).click();
  await expect(page.locator(".drawing svg desc")).toContainText("proof net");
  await page.getByRole("tab", { name: /^Classical linear logic/ }).click();
  await start(page, "A * B |- B * A", false);
  expect(await netEntry()).toEqual({
    faint: true,
    why: "Finish the proof first: its net is drawn from it.",
  });
  await expect(page.getByRole("tab", { name: "Proof net" })).toHaveCount(0);
  await closeGoal(page);
  await page.getByRole("tab", { name: "Proof net" }).click();
  await expect(page.getByRole("tab", { name: "Proof net" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await expect(page.locator(".drawing svg desc")).toContainText("proof net");
});

test("every export downloads, its settings passed on, and both links are copied", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await proveCommuted(page);
  const contents: Record<string, Buffer> = {};
  const save = async (label: string, name: RegExp, key = label) => {
    const file = await saveExport(page, label);
    expect(file.suggestedFilename()).toMatch(name);
    const bytes = await readFile(await file.path());
    expect(bytes.length).toBeGreaterThan(20);
    contents[key] = bytes;
  };
  for (const [label, name] of [
    ["SVG", /\.svg$/],
    ["PNG", /\.png$/],
    ["PDF", /\.pdf$/],
    ["LaTeX", /\.tex$/],
    ["Typst", /\.typ$/],
    ["Text", /\.txt$/],
    ["Session", /\.json$/],
    ["Rocq", /\.v$/],
  ] as const)
    await save(label, name);
  const text = (key: string) => contents[key]?.toString("utf8") ?? "";
  expect(text("SVG")).toContain("<svg");
  expect(contents["PNG"]?.subarray(1, 4).toString("latin1")).toBe("PNG");
  expect(contents["PDF"]?.subarray(0, 5).toString("latin1")).toBe("%PDF-");
  // LaTeX and Typst are fragments until "Whole document" is on; Rocq has its import.
  expect(text("LaTeX")).toContain("\\begin{prooftree}");
  expect(text("LaTeX")).not.toContain("\\documentclass");
  expect(text("Typst")).toContain("prooftree(");
  expect(text("Typst")).not.toContain("#set page");
  expect(text("Text")).toContain("⊢ ~A ⅋ ~B, B ⊗ A");
  expect(JSON.parse(text("Session")).history.length).toBe(1);
  expect(text("Rocq")).toMatch(
    /^From NanoYalla Require Import macroll\.[\s\S]*Lemma certificate[\s\S]*Qed\./,
  );
  // A text format shows what it writes before it is saved.
  const panel = await exportEntry(page, "LaTeX");
  await expect(panel.locator("pre")).toContainText("\\begin{prooftree}");
  // Each setting is deduxit's style option: a whole document, the rule names, the line, the lemma.
  await panel.getByRole("checkbox", { name: "Whole document" }).check();
  await expect(panel.locator("pre")).toContainText("\\documentclass");
  await save("LaTeX", /\.tex$/, "whole LaTeX");
  await save("Typst", /\.typ$/, "whole Typst");
  expect(text("whole LaTeX")).toMatch(
    /^\\documentclass[\s\S]*\\usepackage\{ebproof\}[\s\S]*\\begin\{prooftree\}[\s\S]*\\end\{document\}$/,
  );
  expect(text("whole Typst")).toMatch(/^#import "@preview\/curryst[\s\S]*#set page\(/);
  await exportEntry(page, "Text");
  await panel.getByRole("group", { name: "Rule line" }).getByRole("button", { name: "=" }).click();
  await panel
    .getByRole("group", { name: "Rule names" })
    .getByRole("button", { name: "Off" })
    .click();
  await expect(panel.locator("pre")).toContainText("=====");
  await expect(panel.locator("pre")).not.toContainText(" ax");
  await exportEntry(page, "Rocq");
  await panel.getByRole("textbox", { name: "Lemma's name" }).fill("commuted");
  await expect(panel.locator("pre")).toContainText("Lemma commuted");
  await panel.getByRole("textbox", { name: "Lemma's name" }).fill("2x");
  await expect(panel).toContainText("Not a name");
  // A keyword of Rocq is no name either: deduxit would refuse every format's settings.
  await panel.getByRole("textbox", { name: "Lemma's name" }).fill("Lemma");
  await expect(panel).toContainText("Not a name");
  await panel.getByRole("textbox", { name: "Lemma's name" }).fill("2x");
  await expect(panel.getByRole("button", { name: "Save" })).toBeDisabled();
  await exportEntry(page, "PNG");
  await panel.getByRole("group", { name: "Scale" }).getByRole("button", { name: "1×" }).click();
  await save("PNG", /\.png$/, "small PNG");
  // Half the default scale: a quarter of the pixels, a smaller file.
  expect(contents["small PNG"]?.length ?? 0).toBeLessThan(contents["PNG"]?.length ?? 0);
  // The links: the proof as it stands, and the sequent alone; each shown, then copied.
  await exportEntry(page, "This proof");
  await expect(panel.locator(".ex-link")).toContainText("#v=2&u=linear");
  await panel.getByRole("button", { name: "Copy" }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Link to this proof copied." }),
  ).toBeVisible();
  const whole = await page.evaluate(() => navigator.clipboard.readText());
  expect(whole).toContain("#v=2&u=linear");
  expect(whole).toContain("&d=");
  await exportEntry(page, "The sequent");
  await panel.getByRole("button", { name: "Copy" }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Link to the sequent copied." }),
  ).toBeVisible();
  const bare = await page.evaluate(() => navigator.clipboard.readText());
  expect(bare).toContain("#v=2&u=linear");
  expect(bare).not.toContain("&d=");
});

test("Settings sets the formulas' font: the drawing laid out in it, every formula in it, the font fetched when chosen, the exports following it until they choose their own", async ({
  page,
}) => {
  const fetched: string[] = [];
  page.on("request", (request) => fetched.push(new URL(request.url()).pathname));
  await proveCommuted(page);
  const drawn = () =>
    page
      .locator(".drawing svg text")
      .evaluateAll((all) => all.map((t) => t.getAttribute("textLength")));
  const euler = await drawn();
  expect(fetched.some((path) => path.startsWith("/fonts/STIXTwoMath-"))).toBe(false);
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.getByRole("button", { name: "STIX Two", exact: true }).click();
  // Settings is a page: its own button leaves it.
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await expect(page.locator(".drawing svg")).toHaveAttribute("font-family", /'STIX Two Math'/);
  expect(await drawn()).not.toEqual(euler);
  expect(fetched.some((path) => path.startsWith("/fonts/STIXTwoMath-"))).toBe(true);
  await expect
    .poll(() => page.evaluate(() => document.fonts.check("30px 'STIX Two Math'")))
    .toBe(true);
  // The tab's sequent and every formula of the page follow.
  const family = await page
    .locator(".chip .chip-text")
    .evaluate((element) => getComputedStyle(element).fontFamily);
  expect(family).toContain("STIX Two Math");
  // The exports follow the stage until they choose their own, which is kept apart.
  const panel = await exportEntry(page, "SVG");
  await expect(panel.getByRole("combobox", { name: "Font" })).toHaveValue("stix-two");
  await panel.getByRole("combobox", { name: "Font" }).selectOption("euler");
  await page.keyboard.press("Escape");
  await expect(page.locator(".drawing svg")).toHaveAttribute("font-family", /'STIX Two Math'/);
  const stored = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("deduxit-settings") ?? "{}"),
  );
  expect([stored.stageFont, stored.font]).toEqual(["stix-two", "euler"]);
  await start(page, "A |- A");
  await expect(page.locator(".drawing svg")).toHaveAttribute("font-family", /'STIX Two Math'/);
});

test("the Export panel chooses the font of the SVG, PNG and PDF, kept for the next visit, and the page's drawing stays in Euler Math", async ({
  page,
}) => {
  await proveCommuted(page);
  const exported = async (label: string) => readFile(await (await saveExport(page, label)).path());
  const euler = {
    svg: await exported("SVG"),
    png: await exported("PNG"),
    pdf: await exported("PDF"),
  };
  expect(euler.svg.toString("utf8")).toContain("font-family=\"'Euler Math', 'Neo Euler', serif\"");
  expect(euler.pdf.toString("latin1")).toContain("Euler-Math");
  const font = (await exportEntry(page, "SVG")).getByRole("combobox", { name: "Font" });
  await expect(font).toHaveValue("euler");
  await font.selectOption("stix-two");
  await expect(font).toHaveValue("stix-two");
  const svg = (await exported("SVG")).toString("utf8");
  expect(svg).toContain("font-family=\"'STIX Two Math', serif\"");
  // Laid out in STIX Two Math's advances, not Euler Math's.
  expect(svg.match(/textLength="\d+"/g)).not.toEqual(
    euler.svg.toString("utf8").match(/textLength="\d+"/g),
  );
  expect((await exported("PNG")).equals(euler.png)).toBe(false);
  expect((await exported("PDF")).toString("latin1")).toContain("STIXTwoMath-Regular");
  // The page draws in Euler Math whatever the exports are set in.
  await expect(page.locator(".drawing svg")).toHaveAttribute("font-family", /'Euler Math'/);
  await page.keyboard.press("Escape");
  await start(page, "A |- A");
  await expect(
    (await exportEntry(page, "PNG")).getByRole("combobox", { name: "Font" }),
  ).toHaveValue("stix-two");
});

test("the certificate of non-derivability downloads for a refuted goal", async ({ page }) => {
  await start(page, "A |- B");
  await closeGoal(page);
  const download = await saveExport(page, "Rocq");
  expect(download.suggestedFilename()).toBe("deduxit-refutation.v");
  const certificate = await readFile(await download.path(), "utf8");
  expect(certificate).toMatch(
    /^From Stdlib Require[\s\S]*From Deduxit\.Linear Require[\s\S]*Lemma certificate : ~ ll[\s\S]*Qed\./,
  );
});

test("the link in the fragment restores the proof, or says it could not", async ({
  page,
  browser,
}) => {
  await start(page, "A * B |- B * A");
  // The link is written after each change, the sequent's session first: wait for the step's.
  await expect(page).toHaveURL(/#v=2&u=linear&m=classical&s=.*&d=/);
  const before = page.url();
  await rule(page, /^A⊥ ⅋ B⊥/, "⅋");
  await expect(page).not.toHaveURL(before);
  const url = page.url();
  const fresh = await browser.newPage();
  await fresh.goto(url);
  await expect(fresh.getByRole("button", { name: /^A⊥, formula 1 of goal 2/ })).toBeVisible();
  // The proof the link opened is not offered again to restore, on a reload either.
  await fresh.waitForTimeout(500);
  await fresh.reload();
  await expect(fresh.getByRole("button", { name: /^A⊥, formula 1 of goal 2/ })).toBeVisible();
  await expect(fresh.getByRole("button", { name: /^Restore/ })).toHaveCount(0);
  await expect(fresh.locator(".chip")).toHaveCount(1);
  // A broken link, opened as a load of its own: a change of the fragment alone keeps the
  // document, whose link of the proof, written 400 ms after its last change, could replace the
  // broken one before a reload.
  const broken = await browser.newPage();
  await broken.goto(url.replace(/&d=[^&]*/, "&d=AAAA"));
  await expect(broken.getByText("Proof not restored")).toBeVisible();
  await expect(broken.getByRole("button", { name: /^A⊥ ⅋ B⊥, formula 1 of goal 1/ })).toBeVisible();
});

test("a link pasted into the open page opens its proof, and the proof it replaces is restorable", async ({
  page,
}) => {
  await start(page, "A * B |- B * A");
  await rule(page, /^A⊥ ⅋ B⊥/, "⅋");
  await expect(page.getByRole("button", { name: /^A⊥, formula 1 of goal 2/ })).toBeVisible();
  // The page has written the step's link.
  await page.waitForTimeout(500);
  // Only the fragment changes, as when a link to this page is pasted into its address bar, and
  // the page's own write of its link lands before the change's event.
  await page.evaluate(() => {
    const own = location.hash;
    location.hash = "#v=2&u=linear&m=classical&s=A+|-+A";
    history.replaceState(null, "", own);
  });
  await expect(page.getByRole("button", { name: /^A⊥, formula 1 of goal 1/ })).toBeVisible();
  await expect(page.locator(".chip")).toHaveCount(1);
  // The page's own link of the new proof, with its session, opens nothing.
  await expect(page).toHaveURL(/&s=A\+%E2%8A%A2\+A&d=/);
  await page.waitForTimeout(500);
  await expect(page.locator(".chip")).toHaveCount(1);
  // The proof it replaced waits on the new tab view.
  await newTab(page);
  await page.getByRole("button", { name: "Restore 1 proof" }).click();
  await expect(page.locator(".chip")).toHaveCount(2);
  await expect(page.getByRole("button", { name: /^A⊥, formula 1 of goal 2/ })).toBeVisible();
});

test("a link whose sequent does not parse shows the parse error under the field", async ({
  page,
}) => {
  await page.goto("/#v=1&m=classical&s=A+*+*+B");
  await expect(page.getByRole("textbox", { name: "Sequent" })).toHaveValue("A * * B");
  await expect(page.getByRole("alert")).toContainText("Unexpected * at column 5");
  await expect(page.locator(".caret .at")).toHaveText("*");
});

test("a link whose session unpacks past the cap loads the sequent alone and says why", async ({
  page,
}) => {
  // 4 MiB of one character, deflated: about four kilobytes of link.
  const hash = await page.evaluate(async () => {
    const text = JSON.stringify({ pad: "a".repeat(4 * 1024 * 1024) });
    const packed = new Blob([text]).stream().pipeThrough(new CompressionStream("deflate-raw"));
    const bytes = new Uint8Array(await new Response(packed).arrayBuffer());
    let binary = "";
    for (const byte of bytes) binary += String.fromCharCode(byte);
    const d = btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
    return `#v=1&m=classical&s=A+|-+A&d=${d}`;
  });
  await page.goto(`/${hash}`);
  await page.reload();
  await expect(page.getByText("Proof not restored")).toBeVisible();
  await expect(page.locator(".said-banner")).toContainText("more than a link may hold");
  await expect(page.getByRole("button", { name: /^A, formula/ })).toBeVisible();
});

test("a proof's tab shows its sequent in signs, in Euler Math", async ({ page }) => {
  await start(page, "a^ par b |- b * a");
  const tab = page.locator(".chip-text");
  await expect(tab).toHaveText("a⊥ ⅋ b ⊢ b ⊗ a");
  expect(await tab.evaluate((e) => getComputedStyle(e).fontFamily)).toMatch(/^"Euler Math"/);
  await expect
    .poll(() => page.evaluate(() => document.fonts.check('16px "Euler Math"', "⊗")))
    .toBe(true);
  // A link's load in a page of its own: a goto to another fragment of this page would open it in
  // place, and a reload right after it races the page's own write of its link.
  const fresh = await page.context().newPage();
  await fresh.goto("/#v=1&m=intuitionistic&s=A,+A+-o+B+|-+B");
  await expect(fresh.locator(".chip[aria-selected=true] .chip-text")).toHaveText("A, A ⊸ B ⊢ B");
});

test("autosave keeps every open proof, and the next plain visit brings them back", async ({
  page,
}) => {
  await start(page, "A * B |- B * A");
  await rule(page, /^A⊥ ⅋ B⊥/, "⅋");
  await page.getByRole("button", { name: "New sequent", exact: true }).click();
  await page.getByRole("textbox", { name: "Sequent" }).fill("A |- A");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("button", { name: /^A⊥, formula 1 of goal 1/ })).toBeVisible();
  await page.waitForTimeout(500);
  // A plain visit, no other tab of the page open: they come back by themselves.
  await page.goto("/");
  await expect(page.locator(".chip")).toHaveCount(2);
  await page.locator(".chip").first().click();
  await expect(page.getByRole("button", { name: /^A⊥, formula 1 of goal 2/ })).toBeVisible();
});

test("a sequent's state is told on its chip by a sign and in its name, not by its colour alone", async ({
  page,
}) => {
  const chip = (n: number) => page.locator(".chip").nth(n);
  await start(page, "A |- A");
  await expect(chip(0)).toHaveAccessibleName("A ⊢ A, 1 goal open");
  await closeGoal(page);
  await expect(chip(0).locator("svg.icon-check")).toBeVisible();
  await expect(chip(0)).toHaveAccessibleName("A ⊢ A, proved");
  await start(page, "A |- B", false);
  await closeGoal(page);
  await expect(chip(1).locator("svg.icon-cross")).toBeVisible();
  await expect(chip(1)).toHaveAccessibleName("A ⊢ B, refuted");
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.getByRole("textbox", { name: "Budget, in units of work" }).fill("1");
  await page.getByRole("textbox", { name: "Budget, in units of work" }).press("Enter");
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await start(page, "!(a -o a * a), a |- a * a * a * a", false);
  await calculus(page, ["Intuitionistic"]);
  await closeGoal(page);
  await expect(chip(2)).toHaveAccessibleName(/, unknown$/);
  await page.getByRole("button", { name: "New sequent", exact: true }).click();
  await expect(chip(3)).toHaveAccessibleName("New sequent, not started");
});

test("several proofs are open at once, each with its own state", async ({ page }) => {
  await start(page, "A * B |- B * A");
  await page.getByRole("button", { name: "New sequent", exact: true }).click();
  await page.getByRole("textbox", { name: "Sequent" }).fill("A, B |- A * B");
  await page.keyboard.press("Enter");
  await page.locator(".chip").first().click();
  await expect(page.getByRole("button", { name: /^B ⊗ A, formula 2 of goal 1/ })).toBeVisible();
  await page.locator(".chip").nth(1).click();
  await expect(page.getByRole("button", { name: /^A ⊗ B, formula 3 of goal 1/ })).toBeVisible();
});

test("import reads a session or a sequent, and refuses a level it does not know", async ({
  page,
}) => {
  await proveCommuted(page);
  const session = await readFile(await (await saveExport(page, "Session")).path(), "utf8");
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Import" }).click();
  const panel = page.getByRole("dialog", { name: "Import" });
  await panel.getByRole("textbox").fill(session);
  await panel.getByRole("button", { name: "Import", exact: true }).click();
  await expect(panel.getByRole("status")).toHaveText("Imported a session.");
  await expect(page.locator(".chip")).toHaveCount(2);
  await panel.getByRole("textbox").fill('{"version":99,"terms":[],"roots":[],"atoms":[]}');
  await panel.getByRole("button", { name: "Import", exact: true }).click();
  await expect(panel.getByRole("status")).toContainText("Level 99 unknown: not imported");
  await panel.locator('input[type="file"]').setInputFiles({
    name: "sequent.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(JSON.parse(session).sequent)),
  });
  await expect(panel.getByRole("status")).toHaveText("Imported a sequent from sequent.json.");
});

test("a proof goes by keyboard alone", async ({ page }) => {
  await start(page, "A * B |- B * A");
  await page.getByRole("button", { name: /^A⊥ ⅋ B⊥, formula 1/ }).focus();
  await page.keyboard.press("Enter");
  await page.keyboard.press("1");
  await expect(page.getByRole("button", { name: /^A⊥, formula 1 of goal 2/ })).toBeFocused();
  await page.keyboard.press("u");
  await expect(page.getByRole("button", { name: /^A⊥ ⅋ B⊥, formula 1/ })).toBeVisible();
  await page.keyboard.press("Shift+U");
  await expect(page.getByRole("button", { name: /^A⊥, formula 1 of goal 2/ })).toBeVisible();
  await page.keyboard.press("Shift+C");
  await expect(
    page.getByRole("status").filter({ hasText: "Proved. Every goal is closed." }),
  ).toBeVisible();
  await page.keyboard.press("?");
  await expect(page.getByRole("dialog", { name: "Keys" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog", { name: "Keys" })).toHaveCount(0);
});

test("a toggle keeps the proof where its steps hold, else opens the new calculus beside; two-sided shows in classical mode alone", async ({
  page,
}) => {
  await start(page, "A * B |- B * A");
  // Classical derivations are drawn one-sided by default: the tool is there, off.
  await expect(tool(page, "Two-sided")).toBeEnabled();
  await expect(tool(page, "Two-sided")).toHaveAttribute("aria-pressed", "false");
  await rule(page, /^A⊥ ⅋ B⊥/, "⅋");
  // Every classical step holds with Mix: the proof stays, its goal with it.
  await (await switches(page)).getByRole("button", { name: "Mix" }).click();
  await expect(viewCell(page)).toHaveAttribute("data-tip", /LL\+mix/);
  await expect(page.locator(".chip")).toHaveCount(1);
  await expect(page.getByRole("button", { name: /^A⊥, formula 1 of goal 2/ })).toBeVisible();
  // The one-sided ⅋ on a hypothesis is ⊗L in intuitionistic logic: the proof stays there too.
  await (await switches(page)).getByRole("button", { name: "Intuitionistic" }).click();
  await expect(viewCell(page)).toHaveAttribute("data-tip", /ILL/);
  await expect(page.locator(".chip")).toHaveCount(1);
  // An affine weakening does not hold without Affine: that calculus opens beside.
  await start(page, "A, B |- A", false);
  await (await switches(page)).getByRole("button", { name: "Affine" }).click();
  await rule(page, /^B, formula/, "wk");
  await (await switches(page)).getByRole("button", { name: "Affine" }).click();
  await expect(page.getByRole("status").filter({ hasText: "opened beside" })).toContainText(
    "Step 1 does not hold",
  );
  // The calculus opened beside is a view of the same sequent: a cell of its chip's rail.
  await expect(page.locator(".chip")).toHaveCount(2);
  await expect(page.getByRole("tab", { name: /linear logic, I?LL, / })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  // The proof kept in affine logic has B weakened away.
  await page.getByRole("tab", { name: /linear logic, I?LL\+aff, / }).click();
  await expect(page.getByRole("button", { name: /^B, formula/ })).toHaveCount(0);
  await page.locator(".chip").first().click();
  // Intuitionistic derivations are two-sided already: the tool is not shown.
  await expect(tool(page, "Two-sided")).toHaveCount(0);
  await start(page, "A |- B, C", false);
  await expect(page.getByRole("alert")).toContainText("2 formulas right of ⊢");
});

test("the two-sided switch draws a classical derivation as written, kept across a reload", async ({
  page,
}) => {
  await proveCommuted(page);
  const steps = page.locator(".drawing desc").first();
  await expect(steps).toContainText("by ⅋ from");
  await calculus(page, ["Two-sided"]);
  await expect(steps).toContainText("A ⊗ B ⊢ B ⊗ A, by ⊗L from");
  // The proofs are stored a moment after a change, and the next plain visit brings them back.
  await page.waitForTimeout(500);
  await page.goto("/");
  await expect(page.locator(".chip")).toHaveCount(1);
  await expect(tool(page, "Two-sided")).toHaveAttribute("aria-pressed", "true");
  await expect(steps).toContainText("A ⊗ B ⊢ B ⊗ A, by ⊗L from");
});

test("the light and dark toggle pins a scheme, kept on the next visit", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await goto(page);
  await page.getByRole("button", { name: "Light", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  const field = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe(field);
  await page.getByRole("button", { name: "Dark", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
});

test("the step list goes back to a step, and redo brings the rest back", async ({ page }) => {
  await start(page, "A * B |- B * A");
  await rule(page, /^A⊥ ⅋ B⊥/, "⅋");
  await closeGoal(page);
  await expect(
    page.getByRole("status").filter({ hasText: "Proved. Every goal is closed." }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Steps" }).click();
  const steps = page.getByRole("dialog", { name: "Steps" });
  await expect(steps.getByRole("button")).toHaveText([
    /^0/,
    /^1⅋ on A⊥ ⅋ B⊥$/,
    /^2The focused search closed goal 2/,
  ]);
  await steps.getByRole("button", { name: /^0/ }).click();
  await expect(page.getByRole("button", { name: /^A⊥ ⅋ B⊥, formula 1 of goal 1/ })).toBeVisible();
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Redo", exact: true }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Proved. Every goal is closed." }),
  ).toBeVisible();
});

test("a finished intuitionistic proof's essential net is drawn", async ({ page }) => {
  await start(page, "A, B |- A * B");
  await calculus(page, ["Intuitionistic"]);
  await expect(viewCell(page)).toHaveAttribute("data-tip", /ILL/);
  await closeGoal(page);
  await page.getByRole("tab", { name: "Proof net" }).click();
  await expect(page.locator(".drawing svg desc")).toContainText("proof net");
});

test("a finished intuitionistic MELL proof's net is drawn with its boxes", async ({ page }) => {
  await start(page, "!A |- !A * !A");
  await calculus(page, ["Intuitionistic"]);
  await expect(viewCell(page)).toHaveAttribute("data-tip", /ILL/);
  await expect(page.getByRole("tab", { name: "Proof net" })).toHaveCount(0);
  await closeGoal(page);
  await page.getByRole("tab", { name: "Proof net" }).click();
  await expect(page.getByRole("tab", { name: "Proof net" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await expect(page.locator(".drawing svg desc")).toContainText("proof net");
  // A box for each !A of the goal, a copy of the hypothesis !A in each.
  await expect(page.locator('.drawing svg path[id^="b"]')).toHaveCount(2);
});

test("Settings' net drawing writes every formula or draws the net compact, in the view and the export", async ({
  page,
}) => {
  await proveCommuted(page);
  await page.getByRole("tab", { name: "Proof net" }).click();
  // With its formulas every occurrence is written; compact, each of the two links is a circle.
  await expect(page.locator(".drawing svg desc")).toContainText("proof net");
  await expect(page.locator(".drawing svg circle")).toHaveCount(0);
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await expect(
    page.getByRole("region", { name: "Settings" }).getByRole("button", { name: "Formulas" }),
  ).toHaveAttribute("aria-pressed", "true");
  await page
    .getByRole("region", { name: "Settings" })
    .getByRole("button", { name: "Compact" })
    .click();
  // Settings is a page: its own button leaves it.
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await expect(page.locator(".drawing svg circle")).toHaveCount(2);
  const svg = await readFile(await (await saveExport(page, "SVG")).path(), "utf8");
  await page.keyboard.press("Escape");
  expect(svg).toContain("proof net");
  expect(svg.match(/<circle /g)?.length).toBe(2);
});

test("Settings' net look draws the net as the textbooks do, by the preset or field by field, in the view and the export", async ({
  page,
}) => {
  // ⊢ ?a⊥, ?b⊥, !a: a box with a copy of ?a⊥ in it, and ?b⊥ weakened.
  await start(page, "!a, !b |- !a");
  await closeGoal(page);
  await page.getByRole("tab", { name: "Proof net" }).click();
  await expect(page.locator(".drawing svg desc")).toContainText("proof net");
  const weakening = page.locator(".drawing svg text", { hasText: "?w" });
  const dashed = page.locator(".drawing svg [stroke-dasharray]");
  await expect(weakening).toHaveCount(0);
  await expect(dashed).toHaveCount(1);
  const settings = page.getByRole("region", { name: "Settings" });
  const pressed = (name: string) => settings.getByRole("button", { name, exact: true });
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  for (const name of ["Default", "Dashed", "A row up", "One node"]) {
    await expect(pressed(name)).toHaveAttribute("aria-pressed", "true");
  }
  await pressed("Textbook").click();
  for (const name of ["Textbook", "Plain", "At the bottom", "Its rules"]) {
    await expect(pressed(name)).toHaveAttribute("aria-pressed", "true");
  }
  // Settings is a page: its own button leaves it.
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  // The weakening is a ?w node, the copy's dereliction a ?d, and no edge is dashed.
  await expect(weakening).toHaveCount(1);
  await expect(page.locator(".drawing svg text", { hasText: "?d" })).toHaveCount(1);
  await expect(dashed).toHaveCount(0);
  const svg = await readFile(await (await saveExport(page, "SVG")).path(), "utf8");
  await page.keyboard.press("Escape");
  expect(svg).toContain(">?w<");
  expect(svg).not.toContain("stroke-dasharray");
  // One field changed: the look is neither preset, and that field alone differs.
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await pressed("Dashed").click();
  await expect(pressed("Textbook")).toHaveAttribute("aria-pressed", "false");
  await expect(pressed("Default")).toHaveAttribute("aria-pressed", "false");
  // Settings is a page: its own button leaves it.
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await expect(dashed).toHaveCount(1);
  await expect(weakening).toHaveCount(1);
});

test("the net's look is kept with the other settings for the next visit", async ({ page }) => {
  await goto(page);
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  const settings = page.getByRole("region", { name: "Settings" });
  await settings.getByRole("button", { name: "Its rules", exact: true }).click();
  await page.reload();
  await expect(page.getByRole("textbox", { name: "Sequent" })).toBeVisible();
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  for (const [name, on] of [
    ["Its rules", "true"],
    ["One node", "false"],
    ["Dashed", "true"],
    ["A row up", "true"],
  ] as const) {
    await expect(settings.getByRole("button", { name, exact: true })).toHaveAttribute(
      "aria-pressed",
      on,
    );
  }
});

test("an earlier release's settings and theme, under the old linlog-* keys, hold and move to deduxit-*", async ({
  page,
}) => {
  await page.addInitScript(() => {
    if (localStorage.getItem("deduxit-settings") !== null) return;
    localStorage.setItem("linlog-settings", JSON.stringify({ budget: 7 }));
    localStorage.setItem("linlog-theme", "dark");
  });
  await goto(page);
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await expect(page.getByRole("textbox", { name: "Budget, in units of work" })).toHaveValue("7");
  const keys = await page.evaluate(() => Object.keys(localStorage).sort());
  expect(keys.filter((k) => k.startsWith("linlog-"))).toEqual([]);
  expect(keys).toEqual(expect.arrayContaining(["deduxit-settings", "deduxit-theme"]));
});

test("the essential net draws its input side in the Okabe–Ito palette's blue, never green, in both themes", async ({
  page,
}) => {
  await start(page, "A * B |- B * A");
  await calculus(page, ["Intuitionistic"]);
  await expect(viewCell(page)).toHaveAttribute("data-tip", /ILL/);
  await closeGoal(page);
  await page.getByRole("tab", { name: "Proof net" }).click();
  const input = page.locator('.drawing svg text[fill="#0072b2"]').first();
  const edge = page.locator('.drawing svg g[stroke="#0072b2"] path').first();
  // The hypothesis A ⊗ B, its edges and its literals, is the input side: --color-net-input, never the ink.
  for (const [colorScheme, colour] of [
    ["light", "rgb(0, 113, 182)"],
    ["dark", "rgb(116, 188, 245)"],
  ] as const) {
    await page.emulateMedia({ colorScheme });
    await expect(input).toHaveCSS("fill", colour);
    await expect(edge).toHaveCSS("stroke", colour);
  }
});

test("the net view fits the whole net, drawn afresh with each drawing", async ({ page }) => {
  await start(page, "A * B * C * D * E * F |- F * E * D * C * B * A");
  await closeGoal(page);
  await expect(
    page.getByRole("status").filter({ hasText: "Proved. Every goal is closed." }),
  ).toBeVisible();
  for (let i = 0; i < 4; i++) await page.getByRole("button", { name: "Zoom in" }).click();
  const inside = async () => {
    const stage = await page.locator(".stage").boundingBox();
    const net = await page.locator(".drawing svg").boundingBox();
    if (!stage || !net) return false;
    return (
      net.x >= stage.x &&
      net.y >= stage.y &&
      net.x + net.width <= stage.x + stage.width &&
      net.y + net.height <= stage.y + stage.height
    );
  };
  await page.getByRole("tab", { name: "Proof net" }).click();
  await expect(page.locator(".drawing svg desc")).toContainText("proof net");
  await expect.poll(inside).toBe(true);
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page
    .getByRole("region", { name: "Settings" })
    .getByRole("button", { name: "Compact" })
    .click();
  // Settings is a page: its own button leaves it.
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await expect(page.locator(".drawing svg circle").first()).toBeVisible();
  await expect.poll(inside).toBe(true);
});

test("an action asked for while a search runs waits, and loses neither result", async ({
  page,
}) => {
  // A search of about half a second, which refutes the goal in the end.
  await start(page, "!(A & B) * !(A & B) |- !A * !B * !A * !B * ?C");
  await rule(page, /^\?\(A⊥ ⊕ B⊥\) ⅋ \?\(A⊥ ⊕ B⊥\)/, "⅋");
  await closeGoal(page);
  // Undo while the search runs: it does nothing, rather than replaying a session the search replaces.
  await page.keyboard.press("u");
  await expect(page.locator(".goal-note .kw.bad")).toContainText("Unprovable");
  await expect(page.getByRole("button", { name: /^\?\(A⊥ ⊕ B⊥\) ⅋/ })).toHaveCount(0);
  // Once it ended, undo takes back the ⅋.
  await tool(page, "Undo").click();
  await expect(page.getByRole("button", { name: /^\?\(A⊥ ⊕ B⊥\) ⅋ \?\(A⊥ ⊕ B⊥\)/ })).toBeVisible();
});

test("a goal proved apart opens as a sequent of its own, in the same calculus, which remembers where it came from", async ({
  page,
}) => {
  await start(page, "A * B |- B * A");
  await rule(page, /^A⊥ ⅋ B⊥/, "⅋");
  await (await goalMenu(page)).getByRole("button", { name: "Prove apart" }).click();
  await expect(page.locator(".chip")).toHaveCount(2);
  await expect(page.locator(".chip[aria-selected=true] .chip-text")).toHaveText("⊢ A⊥, B⊥, B ⊗ A");
  await expect(viewCell(page)).toHaveAttribute("data-tip", /LL/);
  await expect(page.getByRole("button", { name: /^B ⊗ A, formula/ })).toBeVisible();
  const origin = await page.evaluate(() => {
    for (const key of Object.keys(localStorage).filter((k) => k.startsWith("deduxit-proofs:"))) {
      const shelf = JSON.parse(localStorage.getItem(key) ?? "{}");
      const proof = shelf.proofs?.find((p: { origin?: unknown }) => p.origin);
      if (proof) return { origin: proof.origin, from: shelf.proofs[0].id };
    }
    return null;
  });
  expect(origin?.origin).toEqual({ from: origin?.from, path: [0] });
});

test("a goal is closed by its proof made apart: its steps taken again, grey, and marked apart in the steps", async ({
  page,
}) => {
  await start(page, "A * B |- B * A");
  await rule(page, /^A⊥ ⅋ B⊥/, "⅋");
  await expect((await goalMenu(page)).getByRole("button", { name: "Use its proof" })).toHaveCount(
    0,
  );
  await (await goalMenu(page)).getByRole("button", { name: "Prove apart" }).click();
  await rule(page, /^B ⊗ A/, "⊗");
  const split = page.getByRole("group", { name: /^Split for ⊗/ });
  await split.getByRole("button", { name: "B⊥", exact: true }).click();
  await split.getByRole("button", { name: "Apply ⊗" }).click();
  await tool(page, "Close all").click();
  await expect(page.getByText("Proved. Every goal is closed.")).toBeVisible();
  await page.locator(".chip").first().click();
  await (await goalMenu(page)).getByRole("button", { name: "Use its proof" }).click();
  await expect(page.getByText("Proved. Every goal is closed.")).toBeVisible();
  await expect(page.locator(".drawing g.search").first()).toBeAttached();
  await tool(page, "Steps").click();
  const steps = page.getByRole("dialog", { name: "Steps" });
  await expect(steps.getByRole("button").nth(1)).not.toContainText("apart");
  await expect(steps.getByRole("button").nth(2)).toContainText("⊗ on B ⊗ A apart");
  // Steps taken back take the mark with them: what is taken by hand there is the visitor's.
  await page.keyboard.press("Escape");
  await tool(page, "Undo").click();
  await tool(page, "Steps").click();
  await expect(steps).not.toContainText("apart");
});

test("a goal is closed by a proof made apart of its formulas in another order, and no other sequent's", async ({
  page,
}) => {
  await start(page, "A * B |- B * A");
  await rule(page, /^A⊥ ⅋ B⊥/, "⅋");
  // The goal ⊢ A⊥, B⊥, B ⊗ A, typed apart in another order and proved by hand.
  await start(page, "|- B * A, ~B, ~A", false);
  await rule(page, /^B ⊗ A/, "⊗");
  const split = page.getByRole("group", { name: /^Split for ⊗/ });
  await split.getByRole("button", { name: "B⊥", exact: true }).click();
  await split.getByRole("button", { name: "Apply ⊗" }).click();
  await tool(page, "Close all").click();
  await expect(page.getByText("Proved. Every goal is closed.")).toBeVisible();
  // A sequent of other formulas, proved too, is not offered.
  await start(page, "|- A * B, ~B, ~A", false);
  await tool(page, "Close all").click();
  await expect(page.getByText("Proved. Every goal is closed.")).toBeVisible();
  await page.locator(".chip").first().click();
  const menu = await goalMenu(page);
  await expect(menu.getByRole("button", { name: /^Use / })).toHaveCount(1);
  await menu.getByRole("button", { name: "Use its proof" }).click();
  await expect(page.getByText("Proved. Every goal is closed.")).toBeVisible();
  await tool(page, "Steps").click();
  await expect(
    page.getByRole("dialog", { name: "Steps" }).getByRole("button").nth(2),
  ).toContainText("⊗ on B ⊗ A apart");
});

test("the search says which engine closed a goal, closed every goal, or found the hint's proof", async ({
  page,
}) => {
  await start(page, "A * B |- B * A");
  await rule(page, /^A⊥ ⅋ B⊥/, "⅋");
  await page.getByRole("button", { name: "Guide", exact: true }).click();
  await tool(page, "Hint").click();
  await expect(page.locator(".hint-line .engine")).toHaveText("Focused search");
  await closeGoal(page);
  const line = page.locator(".note.searched");
  await expect(line).toHaveText("Goal 2 closed by the focused search.");
  await tool(page, "Undo").click();
  await expect(line).toHaveCount(0);
  await tool(page, "Close all").click();
  await expect(line).toHaveText("Every goal closed by the focused search.");
});

test("a net's view has the toggle Formulas or Compact where the calculus's toggles stand", async ({
  page,
}) => {
  await proveCommuted(page);
  await page.getByRole("tab", { name: "Proof net" }).click();
  const drawing = (await switches(page)).getByRole("group", { name: "Net drawing" });
  await expect(drawing.getByRole("button", { name: "Formulas" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  const before = await page.locator(".drawing svg").getAttribute("width");
  await drawing.getByRole("button", { name: "Compact" }).click();
  await expect(drawing.getByRole("button", { name: "Compact" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(page.locator(".drawing svg")).not.toHaveAttribute("width", before ?? "");
});

test("with the guide on, one sentence over the bottom box says what to press next", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Guide", exact: true }).click();
  await start(page, "A * B |- B * A", false);
  const line = page.locator(".guide-line");
  await expect(line).toHaveText("Press a formula on a dashed line to see its rules.");
  await page.getByRole("button", { name: /^B ⊗ A, formula/ }).click();
  await expect(line).toHaveText(
    "Press a rule to apply it. A grey rule shows why it does not apply.",
  );
  await page.getByRole("dialog", { name: "Rules" }).getByRole("button", { name: "⊗" }).click();
  await expect(line).toHaveText("Press a formula to move it to the other premise, then press ⊗ ↵.");
  await page.getByRole("button", { name: "Guide", exact: true }).click();
  await expect(line).toHaveCount(0);
});
