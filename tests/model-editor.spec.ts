// deduxit © Fabian Lukas Grubmüller 2026
// Licensed under the EUPL

// The model editor: a countermodel of the modal or the ordinary suite opened in it, or a model of
// one's own asked for; arrows dragged from world to world and back onto a world for a loop, a
// world moved, the check's findings marked on the drawing, and every edit done by the keyboard
// alone through the world's form. A visitor who never asks for it sees nothing of it.

import type { Locator, Page } from "@playwright/test";
import { expect, test } from "./fixtures";
import { addView, calculus, goto, switches } from "./prover";

/** Opens the page with its tab in modal logic, in `system`, and decides `sequent`. */
async function modal(page: Page, system: string, sequent: string) {
  await goto(page);
  await calculus(page, ["Modal logic"]);
  if (system !== "K")
    await (await switches(page)).getByRole("combobox", { name: "System" }).selectOption(system);
  await page.keyboard.press("Escape");
  await page.getByRole("textbox", { name: "Sequent" }).fill(sequent);
  await page.getByRole("textbox", { name: "Sequent" }).press("Enter");
  await expect(page.locator(".modal .method-verdict .kw").first()).toBeVisible();
}

/** Starts `sequent` in an ordinary tab of `logic`. */
async function ordinary(page: Page, logic: string, sequent: string) {
  await goto(page);
  await calculus(page, ["Ordinary", logic]);
  await page.getByRole("textbox", { name: "Sequent" }).fill(sequent);
  await page.getByRole("textbox", { name: "Sequent" }).press("Enter");
  await expect(page.locator(".stage .fb").first()).toBeVisible();
}

/** World `n`'s box on the canvas. */
const world = (page: Page, n: number) => page.locator(`.kripke-world[data-world="${n}"]`);

