// deduxit © Fabian Lukas Grubmüller 2026
// Licensed under the EUPL

// Every control of the page, in every state the page can be put in, is a
// target of at least 44 by 44 pixels at a phone's width and of at least 24
// by 24 (WCAG 2.2, 2.5.8) at a desktop's: measured where it is drawn. A link
// inside a sentence is WCAG's inline exception and is not measured.

import { devices, type Page } from "@playwright/test";
import { expect, test } from "./fixtures";
import { calculus, goto, rule, start } from "./prover";

/** Every visible control too small for the floor, described. */
async function tooSmall(page: Page, least: number): Promise<string[]> {
  return page.evaluate((least) => {
    const controls = document.querySelectorAll<HTMLElement>(
      "button, input:not([type=checkbox]), select, textarea, summary, a[href], [role=tab], [role=radio], label.sw, label.chip",
    );
    const small: string[] = [];
    for (const control of controls) {
      if (!control.checkVisibility({ visibilityProperty: true, opacityProperty: false })) continue;
      if (control.closest(".sr-only, [aria-hidden=true]")) continue;
      // A checkbox's switch is measured as its label, which it covers.
      if (control.closest("label.sw") && control !== control.closest("label.sw")) continue;
      // A link in running text: the inline exception.
      if (control instanceof HTMLAnchorElement) {
        const parent = control.parentElement;
        const text = [...(parent?.childNodes ?? [])].some(
          (n) => n !== control && (n.textContent ?? "").trim() !== "",
        );
        if (text && getComputedStyle(control).display === "inline") continue;
      }
      const r = control.getBoundingClientRect();
      if (r.width === 0 && r.height === 0) continue;
      if (Math.round(r.width) < least || Math.round(r.height) < least) {
        const name =
          control.getAttribute("aria-label") ??
          control.textContent?.trim().slice(0, 40) ??
          control.className;
        small.push(
          `${control.tagName.toLowerCase()}.${control.className} "${name}" ${Math.round(r.width)}×${Math.round(r.height)}`,
        );
      }
    }
    return small;
  }, least);
}

/**
 * Puts the page through its states, measuring the controls in each: the
 * empty page, a proof with the rule popover, the split chooser, a refusal,
 * a hint, a proof closed and its net, every menu, the status and the
 * calculus, the restart warning, Practice and its filters, Learn's two
 * places and a lesson's parts, the tour, a field's parse error, and the
 * restore bar.
 */
