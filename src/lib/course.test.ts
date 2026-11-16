// deduxit © Fabian Lukas Grubmüller 2026
// Licensed under the EUPL

// Each suite's course format, written as JSON Schema beside its content for tools other than
// the page: the files equal what the schemas say. DEDUXIT_WRITE_SCHEMAS=1 writes them anew
// after a schema changed on purpose.

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { z } from "astro/zod";
import { linearLesson, linearProblem, ordinaryLesson, ordinaryProblem } from "./course";

const SCHEMAS = {
  "linear/lesson.schema.json": linearLesson,
  "linear/problem.schema.json": linearProblem,
  "ordinary/lesson.schema.json": ordinaryLesson,
  "ordinary/problem.schema.json": ordinaryProblem,
} as const;

describe("the course format", () => {
  for (const [path, schema] of Object.entries(SCHEMAS))
    it(`is written down in src/content/${path}`, () => {
      const file = new URL(`../content/${path}`, import.meta.url);
      const written = `${JSON.stringify(z.toJSONSchema(schema, { io: "input" }), null, 2)}\n`;
      if (process.env["DEDUXIT_WRITE_SCHEMAS"] === "1") writeFileSync(file, written);
      expect(existsSync(file), path).toBe(true);
      expect(JSON.parse(readFileSync(file, "utf8"))).toEqual(JSON.parse(written));
    });
});
