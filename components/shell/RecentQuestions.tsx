"use client";

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

/** Sidebar list of recent questions; selecting one asks it again. */
export function RecentQuestions({ onNavigate }: { onNavigate: () => void }) {
  const router = useRouter();
  const pathname = usePathname();
  const [recent, setRecent] = useState<Recent[]>([]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- browser-only list, read after mount
    setRecent(readRecent());
    const update = () => setRecent(readRecent());
    window.addEventListener(RECENT_EVENT, update);
    return () => window.removeEventListener(RECENT_EVENT, update);
  }, []);

  if (!recent.length) return null;
  return (
    <div className="sidebar-section">
      <div className="section-label">Recent questions</div>
      {recent.slice(0, 4).map((r) => (
        <button
          key={r.q}
          className="recent-chat"
          title={r.q}
          onClick={() => {
            onNavigate();
            if (pathname === "/") window.dispatchEvent(new CustomEvent(ASK_EVENT, { detail: r.q }));
            else router.push(`/?ask=${encodeURIComponent(r.q)}`);
          }}
        >
          <span>{r.q}</span>
          <span>{ago(r.at)}</span>
        </button>
      ))}
    </div>
  );
}