async function walk(page: Page, least: number) {
  const found: string[] = [];
  const measure = async (state: string) => {
    for (const small of await tooSmall(page, least)) found.push(`${state}: ${small}`);
  };
  const band = async (name: string) => {
    const button = page.locator("footer").getByRole("button", { name, exact: true });
    if (!(await button.isVisible())) {
      await page.locator("footer").getByRole("button", { name: "More" }).click();
      await measure("more");
      await page.getByRole("dialog", { name: "More" }).getByRole("button", { name }).click();
    } else {
      await button.click();
    }
  };
  await goto(page);
  await measure("empty");
  await page.getByRole("textbox", { name: "Sequent" }).fill("A *");
  await page.getByRole("textbox", { name: "Sequent" }).press("Enter");
  await expect(page.getByRole("alert")).toBeVisible();
  await measure("parse error");
  await start(page, "A * B |- B * A", false);
  await measure("started");
  await page.getByRole("button", { name: /^A⊥ ⅋ B⊥, formula/ }).click();
  await expect(page.getByRole("dialog", { name: "Rules" })).toBeVisible();
  await measure("rules");
  await page.keyboard.press("Escape");
  await rule(page, /^A⊥ ⅋ B⊥, formula/, "⅋");
  await rule(page, /^B ⊗ A, formula/, "⊗");
  await page.getByRole("button", { name: /^B⊥, formula/ }).click();
  await expect(page.getByRole("dialog", { name: "Split" })).toContainText("Passes");
  await measure("split");
  await page.getByRole("dialog", { name: "Split" }).getByRole("button", { name: "Cancel" }).click();
  await rule(page, /^A⊥, formula/, "ax");
  await expect(page.locator(".dline .kw.bad")).toBeVisible();
  await measure("refusal");
  await band("Hint");
  await expect(page.locator(".dline.hint")).toContainText("Work on this goal");
  await measure("hint");
  await page.locator("footer").getByRole("button", { name: "Close all" }).click();
  await expect(page.getByText("Proved: every goal is closed")).toBeVisible();
  await measure("proved");
  await page.getByRole("tab", { name: "Net" }).click();
  await measure("net");
  await page.getByRole("tab", { name: "Tree" }).click();
  for (const menu of ["Export", "Steps", "Import", "Settings", "Keys", "About"]) {
    await band(menu);
    await expect(
      page.getByRole(menu === "Export" ? "menu" : "dialog", { name: menu }),
    ).toBeVisible();
    await measure(menu);
    await page.keyboard.press("Escape");
  }
  const tab = page.locator(".ptab[aria-current=true]");
  await tab.getByRole("button", { name: /^Status/ }).click();
  await measure("status");
  await page.keyboard.press("Escape");
  await tab.getByRole("button", { name: /^Logic/ }).click();
  await measure("calculus mark");
  await page.keyboard.press("Escape");
  // The switches are the tab's mark's alone.
  await tab.getByRole("button", { name: /^Logic/ }).click();
  await page.getByRole("button", { name: "Intuitionistic", exact: true }).click();
  await expect(page.getByRole("alertdialog", { name: "Restart the proof" })).toBeVisible();
  await measure("restart warning");
  await page.getByRole("button", { name: "Keep the proof" }).click();
  await page.keyboard.press("Escape");
  await band("Practice");
  const practice = page.getByRole("dialog", { name: "Practice" });
  await expect(practice.locator(".pr-row").first()).toBeVisible();
  await measure("Practice");
  await practice.getByRole("checkbox", { name: "Additives" }).check();
  await practice.getByRole("checkbox", { name: "Hard", exact: true }).check();
  await measure("Practice filtered");
  await page.keyboard.press("Escape");
  await band("Learn");
  for (const place of ["Tutorial", "Reference"]) {
    await page.getByRole("tab", { name: place }).click();
    await measure(`Learn ${place}`);
  }
  // A lesson: its worked proof, its dead end, its prompt, its faded proof and its check.
  await page.getByRole("tab", { name: "Tutorial" }).click();
  await page.getByRole("button", { name: "Lesson 2: The multiplicatives" }).click();
  await measure("lesson");
  await page.getByRole("button", { name: "Start the worked proof" }).click();
  await page.getByRole("button", { name: "Show the step" }).click();
  await page.getByRole("button", { name: "Play this split" }).click();
  await expect(page.locator(".detour").getByRole("status")).toContainText("Cannot close");
  await measure("lesson's dead end");
  await page.getByRole("button", { name: "Predict ⊗" }).click();
  await expect(page.getByRole("note", { name: "Why this step" })).toBeVisible();
  await measure("lesson's worked proof");
  await page.getByRole("button", { name: "Finish the proof yourself" }).click();
  await measure("lesson's faded proof");
  await page.getByRole("region", { name: "Check" }).getByRole("radio").nth(1).check();
  await measure("lesson's check");
  await page.getByRole("button", { name: "All lessons" }).click();
  // Lesson 7's attempt, its question, a problem asked of deduxit and the search that gives up.
  await page.getByRole("button", { name: "Lesson 7: When there is no proof" }).click();
  await page.getByRole("button", { name: "Play the attempt" }).click();
  await measure("lesson's attempt");
  for (let step = 0; step < 5; step++)
    await page.getByRole("button", { name: "Next step of the attempt" }).click();
  await page.getByRole("radio", { name: "Step 2, ⊕₁" }).check();
  await measure("lesson's wrong step");
  await page.getByRole("button", { name: "Ask deduxit about A false case" }).click();
  await page.getByRole("button", { name: "Search it with a budget of 20 units" }).click();
  await expect(page.getByRole("button", { name: "Try 40 units" })).toBeVisible();
  await measure("lesson's unknown");
  await page.getByRole("button", { name: "All lessons" }).click();
  // Lesson 9's cut eliminated on the stage, and lesson 10's step that deduxit refuses.
  await page.getByRole("button", { name: "Lesson 9: Cut and its elimination" }).click();
  await page.getByRole("button", { name: "Show the finished proof" }).click();
  await page.getByRole("button", { name: "Eliminate the cuts" }).click();
  await page.getByRole("button", { name: "Next step" }).click();
  await expect(page.getByRole("note", { name: "Why this elimination step" })).toBeVisible();
  await measure("lesson's elimination");
  await page.getByRole("button", { name: "All lessons" }).click();
  await page.getByRole("button", { name: "Lesson 10: The quantifiers" }).click();
  await page.getByRole("button", { name: "Play the attempt" }).click();
  for (let step = 0; step < 4; step++)
    await page.getByRole("button", { name: "Next step of the attempt" }).click();
  await page.getByRole("button", { name: "Try the last step" }).click();
  await expect(
    page.getByRole("region", { name: "A step deduxit refuses" }).getByRole("status"),
  ).toBeVisible();
  await measure("lesson's refusal");
  await page.getByRole("button", { name: "All lessons" }).click();
  await page.getByRole("button", { name: "Turn Learn off" }).click();
  await band("Tour");
  await expect(page.getByRole("dialog", { name: "Tour" })).toBeVisible();
  await measure("tour");
  await page.keyboard.press("Escape");
  await page.reload();
  await expect(page.getByRole("region", { name: "Restore" })).toBeVisible();
  await measure("restore");
  return found;
}

