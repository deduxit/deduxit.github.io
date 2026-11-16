// deduxit © Fabian Lukas Grubmüller 2026
// Licensed under the EUPL

// Course packs: a teacher packs the open tabs into a link; a student who opens it works under
// the pack's limits (the calculus fixed, the search barred where the pack says so) and hands the
// answers in as a link or a file; the teacher's check view reads every answer again and trusts
// none of it. The page embedded in a course's page, and a pack printed as a handout.

import { deflateRawSync } from "node:zlib";
import type { BrowserContext, Page } from "@playwright/test";
import { expect, test } from "./fixtures";
import { goto, rule, switches } from "./prover";

/** A pack's link, packed as the page packs one. */
function packLink(pack: object, embed = false): string {
  const k = deflateRawSync(Buffer.from(JSON.stringify(pack))).toString("base64url");
  return `/#v=4&k=${k}${embed ? "&e=1" : ""}`;
}

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

const bar = (page: Page) => page.getByRole("region", { name: "Course pack" });

/** The hand-in's link, as the student copies it. */
async function handIn(page: Page, context: BrowserContext): Promise<string> {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await bar(page).getByRole("button", { name: "Hand in" }).click();
  const sheet = page.getByRole("dialog", { name: "Hand in" });
  await sheet.getByRole("button", { name: "Copy the link" }).click();
  await expect(sheet.getByRole("status")).toHaveText("Link copied.");
  return page.evaluate(() => navigator.clipboard.readText());
}

test("a teacher packs the open tabs into a link, its code and its handout", async ({ page }) => {
  await goto(page);
  await page.getByRole("textbox", { name: "Sequent" }).fill("A * B |- B * A");
  await page.getByRole("textbox", { name: "Sequent" }).press("Enter");
  await expect(page.locator(".stage .fb").first()).toBeVisible();
  await page.getByRole("button", { name: "Export" }).click();
  await page.getByRole("menuitem", { name: /^Course pack/ }).click();
  const sheet = page.getByRole("dialog", { name: "Course pack" });
  await sheet.getByRole("textbox", { name: "Title" }).fill("Week 3");
  await expect(sheet.getByRole("checkbox", { name: /A ⊗ B ⊢ B ⊗ A/ })).toBeChecked();
  await expect(sheet.locator(".pk-code")).toHaveText(/^[0-9a-f]{4} [0-9a-f]{4} [0-9a-f]{4}$/);
  const code = await sheet.locator(".pk-code").textContent();
  // Printed, the sheet is its handout alone: the title, the problems, the link.
  await page.emulateMedia({ media: "print" });
  await expect(page.locator(".pk-handout")).toBeVisible();
  await expect(page.locator(".pk-handout")).toContainText("Week 3");
  await expect(page.locator(".pk-handout")).toContainText("A ⊗ B ⊢ B ⊗ A (Linear (LL))");
  await expect(page.locator(".band.bottom")).toBeHidden();
  await page.emulateMedia({ media: "screen" });
  const link = (await page.locator(".pk-handout p").textContent())?.match(
    /https?:\S+#v=4&k=\S+/,
  )?.[0];
  expect(link).toBeTruthy();
  await page.goto(link as string);
  await expect(bar(page)).toContainText("Week 3");
  await expect(page.locator(".ptab")).toHaveCount(1);
  await page.getByRole("button", { name: "Hand in" }).click();
  await expect(page.getByRole("dialog", { name: "Hand in" }).locator(".pk-code")).toHaveText(
    code ?? "",
  );
});

test("a pack's limits hold: the calculus fixed and the search barred, by keys too", async ({
  page,
}) => {
  await page.goto(packLink(BY_HAND));
  await expect(bar(page)).toContainText("0 of 3 done");
  await expect(page.locator(".ptab")).toHaveCount(3);
  await expect(page.getByRole("button", { name: "Close goal" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Close all" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Hint" })).toBeDisabled();
  await page.locator(".stage").click({ position: { x: 5, y: 5 } });
  await page.keyboard.press("c");
  await page.keyboard.press("h");
  await expect(page.locator(".stage .kw", { hasText: "Course pack" }).first()).toBeVisible();
  const pop = await switches(page);
  await expect(pop).toContainText("This is problem 1 of the pack");
  await expect(pop.getByRole("button", { name: "Ordinary", exact: true })).toHaveCount(0);
  await page.keyboard.press("Escape");
  // By hand it is done.
  await rule(page, /^a, formula/, "ax");
  await expect(bar(page)).toContainText("1 of 3 done");
  await expect(bar(page).getByRole("button", { name: /^Problem 1: a ⊢ a, done/ })).toBeVisible();
  // The modal problem is the student's to decide: no verdict, a model to find.
  await bar(page)
    .getByRole("button", { name: /^Problem 3/ })
    .click();
  await expect(page.getByText("This problem is yours to decide")).toBeVisible();
  await expect(page.locator(".modal .kw", { hasText: "Not valid" })).toHaveCount(0);
  await page.getByRole("button", { name: "Start from one world" }).click();
  await page.getByRole("button", { name: "Check the model" }).click();
  await expect(page.locator(".modal-check")).toContainText("Fails");
  await expect(bar(page)).toContainText("2 of 3 done");
  // The answers are kept in the browser: the pack's link opens them again.
  await page.reload();
  await expect(bar(page)).toContainText("2 of 3 done");
  // A proof kept reads on its tab as the problem was written.
  await expect(page.locator(".ptab").first()).toContainText("a ⊢ a");
});

