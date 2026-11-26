// deduxit © Fabian Lukas Grubmüller 2026
// Licensed under the EUPL

// Course packs: a teacher makes one in the Export panel (its title, the sequents at the top as
// problems, the link, the embed code and the printed sheet); a student who opens the link meets
// it as one chip with its count done and a page of its problems, each in the calculus the pack
// fixes, the search working as anywhere. A hand-in of the page before opens as its pack with its
// answers. The page embedded in a course's page, and a pack printed.

import { readFile } from "node:fs/promises";
import { deflateRawSync } from "node:zlib";
import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";
import { exportEntry, goto, proved, rule, saveExport, start, tool, viewCell } from "./prover";

/** A fragment's document, packed as the page packs one. */
const packed = (document: object) =>
  deflateRawSync(Buffer.from(JSON.stringify(document))).toString("base64url");

/** A pack's link. */
const packLink = (pack: object, embed = false) => `/#v=4&k=${packed(pack)}${embed ? "&e=1" : ""}`;

/** A pack of the page before, whose switch barred the search: the page no longer bars it. */
const BY_HAND = {
  pack: 1,
  title: "Week 3",
  search: false,
  problems: [
    { suite: "ordinary", parameter: "intuitionistic", sequent: "a ⊢ a" },
    { suite: "linear", parameter: "classical", sequent: "A ⊗ B ⊢ B ⊗ A" },
    { suite: "modal", parameter: "K", sequent: "□p ⊢ p" },
  ],
};

/** The pack's chip at the top. */
const chip = (page: Page) => page.getByRole("tab", { name: /course pack/ });
/** The pack's page. */
const packPage = (page: Page) => page.getByRole("region", { name: "Week 3" });
/** A problem's row on the pack's page. */
const row = (page: Page, n: number) =>
  packPage(page).getByRole("button", { name: new RegExp(`^Problem ${n}:`) });

