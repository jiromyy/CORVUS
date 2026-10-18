"use client";

import { Activity, Brain, Compass, Database, Laptop, Menu, MessageSquare, Moon, Plus, Podcast, Settings, Sun, X, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { Wordmark } from "../Brand";
import { CaptureCard } from "../CaptureControls";
import { Account } from "./Account";
import { RecentQuestions } from "./RecentQuestions";
import { EvidenceProvider } from "../Evidence";
import { Welcome } from "../Welcome";
import { NEW_CONVERSATION_EVENT } from "./events";
import { THEME_EVENT, applyTheme, currentTheme, setTheme, type ThemePreference } from "./theme";

const NAV: Array<{ href: string; label: string; icon: LucideIcon }> = [
  { href: "/", label: "Ask Corvus", icon: MessageSquare },
  { href: "/library", label: "Memory", icon: Brain },
  { href: "/recap", label: "Recap", icon: Podcast },
  { href: "/for-you", label: "For you", icon: Compass },
  { href: "/insights", label: "Insights", icon: Activity },
  { href: "/sources", label: "Sources", icon: Database },
];

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

function Sidebar({ pathname, open, onClose }: { pathname: string; open: boolean; onClose: () => void }) {
  const router = useRouter();
  return (
    <>
      <button className={`sidebar-scrim ${open ? "visible" : ""}`} aria-label="Close navigation" tabIndex={open ? 0 : -1} onClick={onClose} />
      <aside className={`sidebar ${open ? "open" : ""}`} aria-label="Primary navigation">
        <div className="brand-row">
          <Link href="/" onClick={onClose} aria-label="Corvus home">
            <Wordmark className="brand-wordmark brand-ink" />
          </Link>
          <button className="icon-button sidebar-close" aria-label="Close navigation" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <button
          className="button new-chat"
          onClick={() => {
            window.dispatchEvent(new Event(NEW_CONVERSATION_EVENT));
            router.push("/");
            onClose();
          }}
        >
          <Plus size={17} /> New conversation
        </button>
        <nav className="nav-list" aria-label="Main">
          {NAV.map(({ href, label, icon: Icon }) => {
            // Import lives under Sources.
            const active = pathname === href || (href === "/sources" && pathname === "/import") || (href === "/library" && pathname.startsWith("/library/"));
            return (
              <Link key={href} href={href} onClick={onClose} className={`nav-item ${active ? "active" : ""}`} aria-current={active ? "page" : undefined}>
                <Icon size={18} />
                <span>{label}</span>
              </Link>
            );
          })}
        </nav>
        <RecentQuestions onNavigate={onClose} />
        <div className="sidebar-spacer" />
        <CaptureCard onNavigate={onClose} />
        <Link href="/extension" onClick={onClose} className={`nav-item ${pathname === "/extension" ? "active" : ""}`} aria-current={pathname === "/extension" ? "page" : undefined}>
          <Laptop size={18} />
          <span>Browser extension</span>
        </Link>
        <Link href="/settings" onClick={onClose} className={`nav-item ${pathname === "/settings" ? "active" : ""}`} aria-current={pathname === "/settings" ? "page" : undefined}>
          <Settings size={18} />
          <span>Settings</span>
        </Link>
        <Account />
        <p className="sidebar-note">Corvus is a hackathon concept and is not a Google product.</p>
      </aside>
    </>
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
