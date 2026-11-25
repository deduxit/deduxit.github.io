// deduxit © Fabian Lukas Grubmüller 2026
// Licensed under the EUPL

import { expect, test } from "./fixtures";
import { calculus, newTab, proved, rule, start, tool } from "./prover";

test("a proof goes at a phone's width, and the page does not scroll sideways", async ({ page }) => {
  await start(page, "A * B |- B * A");
  await rule(page, /^A⊥ ⅋ B⊥/, "⅋");
  await rule(page, /^B ⊗ A/, "⊗");
  await page.getByRole("button", { name: /^B⊥, formula 2/ }).click();
  await page.getByRole("dialog", { name: "Split" }).getByRole("button", { name: "Apply" }).click();
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

test("the goal bar keeps one row at a phone's width, the new tab's button in it", async ({
  page,
}) => {
  await start(page, "A * B |- B * A");
  const bar = page.locator(".dock .gbar");
  await expect(bar.getByRole("button", { name: "Open this goal in a new tab" })).toBeVisible();
  const rows = await bar.evaluate((element) => {
    const tops = [...element.children].map((child) => {
      const r = child.getBoundingClientRect();
      return r.width === 0 ? null : Math.round(r.top + r.height / 2);
    });
    return new Set(tops.filter((top) => top !== null)).size;
  });
  expect(rows).toBe(1);
});

test("a finished proof's λ-term shows in Export from More's sheet at a phone's width, without sideways scroll", async ({
  page,
}) => {
  await start(page, "|- (a -o b) -o (b -o c) -o a -o c");
  await calculus(page, ["Intuitionistic"]);
  await tool(page, "Close all").click();
  await expect(proved(page)).toBeVisible();
  await tool(page, "More").click();
  await tool(page, "Export").click();
  const item = page
    .getByRole("menu", { name: "Export" })
    .getByRole("menuitem", { name: /^λ-term/ });
  await expect(item.locator(".judgement")).toContainText("λf. λg. λx. g (f x)");
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBe(0);
});

test("a tap opens a rule's hint, and a tap elsewhere closes it", async ({ page }) => {
  await start(page, "A * B |- B * A");
  await page.getByRole("button", { name: /^A⊥ ⅋ B⊥, formula/ }).tap();
  await page
    .getByRole("dialog", { name: "Rules" })
    .getByRole("button", { name: "About par" })
    .tap();
  const hint = page.locator(".rule-tip");
  await expect(hint).toContainText("⅋: par");
  await expect(hint.getByRole("img", { name: "⅋: from ⊢ Γ, A, B to ⊢ Γ, A ⅋ B" })).toBeVisible();
  await page.getByRole("dialog", { name: "Rules" }).locator(".pop-h").tap();
  await expect(hint).toHaveCount(0);
});

test("a fitted goal's buttons lie over its formulas, and its dock clears the stage's controls", async ({
  page,
}) => {
  // A long sequent fitted small, its dock three rows high with the search's long reason.
  await page.goto("/");
  await newTab(page);
  await calculus(page, ["Intuitionistic"]);
  await page
    .getByRole("textbox", { name: "Sequent" })
    .fill("!(a -o a * a * a), !(a -o a), a |- a * (a + 0)");
  await page.getByRole("textbox", { name: "Sequent" }).press("Enter");
  await page.getByRole("button", { name: "Close goal" }).click();
  await expect(page.locator(".dock .note").getByRole("button", { name: "more" })).toBeVisible();
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
    const dock = document.querySelector(".dock")?.getBoundingClientRect();
    const controls = document.querySelector(".stage-ctl")?.getBoundingClientRect();
    return { off, clear: !!dock && !!controls && dock.bottom <= controls.top };
  });
  expect(placed).toEqual({ off: [], clear: true });
  // A drag up on the field stays where the visitor leaves it: the dock moves the drawing only
  // where the page placed it.
  const top = () =>
    page.locator(".world").evaluate((w) => new DOMMatrix(getComputedStyle(w).transform).f);
  const before = await top();
  // The dock follows the goal in the event that moved it, never a move behind: right above the
  // goal with its formulas' buttons, or right below it.
  const docked = () =>
    page.evaluate(() => {
      const probe = document.createElement("div");
      probe.style.height = "var(--spacing-2)";
      document.body.append(probe);
      const gap = probe.getBoundingClientRect().height;
      probe.remove();
      const dock = document.querySelector(".dock")?.getBoundingClientRect();
      const goal = [document.getElementById("i0"), ...document.querySelectorAll(".fb[data-active]")]
        .filter((e) => e !== null)
        .map((e) => e.getBoundingClientRect());
      if (!dock || goal.length === 0) return "no dock or goal";
      const above = Math.min(...goal.map((r) => r.top)) - dock.height - gap;
      const below = Math.max(...goal.map((r) => r.bottom)) + gap;
      return Math.abs(dock.top - above) < 1 || Math.abs(dock.top - below) < 1
        ? "docked"
        : `${String(Math.round(dock.top))} for ${String(Math.round(above))} or ${String(Math.round(below))}`;
    });
  const steps = [await docked()];
  // The field's empty part at the stage's lower left, under the goal, left of the zoom.
  const field = await page.locator(".stage").boundingBox();
  const x = (field?.x ?? 0) + 8;
  const y = (field?.y ?? 0) + (field?.height ?? 0) - 12;
  await page.mouse.move(x, y);
  await page.mouse.down();
  for (let step = 1; step <= 5; step++) {
    await page.mouse.move(x, y - 10 * step);
    steps.push(await docked());
  }
  await page.mouse.up();
  expect(await top()).toBeLessThan(before - 40);
  expect(steps).toEqual(Array(6).fill("docked"));
});
