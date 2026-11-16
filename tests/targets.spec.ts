// deduxit © Fabian Lukas Grubmüller 2026
// Licensed under the EUPL

// Every control of the page, in every state the page can be put in, is a
// target of at least 44 by 44 pixels at a phone's width and of at least 24
// by 24 (WCAG 2.2, 2.5.8) at a desktop's: measured where it is drawn. A link
// inside a sentence is WCAG's inline exception and is not measured. A rule
// label's button over the drawing is as large as its neighbours leave it: it
// overlaps no other button of the drawing, and where it is short of the floor
// on an axis, it reaches a neighbour's button on that axis.

import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";
import { goto } from "./prover";
import {
  answers,
  attempting,
  cutting,
  fonts,
  learning,
  menus,
  methods,
  coursing,
  customising,
  deducing,
  ordinary,
  pixel,
  practising,
  proving,
  reasons,
  restoring,
  touring,
  transforms,
  linking,
  type Visit,
  witnessing,
} from "./states";

/** Every visible control too small for the floor, described. */
async function tooSmall(page: Page, least: number): Promise<string[]> {
  return page.evaluate((least) => {
    const controls = document.querySelectorAll<HTMLElement>(
      "button, input:not([type=checkbox]), select, textarea, summary, a[href], [role=tab], [role=radio], label.sw, label.chip",
    );
    const small: string[] = [];
    const drawn = [...document.querySelectorAll<HTMLElement>(".hits button")].map((b) => ({
      b,
      r: b.getBoundingClientRect(),
    }));
    const across = (a: number, b: number, c: number, d: number) => Math.min(b, d) - Math.max(a, c);
    for (const { b, r } of drawn) {
      if (!b.classList.contains("lb")) continue;
      for (const other of drawn) {
        const o = other.r;
        if (
          other.b !== b &&
          across(r.left, r.right, o.left, o.right) > 0.5 &&
          across(r.top, r.bottom, o.top, o.bottom) > 0.5
        )
          small.push(
            `${b.getAttribute("aria-label")} overlaps ${other.b.getAttribute("aria-label")}`,
          );
      }
    }
    /** Whether a label's button meets a neighbour's on the axis it is short on. */
    const shared = (control: HTMLElement, r: DOMRect, vertical: boolean) =>
      control.classList.contains("lb") &&
      drawn.some(({ b, r: o }) => {
        if (b === control) return false;
        const [near, beside] = vertical
          ? [
              Math.min(Math.abs(o.top - r.bottom), Math.abs(r.top - o.bottom)),
              across(r.left, r.right, o.left, o.right),
            ]
          : [
              Math.min(Math.abs(o.left - r.right), Math.abs(r.left - o.right)),
              across(r.top, r.bottom, o.top, o.bottom),
            ];
        return near < 0.75 && beside > 0;
      });
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
      const narrow = Math.round(r.width) < least && !shared(control, r, false);
      const short = Math.round(r.height) < least && !shared(control, r, true);
      if (narrow || short) {
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

/** Every control too small for the floor in each state the walk `through` visits. */
async function measured(
  page: Page,
  least: number,
  through: (page: Page, visit: Visit) => Promise<void>,
): Promise<string[]> {
  const found: string[] = [];
  await through(page, async (state) => {
    for (const small of await tooSmall(page, least)) found.push(`${state}: ${small}`);
  });
  return found;
}

/** Every state of the page's walk, in order: a proof, Practice, Learn, the tour and the restore bar. */
async function walk(page: Page, visit: Visit) {
  await proving(page, visit);
  await menus(page, visit);
  await practising(page, visit);
  await learning(page, visit);
  await attempting(page, visit);
  await touring(page, visit);
  await restoring(page, visit);
}

test("every control is a target of 24 by 24 pixels at least, at a desktop's width", async ({
  page,
}) => {
  expect(await measured(page, 24, walk)).toEqual([]);
});

test("a goal's reasons and their controls are targets of 24 by 24 pixels at least, at a desktop's width", async ({
  page,
}) => {
  expect(await measured(page, 24, reasons)).toEqual([]);
});

test("Learn's answers and lesson 1's rewrite are targets of 24 by 24 pixels at least, at a desktop's width", async ({
  page,
}) => {
  expect(await measured(page, 24, answers)).toEqual([]);
});

test("an ordinary tab's controls are targets of 24 by 24 pixels at least, at a desktop's width", async ({
  page,
}) => {
  expect(await measured(page, 24, ordinary)).toEqual([]);
});

test("a truth table's and a tableau's controls are targets of 24 by 24 pixels at least", async ({
  page,
}) => {
  expect(await measured(page, 24, methods)).toEqual([]);
});

test("a translation's and an interpolant's controls are targets of 24 by 24 pixels at least", async ({
  page,
}) => {
  expect(await measured(page, 24, transforms)).toEqual([]);
});

test("the workspace's controls are targets of 24 by 24 pixels at least", async ({ page }) => {
  expect(await measured(page, 24, linking)).toEqual([]);
});

test("a calculus of one's own's controls are targets of 24 by 24 pixels at least", async ({
  page,
}) => {
  expect(await measured(page, 24, customising)).toEqual([]);
});

test("the ordinary course's controls are targets of 24 by 24 pixels at least", async ({ page }) => {
  expect(await measured(page, 24, coursing)).toEqual([]);
});

test("natural deduction's controls are targets of 24 by 24 pixels at least", async ({ page }) => {
  expect(await measured(page, 24, deducing)).toEqual([]);
});

test.describe("at a phone's width", () => {
  test.use(pixel);

  test("the ordinary course's controls are 44 by 44 pixels at least", async ({ page }) => {
    expect(await measured(page, 44, coursing)).toEqual([]);
  });

  test("natural deduction's controls are 44 by 44 pixels at least", async ({ page }) => {
    expect(await measured(page, 44, deducing)).toEqual([]);
  });

  test("a calculus of one's own's controls are 44 by 44 pixels at least", async ({ page }) => {
    expect(await measured(page, 44, customising)).toEqual([]);
  });

  test("a truth table's and a tableau's controls are 44 by 44 pixels at least", async ({
    page,
  }) => {
    expect(await measured(page, 44, methods)).toEqual([]);
  });

  test("a translation's and an interpolant's controls are 44 by 44 pixels at least", async ({
    page,
  }) => {
    expect(await measured(page, 44, transforms)).toEqual([]);
  });

  test("the workspace's controls are 44 by 44 pixels at least", async ({ page }) => {
    expect(await measured(page, 44, linking)).toEqual([]);
  });

  test("an ordinary tab's controls are 44 by 44 pixels at least", async ({ page }) => {
    expect(await measured(page, 44, ordinary)).toEqual([]);
  });

  test("every control is a target of 44 by 44 pixels at least", async ({ page }) => {
    expect(await measured(page, 44, walk)).toEqual([]);
  });

  test("Learn's answers and lesson 1's rewrite are 44 by 44 pixels at least", async ({ page }) => {
    expect(await measured(page, 44, answers)).toEqual([]);
  });

  test("a goal's reasons and their controls are 44 by 44 pixels at least", async ({ page }) => {
    expect(await measured(page, 44, reasons)).toEqual([]);
  });

  test("the witness chooser and its refusal are 44 by 44 pixels at least", async ({ page }) => {
    expect(await measured(page, 44, witnessing)).toEqual([]);
  });

  test("the cut chooser and the elimination's controls are 44 by 44 pixels at least", async ({
    page,
  }) => {
    expect(await measured(page, 44, cutting)).toEqual([]);
  });

  test("the stage's controls stay 44 by 44 pixels in every math font", async ({ page }) => {
    await goto(page);
    expect(await measured(page, 44, fonts)).toEqual([]);
  });
});

test("the stage's controls stay 24 by 24 pixels in every math font, at a desktop's width", async ({
  page,
}) => {
  await goto(page);
  expect(await measured(page, 24, fonts)).toEqual([]);
});
