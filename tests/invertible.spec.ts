// deduxit © Fabian Lukas Grubmüller 2026
// Licensed under the EUPL

// The invertible rules applied by themselves: Settings' switch, off by default and kept with
// the other settings, its tip, the rules applied at once when it is turned on and after each
// step, undo taking back the visitor's step with them, and the hint past them.

import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";
import { goto, rule, start, tool } from "./prover";

const SWITCH = "Apply invertible rules by themselves";

/** Opens Settings and returns the switch. */
async function invertible(page: Page) {
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  return page.getByRole("region", { name: "Settings" }).getByRole("checkbox", { name: SWITCH });
}

test("the switch is off by default, kept with the settings, and applies the rules at once", async ({
  page,
}) => {
  await start(page, "A * B |- B * A");
  const off = await invertible(page);
  await expect(off).not.toBeChecked();
  await off.check();
  // Settings is a page: its own button leaves it.
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  // ⅋ was applied to the open goal at once: its subformulas are the goal's.
  await expect(page.getByRole("button", { name: /^A⊥ ⅋ B⊥/ })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /^A⊥, formula 1 of goal 2/ })).toBeVisible();
  await page.reload();
  await expect(await invertible(page)).toBeChecked();
});

test("the switch's tip says what an invertible rule is and why it loses no proof", async ({
  page,
}) => {
  await goto(page);
  await invertible(page);
  await page.locator("label.sw", { hasText: SWITCH }).hover();
  await expect(page.getByRole("tooltip")).toContainText(
    "An invertible rule never loses a proof: when its goal has a proof, so do its premises.",
  );
  await expect(page.getByRole("tooltip")).toContainText("never loses a proof");
});

test("with the switch on, undo takes back a step with the invertible steps after it", async ({
  page,
}) => {
  await goto(page);
  await (await invertible(page)).check();
  await page.keyboard.press("Escape");
  await start(page, "|- (B par ~B) + A", false);
  // ⊕₁ is the visitor's choice; ⅋ and the axiom follow by themselves and finish the proof.
  await rule(page, /^\(B ⅋ B⊥\) ⊕ A/, "⊕₁");
  await expect(
    page.getByRole("status").filter({ hasText: "Proved. Every goal is closed." }),
  ).toBeVisible();
  await tool(page, "Undo").click();
  await expect(
    page.getByRole("button", { name: /^\(B ⅋ B⊥\) ⊕ A, formula 1 of goal 1/ }),
  ).toBeVisible();
  // Where every step on the branch was applied by itself, there is nothing to take back
  // (on the page loaded again, the switch kept on).
  await start(page, "A * B |- B * A");
  await tool(page, "Undo").click();
  const note = page.locator(".goal-note");
  await expect(note.locator(".kw")).toHaveText("Nothing to undo on this branch.");
  await expect(note).toContainText(
    "Every step on this branch is an invertible rule the page applied by itself.",
  );
});

test("with the switch on, the hint points past the invertible rules, at the split that comes next", async ({
  page,
}) => {
  await goto(page);
  await (await invertible(page)).check();
  await page.keyboard.press("Escape");
  await start(page, "A * B |- B * A", false);
  await page.getByRole("button", { name: "Hint" }).click();
  await expect(page.locator(".fb[data-hinted]")).toHaveAccessibleName(/^B ⊗ A/);
});
