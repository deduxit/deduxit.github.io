// deduxit © Fabian Lukas Grubmüller 2026
// Licensed under the EUPL

// The linear course moved under src/content/linear/ unchanged: every lesson, problem, session
// and rule here has the SHA-256 it had before the move (moved.json), and none is missing or
// new. A deliberate edit of one updates moved.json in the same commit.

import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const here = new URL("./", import.meta.url);
const before = JSON.parse(readFileSync(new URL("moved.json", here), "utf8")) as Record<
  string,
  string
>;

describe("the linear course's move", () => {
  it("kept every lesson, problem, session and rule as it was", () => {
    const now: Record<string, string> = {};
    for (const folder of ["problems", "lessons", "rules"])
      for (const name of readdirSync(new URL(`${folder}/`, here)).sort()) {
        const bytes = readFileSync(new URL(`${folder}/${name}`, here));
        now[`${folder}/${name}`] = createHash("sha256").update(bytes).digest("hex");
      }
    expect(Object.keys(now).length).toBe(912);
    expect(now).toEqual(before);
  });
});
