// deduxit © Fabian Lukas Grubmüller 2026
// Licensed under the EUPL

import { expect, it } from "vitest";
import { PRACTICE_KEY } from "./practice";
import { PREVIOUS_KEY, SHELF_PREFIX, type Store } from "./shelf";
import { migrate, SETTINGS_KEY } from "./storage";
import { THEME_KEY } from "./theme";

/** A storage in memory, its keys in the order they were set. */
const memory = (entries: Record<string, string>): Store & { map: Map<string, string> } => {
  const map = new Map(Object.entries(entries));
  return {
    map,
    get length() {
      return map.size;
    },
    key: (i) => [...map.keys()][i] ?? null,
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => void map.set(key, value),
    removeItem: (key) => void map.delete(key),
  };
};

it("moves an earlier release's keys to their new names, keeping a newer value", () => {
  const store = memory({
    "linlog-settings": '{"budget":7}',
    "linlog-theme": "dark",
    "linlog-practice": '{"proved":["p1"]}',
    "linlog-proofs:visit": '{"version":2}',
    "linlog-proofs-previous": '{"version":1}',
    "linlog-other": "not the page's",
    [THEME_KEY]: "light",
  });
  migrate(store);
  expect(Object.fromEntries(store.map)).toEqual({
    "linlog-other": "not the page's",
    [SETTINGS_KEY]: '{"budget":7}',
    [THEME_KEY]: "light",
    [PRACTICE_KEY]: '{"proved":["p1"]}',
    [`${SHELF_PREFIX}visit`]: '{"version":2}',
    [PREVIOUS_KEY]: '{"version":1}',
  });
});
