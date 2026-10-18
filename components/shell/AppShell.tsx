"use client";

import { Laptop, Menu, Moon, Sun } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { EvidenceProvider } from "../Evidence";
import { Welcome } from "../Welcome";
import { Sidebar } from "./Sidebar";
import { THEME_EVENT, applyTheme, currentTheme, setTheme, type ThemePreference } from "./theme";

const TITLES: Record<string, string> = {
  "/": "Ask Corvus",
  "/library": "Memory",
  "/recap": "Recap",
  "/for-you": "For you",
  "/insights": "Insights",
  "/sources": "Sources",
  "/import": "Import & capture",
  "/settings": "Privacy & memory",
  "/extension": "Browser extension",
  "/watch": "Video moment",
  "/read": "Article",
};

/** The v2 application frame: sidebar navigation, sticky top bar with theme control, ambient background. */
export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <EvidenceProvider>
      <div className="ambient" aria-hidden />
      <div className="grain" aria-hidden />
      <div className="app-shell">
        <Sidebar pathname={pathname} open={menuOpen} onClose={() => setMenuOpen(false)} />
        <div className="main-shell">
          <header className="topbar">
            <button className="icon-button mobile-menu" aria-label="Open navigation" onClick={() => setMenuOpen(true)}>
              <Menu size={20} />
            </button>
            <div className="topbar-title">
              <span>{TITLES[pathname] ?? (pathname === "/library/thread" ? "Interest thread" : "Corvus")}</span>
              {pathname === "/" && (
                <span className="status-inline">
                  <span className="status-dot" /> Memories ready
                </span>
              )}
            </div>
            <div className="topbar-actions">
              <ThemeToggle />
            </div>
          </header>
          <main className="main-content" id="main">
            <div className="route-stage" key={pathname}>
              {children}
            </div>
          </main>
        </div>
      </div>
      <Welcome />
    </EvidenceProvider>
  );
}

const NEXT_THEME: Record<ThemePreference, ThemePreference> = { dark: "light", light: "system", system: "dark" };

/** Cycles dark → light → system; stays in sync with the choice in Settings. */
function ThemeToggle() {
  const [pref, setPref] = useState<ThemePreference>("system");

  useEffect(() => {
    // The pre-paint script already applied the saved preference; mirror it in the button.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- browser-only value, read after mount
    setPref(currentTheme());
    const onTheme = (e: Event) => setPref((e as CustomEvent<ThemePreference>).detail);
    window.addEventListener(THEME_EVENT, onTheme);
    return () => window.removeEventListener(THEME_EVENT, onTheme);
  }, []);

  useEffect(() => {
    if (pref !== "system") return;
    const media = matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyTheme("system");
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [pref]);

  const Icon = pref === "dark" ? Moon : pref === "light" ? Sun : Laptop;
  return (
    <button className="icon-button" onClick={() => setTheme(NEXT_THEME[pref])} aria-label={`Theme: ${pref}. Switch theme`} title={`Theme: ${pref}`}>
      <Icon size={18} />
    </button>
  );
}
