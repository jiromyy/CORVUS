/** Light / dark / system theme, shared by the top-bar toggle and Settings. The pre-paint script is in app/layout.tsx. */
export type ThemePreference = "light" | "dark" | "system";
export const THEME_EVENT = "corvus:theme";

export function currentTheme(): ThemePreference {
  return (document.documentElement.dataset.themePreference as ThemePreference | undefined) ?? "system";
}

export function applyTheme(pref: ThemePreference) {
  const dark = pref === "dark" || (pref === "system" && matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.dataset.theme = dark ? "dark" : "light";
  document.documentElement.dataset.themePreference = pref;
}

/** Applies, remembers, and announces a new preference so every control can follow it. */
export function setTheme(pref: ThemePreference) {
  applyTheme(pref);
  try {
    localStorage.setItem("corvus-theme", pref);
  } catch {
    // Not remembered; harmless.
  }
  window.dispatchEvent(new CustomEvent(THEME_EVENT, { detail: pref }));
}