/** A goal's reasons: a goal an earlier step lost, with Go back, and a long reason with its "more". */
async function reasons(page: Page, least: number): Promise<string[]> {
  const found: string[] = [];
  const measure = async (state: string) => {
    for (const small of await tooSmall(page, least)) found.push(`${state}: ${small}`);
  };
  await start(page, "A * B |- A");
  await rule(page, /^A⊥ ⅋ B⊥, formula/, "⅋");
  await page.getByRole("button", { name: "Close goal" }).click();
  await expect(page.getByRole("button", { name: "Go back" })).toBeVisible();
  await measure("lost goal");
  await start(page, "!(a -o a * a * a), !(a -o a), a |- a * (a + 0)", false);
  await calculus(page, ["Intuitionistic"]);
  await page.getByRole("button", { name: "Close goal" }).click();
  await expect(page.locator(".dock .note").getByRole("button", { name: "more" })).toBeVisible();
  await measure("long reason");
  return found;
}

/** Learn's answers: lesson 1's rewrite, a wrong check answer's sequent to try, a practice row answered. */
async function answers(page: Page, least: number): Promise<string[]> {
  const found: string[] = [];
  const measure = async (state: string) => {
    for (const small of await tooSmall(page, least)) found.push(`${state}: ${small}`);
  };
  await goto(page);
  // Learn is in the band, or under More on a phone.
  const learn = page.locator("footer").getByRole("button", { name: "Learn", exact: true });
  if (await learn.isVisible()) await learn.click();
  else {
    await page.locator("footer").getByRole("button", { name: "More" }).click();
    await page.getByRole("dialog", { name: "More" }).getByRole("button", { name: "Learn" }).click();
  }
  await page.getByRole("button", { name: "Lesson 1: Reading a sequent" }).click();
  await page.getByRole("button", { name: "Start the worked proof" }).click();
  await page.getByRole("button", { name: "Turn on Two-sided" }).click();
  await expect(page.getByRole("button", { name: "Turn it off" })).toBeVisible();
  // Measured once the stage has redrawn the sequent two-sided, and zoomed to it.
  await expect(page.locator(".drawing svg title")).toHaveText("A ⊢ A");
  await measure("lesson's rewrite");
  await page.getByRole("region", { name: "Check" }).getByRole("radio", { name: "⊢ A, A" }).check();
  await expect(page.getByRole("button", { name: "Try ⊢ A, A yourself" })).toBeVisible();
  await measure("check's sequent to try");
  const card = page.locator(".exercise").filter({ hasText: "A entails A" });
  await card.getByRole("button", { name: "Has a proof" }).click();
  await expect(card.getByRole("button", { name: "Watch A entails A" })).toBeVisible();
  await measure("practice answered");
  return found;
}

/** An ordinary tab: its calculus's switches, the field's examples, and a proof's rules. */
async function ordinary(page: Page, least: number): Promise<string[]> {
  const found: string[] = [];
  const measure = async (state: string) => {
    for (const small of await tooSmall(page, least)) found.push(`${state}: ${small}`);
  };
  await goto(page);
  await page
    .locator(".ptab[aria-current=true]")
    .getByRole("button", { name: /^Logic/ })
    .click();
  await page
    .getByRole("dialog", { name: "Logic" })
    .getByRole("button", { name: "Ordinary", exact: true })
    .click();
  await measure("ordinary calculus");
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Examples" }).click();
  await measure("examples");
  await page
    .getByRole("dialog", { name: "Examples" })
    .getByRole("button", { name: /^Modus ponens/ })
    .click();
  await page.getByRole("button", { name: /^a → b, formula/ }).click();
  await expect(page.getByRole("dialog", { name: "Rules" })).toBeVisible();
  await measure("ordinary rules");
  return found;
}