test("a teacher makes a pack in Export: its title, its problems, the link, the embed code, the sheet", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await start(page, "A * B |- B * A");
  await start(page, "A |- A", false);
  const panel = await exportEntry(page, "Course pack");
  await panel.getByRole("textbox", { name: "Title" }).fill("Week 3");
  // The sequents at the top are its problems, each ticked; one is left out.
  await expect(panel.getByRole("checkbox", { name: /A ⊗ B ⊢ B ⊗ A/ })).toBeChecked();
  await panel.getByRole("checkbox", { name: /^A ⊢ A/ }).uncheck();
  await expect(panel).toContainText("1 problem");
  // No switch bars the search, and no code is shown.
  await expect(panel.getByRole("checkbox", { name: /search/ })).toHaveCount(0);
  await panel.getByRole("button", { name: "Copy the embed code" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Embed code copied." })).toBeVisible();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toMatch(
    /^<iframe src="https?:\S+#v=4&k=\S+&e=1" title="deduxit: Week 3"/,
  );
  await panel.getByRole("button", { name: "Copy the link" }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Link to the pack copied." }),
  ).toBeVisible();
  const link = await page.evaluate(() => navigator.clipboard.readText());
  expect(link).toMatch(/#v=4&k=/);
  // Printed, the page is the sheet alone: the title, the problems, the link.
  await page.emulateMedia({ media: "print" });
  await expect(page.locator(".pk-handout")).toBeVisible();
  await expect(page.locator(".pk-handout")).toContainText("Week 3");
  await expect(page.locator(".pk-handout")).toContainText("A ⊗ B ⊢ B ⊗ A (Linear (LL))");
  await expect(page.locator(".pk-handout li")).toHaveCount(1);
  await expect(page.locator(".pk-handout")).toContainText(link);
  await page.emulateMedia({ media: "screen" });
  await page.goto(link);
  await expect(chip(page)).toContainText("Week 3, 0/1");
  await expect(page.locator(".chip")).toHaveCount(1);
  await expect(packPage(page)).toBeVisible();
});

test("a student meets one chip and a page of problems; the calculus fixed, the search allowed", async ({
  page,
}) => {
  await page.goto(packLink(BY_HAND));
  // One chip with its count; its page lists the problems with their calculus and state. The
  // modal problem is decided as anywhere, its countermodel found: it is done.
  await expect(chip(page)).toContainText("Week 3, 1/3");
  await expect(chip(page)).toHaveAttribute("aria-selected", "true");
  await expect(page.locator(".chip")).toHaveCount(1);
  await expect(packPage(page)).toContainText("1 of 3 done");
  await expect(row(page, 1)).toHaveAccessibleName("Problem 1: a ⊢ a, LJ, open");
  await expect(row(page, 3)).toHaveAccessibleName("Problem 3: □p ⊢ p, K, done");
  // The page has no bottom box and no view's tools.
  await expect(page.getByRole("textbox", { name: "Sequent" })).toHaveCount(0);
  await expect(page.getByRole("toolbar", { name: "Tools" })).toHaveCount(0);
  await row(page, 1).click();
  await expect(page.locator(".calc-fixed")).toContainText("This is problem 1 of the pack");
  await expect(chip(page)).toHaveAttribute("aria-selected", "true");
  // An old pack's switch that barred the search is gone: Hint and Close all work as anywhere.
  await expect(tool(page, "Hint")).toBeEnabled();
  await expect(tool(page, "Close all")).toBeEnabled();
  await rule(page, /^a, formula/, "ax");
  await expect(proved(page)).toBeVisible();
  await expect(chip(page)).toContainText("Week 3, 2/3");
  // A press on the chip goes back to the page.
  await chip(page).click();
  await expect(row(page, 1)).toHaveAccessibleName(/, done$/);
  await expect(packPage(page)).toContainText("2 of 3 done");
  await row(page, 3).click();
  await expect(page.locator(".modal .kw", { hasText: "Not valid" })).toBeVisible();
  // The answers are kept in the browser: the pack's link opens them again.
  await page.reload();
  await expect(packPage(page)).toContainText("2 of 3 done");
  await row(page, 1).click();
  await expect(page.getByRole("textbox", { name: "Sequent" })).toHaveValue("a ⊢ a");
});

test("a hand-in of the page before opens as its pack with its answers, by link or by file", async ({
  page,
}) => {
  await start(page, "A * B |- B * A");
  await tool(page, "Close all").click();
  await expect(proved(page)).toBeVisible();
  const session = JSON.parse(
    await readFile(await (await saveExport(page, "Session")).path(), "utf8"),
  ) as unknown;
  const handin = { handin: 1, pack: BY_HAND, answers: [null, { session }, null] };
  await page.goto(`/#v=4&h=${packed(handin)}`);
  await page.reload();
  await expect(chip(page)).toContainText("Week 3, 2/3");
  await expect(row(page, 2)).toHaveAccessibleName(/, done$/);
  // No check view is left.
  await expect(page.getByRole("dialog", { name: "Check a hand-in" })).toHaveCount(0);
  await row(page, 2).click();
  await expect(proved(page)).toBeVisible();
  // A hand-in file opens the same way, from Import.
  await goto(page);
  await tool(page, "Import").click();
  const panel = page.getByRole("dialog", { name: "Import" });
  await panel.locator("textarea").fill(JSON.stringify(handin));
  await panel.getByRole("button", { name: "Import" }).click();
  await expect(chip(page)).toContainText("Week 3, 2/3");
});

test("closing the pack's chip closes its problems, and Undo opens it again", async ({ page }) => {
  await page.goto(packLink(BY_HAND));
  await expect(packPage(page)).toBeVisible();
  await chip(page).focus();
  await page.keyboard.press("Delete");
  await expect(chip(page)).toHaveCount(0);
  const notice = page.getByRole("status").filter({ hasText: "Week 3 closed." });
  await notice.getByRole("button", { name: "Undo" }).click();
  await expect(chip(page)).toContainText("Week 3, 1/3");
  await expect(packPage(page)).toBeVisible();
});

test("with the pack's page shown, another sequent's close closes that sequent alone", async ({
  page,
}) => {
  await page.goto(packLink(BY_HAND));
  await expect(packPage(page)).toBeVisible();
  await page.getByRole("button", { name: "New sequent", exact: true }).click();
  await page.getByRole("textbox", { name: "Sequent" }).fill("A |- A");
  await page.getByRole("textbox", { name: "Sequent" }).press("Enter");
  await chip(page).click();
  await expect(packPage(page)).toBeVisible();
  const other = page.getByRole("tab", { name: /^A ⊢ A/ });
  await other.focus();
  await page.keyboard.press("Delete");
  await expect(other).toHaveCount(0);
  await expect(chip(page)).toBeVisible();
});

test("embedded, the page keeps the pack and leaves the site's places out", async ({ page }) => {
  await page.goto(packLink({ ...BY_HAND, problems: BY_HAND.problems.slice(0, 1) }, true));
  await expect(packPage(page)).toBeVisible();
  await expect(page.getByRole("link", { name: "Open in deduxit" })).toBeVisible();
  await row(page, 1).click();
  await expect(tool(page, "Undo")).toBeVisible();
  await expect(page.getByRole("button", { name: "New sequent", exact: true })).toBeHidden();
});

test("a visitor without a pack sees nothing of it", async ({ page }) => {
  await goto(page);
  await expect(chip(page)).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Open in deduxit" })).toHaveCount(0);
});

test("a modal problem keeps its calculus, and a valid one is never done", async ({ page }) => {
  await page.goto(
    packLink({
      ...BY_HAND,
      problems: [{ suite: "modal", parameter: "K", sequent: "□(p → q) ⊢ □p → □q" }],
    }),
  );
  await row(page, 1).click();
  await expect(page.locator(".modal .kw.ok")).toHaveText("Valid");
  await expect(chip(page)).toContainText("Week 3, 0/1");
  await tool(page, "Prove step by step").click();
  await expect(page.locator(".notes .kw", { hasText: "Course pack" }).first()).toBeVisible();
  await expect(viewCell(page)).toHaveAttribute("data-tip", "Modal logic, K");
});

test("print leaves the bands out, and prints light in the dark theme", async ({ page }) => {
  await goto(page);
  await page.evaluate(() => {
    document.documentElement.dataset["theme"] = "dark";
  });
  await page.emulateMedia({ media: "print" });
  await expect(page.locator(".top-row")).toBeHidden();
  await expect(page.locator(".rail")).toBeHidden();
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).colorScheme)).toBe(
    "light",
  );
});