test("a hand-in is checked again: what holds, what is open, what is missing", async ({
  page,
  context,
}) => {
  await page.goto(packLink(BY_HAND));
  await rule(page, /^a, formula/, "ax");
  await expect(bar(page)).toContainText("1 of 3 done");
  await bar(page)
    .getByRole("button", { name: /^Problem 3/ })
    .click();
  await page.getByRole("button", { name: "Start from one world" }).click();
  await page.getByRole("button", { name: "Check the model" }).click();
  await expect(bar(page)).toContainText("2 of 3 done");
  const link = await handIn(page, context);
  expect(link).toMatch(/#v=4&h=/);

  await page.goto("/");
  await page.goto(link);
  const check = page.getByRole("dialog", { name: "Check a hand-in" });
  const rows = check.locator(".pk-check");
  await expect(rows).toHaveCount(3);
  await expect(rows.nth(0)).toContainText("Proved");
  await expect(rows.nth(1)).toContainText("Not finished");
  await expect(rows.nth(2)).toContainText("Countermodel");
  await expect(rows.nth(2)).toContainText("fails at world 0");
  // An answer opens on a tab of its own, the teacher's tabs left as they were.
  await rows.nth(0).getByRole("button", { name: "Open the answer to problem 1" }).click();
  await expect(page.locator(".ptab[aria-current=true] .pt-mark")).toContainText("LJ");
});

test("a hand-in's claims count for nothing: a changed pack and a forged proof are found", async ({
  page,
}) => {
  await page.goto(packLink(BY_HAND));
  await rule(page, /^a, formula/, "ax");
  await expect(bar(page)).toContainText("1 of 3 done");
  await bar(page).getByRole("button", { name: "Hand in" }).click();
  const code = await page
    .getByRole("dialog", { name: "Hand in" })
    .locator(".pk-code")
    .textContent();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download the file" }).click();
  const { readFile } = await import("node:fs/promises");
  const handin = JSON.parse(await readFile(await (await download).path(), "utf8"));
  // The student makes the first problem another one, and claims a proof deduxit cannot read.
  handin.pack.problems[0].sequent = "b ⊢ b";
  handin.answers[1] = { session: { version: 1, mode: "classical", sequent: {}, history: [9] } };

  await page.goto("/");
  await page.getByRole("button", { name: "Import" }).click();
  await page
    .getByRole("dialog", { name: "Import" })
    .locator("textarea")
    .fill(JSON.stringify(handin));
  await page
    .getByRole("dialog", { name: "Import" })
    .getByRole("button", { name: "Import" })
    .click();
  const check = page.getByRole("dialog", { name: "Check a hand-in" });
  await expect(check.locator(".pk-code")).not.toHaveText(code ?? "");
  const rows = check.locator(".pk-check");
  await expect(rows.nth(0)).toContainText("Another sequent");
  await expect(rows.nth(0)).toContainText("a ⊢ a");
  await expect(rows.nth(1)).toContainText("Refused");
  await expect(rows.nth(2)).toContainText("No answer");
});

test("embedded, the page keeps the proof and leaves the site's places out", async ({ page }) => {
  await page.goto(packLink({ ...BY_HAND, problems: BY_HAND.problems.slice(0, 1) }, true));
  await expect(bar(page)).toContainText("Week 3");
  await expect(page.getByRole("link", { name: "Open in deduxit" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Practice" })).toBeHidden();
  await expect(page.getByRole("button", { name: "Undo" })).toBeVisible();
  await expect(page.locator(".pt-new")).toBeHidden();
});

test("a visitor without a pack sees nothing of it", async ({ page }) => {
  await goto(page);
  await expect(bar(page)).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Open in deduxit" })).toHaveCount(0);
});

test("with the search barred, deduxit's table and tableau are barred too", async ({ page }) => {
  await page.goto(
    packLink({
      ...BY_HAND,
      problems: [{ suite: "ordinary", parameter: "classical", sequent: "⊢ a ∨ ¬a" }],
    }),
  );
  await expect(bar(page)).toContainText("0 of 1 done");
  await expect(page.getByRole("tab", { name: "Tree" })).toBeVisible();
  await expect(page.getByRole("tab", { name: "Tableau" })).toHaveCount(0);
  await expect(page.getByRole("tab", { name: "Table" })).toHaveCount(0);
});

test("a modal problem keeps its calculus, and a valid one is never done", async ({ page }) => {
  await page.goto(
    packLink({
      ...BY_HAND,
      search: true,
      problems: [{ suite: "modal", parameter: "K", sequent: "□(p → q) ⊢ □p → □q" }],
    }),
  );
  await expect(page.locator(".modal .kw.ok")).toHaveText("Valid");
  await expect(bar(page)).toContainText("0 of 1 done");
  await page.getByRole("button", { name: "Prove it step by step" }).click();
  await expect(page.locator(".stage .kw", { hasText: "Course pack" }).first()).toBeVisible();
  await expect(page.locator(".ptab[aria-current=true] .pt-mark")).toContainText("Modal (K)");
});

test("print leaves the bands out, and prints light in the dark theme", async ({ page }) => {
  await goto(page);
  await page.evaluate(() => {
    document.documentElement.dataset["theme"] = "dark";
  });
  await page.emulateMedia({ media: "print" });
  await expect(page.locator(".band.bottom")).toBeHidden();
  await expect(page.locator(".band.top")).toBeHidden();
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).colorScheme)).toBe(
    "light",
  );
});
