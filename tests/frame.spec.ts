// deduxit © Fabian Lukas Grubmüller 2026
// Licensed under the EUPL

// The frame around the stage (the design guide's "The frame", "Window sizes" and "Keys"): the
// new tab view, the chips and the rail, the tools, the bottom box and its notes, the keys and
// their switch, light and dark, the Settings page, restoring and closing, files opened, and the
// layout at each window class.

import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";
import { addView, closeGoal, goto, newTab, proved, start, tool } from "./prover";

test("the new tab view offers four logics, and a sequent entered becomes a chip", async ({
  page,
}) => {
  await goto(page);
  const logics = page.getByRole("region", { name: "New sequent" });
  for (const name of ["Ordinary logic", "Linear logic", "Modal logic", "Lambda-terms"])
    await expect(logics.getByRole("button", { name })).toBeVisible();
  await logics.getByRole("button", { name: "Ordinary logic" }).click();
  await expect(logics.getByRole("button", { name: "Ordinary logic" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(page.getByRole("group", { name: "Calculus of this view" })).toContainText("Minimal");
  const box = page.getByRole("textbox", { name: "Sequent" });
  await box.fill("a /\\ b |- b /\\ a");
  await box.press("Enter");
  await expect(page.getByRole("tab", { name: /^a ∧ b ⊢ b ∧ a, 1 goal open$/ })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  // The box writes the sequent in signs once it is entered.
  await expect(box).toHaveValue("a ∧ b ⊢ b ∧ a");
  await expect(page.getByRole("tab", { name: /^Sequent calculus, LK/ })).toBeVisible();
});

test("a text that is no sequent marks the box and says why above it, until it is typed again", async ({
  page,
}) => {
  await goto(page);
  const box = page.getByRole("textbox", { name: "Sequent" });
  await box.fill("A *");
  await box.press("Enter");
  await expect(page.locator(".box")).toHaveAttribute("data-invalid", "");
  await expect(box).toHaveAttribute("aria-invalid", "true");
  await expect(page.getByRole("alert")).toBeVisible();
  await box.press("End");
  await box.pressSequentially(" B");
  await expect(page.getByRole("alert")).toBeHidden();
  await expect(page.locator(".box")).not.toHaveAttribute("data-invalid", "");
});

test("+ and the word mark open the new tab view, an empty one opened once", async ({ page }) => {
  await start(page, "A * B |- B * A");
  await newTab(page);
  await expect(page.locator(".chip")).toHaveCount(2);
  await page.getByRole("tab", { name: /^A ⊗ B ⊢ B ⊗ A/ }).click();
  await expect(page.getByRole("region", { name: "New sequent" })).toBeHidden();
  await page.getByRole("link", { name: "deduxit, a new sequent" }).click();
  await expect(page.getByRole("region", { name: "New sequent" })).toBeVisible();
  await expect(page.locator(".chip")).toHaveCount(2);
});

test("the chips are a tab list: the arrow keys and T move between the sequents", async ({
  page,
}) => {
  await start(page, "A * B |- B * A");
  await start(page, "A |- A", false);
  const first = page.getByRole("tab", { name: /^A ⊗ B ⊢ B ⊗ A/ });
  const second = page.getByRole("tab", { name: /^A ⊢ A/ });
  await expect(second).toHaveAttribute("aria-selected", "true");
  await second.focus();
  await page.keyboard.press("ArrowLeft");
  await expect(first).toHaveAttribute("aria-selected", "true");
  await expect(first).toBeFocused();
  await page.locator(".stage").click({ position: { x: 20, y: 300 } });
  await page.keyboard.press("t");
  await expect(second).toHaveAttribute("aria-selected", "true");
  await page.keyboard.press("Shift+T");
  await expect(first).toHaveAttribute("aria-selected", "true");
});

test("the rail shows a finished linear proof's net in its capsule, and V moves between the views", async ({
  page,
}) => {
  await start(page, "A * B |- B * A");
  const rail = page.getByRole("tablist", { name: "Views of this sequent" });
  await expect(rail.getByRole("tab")).toHaveCount(1);
  await expect(rail.getByRole("tab").first()).toHaveAccessibleName(
    "Classical linear logic, LL, 1 goal open",
  );
  await closeGoal(page);
  await expect(proved(page)).toBeVisible();
  const net = rail.getByRole("tab", { name: "Proof net" });
  await expect(net).toHaveAttribute("data-capsule", "");
  await page.locator(".stage").click({ position: { x: 20, y: 300 } });
  await page.keyboard.press("v");
  await expect(net).toHaveAttribute("aria-selected", "true");
  await page.keyboard.press("Shift+V");
  await expect(net).toHaveAttribute("aria-selected", "false");
});

test("+ view lists the views to add, faint ones with their reason, and an added one gets a cell", async ({
  page,
}) => {
  await start(page, "A * B |- B * A");
  await page.getByRole("button", { name: "Add a view" }).click();
  const list = page.getByRole("dialog", { name: "Add a view" });
  for (const group of ["Prove", "Decide", "Translate", "Read off", "From this proof"])
    await expect(list.getByRole("heading", { name: group })).toBeVisible();
  await expect(list.getByRole("button", { name: "Truth table" })).toHaveAttribute(
    "aria-disabled",
    "true",
  );
  await expect(list).toContainText(
    "This needs a sequent of ordinary classical logic. Start one with + at the top.",
  );
  await page.keyboard.press("Escape");
  await newTab(page);
  await page.getByRole("button", { name: "Ordinary logic" }).click();
  await page.getByRole("textbox", { name: "Sequent" }).fill("a -> b |- b -> a");
  await page.getByRole("textbox", { name: "Sequent" }).press("Enter");
  await addView(page, "Truth table");
  await expect(page.getByRole("tab", { name: "Truth table, TT" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
});

test("the tools are a toolbar: one stop of Tab, the arrow keys move, each names its key", async ({
  page,
}) => {
  await start(page, "A * B |- B * A");
  const tools = page.getByRole("toolbar", { name: "Tools" });
  await expect(tool(page, "Undo")).toHaveAttribute("aria-keyshortcuts", "Control+Z U");
  await expect(tool(page, "Hint")).toHaveAttribute("aria-keyshortcuts", "H");
  // Tab reaches the toolbar once, at a tool that can act, from the rail.
  await page.getByRole("button", { name: "Add a view" }).focus();
  const inTools = () => tools.evaluate((bar) => bar.contains(document.activeElement));
  for (let presses = 0; presses < 30 && !(await inTools()); presses++)
    await page.keyboard.press("Tab");
  expect(await inTools()).toBe(true);
  await expect(tools.locator("[tabindex='0']")).toHaveCount(1);
  await expect(tools.locator("[tabindex='0']")).toBeEnabled();
  await tool(page, "Hint").focus();
  await page.keyboard.press("ArrowDown");
  await expect(tool(page, "Close all")).toBeFocused();
  await page.keyboard.press("ArrowUp");
  await expect(tool(page, "Hint")).toBeFocused();
  await expect(tools.locator("[tabindex='0']")).toHaveCount(1);
});

test("with the guide on, the tools show their names, and Learn and Practice are coming soon", async ({
  page,
}) => {
  await start(page, "A * B |- B * A");
  await expect(page.locator(".tools .tool-name").first()).toBeHidden();
  const guide = page.getByRole("button", { name: "Guide", exact: true });
  await guide.click();
  await expect(guide).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(".tools .tool-name").first()).toBeVisible();
  // Inactive (aria-disabled), it still says why when pressed.
  await tool(page, "Learn").focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("status").filter({ hasText: "Learn is coming soon." })).toBeVisible();
  await newTab(page);
  const practice = page.getByRole("region", { name: "New sequent" }).getByRole("button", {
    name: "Practice",
  });
  await expect(practice).toHaveAttribute("aria-disabled", "true");
  await expect(practice).toHaveAttribute("data-tip", "Coming soon");
});

test("the keys: ? lists them, J and K move between goals, Ctrl+Z undoes, / goes to the box", async ({
  page,
}) => {
  await start(page, "A * B, C |- B * A * C");
  await page.locator(".stage").click({ position: { x: 20, y: 300 } });
  await page.keyboard.press("?");
  const keys = page.getByRole("dialog", { name: "Keys" });
  await expect(keys).toContainText("Next, previous open goal");
  await expect(keys.getByRole("checkbox", { name: "Guide" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(keys).toBeHidden();
  await page.keyboard.press("Control+/");
  await expect(keys).toBeVisible();
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: /^A⊥ ⅋ B⊥, formula/ }).click();
  await page.getByRole("dialog", { name: "Rules" }).getByRole("button", { name: /^⅋/ }).click();
  await expect(tool(page, "Undo")).toBeEnabled();
  await page.locator(".stage").click({ position: { x: 20, y: 300 } });
  await page.keyboard.press("Control+z");
  await expect(tool(page, "Undo")).toBeDisabled();
  await page.keyboard.press("/");
  await expect(page.getByRole("textbox", { name: "Sequent" })).toBeFocused();
  // In the box a letter is the box's.
  await page.keyboard.press("j");
  await expect(page.getByRole("textbox", { name: "Sequent" })).toHaveValue(/j$/);
});

test("J and K go to the next and the previous open goal", async ({ page }) => {
  await start(page, "A * B |- B * A");
  await page.getByRole("button", { name: /^A⊥ ⅋ B⊥, formula/ }).click();
  await page.getByRole("dialog", { name: "Rules" }).getByRole("button", { name: /^⅋/ }).click();
  await page.getByRole("button", { name: /^B ⊗ A, formula/ }).click();
  await page.getByRole("dialog", { name: "Rules" }).getByRole("button", { name: /^⊗/ }).click();
  await page.getByRole("button", { name: "Apply ⊗" }).click();
  const active = page.locator(".gt[data-active]");
  await expect(page.locator(".gt")).toHaveCount(2);
  const first = await active.getAttribute("data-goal");
  await page.locator(".stage").click({ position: { x: 20, y: 300 } });
  await page.keyboard.press("j");
  await expect(active).not.toHaveAttribute("data-goal", first ?? "");
  await page.keyboard.press("k");
  await expect(active).toHaveAttribute("data-goal", first ?? "");
});

test("Settings' Single keys off leaves the letters alone and keeps the keys with Ctrl", async ({
  page,
}) => {
  await start(page, "A * B |- B * A");
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.getByRole("checkbox", { name: "Single keys" }).uncheck();
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.locator(".stage").click({ position: { x: 20, y: 300 } });
  await page.keyboard.press("?");
  await expect(page.getByRole("dialog", { name: "Keys" })).toBeHidden();
  await page.keyboard.press("Control+/");
  await expect(page.getByRole("dialog", { name: "Keys" })).toContainText("Single keys are off");
});

test("light or dark from the top row is kept and read before the first paint", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light" });
  await goto(page);
  await page.getByRole("button", { name: "Dark", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.reload();
  // The scheme is set before the island runs: the body's first script reads it.
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(page.getByRole("button", { name: "Light", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.getByRole("button", { name: "System", exact: true }).click();
  await expect(page.locator("html")).not.toHaveAttribute("data-theme", /./);
});

test("each sequent's model view checks a model of its own sequent", async ({ page }) => {
  await goto(page);
  for (const sequent of ["a |- a", "b |- b"]) {
    await newTab(page);
    await page.getByRole("button", { name: /^Ordinary logic/ }).click();
    await page.getByRole("textbox", { name: "Sequent" }).fill(sequent);
    await page.getByRole("textbox", { name: "Sequent" }).press("Enter");
    await addView(page, "A model of your own");
  }
  await page.locator(".chip").first().click();
  await page.getByRole("tab", { name: /^A model of your own/ }).click();
  await expect(page.getByRole("region", { name: "Model" })).toContainText("a ⊢ a");
});

test("the Settings page takes the stage's place, and closing every sequent can be undone", async ({
  page,
}) => {
  await start(page, "A * B |- B * A");
  await start(page, "A |- A", false);
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Settings", level: 1 })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Views" })).toBeHidden();
  await expect(page.getByRole("textbox", { name: "Sequent" })).toBeHidden();
  await page.getByRole("button", { name: "Close every sequent" }).click();
  await expect(page.locator(".chip")).toHaveCount(1);
  await expect(page.getByRole("region", { name: "New sequent" })).toBeVisible();
  await page
    .getByRole("status")
    .filter({ hasText: "Every sequent closed." })
    .getByRole("button", { name: "Undo" })
    .click();
  await expect(page.getByRole("tab", { name: /^A ⊗ B ⊢ B ⊗ A/ })).toBeVisible();
  await expect(page.getByRole("tab", { name: /^A ⊢ A/ })).toBeVisible();
});

test("a plain visit brings the last proofs back by itself while no other tab of the page is open", async ({
  page,
}) => {
  await start(page, "A * B |- B * A");
  await expect(page).toHaveURL(/#v=/);
  await page.waitForTimeout(500);
  await page.goto("/");
  await expect(page.getByRole("tab", { name: /^A ⊗ B ⊢ B ⊗ A/ })).toBeVisible();
  await expect(page.getByRole("region", { name: "New sequent" })).toBeHidden();
});

test("with the page open in another tab, the new tab view offers Restore N proofs", async ({
  page,
  context,
}) => {
  await start(page, "A * B |- B * A");
  await page.waitForTimeout(500);
  const other = await context.newPage();
  await other.goto("/");
  await expect(other.getByRole("textbox", { name: "Sequent" })).toBeVisible();
  const restore = other.getByRole("button", { name: "Restore 1 proof" });
  await expect(restore).toBeVisible();
  await restore.click();
  await expect(other.getByRole("tab", { name: /^A ⊗ B ⊢ B ⊗ A/ })).toBeVisible();
});

test("Open a file opens its sequent, and the note names the file", async ({ page }) => {
  await goto(page);
  await page.locator(".new-tab input[type=file]").setInputFiles({
    name: "sequent.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("A * B |- B * A"),
  });
  await expect(page.getByRole("status").filter({ hasText: "from sequent.txt" })).toBeVisible();
  await expect(page.locator(".stage .fb").first()).toBeVisible();
});

test("a file dropped under the top row opens, the dashed frame saying so while it is held", async ({
  page,
}) => {
  await goto(page);
  const drop = await page.evaluateHandle(() => {
    const data = new DataTransfer();
    data.items.add(new File(["A * B |- B * A"], "dropped.txt", { type: "text/plain" }));
    return data;
  });
  await page.locator(".body").dispatchEvent("dragover", { dataTransfer: drop });
  await expect(page.getByText("Drop the file to open it")).toBeVisible();
  await page.locator(".body").dispatchEvent("drop", { dataTransfer: drop });
  await expect(page.getByText("Drop the file to open it")).toBeHidden();
  await expect(page.getByRole("status").filter({ hasText: "from dropped.txt" })).toBeVisible();
});

test("a session pasted as deduxit's JSON into the bottom box opens on Enter", async ({ page }) => {
  await start(page, "A * B |- B * A");
  await closeGoal(page);
  await expect(proved(page)).toBeVisible();
  await page.waitForTimeout(500);
  // The session as the page keeps it in the browser: deduxit's JSON.
  const session = await page.evaluate(() => {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i) ?? "";
      if (!key.startsWith("deduxit-proofs:")) continue;
      const shelf = JSON.parse(localStorage.getItem(key) ?? "{}");
      return JSON.stringify(shelf.proofs?.[0]?.session ?? null);
    }
    return "null";
  });
  expect(session).not.toBe("null");
  await newTab(page);
  await page.getByRole("textbox", { name: "Sequent" }).fill(session);
  await page.getByRole("textbox", { name: "Sequent" }).press("Enter");
  await expect(page.locator(".chip")).toHaveCount(2);
  await expect(proved(page)).toBeVisible();
});

test.describe("a compact window", () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

  test("has the square mark, the views in a row, and the tools in a bar with More", async ({
    page,
  }) => {
    await start(page, "A * B |- B * A");
    await expect(page.locator(".mark-square")).toBeVisible();
    await expect(page.locator(".mark-word")).toBeHidden();
    await expect(page.getByRole("button", { name: "Dark" })).toBeHidden();
    const rail = await page.locator(".rail").boundingBox();
    expect(rail?.width).toBeGreaterThan(300);
    const bar = await page.getByRole("toolbar", { name: "Tools" }).boundingBox();
    expect((bar?.y ?? 0) + (bar?.height ?? 0)).toBeGreaterThan(800);
    const box = await page.getByRole("textbox", { name: "Sequent" }).boundingBox();
    expect(box?.height).toBeGreaterThanOrEqual(43);
    await expect(tool(page, "Export")).toBeHidden();
    // More's rows stand where the bottom box was, until a tool is pressed.
    await tool(page, "More").click();
    await expect(tool(page, "Export")).toBeVisible();
    await expect(page.getByRole("textbox", { name: "Sequent" })).toBeHidden();
    await tool(page, "Export").click();
    await expect(page.getByRole("dialog", { name: "Export" })).toBeVisible();
    await expect(tool(page, "Export")).toBeHidden();
    // The panel is a sheet, with a close button.
    await page.getByRole("button", { name: "Close", exact: true }).click();
    await expect(page.getByRole("dialog", { name: "Export" })).toBeHidden();
  });
});

test.describe("a short window", () => {
  test.use({ viewport: { width: 844, height: 390 } });

  test("keeps the rail, puts the rarer tools behind More and the bottom box at the lower left", async ({
    page,
  }) => {
    await start(page, "A * B |- B * A");
    await expect(page.getByRole("navigation", { name: "Views" })).toBeVisible();
    await expect(tool(page, "Export")).toBeHidden();
    await expect(tool(page, "More")).toBeVisible();
    const box = await page.locator(".bottom").boundingBox();
    const stage = await page.locator(".stage-area").boundingBox();
    expect((box?.x ?? 0) - (stage?.x ?? 0)).toBeLessThan(40);
  });
});

test.describe("a medium window", () => {
  test.use({ viewport: { width: 700, height: 900 } });

  test("lays a panel over the stage, where an expanded one moves the drawing aside", async ({
    page,
  }) => {
    await start(page, "A * B |- B * A");
    const before = await page.locator(".stage").boundingBox();
    await tool(page, "Steps").click();
    await expect(page.getByRole("dialog", { name: "Steps" })).toBeVisible();
    expect((await page.locator(".stage").boundingBox())?.width).toBe(before?.width);
    await page.setViewportSize({ width: 1280, height: 800 });
    await expect
      .poll(async () => (await page.locator(".stage").boundingBox())?.width ?? 0)
      .toBeLessThan(1280 - 60 - 300);
  });

  test("shows the four logics two by two, inside the stage", async ({ page }) => {
    await goto(page);
    for (const width of [700, 840, 1280]) {
      await page.setViewportSize({ width, height: 900 });
      const logics = page.getByRole("region", { name: "New sequent" }).locator(".logic");
      await expect(logics).toHaveCount(4);
      const stage = await page.locator(".stage-area").boundingBox();
      const boxes = await Promise.all((await logics.all()).map((l) => l.boundingBox()));
      for (const box of boxes) {
        expect(box?.x ?? 0).toBeGreaterThanOrEqual(stage?.x ?? 0);
        expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(
          (stage?.x ?? 0) + (stage?.width ?? 0),
        );
      }
      // One row where the stage is as wide as the row of four, two rows where it is narrower.
      const rows = new Set(boxes.map((box) => Math.round(box?.y ?? 0))).size;
      expect(rows, `${width} wide`).toBe(width === 1280 ? 1 : 2);
    }
  });
});

/** Whether each of the zoom group's buttons is the element drawn at its centre. */
async function zoomUncovered(page: Page) {
  return page.locator(".stage-ctl").evaluate((group) =>
    [...group.querySelectorAll("button")].every((button) => {
      const r = button.getBoundingClientRect();
      const at = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      return at !== null && button.contains(at);
    }),
  );
}

test("the zoom group is covered by neither the bottom box nor a note, nor where a panel narrows the stage", async ({
  page,
}) => {
  await start(page, "A * B |- B * A");
  await tool(page, "Close all").click();
  await expect(page.getByRole("status").filter({ hasText: "Proved." })).toBeVisible();
  for (const [width, height] of [
    [600, 900],
    [700, 900],
    [839, 900],
    [1280, 800],
    [640, 400],
    [390, 844],
  ] as const) {
    await page.setViewportSize({ width, height });
    await expect.poll(() => zoomUncovered(page), `${width} by ${height}`).toBe(true);
  }
  // An expanded window with a panel: the stage narrows, and the box keeps clear of its zoom.
  await page.setViewportSize({ width: 1280, height: 800 });
  for (const panel of ["Steps", "Export"]) {
    await tool(page, panel).click();
    await expect(page.getByRole("dialog", { name: panel })).toBeVisible();
    await expect.poll(() => zoomUncovered(page), `${panel} open`).toBe(true);
    await page.keyboard.press("Escape");
  }
});

test("a sheet's close button is drawn and reached by Tab only where the panel is a sheet", async ({
  page,
}) => {
  await start(page, "A * B |- B * A");
  await tool(page, "Steps").click();
  const panel = page.getByRole("dialog", { name: "Steps" });
  await expect(panel).toBeVisible();
  const close = page.locator(".panels").getByRole("button", { name: "Close", exact: true });
  // Not drawn, so not in the tab order either.
  await expect(close).toBeHidden();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(close).toBeVisible();
  await close.click();
  await expect(panel).toBeHidden();
});

test.describe("a compact window 200 high, as 400 % zoom makes one", () => {
  test.use({ viewport: { width: 320, height: 200 } });

  test("keeps its rows apart and scrolls the page up and down, never sideways", async ({
    page,
  }) => {
    await start(page, "A * B |- B * A");
    const rows = [
      page.locator(".top-row"),
      page.locator(".rail"),
      page.locator(".stage-ctl"),
      page.locator(".bottom"),
      page.getByRole("toolbar", { name: "Tools" }),
    ];
    const boxes = [];
    for (const row of rows) boxes.push(await row.boundingBox());
    // Each row lies below the one before it (the zoom above the box), none over another.
    for (let i = 1; i < boxes.length; i++)
      expect(boxes[i]?.y ?? 0).toBeGreaterThanOrEqual(
        (boxes[i - 1]?.y ?? 0) + (boxes[i - 1]?.height ?? 0) - 0.5,
      );
    const scrolls = await page.evaluate(() => ({
      tall: document.documentElement.scrollHeight > innerHeight,
      wide: document.documentElement.scrollWidth > innerWidth,
    }));
    expect(scrolls).toEqual({ tall: true, wide: false });
  });
});

test.describe("a coarse pointer", () => {
  test.use({ hasTouch: true, isMobile: true, viewport: { width: 1024, height: 768 } });

  test("makes every tool, toggle and field 44 pixels high", async ({ page }) => {
    await start(page, "A * B |- B * A");
    for (const control of [
      tool(page, "Undo"),
      page.getByRole("button", { name: "Classical", exact: true }),
      page.getByRole("textbox", { name: "Sequent" }),
    ]) {
      const box = await control.boundingBox();
      expect(box?.height).toBeGreaterThanOrEqual(43.5);
    }
  });
});

test("a medium or expanded window keeps Close this sequent to More's rows: the column has none", async ({
  page,
}) => {
  await start(page, "A * B |- B * A");
  await expect(tool(page, "Export")).toBeVisible();
  await expect(tool(page, "Close this sequent")).toBeHidden();
});
