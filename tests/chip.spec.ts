// deduxit © Fabian Lukas Grubmüller 2026
// Licensed under the EUPL

// A proof's tab: its calculus mark reads as a label of its own, a step of the spacing scale
// further from the sequent than its parts from each other, and the phone's tab still fits its
// row beside the new proof's `+`.

import { devices, type Page } from "@playwright/test";
import { expect, test } from "./fixtures";
import { start } from "./prover";

/** The gaps on the screen: the sequent's end to the mark's label, and the calculus to the fragment. */
async function gaps(page: Page): Promise<{ sequent: number; parts: number }> {
  return page.locator(".ptab[aria-current=true]").evaluate((tab) => {
    const text = (element: Element | null) => {
      const node = [...(element?.childNodes ?? [])].find((n) => n.nodeType === Node.TEXT_NODE);
      const range = document.createRange();
      if (node) range.selectNodeContents(node);
      return range.getBoundingClientRect();
    };
    const sequent = text(tab.querySelector(".pt-go .m"));
    const mark = tab.querySelector(".pt-mark");
    // The calculus's label, "Linear (LL)" on a wide screen and "LL" on a phone.
    const calculus = mark?.querySelector(".mk")?.getBoundingClientRect() ?? new DOMRect();
    const fragment = mark?.querySelector(".frag")?.getBoundingClientRect();
    return {
      sequent: calculus.left - sequent.right,
      parts: (fragment?.left ?? 0) - calculus.right,
    };
  });
}

test("the calculus mark stands apart from the sequent, its calculus and fragment a word apart", async ({
  page,
}) => {
  await start(page, "A * B |- B * A");
  const mark = page.locator(".ptab[aria-current=true] .pt-mark");
  // A wide screen names the logic and shows that the mark opens a menu.
  await expect(mark).toHaveText(/^Linear \(LL\)\s*MLL\s*▾$/, { useInnerText: true });
  await expect(mark).toHaveAccessibleName(/^Logic: Classical; fragment MLL/);
  const { sequent, parts } = await gaps(page);
  expect(sequent).toBeGreaterThanOrEqual(16);
  expect(parts).toBeGreaterThanOrEqual(8);
  expect(sequent).toBeGreaterThan(parts);
});

test.describe("at a phone's width", () => {
  const { defaultBrowserType: _, ...pixel } = devices["Pixel 7"];
  test.use(pixel);

  test("the mark stands apart, and the tab and the new proof's + fit the row", async ({ page }) => {
    await start(page, "A * B |- B * A");
    // A phone keeps the short mark.
    const mark = page.locator(".ptab[aria-current=true] .pt-mark");
    await expect(mark.locator(".mk")).toHaveText("LL", { useInnerText: true });
    await expect(mark.getByText("Linear (LL)")).toBeHidden();
    await expect(mark.getByText("▾")).toBeHidden();
    const { sequent, parts } = await gaps(page);
    expect(sequent).toBeGreaterThanOrEqual(16);
    expect(parts).toBeGreaterThanOrEqual(8);
    const width = page.viewportSize()?.width ?? 0;
    for (const part of [".ptab[aria-current=true]", ".pt-new"]) {
      const box = await page.locator(part).boundingBox();
      expect(box && box.x >= 0 && box.x + box.width <= width, part).toBe(true);
    }
  });
});
