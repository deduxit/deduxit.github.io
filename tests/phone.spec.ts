// deduxit © Fabian Lukas Grubmüller 2026
// Licensed under the EUPL

import { expect, test } from "./fixtures";
import { calculus, closeGoal, goalMenu, newTab, proved, rule, start, tool } from "./prover";

test("a proof goes at a phone's width, and the page does not scroll sideways", async ({ page }) => {
  await start(page, "A * B |- B * A");
  await rule(page, /^A⊥ ⅋ B⊥/, "⅋");
  await rule(page, /^B ⊗ A/, "⊗");
  const split = page.getByRole("group", { name: /^Split for ⊗/ });
  await split.getByRole("button", { name: "B⊥", exact: true }).click();
  await split.getByRole("button", { name: "Apply ⊗" }).click();
  await tool(page, "Close all").click();
  await expect(proved(page)).toBeVisible();
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBe(0);
});

test("Settings links the privacy page at a phone's width", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.getByRole("link", { name: "Privacy" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Privacy" })).toBeVisible();
});

test("the top row, the views and the tools' bar fit from 320 pixels, with no sideways scroll", async ({
  page,
}) => {
  await start(page, "A * B |- B * A");
  for (const width of [320, 360, 412]) {
    await page.setViewportSize({ width, height: 800 });
    for (const control of [
      page.getByRole("button", { name: "New sequent", exact: true }),
      page.getByRole("button", { name: "Settings", exact: true }),
      tool(page, "More"),
      page.getByRole("button", { name: "Enter" }),
    ]) {
      const box = await control.boundingBox();
      expect(box && box.x >= 0 && box.x + box.width <= width, `${width}`).toBe(true);
    }
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow, `${width}`).toBe(0);
  }
});

test("the goal's menu and the rule popover are sheets above the stage's controls at a phone's width", async ({
  page,
}) => {
  await start(page, "A * B |- B * A");
  const controls = await page.locator(".stage-ctl").boundingBox();
  const width = page.viewportSize()?.width ?? 0;
  for (const open of [
    async () => (await goalMenu(page)).boundingBox(),
    async () => {
      await page.keyboard.press("Escape");
      await page.getByRole("button", { name: /^A⊥ ⅋ B⊥, formula/ }).tap();
      return page.getByRole("dialog", { name: "Rules" }).boundingBox();
    },
  ]) {
    const box = await open();
    expect(box && controls && box.y + box.height <= controls.y + 1).toBe(true);
    expect(box && box.x >= 0 && box.x + box.width <= width).toBe(true);
  }
});

test("Export from More's sheet at a phone's width: the entries in rows over the LaTeX, no sideways scroll", async ({
  page,
}) => {
  await start(page, "|- (a -o b) -o (b -o c) -o a -o c");
  await calculus(page, ["Intuitionistic"]);
  await tool(page, "Close all").click();
  await expect(proved(page)).toBeVisible();
  await tool(page, "More").click();
  await tool(page, "Export").click();
  const panel = page.getByRole("dialog", { name: "Export" });
  await panel.getByRole("button", { name: "LaTeX", exact: true }).click();
  await expect(panel.locator("pre")).toContainText("\\begin{prooftree}");
  // Every entry is whole in the window, above the chosen entry's text.
  const width = page.viewportSize()?.width ?? 0;
  const text = await panel.locator("pre").boundingBox();
  for (const entry of await panel.locator(".ex-entry").all()) {
    const box = await entry.boundingBox();
    expect(box && box.x >= 0 && box.x + box.width <= width).toBe(true);
    expect(box && text && box.y + box.height <= text.y).toBe(true);
  }
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBe(0);
});

test("a tap on a greyed rule shows why it does not apply, and a second tap takes it away", async ({
  page,
}) => {
  await start(page, "|- 1, A");
  await page.getByRole("button", { name: /^1, formula/ }).tap();
  const greyed = page
    .getByRole("dialog", { name: "Rules" })
    .getByRole("button", { name: "1, does not apply" });
  // A greyed rule is aria-disabled, which Playwright will not press unforced; a visitor can.
  await greyed.tap({ force: true });
  const card = page.locator('.rule-card[role="note"]');
  await expect(card).toContainText("1 refused");
  await expect(card.getByRole("img", { name: /over ⊢ 1$/ })).toBeVisible();
  await greyed.tap({ force: true });
  await expect(card).toHaveCount(0);
});

test("a fitted goal's buttons lie over its formulas, and its line follows it as the field is dragged", async ({
  page,
}) => {
  // A long sequent fitted small, with the search's long reason over the bottom box.
  await page.goto("/");
  await newTab(page);
  await calculus(page, ["Intuitionistic"]);
  await page
    .getByRole("textbox", { name: "Sequent" })
    .fill("!(a -o a * a * a), !(a -o a), a |- a * (a + 0)");
  await page.getByRole("textbox", { name: "Sequent" }).press("Enter");
  await closeGoal(page);
  await expect(page.locator(".goal-note").getByRole("button", { name: "more" })).toBeVisible();
  const placed = await page.evaluate(() => {
    const off: string[] = [];
    for (const button of document.querySelectorAll<HTMLElement>(".fb[data-active]")) {
      const b = button.getBoundingClientRect();
      // The goal is the drawing's one inference, i0.
      const formula = document.getElementById(`i0-${button.dataset["position"]}`);
      const f = formula?.getBoundingClientRect();
      const x = f ? f.left + f.width / 2 : -1;
      const y = f ? f.top + f.height / 2 : -1;
      if (x < b.left || x > b.right || y < b.top || y > b.bottom)
        off.push(button.getAttribute("aria-label") ?? "");
    }
    return off;
  });
  expect(placed).toEqual([]);
  const top = () =>
    page.locator(".world").evaluate((w) => new DOMMatrix(getComputedStyle(w).transform).f);
  const before = await top();
  // The goal's line stands right over the goal in every move of a drag.
  const lined = () =>
    page.evaluate(() => {
      const line = document.querySelector(".goal-line[data-active]")?.getBoundingClientRect();
      const goal = document.getElementById("i0")?.getBoundingClientRect();
      if (!line || !goal) return "no line or goal";
      return line.top <= goal.top && goal.top - line.top < goal.height ? "over" : "off";
    });
  const steps = [await lined()];
  // The field's empty part at the stage's left edge, half way down: its foot holds the notes.
  const field = await page.locator(".stage").boundingBox();
  const x = (field?.x ?? 0) + 8;
  const y = (field?.y ?? 0) + (field?.height ?? 0) / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  for (let step = 1; step <= 5; step++) {
    await page.mouse.move(x, y - 10 * step);
    steps.push(await lined());
  }
  await page.mouse.up();
  expect(await top()).toBeLessThan(before - 40);
  expect(steps).toEqual(Array(6).fill("over"));
});