/** The centre of an element's box on the screen. */
async function centre(element: Locator) {
  const box = await element.locator(".kripke-box").boundingBox();
  if (!box) throw new Error("not on screen");
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

/** Drags with the pointer from world `from` along `through` to its last point, then lets go. */
async function drag(page: Page, from: number, ...through: { x: number; y: number }[]) {
  const start = await centre(world(page, from));
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  for (const p of through) await page.mouse.move(p.x, p.y, { steps: 6 });
  await page.mouse.up();
}

test("nothing of the editor shows until a model is asked for", async ({ page }) => {
  await ordinary(page, "Intuitionistic", "a |- a");
  await expect(page.locator(".kripke")).toHaveCount(0);
  await addView(page, "A model of your own");
  await expect(page.locator(".kripke-canvas")).toBeVisible();
  await expect(page.getByRole("tab", { name: "A model of your own" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await page
    .getByRole("tab", {
      name: /^(Sequent calculus|Natural deduction|Classical linear|Intuitionistic linear)/,
    })
    .click();
  await expect(page.locator(".kripke")).toHaveCount(0);
  // The view stays in the rail, to come back to.
  await expect(page.getByRole("tab", { name: "A model of your own" })).toHaveAttribute(
    "aria-selected",
    "false",
  );
});

test("a modal countermodel is changed by dragging: an arrow, a loop, a world moved", async ({
  page,
}) => {
  await modal(page, "K", "[]p -> [][]p");
  await page.getByText("Change the model and check it").click();
  await page.getByRole("button", { name: "Check the model" }).click();
  await expect(page.locator(".modal-check")).toContainText("Fails");
  // The failing world and the witness are marked on the drawing, in words too.
  await expect(world(page, 0)).toHaveAttribute("data-failing", "");
  await expect(world(page, 0)).toHaveAccessibleName(/the sequent fails here$/);
  await expect(world(page, 1)).toHaveAttribute("data-witness", "");
  await expect(page.locator('.kripke-words [data-world="1"] .kripke-tag')).toHaveText("witness");

  await drag(page, 2, await centre(world(page, 0)));
  await expect(world(page, 2)).toHaveAccessibleName("World 2, forces no atom, sees world 0");
  // A change of the model takes the last check away, and its marks with it.
  await expect(page.locator(".modal-check")).toHaveCount(0);
  await expect(world(page, 0)).not.toHaveAttribute("data-failing", "");

  const one = await centre(world(page, 1));
  await drag(page, 1, { x: one.x + 120, y: one.y }, one);
  await expect(world(page, 1)).toHaveAccessibleName("World 1, forces p, sees itself and world 2");
  await drag(page, 1, { x: one.x + 120, y: one.y }, one);
  await expect(world(page, 1)).toHaveAccessibleName("World 1, forces p, sees world 2");

  const before = await world(page, 2).getAttribute("transform");
  const two = await centre(world(page, 2));
  await drag(page, 2, { x: two.x + 150, y: two.y });
  await expect(world(page, 2)).not.toHaveAttribute("transform", before ?? "");
  await expect(world(page, 2)).toHaveAccessibleName("World 2, forces no atom, sees world 0");
  await page.getByRole("button", { name: "Check the model" }).click();
  await expect(page.locator(".modal-check")).toContainText("Fails");
});

test("the frame condition is named, its worlds marked and the arrow it asks for dashed", async ({
  page,
}) => {
  await modal(page, "T", "[]p -> [][]p");
  await page.getByText("Change the model and check it").click();
  await page.getByRole("checkbox", { name: "World 0 sees world 0" }).uncheck();
  await page.getByRole("button", { name: "Check the model" }).click();
  await expect(page.locator(".modal-check")).toContainText(
    "Not reflexive: world 0 does not see itself.",
  );
  await expect(world(page, 0)).toHaveAttribute("data-frame", "");
  await expect(page.locator(".kripke-arrow.missing")).toHaveCount(1);
  // Drawn in, the loop meets the condition, and the model fails the sequent again.
  const zero = await centre(world(page, 0));
  await drag(page, 0, { x: zero.x + 120, y: zero.y }, zero);
  await expect(page.locator(".kripke-arrow.missing")).toHaveCount(0);
  await page.getByRole("button", { name: "Check the model" }).click();
  await expect(page.locator(".modal-check")).toContainText("Fails");
});

test("the keyboard alone selects, moves and changes a world, and checks the model", async ({
  page,
}) => {
  await modal(page, "K", "[]p -> [][]p");
  const summary = page.getByText("Change the model and check it");
  await summary.focus();
  await page.keyboard.press("Enter");
  await page.keyboard.press("Tab");
  await expect(world(page, 0)).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(world(page, 1)).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(world(page, 1)).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(".kripke-form legend")).toHaveText("World 1");
  const before = await world(page, 1).getAttribute("transform");
  await page.keyboard.press("ArrowRight");
  await expect(world(page, 1)).not.toHaveAttribute("transform", before ?? "");
  await page.keyboard.press("Tab");
  await page.keyboard.press("Tab");
  const atoms = page.getByRole("textbox", { name: "Atoms world 1 forces" });
  await expect(atoms).toBeFocused();
  await page.keyboard.press("ControlOrMeta+a");
  await page.keyboard.press("Backspace");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("checkbox", { name: "World 1 sees world 0" })).toBeFocused();
  await page.keyboard.press("Space");
  await expect(world(page, 1)).toHaveAccessibleName("World 1, forces no atom, sees worlds 0 and 2");
  await expect(page.locator(".kripke [aria-live]")).toHaveText(
    "The arrow from world 1 to world 0 is added.",
  );
  await page.getByRole("button", { name: "Check the model" }).focus();
  await page.keyboard.press("Enter");
  await expect(page.locator(".modal-check")).toContainText("Holds");
});

test("an ordinary countermodel opens in the model view; a model of another logic is refused", async ({
  page,
}) => {
  await ordinary(page, "Intuitionistic", "|- a \\/ ~a");
  await page.getByRole("button", { name: "Close goal" }).click();
  await page.getByRole("button", { name: "Change this model and check it" }).click();
  const view = page.getByRole("region", { name: "Model" });
  await expect(view).toContainText("The countermodel deduxit found");
  await expect(view).toContainText("⊢ a ∨ ¬a");
  await view.getByRole("button", { name: "Check the model" }).click();
  await expect(view.locator(".modal-check")).toContainText("Fails");
  await expect(view.locator(".modal-check")).toContainText("a ∨ ¬a is not forced");
  await expect(world(page, 0)).toHaveAttribute("data-failing", "");
  // An atom at the lower world alone: the world above forgets it, which no model of the logic does.
  await world(page, 0).click();
  await view.getByRole("textbox", { name: "Atoms world 0 forces" }).fill("b");
  await view.getByRole("textbox", { name: "Atoms world 0 forces" }).press("Tab");
  await view.getByRole("button", { name: "Check the model" }).click();
  await expect(view.locator(".modal-check")).toContainText("No model of intuitionistic logic");
  await expect(view.locator(".modal-check")).toContainText("does not force all it forces.");
  await page
    .getByRole("tab", {
      name: /^(Sequent calculus|Natural deduction|Classical linear|Intuitionistic linear)/,
    })
    .click();
  await expect(view).toHaveCount(0);
});

test("in minimal logic a world of one's own model may force ⊥", async ({ page }) => {
  await ordinary(page, "Minimal", "~~a |- a");
  await addView(page, "A model of your own");
  const view = page.getByRole("region", { name: "Model" });
  await expect(view).toContainText("A model of minimal logic");
  await view.getByRole("checkbox", { name: "World 0 forces ⊥" }).check();
  await expect(page.locator('.kripke-words [data-world="0"] .kripke-atoms')).toHaveText("⊥");
  await view.getByRole("button", { name: "Check the model" }).click();
  // ¬¬a holds at a world that forces ⊥, and a does not: the sequent fails there.
  await expect(view.locator(".modal-check")).toContainText("Fails");
});

test("adding and removing worlds keeps the places, and the world checked at follows", async ({
  page,
}) => {
  await modal(page, "K", "[]p -> [][]p");
  await page.getByText("Change the model and check it").click();
  const two = await centre(world(page, 2));
  await drag(page, 2, { x: two.x + 150, y: two.y });
  const places = async () =>
    Promise.all([0, 1, 2].map((n) => world(page, n).getAttribute("transform")));
  const before = await places();
  await page.getByRole("button", { name: "Add a world" }).click();
  expect(await places()).toEqual(before);
  const check = page.getByRole("combobox", { name: "The world to check the sequent at" });
  await check.selectOption("2");
  // World 1 goes: world 2 is world 1 now, and the check goes with it.
  await world(page, 1).click();
  await page.getByRole("button", { name: "Remove world 1" }).click();
  await expect(check).toHaveValue("1");
  await expect(world(page, 1)).toHaveAttribute("transform", before[2] ?? "");
  await world(page, 1).click();
  await page.getByRole("button", { name: "Remove world 1" }).click();
  await expect(check).toHaveValue("");
  await page.getByRole("button", { name: "Check the model" }).click();
  await expect(page.locator(".modal-check")).toContainText("at every world");
});

test("ordinary logic draws no loop, and a removal hands the focus to a world", async ({ page }) => {
  await ordinary(page, "Intuitionistic", "|- a \\/ ~a");
  await page.getByRole("button", { name: "Close goal" }).click();
  await page.getByRole("button", { name: "Change this model and check it" }).click();
  const zero = await centre(world(page, 0));
  await drag(page, 0, { x: zero.x + 150, y: zero.y }, zero);
  await expect(world(page, 0)).toHaveAccessibleName(
    "World 0, forces no atom, has world 1 directly above it",
  );
  await expect(page.locator(".kripke-arrow")).toHaveCount(1);
  await page.getByRole("button", { name: "Remove world 0" }).focus();
  await page.keyboard.press("Enter");
  await expect(world(page, 0)).toBeFocused();
});
