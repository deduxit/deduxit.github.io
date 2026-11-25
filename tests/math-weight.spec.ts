// deduxit © Fabian Lukas Grubmüller 2026
// Licensed under the EUPL

// Math text is set in its font's one weight: never a weight the browser would fake, not even in
// the chosen chip, and the drawing's formulas take no filter.

import { expect, test } from "./fixtures";
import { proveCommuted } from "./prover";

test("math text keeps its font's weight, and the drawing takes no filter", async ({ page }) => {
  await proveCommuted(page);
  const sequent = page.locator(".chip[aria-selected=true] .chip-text");
  await expect(sequent).toHaveCSS("font-weight", "400");
  await expect(sequent).toHaveCSS("font-synthesis-weight", "none");
  const drawing = page.locator(".drawing svg").first();
  await expect(drawing).toHaveCSS("filter", "none");
  await expect(page.locator(".drawing svg text").first()).toHaveCSS(
    "font-synthesis-weight",
    "none",
  );
});
