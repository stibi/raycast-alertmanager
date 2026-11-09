import { Keyboard } from "@raycast/api";

/**
 * Extension-specific shortcuts. Raycast's `Keyboard.Shortcut.Common` presets
 * are used where the meaning matches (Refresh, New, Open). These are the
 * actions with no matching preset; they reuse the same keys but under
 * alertmanager-specific names.
 */
export const Shortcuts = {
  Silence: {
    macOS: { modifiers: ["cmd"], key: "s" },
    Windows: { modifiers: ["ctrl"], key: "s" },
  },
  InstantSilence: {
    macOS: { modifiers: ["cmd", "shift"], key: "s" },
    Windows: { modifiers: ["ctrl", "shift"], key: "s" },
  },
  SilenceByLabel: {
    macOS: { modifiers: ["cmd"], key: "l" },
    Windows: { modifiers: ["ctrl"], key: "l" },
  },
  SortBy: {
    macOS: { modifiers: ["cmd", "shift"], key: "s" },
    Windows: { modifiers: ["ctrl", "shift"], key: "s" },
  },
} satisfies Record<string, Keyboard.Shortcut>;