/** The stage in each math font: a proof started, the rule popover, and the split chooser. */
async function fonts(page: Page, least: number): Promise<string[]> {
  const found: string[] = [];
  for (const font of ["stix-two", "garamond", "asana", "new-computer-modern"]) {
    await page.evaluate(
      (f) => localStorage.setItem("deduxit-settings", JSON.stringify({ stageFont: f })),
      font,
    );
    await start(page, "A * B |- B * A");
    await expect(page.locator(".drawing svg")).not.toHaveAttribute("font-family", /Euler/);
    for (const small of await tooSmall(page, least)) found.push(`${font}, started: ${small}`);
    await rule(page, /^A⊥ ⅋ B⊥, formula/, "⅋");
    await rule(page, /^B ⊗ A, formula/, "⊗");
    await expect(page.getByRole("dialog", { name: "Split" })).toBeVisible();
    for (const small of await tooSmall(page, least)) found.push(`${font}, split: ${small}`);
  }
  return found;
}

test("every control is a target of 24 by 24 pixels at least, at a desktop's width", async ({
  page,
}) => {
  expect(await walk(page, 24)).toEqual([]);
});

test("a goal's reasons and their controls are targets of 24 by 24 pixels at least, at a desktop's width", async ({
  page,
}) => {
  expect(await reasons(page, 24)).toEqual([]);
});

test("Learn's answers and lesson 1's rewrite are targets of 24 by 24 pixels at least, at a desktop's width", async ({
  page,
}) => {
  expect(await answers(page, 24)).toEqual([]);
});

test("an ordinary tab's controls are targets of 24 by 24 pixels at least, at a desktop's width", async ({
  page,
}) => {
  expect(await ordinary(page, 24)).toEqual([]);
});

test.describe("at a phone's width", () => {
  const { defaultBrowserType: _, ...pixel } = devices["Pixel 7"];
  test.use(pixel);

  test("an ordinary tab's controls are 44 by 44 pixels at least", async ({ page }) => {
    expect(await ordinary(page, 44)).toEqual([]);
  });

  test("every control is a target of 44 by 44 pixels at least", async ({ page }) => {
    expect(await walk(page, 44)).toEqual([]);
  });

  test("Learn's answers and lesson 1's rewrite are 44 by 44 pixels at least", async ({ page }) => {
    expect(await answers(page, 44)).toEqual([]);
  });

  test("a goal's reasons and their controls are 44 by 44 pixels at least", async ({ page }) => {
    expect(await reasons(page, 44)).toEqual([]);
  });

  test("the witness chooser and its refusal are 44 by 44 pixels at least", async ({ page }) => {
    await start(page, "|- exists x. p(x), ~p(c)");
    await page.getByRole("button", { name: /^∃x\. p\(x\), formula/ }).click();
    await page.getByRole("dialog", { name: "Rules" }).getByRole("button", { name: /^∃/ }).click();
    const chooser = page.getByRole("dialog", { name: "Witness" });
    await chooser.getByRole("textbox").fill("g(c)");
    expect(await tooSmall(page, 44)).toEqual([]);
    await chooser.getByRole("button", { name: "Apply" }).click();
    await expect(chooser.getByRole("alert")).toBeVisible();
    expect(await tooSmall(page, 44)).toEqual([]);
  });

  test("the cut chooser and the elimination's controls are 44 by 44 pixels at least", async ({
    page,
  }) => {
    await start(page, "A, A -o B |- B");
    await page.getByRole("button", { name: "Cut", exact: true }).click();
    await page.getByRole("dialog", { name: "Cut" }).getByRole("textbox").fill("A -o B");
    expect(await tooSmall(page, 44)).toEqual([]);
    await page.getByRole("button", { name: /^A ⊗ B⊥, formula 2/ }).click();
    await page.getByRole("dialog", { name: "Cut" }).getByRole("button", { name: "Cut" }).click();
    await page.getByRole("button", { name: "Close all" }).first().click();
    const panel = page.getByRole("region", { name: "Cut elimination" });
    await panel.getByRole("button", { name: "Eliminate the cuts" }).click();
    expect(await tooSmall(page, 44)).toEqual([]);
    await panel.getByRole("button", { name: "To the end" }).click();
    await expect(panel.getByRole("status")).toContainText("Cut-free");
    await panel.locator("summary").click();
    expect(await tooSmall(page, 44)).toEqual([]);
  });

  test("the stage's controls stay 44 by 44 pixels in every math font", async ({ page }) => {
    await goto(page);
    expect(await fonts(page, 44)).toEqual([]);
  });
});

test("the stage's controls stay 24 by 24 pixels in every math font, at a desktop's width", async ({
  page,
}) => {
  await goto(page);
  expect(await fonts(page, 24)).toEqual([]);
});
