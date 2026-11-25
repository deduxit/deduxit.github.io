// deduxit © Fabian Lukas Grubmüller 2026
// Licensed under the EUPL

import { describe, expect, it } from "vitest";
import { keyAction } from "./keys";

const press = (
  key: string,
  held: Partial<Record<"ctrl" | "meta" | "alt" | "shift", boolean>> = {},
) => ({
  key,
  ctrlKey: !!held.ctrl,
  metaKey: !!held.meta,
  altKey: !!held.alt,
  shiftKey: !!held.shift,
  isComposing: false,
});
const outside = { inField: false, singleKeys: true };

describe("the keys", () => {
  it("reads a letter by the character it types", () => {
    expect(keyAction(press("j"), outside)).toBe("nextGoal");
    expect(keyAction(press("]"), outside)).toBe("nextGoal");
    expect(keyAction(press("T", { shift: true }), outside)).toBe("previousSequent");
  });

  it("takes Ctrl or Cmd with Z for undo and redo, and Ctrl+Y", () => {
    expect(keyAction(press("z", { ctrl: true }), outside)).toBe("undo");
    expect(keyAction(press("Z", { meta: true, shift: true }), outside)).toBe("redo");
    expect(keyAction(press("y", { ctrl: true }), outside)).toBe("redo");
  });

  it("leaves a key with Alt alone, as AltGr is reported", () => {
    expect(keyAction(press("[", { ctrl: true, alt: true }), outside)).toBeNull();
    expect(keyAction(press("j", { alt: true }), outside)).toBeNull();
  });

  it("acts on no key in a field, nor while a character is composed", () => {
    expect(keyAction(press("j"), { inField: true, singleKeys: true })).toBeNull();
    expect(keyAction(press("z", { ctrl: true }), { inField: true, singleKeys: true })).toBeNull();
    expect(keyAction({ ...press("j"), isComposing: true }, outside)).toBeNull();
  });

  it("turns the single keys off with the switch and keeps the keys with Ctrl", () => {
    const off = { inField: false, singleKeys: false };
    expect(keyAction(press("j"), off)).toBeNull();
    expect(keyAction(press("?"), off)).toBeNull();
    expect(keyAction(press("z", { ctrl: true }), off)).toBe("undo");
    expect(keyAction(press("/", { ctrl: true }), off)).toBe("keys");
  });
});
