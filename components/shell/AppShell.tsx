"use client";

import { Brain, Import, Laptop, Menu, MessageSquare, Moon, Plus, Podcast, Sun, X, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { Wordmark } from "../Brand";
import { EvidenceProvider } from "../Evidence";
import { NEW_CONVERSATION_EVENT } from "./events";

const NAV: Array<{ href: string; label: string; icon: LucideIcon }> = [
  { href: "/", label: "Ask Corvus", icon: MessageSquare },
  { href: "/library", label: "Memory", icon: Brain },
  { href: "/recap", label: "Recap", icon: Podcast },
  { href: "/import", label: "Import & capture", icon: Import },
];

const TITLES: Record<string, string> = {
  "/": "Ask Corvus",
  "/library": "Memory",
  "/recap": "Recap",
  "/import": "Import & capture",
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
              <span>{TITLES[pathname] ?? "Corvus"}</span>
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
          {NAV.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} onClick={onClose} className={`nav-item ${pathname === href ? "active" : ""}`} aria-current={pathname === href ? "page" : undefined}>
              <Icon size={18} />
              <span>{label}</span>
            </Link>
          ))}
        </nav>
        <div className="sidebar-spacer" />
        <Link href="/import#extension" className="capture-card" onClick={onClose}>
          <span className="capture-dot" />
          <div>
            <strong>Automatic capture</strong>
            <span>YouTube + Search via the extension</span>
          </div>
          <Laptop size={16} className="faint" />
        </Link>
        <div className="profile-card">
          <div className="avatar" aria-hidden>
            M
          </div>
          <div>
            <strong>Maya’s sample + yours</strong>
            <span>Private to this browser</span>
          </div>
        </div>
        <p className="sidebar-note">Corvus is a hackathon concept and is not a Google product.</p>
      </aside>
    </>
  );
}

type ThemePreference = "light" | "dark" | "system";
const NEXT_THEME: Record<ThemePreference, ThemePreference> = { dark: "light", light: "system", system: "dark" };

function applyTheme(pref: ThemePreference) {
  const dark = pref === "dark" || (pref === "system" && matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.dataset.theme = dark ? "dark" : "light";
  document.documentElement.dataset.themePreference = pref;
}

/** Cycles dark → light → system; the choice is remembered in this browser. */
function ThemeToggle() {
  const [pref, setPref] = useState<ThemePreference>("system");

  useEffect(() => {
    // The pre-paint script already applied the saved preference; mirror it in the button.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- browser-only value, read after mount
    setPref((document.documentElement.dataset.themePreference as ThemePreference) ?? "system");
  }, []);

  useEffect(() => {
    if (pref !== "system") return;
    const media = matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyTheme("system");
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [pref]);

  function cycle() {
    const next = NEXT_THEME[pref];
    setPref(next);
    applyTheme(next);
    try {
      localStorage.setItem("corvus-theme", next);
    } catch {
      // Not remembered; harmless.
    }
  }

  const Icon = pref === "dark" ? Moon : pref === "light" ? Sun : Laptop;
  return (
    <button className="icon-button" onClick={cycle} aria-label={`Theme: ${pref}. Switch theme`} title={`Theme: ${pref}`}>
      <Icon size={18} />
    </button>
  );
}
