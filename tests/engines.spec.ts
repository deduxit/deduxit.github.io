// deduxit © Fabian Lukas Grubmüller 2026
// Licensed under the EUPL

// The engines on the page: every search names the engine that did its work
// beside that work, with its source one gesture away; Settings forces one;
// the inverse method's saturation is shown as a checked refutation, and a
// forced engine holds for the visit alone. And the
// practice set, and the field's Enter while a search runs.

import { expect, test } from "./fixtures";
import { calculus, closeGoal, start, tool, viewCell } from "./prover";

/** Sends the visible proof to intuitionistic mode before any step. */
async function intuitionistic(page: import("@playwright/test").Page) {
  await calculus(page, ["Intuitionistic"]);
  await expect(viewCell(page)).toHaveAttribute("data-tip", /ILL/);
}

test("a search names its engine beside its work, with its source on hover", async ({ page }) => {
  await start(page, "A & B |- A * B");
  await closeGoal(page);
  const chip = page.locator(".goal-note .kw.engine");
  await expect(chip).toHaveText("Focused search");
  await chip.hover();
  await expect(page.getByRole("tooltip")).toContainText("Andreoli 1992");
});

test("a saturation refutation is shown checked, by the inverse method", async ({ page }) => {
  await start(page, "!(a -o a * a * a), !(a -o a), a |- a * (a + 0)");
  await intuitionistic(page);
  await closeGoal(page);
  const note = page.locator(".goal-note");
  await expect(note.locator(".kw.bad")).toHaveText("Unprovable, checked: saturation.");
  await expect(note.locator(".kw.engine")).toHaveText("Inverse method");
  // The long reason: its first sentence in view, the rest behind "more".
  await expect(note).toContainText("The inverse method built every sequent");
  await expect(note).not.toContainText("checker confirmed the set");
  await note.getByRole("button", { name: "more" }).click();
  await expect(note).toContainText("checker confirmed the set");
  await expect(page.locator(".chip[aria-selected=true] svg.lucide-x")).toBeVisible();
  await tool(page, "Export").click();
  // Why the item is greyed is a line of the item itself.
  await expect(page.getByRole("menuitem", { name: /Not derivable/ })).toContainText(
    "no Rocq certificate",
  );
});

test("Settings forces an engine: those that take the sequent, the others greyed with why, a refusal at the goal", async ({
  page,
}) => {
  await start(page, "A * B |- B * A");
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  const engines = page.getByRole("radiogroup", { name: "Engine" });
  await expect(engines.getByRole("radio", { name: /^Automatic/ })).toBeChecked();
  await expect(engines.getByText("here the focused search")).toBeVisible();
  const twoSided = engines.getByRole("radio", { name: /^Two-sided focused search/ });
  await expect(twoSided).toBeDisabled();
  await expect(twoSided).toHaveAccessibleName(/not in classical mode/);
  await engines.getByRole("radio", { name: /^Proof-net search/ }).check();
  await expect(engines.getByRole("radio", { name: /^Proof-net search/ })).toBeChecked();
  // Settings is a page: its own button leaves it.
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await closeGoal(page);
  await expect(page.getByText("Proved. Every goal is closed.")).toBeVisible();
  await expect(page.locator(".drawing svg text.engine")).toHaveText("Proof-net search");
  // A sequent with a unit is no net's: the forced engine's refusal is said at the goal.
  await start(page, "|- 1, bot", false);
  await closeGoal(page);
  await expect(page.locator(".goal-note .kw.bad")).toHaveText(
    "The proof-net search does not take this goal.",
  );
});

test("a forced engine holds for the visit: the next visit starts on Automatic, every other setting kept", async ({
  page,
}) => {
  await start(page, "A * B |- B * A");
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  const settings = page.getByRole("region", { name: "Settings" });
  await settings
    .getByRole("radiogroup", { name: "Engine" })
    .getByRole("radio", { name: /^Proof-net search/ })
    .check();
  await settings.getByRole("button", { name: "Compact" }).click();
  // Settings is a page: its own button leaves it.
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  const stored = () =>
    page.evaluate(() => JSON.parse(localStorage.getItem("deduxit-settings") ?? "{}"));
  expect(await stored()).toMatchObject({ net: "compact" });
  expect(await stored()).not.toHaveProperty("engine");
  await page.reload();
  await expect(page.locator(".chip")).not.toHaveCount(0);
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await expect(
    settings.getByRole("radiogroup", { name: "Engine" }).getByRole("radio", { name: /^Automatic/ }),
  ).toBeChecked();
  await expect(settings.getByRole("button", { name: "Compact" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
});

test("Enter in the sequent field while a search runs waits for it, and is not lost", async ({
  page,
}) => {
  await start(page, "!(a -o a * a * a), !(a -o a), a |- a * (a + 0)");
  await intuitionistic(page);
  await closeGoal(page);
  await page.getByRole("button", { name: "New sequent", exact: true }).click();
  await page.getByRole("textbox", { name: "Sequent" }).fill("A |- A");
  await page.getByRole("textbox", { name: "Sequent" }).press("Enter");
  await expect(page.getByRole("button", { name: /^A, formula 2 of goal 1/ })).toBeVisible();
  await expect(page.locator(".chip")).toHaveCount(2);
});
