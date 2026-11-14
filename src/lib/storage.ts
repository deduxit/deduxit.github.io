// deduxit © Fabian Lukas Grubmüller 2026
// Licensed under the EUPL

/**
 * The move of the browser's keys from the prover's old name, linlog, to deduxit. A visitor of an
 * earlier release has their settings, theme, Practice's progress and saved proofs under
 * `linlog-…`; the island moves each to its `deduxit-…` key before anything reads one, so nothing
 * is lost. Kept for one release after the rename, then removed with the old names.
 */

import { PRACTICE_KEY } from "./practice";
import { PREVIOUS_KEY, SHELF_PREFIX, type Store } from "./shelf";
import { THEME_KEY } from "./theme";

/** The storage key of the settings. */
export const SETTINGS_KEY = "deduxit-settings";

/** The old name every key began with. */
const OLD = "linlog-";
/** The name every key begins with now. */
const NEW = "deduxit-";

/** The keys that are moved: each is one of these, or begins with the shelf's prefix. */
const MOVED = [SETTINGS_KEY, THEME_KEY, PRACTICE_KEY, PREVIOUS_KEY];

/** The new key for an old one, or undefined for a key that is not the page's. */
const renamed = (key: string): string | undefined => {
  if (!key.startsWith(OLD)) return undefined;
  const now = NEW + key.slice(OLD.length);
  return MOVED.includes(now) || now.startsWith(SHELF_PREFIX) ? now : undefined;
};

/**
 * Moves every old key's value to its new key and deletes the old key. A new key that holds a
 * value already keeps it: it was written later. A storage the browser refuses is left alone.
 */
export function migrate(store: Store | undefined): void {
  if (!store) return;
  try {
    const old: string[] = [];
    for (let i = 0; i < store.length; i++) {
      const key = store.key(i);
      if (key !== null && renamed(key) !== undefined) old.push(key);
    }
    for (const key of old) {
      const now = renamed(key) as string;
      const value = store.getItem(key);
      if (value !== null && store.getItem(now) === null) store.setItem(now, value);
      store.removeItem(key);
    }
  } catch {
    // Storage refused or full: the old keys stay for the next visit.
  }
}
