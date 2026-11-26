// deduxit © Fabian Lukas Grubmüller 2026
// Licensed under the EUPL

// About, llms.txt and the tour: one test per interaction, against the built site with deduxit's
// real module.

import { expect, test } from "./fixtures";
import { goto, start } from "./prover";

const CC_BY = "https://creativecommons.org/licenses/by/4.0/";

test("About says what the page is, and every licence it lists is served", async ({
  page,
  request,
}) => {
  await goto(page);
  await page.getByRole("button", { name: "About" }).click();
  const about = page.getByRole("dialog", { name: "About" });
  await expect(about).toContainText("nothing you type is sent anywhere");
  await expect(about).toContainText(/deduxit \d+\.\d+\.\d+, reading session documents/);
  await expect(about).toContainText(
    "GitHub, which serves this site, logs every visitor's IP address",
  );
  await expect(about.getByRole("img", { name: "deduxit" })).toBeVisible();
  await expect(about).toContainText(
    'dēdūxit [deːˈduːk.sɪt] Latin, verb: "it has derived", the perfect of dēdūcō, to lead down, derive.',
  );
  // deduxit's manual, which deduxit's own Pages site serves beside its API.
  await expect(about.getByRole("link", { name: "manual" })).toHaveAttribute(
    "href",
    "/deduxit/manual/",
  );
  await expect(about).toContainText(
    "The name deduxit and its mark identify this project, and may not be used to suggest its endorsement of anything else.",
  );
  const licence = (what: string) =>
    about.getByRole("listitem").filter({ hasText: what }).getByRole("link", { name: "CC BY 4.0" });
  await expect(licence("The written content")).toHaveAttribute("href", CC_BY);
  await expect(licence("deduxit's mark")).toHaveAttribute("href", "/logo/LICENSE.txt");
  await expect(
    about
      .getByRole("listitem")
      .filter({ hasText: "Rocq's logo" })
      .getByRole("link", { name: "the Unlicense" }),
  ).toHaveAttribute("href", "/licenses/rocq/LICENSE.txt");
  const local = await about
    .getByRole("listitem")
    .getByRole("link")
    .evaluateAll((links) =>
      links.map((a) => a.getAttribute("href") ?? "").filter((href) => href.startsWith("/")),
    );
  expect(local.length).toBe(12);
  for (const href of local) {
    const response = await request.get(href);
    expect(response.status(), href).toBe(200);
    expect((await response.text()).length, href).toBeGreaterThan(500);
  }
});

test("llms.txt tells AI models what the page is and where deduxit's guide is, and About links it", async ({
  page,
  request,
}) => {
  await goto(page);
  await page.getByRole("button", { name: "About" }).click();
  const about = page.getByRole("dialog", { name: "About" });
  await expect(about.getByRole("link", { name: "llms.txt" })).toHaveAttribute("href", "/llms.txt");
  const response = await request.get("/llms.txt");
  expect(response.status()).toBe(200);
  expect(response.headers()["content-type"]).toContain("text/plain");
  const text = await response.text();
  // The proposal's shape: an H1, a blockquote, then the lists of links.
  expect(text).toMatch(/^# .+\n\n> /);
  expect(text).toContain("\n## Docs\n");
  for (const guide of ["llms.txt", "llms-full.txt"]) {
    expect(text).toContain(`(https://deduxit.github.io/deduxit/${guide})`);
  }
  expect(text).toContain("CC BY 4.0");
});

test("the tour walks the page by keyboard and ends on a checked proof", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  // The tour is among the tools, which a sequent entered shows.
  await start(page, "A |- A");
  await page.getByRole("button", { name: "Guide", exact: true }).click();
  await page
    .getByRole("toolbar", { name: "Tools" })
    .getByRole("button", { name: "Tour", exact: true })
    .click();
  const tour = page.getByRole("dialog", { name: "Tour" });
  await expect(tour).toContainText("The sequent (1 of 8)");
  await expect(page.locator("[aria-live]")).toContainText("Tour, stop 1 of 8");
  for (let stop = 2; stop <= 8; stop++) {
    // Next waits while the stop's step runs, as a keyboard user does.
    await expect(tour.getByRole("button", { name: "Next", exact: true })).toBeEnabled();
    await expect(tour.getByRole("button", { name: "Next", exact: true })).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(tour).toContainText(`(${stop} of 8)`);
  }
  await expect(page.locator("[data-tour-spot]")).toHaveCount(1);
  await expect(page.locator(".chip[aria-selected=true] svg.icon-check")).toBeVisible();
  await expect(tour.getByRole("button", { name: "Done" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(tour).toHaveCount(0);
  await expect(page.locator("[data-tour-spot]")).toHaveCount(0);
});
