"use client";

import { History } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ASK_EVENT, RECENT_EVENT } from "./events";

const KEY = "corvus.recent-questions";
type Recent = { q: string; at: number };

export function readRecent(): Recent[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]") as Recent[];
  } catch {
    return [];
  }
}

/** Remembers a question in this browser (newest first, no duplicates) for the sidebar list. */
export function rememberQuestion(q: string) {
  const next = [{ q, at: Date.now() }, ...readRecent().filter((r) => r.q !== q)].slice(0, 6);
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Not remembered; harmless.
  }
  window.dispatchEvent(new Event(RECENT_EVENT));
}

function ago(at: number) {
  const m = Math.round((Date.now() - at) / 60_000);
  if (m < 1) return "now";
  if (m < 60) return `${m}m`;
  if (m < 1440) return `${Math.round(m / 60)}h`;
  return `${Math.round(m / 1440)}d`;
}

/**
 * Sidebar list of recent questions; selecting one asks it again. The list scrolls within the space it
 * has; `compact` (a short window) turns it into a button that opens the list as a pop-up.
 */
export function RecentQuestions({ onNavigate, compact = false }: { onNavigate: () => void; compact?: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const [recent, setRecent] = useState<Recent[]>([]);
  const [popup, setPopup] = useState(false);

  useEffect(() => {
    if (!popup) return;
    const close = (e: MouseEvent) => !(e.target as Element).closest(".recent-popup, .recent-button") && setPopup(false);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setPopup(false);
    window.addEventListener("mousedown", close);
    window.addEventListener("keydown", esc);
    return () => {
      window.removeEventListener("mousedown", close);
      window.removeEventListener("keydown", esc);
    };
  }, [popup]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- browser-only list, read after mount
    setRecent(readRecent());
    const update = () => setRecent(readRecent());
    window.addEventListener(RECENT_EVENT, update);
    return () => window.removeEventListener(RECENT_EVENT, update);
  }, []);

  if (!recent.length) return null;

  const items = recent.map((r) => (
    <button
      key={r.q}
      className="recent-chat"
      title={r.q}
      onClick={() => {
        setPopup(false);
        onNavigate();
        if (pathname === "/") window.dispatchEvent(new CustomEvent(ASK_EVENT, { detail: r.q }));
        else router.push(`/?ask=${encodeURIComponent(r.q)}`);
      }}
    >
      <span>{r.q}</span>
      <span>{ago(r.at)}</span>
    </button>
  ));

  if (compact)
    return (
      <div className="recent-compact">
        <button className="nav-item recent-button" aria-haspopup="dialog" aria-expanded={popup} onClick={() => setPopup((v) => !v)}>
          <History size={17} />
          <span>Recent questions</span>
          <span className="badge ml-auto">{recent.length}</span>
        </button>
        {popup && (
          <div className="recent-popup" role="dialog" aria-label="Recent questions">
            {items}
          </div>
        )}
      </div>
    );

  return (
    <div className="sidebar-section">
      <div className="section-label">Recent questions</div>
      <div className="recent-list">{items}</div>
    </div>
  );
}
