"use client";

import { Activity, Brain, ChevronDown, Compass, Database, Laptop, MessageSquare, MoreHorizontal, Plus, Podcast, Settings, X, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Wordmark } from "../Brand";
import { CaptureCard } from "../CaptureControls";
import { Account } from "./Account";
import { NEW_CONVERSATION_EVENT } from "./events";
import { RecentQuestions } from "./RecentQuestions";

type NavItem = { href: string; label: string; icon: LucideIcon; bottom?: boolean };

/** In priority order: when space runs out, items leave from the end into "More". */
const ITEMS: NavItem[] = [
  { href: "/", label: "Ask Corvus", icon: MessageSquare },
  { href: "/library", label: "Memory", icon: Brain },
  { href: "/recap", label: "Recap", icon: Podcast },
  { href: "/for-you", label: "For you", icon: Compass },
  { href: "/insights", label: "Insights", icon: Activity },
  { href: "/sources", label: "Sources", icon: Database },
  { href: "/extension", label: "Browser extension", icon: Laptop, bottom: true },
  { href: "/settings", label: "Settings", icon: Settings, bottom: true },
];

const ITEM_H = 46; // a nav row (42px) plus its gap
const HISTORY_MIN = 128; // the "Recent questions" label plus two rows; below this it becomes a button
const MIN_VISIBLE = 2;

const isActive = (href: string, pathname: string) =>
  pathname === href || (href === "/sources" && pathname === "/import") || (href === "/library" && pathname.startsWith("/library"));

/**
 * The sidebar never scrolls as a whole. Only the recent-questions list scrolls; when even that has no
 * room it collapses to a button, and nav items that still don't fit move into a "More" menu.
 */
export function Sidebar({ pathname, open, onClose }: { pathname: string; open: boolean; onClose: () => void }) {
  const router = useRouter();
  const aside = useRef<HTMLElement>(null);
  const top = useRef<HTMLDivElement>(null);
  const capture = useRef<HTMLDivElement>(null);
  const account = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(ITEMS.length);
  const [compactHistory, setCompactHistory] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);

  useLayoutEffect(() => {
    const el = aside.current;
    if (!el || !top.current || !capture.current || !account.current) return;
    const measure = () => {
      const pad = parseFloat(getComputedStyle(el).paddingTop) + parseFloat(getComputedStyle(el).paddingBottom);
      // Only fixed parts are measured (not the nav links that move into More), so the layout can't oscillate.
      const room = el.clientHeight - pad - top.current!.offsetHeight - capture.current!.offsetHeight - account.current!.offsetHeight;
      if (room >= ITEMS.length * ITEM_H + HISTORY_MIN) {
        setCompactHistory(false);
        setVisible(ITEMS.length);
        return;
      }
      setCompactHistory(true);
      const afterHistory = room - ITEM_H; // the history button
      if (afterHistory >= ITEMS.length * ITEM_H) return setVisible(ITEMS.length);
      setVisible(Math.max(MIN_VISIBLE, Math.floor((afterHistory - ITEM_H) / ITEM_H))); // leave a row for "More"
    };
    measure();
    const ro = new ResizeObserver(measure);
    [el, top.current, capture.current, account.current].forEach((n) => ro.observe(n));
    return () => ro.disconnect();
  }, []);

  // Close the More menu on outside click or Escape (choosing an item closes it too).
  useEffect(() => {
    if (!moreOpen) return;
    const close = (e: MouseEvent) => !(e.target as Element).closest(".more-menu, .more-button") && setMoreOpen(false);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setMoreOpen(false);
    window.addEventListener("mousedown", close);
    window.addEventListener("keydown", esc);
    return () => {
      window.removeEventListener("mousedown", close);
      window.removeEventListener("keydown", esc);
    };
  }, [moreOpen]);

  const shown = ITEMS.slice(0, visible);
  const hidden = ITEMS.slice(visible);
  const link = ({ href, label, icon: Icon }: NavItem) => (
    <Link key={href} href={href} onClick={onClose} className={`nav-item ${isActive(href, pathname) ? "active" : ""}`} aria-current={isActive(href, pathname) ? "page" : undefined}>
      <Icon size={18} />
      <span>{label}</span>
    </Link>
  );

  return (
    <>
      <button className={`sidebar-scrim ${open ? "visible" : ""}`} aria-label="Close navigation" tabIndex={open ? 0 : -1} onClick={onClose} />
      <aside ref={aside} className={`sidebar ${open ? "open" : ""}`} aria-label="Primary navigation">
        <div ref={top}>
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
        </div>

        <nav className="nav-list" aria-label="Main">
          {shown.filter((i) => !i.bottom).map(link)}
          {hidden.length > 0 && (
            <div className="more-wrap">
              <button
                className={`nav-item more-button ${hidden.some((i) => isActive(i.href, pathname)) ? "active" : ""}`}
                aria-haspopup="menu"
                aria-expanded={moreOpen}
                onClick={() => setMoreOpen((v) => !v)}
              >
                <MoreHorizontal size={18} />
                <span>More</span>
                <ChevronDown size={15} className={`ml-auto transition-transform ${moreOpen ? "rotate-180" : ""}`} />
              </button>
              {moreOpen && (
                <div className="more-menu" role="menu">
                  {hidden.map((i) => (
                    <Link
                      key={i.href}
                      role="menuitem"
                      href={i.href}
                      onClick={() => {
                        setMoreOpen(false);
                        onClose();
                      }}
                      className={`nav-item ${isActive(i.href, pathname) ? "active" : ""}`}>
                      <i.icon size={17} />
                      <span>{i.label}</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}
        </nav>

        <div className="sidebar-middle">
          <RecentQuestions onNavigate={onClose} compact={compactHistory} />
        </div>

        <div className="sidebar-bottom">
          <div ref={capture}>
            <CaptureCard onNavigate={onClose} />
          </div>
          {shown.filter((i) => i.bottom).map(link)}
          <div ref={account}>
            <Account />
          </div>
        </div>
      </aside>
    </>
  );
}
