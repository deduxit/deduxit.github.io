// deduxit © Fabian Lukas Grubmüller 2026
// Licensed under the EUPL

// The calculus is each sequent's own: a goal opened in a new tab keeps the whole mode of the
// sequent it came from, and a change of one sequent's mode leaves the others alone, across a
// reload. Its toggles stand at the stage's top left, and the view's cell names it in words.

import { devices, type Page } from "@playwright/test";
import { expect, test } from "./fixtures";
import { calculus, newTab, rule, start } from "./prover";

/** The chosen sequent's proof, its cell in the rail, whose hover names its calculus. */
const mark = (page: Page) =>
  page.getByRole("tablist", { name: "Views of this sequent" }).getByRole("tab").first();
/** A calculus's short mark as the cell's hover ends in it. */
const ends = (shown: string) => new RegExp(`, ${shown.replaceAll("+", "\\+")}$`);

for (const [label, sequent, switches, shown, formula, name, left] of [
  [
    "intuitionistic",
    "A, A -o B |- B",
    ["Intuitionistic"],
    "ILL",
    /^A ⊸ B, formula/,
    "⊸L",
    /^A, formula/,
  ],
  ["Mix", "|- A * B, ~A, ~B", ["Mix"], "LL+mix", /^A ⊗ B, formula/, "⊗", null],
  ["affine", "|- A * B, ~A, ~B, C", ["Affine"], "LL+aff", /^A ⊗ B, formula/, "⊗", null],
  [
    "intuitionistic affine",
    "A, A -o B, C |- B",
    ["Intuitionistic", "Affine"],
    "ILL+aff",
    /^A ⊸ B, formula/,
    "⊸L",
    /^A, formula/,
  ],
] as const) {
  test(`a goal of a tab in ${label} logic opens in a new tab in the same calculus`, async ({
    page,
  }) => {
    await start(page, sequent);
    await calculus(page, switches);
    await expect(mark(page)).toHaveAttribute("data-tip", ends(shown));
    // A goal below the root: a step first.
    await rule(page, formula, name);
    const split = page.getByRole("dialog", { name: "Split" });
    if (left) await page.getByRole("button", { name: left }).first().click();
    if (await split.isVisible()) await split.getByRole("button", { name: "Apply" }).click();
    await expect(split).toBeHidden();
    await page.getByRole("button", { name: "Open this goal in a new tab" }).click();
    await expect(page.locator(".chip")).toHaveCount(2);
    await expect(mark(page)).toHaveAttribute("data-tip", ends(shown));
    await expect(page.locator(".stage .fb").first()).toBeVisible();
  });
}

test("each sequent keeps its own calculus, across a reload", async ({ page }) => {
  await start(page, "A * B |- B * A");
  await start(page, "|- A * B, ~A, ~B", false);
  await calculus(page, ["Mix"]);
  await start(page, "A, A -o B |- B", false);
  await calculus(page, ["Intuitionistic", "Affine"]);
  /** Each sequent's calculus, its chip pressed and its proof's cell read. */
  const marks = async () => {
    const all: string[] = [];
    for (const chip of await page.locator(".chip").all()) {
      await chip.click();
      all.push((await mark(page).getAttribute("data-tip")) ?? "");
    }
    return all.map((tip) => tip.slice(tip.lastIndexOf(", ") + 2));
  };
  await expect.poll(marks).toEqual(["LL", "LL+mix", "ILL+aff"]);
  // A change of one sequent's calculus leaves the others alone.
  await page.locator(".chip").nth(1).click();
  await calculus(page, ["Affine"]);
  await expect.poll(marks).toEqual(["LL", "LL+aff+mix", "ILL+aff"]);
  await page.waitForTimeout(500);
  // A plain visit with no other tab of the page open brings them back by itself.
  await page.goto("/");
  await expect(page.locator(".chip")).toHaveCount(3);
  await expect.poll(marks).toEqual(["LL", "LL+aff+mix", "ILL+aff"]);
});

for (const phone of [false, true]) {
  test.describe(phone ? "at a phone's width" : "at a desktop's width", () => {
    if (phone) {
      const { defaultBrowserType: _, ...pixel } = devices["Pixel 7"];
      test.use(pixel);
    }

    test("the toggles stand at the stage's top left, on the new tab view and on a proof", async ({
      page,
    }) => {
      await start(page, "|- A * B, ~A, ~B");
      const toggles = page.getByRole("group", { name: "Calculus of this view" });
      const stage = await page.locator(".stage-area").boundingBox();
      const box = await toggles.boundingBox();
      expect((box?.x ?? 0) - (stage?.x ?? 0)).toBeLessThan(16);
      expect((box?.y ?? 0) - (stage?.y ?? 0)).toBeLessThan(16);
      await toggles.getByRole("button", { name: "Mix", exact: true }).click();
      await expect(toggles.getByRole("button", { name: "Mix", exact: true })).toHaveAttribute(
        "aria-pressed",
        "true",
      );
      await expect(mark(page)).toHaveAttribute("data-tip", ends("LL+mix"));
      // A new sequent's calculus is set by the toggles before it is entered.
      await newTab(page);
      await toggles.getByRole("button", { name: "Intuitionistic", exact: true }).click();
      await page.getByRole("textbox", { name: "Sequent" }).fill("A |- A");
      await page.getByRole("textbox", { name: "Sequent" }).press("Enter");
      await expect(mark(page)).toHaveAttribute("data-tip", ends("ILL"));
    });
  });
}

test("a goal's hypothesis A ⊸ B opens in a new tab as A ⊸ B, and the split chooser lists the formulas as they read", async ({
  page,
}) => {
  await start(page, "A -o B |- A -o B");
  await calculus(page, ["Intuitionistic"]);
  // The formulas' buttons are named as they read: the hypothesis and the goal both A ⊸ B.
  await expect(page.getByRole("button", { name: /^A ⊸ B, formula/ })).toHaveCount(2);
  await rule(page, /^A ⊸ B, formula 2/, "⊸R");
  await page.getByRole("button", { name: "Open this goal in a new tab" }).click();
  await expect(page.locator(".chip")).toHaveCount(2);
  await expect(page.locator(".chip[aria-selected=true] .chip-text")).toHaveText("A ⊸ B, A ⊢ B");
  await expect(mark(page)).toHaveAttribute("data-tip", ends("ILL"));
  // The split of ⊸L in the new tab: the lists say A and B, not their one-sided forms.
  await rule(page, /^A ⊸ B, formula/, "⊸L");
  const split = page.getByRole("dialog", { name: "Split" });
  await expect(split.locator(".prem").first()).toHaveText(/^Left\s*nothing else$/);
  await expect(split.locator(".prem").last()).toHaveText(/^Right\s*A, B$/);
  await page
    .getByRole("button", { name: /^A, formula/ })
    .first()
    .click();
  await expect(split.locator(".prem").first()).toHaveText(/^Left\s*A$/);
  await expect(split.locator(".prem").last()).toHaveText(/^Right\s*B$/);
});

test("the proof's cell names its calculus in words, with its state", async ({ page }) => {
  await start(page, "A |- A");
  await calculus(page, ["Intuitionistic", "Affine"]);
  await expect(mark(page)).toHaveAccessibleName(
    "Intuitionistic linear logic, ILL+aff, 1 goal open",
  );
  await expect(mark(page)).not.toHaveAccessibleName(/intuitionistic-affine/);
});
