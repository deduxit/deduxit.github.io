// deduxit © Fabian Lukas Grubmüller 2026
// Licensed under the EUPL

// Every colour that carries a meaning stays apart from the colours it is seen
// with, for a visitor with any common colour-vision deficiency: under
// simulated protanopia, deuteranopia and tritanopia, in both schemes. Each
// meaning also has a word, a sign or a shape beside its colour, so the colour
// is never all a visitor has to go by.
//
// The simulation: Machado, Oliveira and Fernandes, "A physiologically-based
// model for simulation of color vision deficiency", IEEE TVCG 15(6), 2009,
// 1291-1298; the matrices are severity 1.0 of the authors' own Table 1
// (https://www.inf.ufrgs.br/~oliveira/pubs_files/CVD_Simulation/CVD_Simulation.html).
// The paper says its model is "not intended to handle tritanopia"; the
// authors' table gives the matrix nonetheless, and it is the published one
// at hand (Brettel, Viénot and Mollon 1997 is not openly available). The
// matrices act on linear RGB, since the paper derives them from the primaries'
// spectra (its Eq. 8), which add in linear light: sRGB is linearised as CSS
// Color 4's `lin_sRGB` does. Distance is Euclidean in OKLab, times 100
// (Ottosson, https://bottosson.github.io/posts/oklab/): at least 8 under each
// deficiency, and 15 for full colour vision.
//
// deduxit's mark is not among them: its lapis is the project's identity, not
// a meaning, and stays the mark's colour whatever the page's colours are.
// WCAG draws the same line: SC 1.4.3 exempts text that is part of a logo or
// brand name, and the Understanding document of SC 1.4.11 treats logotypes
// alike. What holds it instead: the mark stands out from the backgrounds it
// is drawn on, and nothing but the mark is painted with it.

import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

type Rgb = readonly [number, number, number];
type Matrix = readonly [Rgb, Rgb, Rgb];

const DEFICIENCIES: Readonly<Record<string, Matrix>> = {
  protanopia: [
    [0.152286, 1.052583, -0.204868],
    [0.114503, 0.786281, 0.099216],
    [-0.003882, -0.048116, 1.051998],
  ],
  deuteranopia: [
    [0.367322, 0.860646, -0.227968],
    [0.280085, 0.672501, 0.047413],
    [-0.01182, 0.04294, 0.968881],
  ],
  tritanopia: [
    [1.255528, -0.076749, -0.178779],
    [-0.078411, 0.930809, 0.147602],
    [0.004733, 0.691367, 0.3039],
  ],
};
/** The least distance, in OKLab times 100, under a simulated deficiency and in full colour vision. */
const SIMULATED = 8;
const FULL = 15;

/**
 * Which colours are seen together, each pair of a group to stay apart: a
 * drawing's colours with one another and with every colour of the bands
 * around it, the tabs' states and the selection.
 */
const BANDS = ["ok", "warn", "bad", "accent", "line"];
const GROUPS: Readonly<Record<string, readonly string[]>> = {
  // A proof's state: the tabs' marks side by side, the keywords, the dock's note.
  verdicts: BANDS,
  // The active goal and the selection among the other formulas, inside Learn's frame.
  focus: ["accent", "ink", "learn"],
  // A net, under the bands: its plain edges and its ⅋ edges (a witness is never drawn here).
  net: [...BANDS, "ink", "net-par"],
  // An essential net, under the bands: its input side and its dominator lines.
  essential: [...BANDS, "ink", "net-input", "net-dominator"],
  // Every colour deduxit may draw in one net, a witness's among them.
  "net drawing": ["ink", "net-par", "net-highlight"],
  "essential drawing": ["ink", "net-input", "net-dominator", "net-highlight"],
};

/** Every pair of a group closer than the thresholds, in one scheme, read through `colourOf`. */
function tooClose(
  colourOf: (name: string) => string,
  groups: Readonly<Record<string, readonly string[]>> = GROUPS,
): string[] {
  const close: string[] = [];
  for (const [group, names] of Object.entries(groups)) {
    for (const [i, a] of names.entries()) {
      for (const b of names.slice(i + 1)) {
        const [x, y] = [colourOf(a), colourOf(b)];
        if (distance(x, y) < FULL) close.push(`${group}: ${a} and ${b} in full colour`);
        for (const [deficiency, m] of Object.entries(DEFICIENCIES))
          if (distance(x, y, m) < SIMULATED) close.push(`${group}: ${a} and ${b}, ${deficiency}`);
      }
    }
  }
  return close;
}

/** Okabe and Ito's colour-universal palette (https://jfly.uni-koeln.de/color/, Fig. 16), whose hue each net colour keeps. */
const OKABE_ITO: Readonly<Record<string, string>> = {
  "net-par": "#0072b2", // blue
  "net-input": "#0072b2", // blue, as ⅋'s: the two never share a drawing
  "net-dominator": "#cc79a7", // reddish purple
  "net-highlight": "#d55e00", // vermilion
};

