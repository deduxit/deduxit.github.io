// deduxit © Fabian Lukas Grubmüller 2026
// Licensed under the EUPL

import { expect, test } from "./fixtures";
import { calculus, rule, start } from "./prover";

test("a proof goes at a phone's width, and the page does not scroll sideways", async ({ page }) => {
  await start(page, "A * B |- B * A");
  await rule(page, /^A⊥ ⅋ B⊥/, "⅋");
  await rule(page, /^B ⊗ A/, "⊗");
  await page.getByRole("button", { name: /^B⊥, formula 2/ }).click();
  await page.getByRole("dialog", { name: "Split" }).getByRole("button", { name: "Apply" }).click();
  await page.getByRole("button", { name: "Close all" }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Proved: every goal is closed" }),
  ).toBeVisible();
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBe(0);
});

test("Learn's frame takes the lower half at a phone's width, with no sideways scroll", async ({
  page,
}) => {
  await page.goto("/");
  await page.locator("footer").getByRole("button", { name: "Learn" }).click();
  const frame = page.getByRole("complementary", { name: "Learn" });
  await frame.getByRole("button", { name: "Lesson 2: The multiplicatives" }).click();
  await frame.getByRole("button", { name: "Prove Tensor commutes" }).click();
  await expect(page.locator(".ptab .pt-go .m")).toHaveText("A ⊗ B ⊢ B ⊗ A");
  const [frameBox, stage] = [await frame.boundingBox(), await page.locator(".stage").boundingBox()];
  expect(frameBox && stage && frameBox.y >= stage.y + stage.height).toBe(true);
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBe(0);
});

test("More's sheet links the privacy page at a phone's width", async ({ page }) => {
  await page.goto("/");
  await page.locator("footer").getByRole("button", { name: "More" }).click();
  await page.getByRole("dialog", { name: "More" }).getByRole("link", { name: "Privacy" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Privacy" })).toBeVisible();
});

test("Practice is in the bottom band at a phone's width, and a problem opens from it", async ({
  page,
}) => {
  for (const width of [320, 360, 412]) {
    await page.setViewportSize({ width, height: 800 });
    await page.goto("/");
    const button = page.locator("footer").getByRole("button", { name: "Practice", exact: true });
    await expect(button, `${width}`).toBeVisible();
    const box = await button.boundingBox();
    expect(box && box.x >= 0 && box.x + box.width <= width, `${width}`).toBe(true);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow, `${width}`).toBe(0);
  }
  await page.locator("footer").getByRole("button", { name: "Practice", exact: true }).click();
  const practice = page.getByRole("dialog", { name: "Practice" });
  await practice.getByRole("button", { name: /^Prove A & B ⊢ A,/ }).click();
  await expect(practice).toBeHidden();
  await expect(page.locator(".ptab[aria-current=true] .pt-go .m")).toHaveText("A & B ⊢ A");
});

test("the goal bar keeps one row at a phone's width, Cut and the new tab's button in it", async ({
  page,
}) => {
  await start(page, "A * B |- B * A");
  const bar = page.locator(".dock .gbar");
  await expect(bar.getByRole("button", { name: "Cut", exact: true })).toBeVisible();
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
  await page.getByRole("button", { name: "Close all" }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Proved: every goal is closed" }),
  ).toBeVisible();
  await page.locator("footer").getByRole("button", { name: "More" }).click();
  await page.getByRole("dialog", { name: "More" }).getByRole("button", { name: "Export" }).click();
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

test("with Learn open, a fitted goal's buttons lie over its formulas, and its dock clears the stage's controls", async ({
  page,
}) => {
  // Lesson 7's search that gives up: a long sequent fitted small, its dock three rows high.
  await page.goto("/");
  await page.locator("footer").getByRole("button", { name: "Learn" }).click();
  await page.getByRole("button", { name: "Lesson 7: When there is no proof" }).click();
  await page.getByRole("button", { name: "Ask deduxit about A false case" }).click();
  await page.getByRole("button", { name: "Search it with a budget of 20 units" }).click();
  await expect(page.getByRole("button", { name: "Try 40 units" })).toBeVisible();
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
  await page.mouse.move(200, 300);
  await page.mouse.down();
  for (let step = 1; step <= 5; step++) await page.mouse.move(200, 300 - 10 * step);
  await page.mouse.up();
  expect(await top()).toBeLessThan(before - 40);
});