const tokens = readFileSync(new URL("./tokens.css", import.meta.url), "utf8");
const schemes = ["light", "dark"] as const;
/** A colour token's value in each scheme. */
function colour(name: string): Readonly<Record<(typeof schemes)[number], string>> {
  const match = new RegExp(`--color-${name}: light-dark\\((#[0-9a-f]{6}), (#[0-9a-f]{6})\\);`).exec(
    tokens,
  );
  if (!match?.[1] || !match[2]) throw new Error(`tokens.css: no --color-${name} pair`);
  return { light: match[1], dark: match[2] };
}

const linear = (hex: string): Rgb => {
  const channel = (i: number) => {
    const c = Number.parseInt(hex.slice(1 + 2 * i, 3 + 2 * i), 16) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return [channel(0), channel(1), channel(2)];
};
const simulate = (rgb: Rgb, m: Matrix): Rgb => {
  const row = (r: Rgb) => Math.min(1, Math.max(0, r[0] * rgb[0] + r[1] * rgb[1] + r[2] * rgb[2]));
  return [row(m[0]), row(m[1]), row(m[2])];
};
const oklab = ([r, g, b]: Rgb): Rgb => {
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
};
const distance = (a: string, b: string, m?: Matrix) => {
  const lab = (hex: string) => oklab(m ? simulate(linear(hex), m) : linear(hex));
  const [p, q] = [lab(a), lab(b)];
  return 100 * Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);
};
/** WCAG 2's contrast ratio of two colours, from their relative luminance. */
const contrast = (a: string, b: string) => {
  const luminance = (hex: string) => {
    const [r, g, b] = linear(hex);
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const [dark, light] = [luminance(a), luminance(b)].sort((x, y) => x - y) as [number, number];
  return (light + 0.05) / (dark + 0.05);
};
const hue = (hex: string) => {
  const [, a, b] = oklab(linear(hex));
  return (Math.atan2(b, a) * 180) / Math.PI;
};

describe("the colours that carry a meaning", () => {
  for (const scheme of schemes) {
    it(`stay apart under simulated protanopia, deuteranopia and tritanopia, ${scheme}`, () => {
      expect(tooClose((name) => colour(name)[scheme])).toEqual([]);
    });
  }

  it("draw the nets in the hues of Okabe and Ito's palette", () => {
    for (const [name, palette] of Object.entries(OKABE_ITO))
      for (const scheme of schemes) {
        const turn = Math.abs(hue(colour(name)[scheme]) - hue(palette));
        expect(Math.min(turn, 360 - turn), `${name}, ${scheme}`).toBeLessThan(3);
      }
  });

  it("are told apart by the simulation as published: green and red meet under deuteranopia", () => {
    // The check's own check: a green and a red of equal weight, far apart in full colour, meet.
    const m = DEFICIENCIES["deuteranopia"] as Matrix;
    expect(distance("#2e7d32", "#c62828")).toBeGreaterThan(FULL);
    expect(distance("#2e7d32", "#c62828", m)).toBeLessThan(SIMULATED);
  });
});

describe("the mark's lapis", () => {
  it("stands out from the band and the field it is drawn on, as SC 1.4.11 asks of a graphic", () => {
    for (const scheme of schemes)
      for (const ground of ["panel", "field"])
        expect(
          contrast(colour("logo")[scheme], colour(ground)[scheme]),
          `logo on ${ground}, ${scheme}`,
        ).toBeGreaterThanOrEqual(3);
  });

  it("paints the mark alone: no rule but the mark's names it, nor any token or component", () => {
    const styles = new URL("./", import.meta.url);
    const app = readFileSync(new URL("app.css", styles), "utf8");
    // The `.logo` rule, nested braces and all: the only place the colour may be used.
    const at = app.indexOf("\n.logo {");
    expect(at).toBeGreaterThan(-1);
    let depth = 0;
    let end = app.indexOf("{", at);
    do {
      if (app[end] === "{") depth++;
      if (app[end] === "}") depth--;
      end++;
    } while (depth > 0);
    expect(app.slice(at, end)).toContain("var(--color-logo)");
    expect(app.slice(0, at) + app.slice(end)).not.toContain("--color-logo");
    expect(tokens.match(/--color-logo\b/g)).toHaveLength(1);
    const src = new URL("../", import.meta.url);
    const named = readdirSync(src, { recursive: true, encoding: "utf8" })
      .filter((path) => /\.(tsx?|astro|css)$/.test(path) && !path.endsWith("colours.test.ts"))
      .filter((path) => !/^styles[/\\](app|tokens)\.css$/.test(path))
      .filter((path) => readFileSync(new URL(path, src), "utf8").includes("--color-logo"));
    expect(named).toEqual([]);
  });
});
