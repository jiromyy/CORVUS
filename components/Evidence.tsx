"use client";

import { CheckCircle2, ExternalLink, Trash2, X } from "lucide-react";
import Link from "next/link";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { MemoryView } from "@/lib/db/store";
import { secondsToClock } from "@/lib/time";
import { MEMORY_FORGOTTEN_EVENT } from "./shell/events";
import { LanguageBadge, SOURCE_LABEL, formatSeen, memoryHref, videoIdOf } from "./ui";
import { thumbnailUrl } from "@/lib/youtube";

/** What the drawer needs; recap sources carry only some of these fields. */
export type EvidenceItem = Pick<MemoryView, "id" | "title" | "source" | "memoryType" | "deepLink"> &
  Partial<Pick<MemoryView, "excerpt" | "visualDescription" | "startSeconds" | "endSeconds" | "occurredAt" | "language" | "contentId" | "sourceMode">> & {
    /** The sentence in an answer or recap this source supports. */
    claim?: string;
  };

type Ctx = { openEvidence: (item: EvidenceItem) => void; notify: (message: string) => void };
const EvidenceContext = createContext<Ctx | null>(null);

export function useEvidence() {
  const value = useContext(EvidenceContext);
  if (!value) throw new Error("useEvidence must be used inside EvidenceProvider");
  return value;
}

/** How each memory type is supported: observed activity versus what Gemini derived from the content. */
const KIND: Record<MemoryView["memoryType"], { label: string; tone: "success" | "accent" | "warning"; body: string; use: string }> = {
  video: {
    label: "Observed",
    tone: "success",
    body: "Your history records that you opened this video. It shows the watch happened, not that you watched all of it.",
    use: "Confirms activity",
  },
  video_moment: {
    label: "AI video moment",
    tone: "accent",
    body: "Gemini watched this public video and described what is said and shown at this moment. Corvus links it to the time you watched the video.",
    use: "Describes content",
  },
  search: {
    label: "Observed",
    tone: "success",
    body: "Your history records this search query. Corvus did not record keystrokes or the results page.",
    use: "Confirms activity",
  },
  article: {
    label: "Observed",
    tone: "success",
    body: "Your history records that you opened this page. It shows the visit, not that you read it in full.",
    use: "Confirms activity",
  },
  article_passage: {
    label: "Derived passage",
    tone: "warning",
    body: "A section of a public page you opened. Corvus can confirm the visit, not that you read this exact passage.",
    use: "Describes content",
  },
};

const ORIGIN: Record<NonNullable<MemoryView["sourceMode"]>, string> = {
  demo_seed: "Raven’s sample history",
  user_import: "Google Takeout import",
  user_capture: "Chrome extension",
};

export function EvidenceProvider({ children }: { children: ReactNode }) {
  const [item, setItem] = useState<EvidenceItem | null>(null);
  const [toast, setToast] = useState("");

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(""), 2800);
    return () => window.clearTimeout(id);
  }, [toast]);

  const openEvidence = useCallback((next: EvidenceItem) => setItem(next), []);
  const value = useMemo(() => ({ openEvidence, notify: setToast }), [openEvidence]);

  return (
    <EvidenceContext.Provider value={value}>
      {children}
      {item && <EvidenceDrawer item={item} onClose={() => setItem(null)} notify={setToast} />}
      {toast && (
        <div className="toast" role="status">
          <CheckCircle2 size={17} /> {toast}
        </div>
      )}
    </EvidenceContext.Provider>
  );
}

function EvidenceDrawer({ item, onClose, notify }: { item: EvidenceItem; onClose: () => void; notify: (m: string) => void }) {
  const [forgetting, setForgetting] = useState(false);
  const kind = KIND[item.memoryType];
  const videoId = item.source === "youtube" ? videoIdOf(item) : undefined;
  const href = memoryHref(item);
  const external = href.startsWith("http");
  const isMoment = item.memoryType === "video_moment" && item.startSeconds !== undefined;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function forget() {
    setForgetting(true);
    const res = await fetch(`/api/memories/${encodeURIComponent(item.id)}`, { method: "DELETE" }).catch(() => undefined);
    setForgetting(false);
    if (!res?.ok) return notify("Couldn’t forget this memory. Try again.");
    window.dispatchEvent(new CustomEvent(MEMORY_FORGOTTEN_EVENT, { detail: item.id }));
    notify("Forgotten. It won’t be used in future answers.");
    onClose();
  }

  return (
    <>
      <button className="drawer-scrim" aria-label="Close evidence" onClick={onClose} />
      <aside className="evidence-drawer" role="dialog" aria-modal="true" aria-labelledby="evidence-title">
        <div className="drawer-header">
          <div>
            <span className="eyebrow">Evidence</span>
            <h2 id="evidence-title">Why Corvus used this</h2>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Close evidence" autoFocus>
            <X size={18} />
          </button>
        </div>
        {videoId && (
          <div className="drawer-thumbnail" style={{ backgroundImage: `url(${thumbnailUrl(videoId)})` }}>
            <span>{isMoment ? secondsToClock(item.startSeconds!) : "Video"}</span>
          </div>
        )}
        <div className="drawer-content">
          <span className={`badge ${kind.tone}`}>{kind.label}</span>
          <h3>{item.title}</h3>
          <p className="drawer-subtitle">
            {SOURCE_LABEL[item.source]}
            {item.occurredAt && ` · ${formatSeen(item.occurredAt)}`}
            {isMoment && ` · ${secondsToClock(item.startSeconds!)}${item.endSeconds ? `–${secondsToClock(item.endSeconds)}` : ""}`}
          </p>
          {item.claim && <div className="drawer-quote">“{item.claim}”</div>}
          {item.excerpt && item.excerpt !== item.title && <p>{item.excerpt}</p>}
          {item.visualDescription && (
            <p>
              <b className="text-[var(--text-1)]">On screen: </b>
              {item.visualDescription}
            </p>
          )}
          <p className="faint">{kind.body}</p>
          <div className="evidence-facts">
            {item.sourceMode && (
              <div>
                <span>Memory source</span>
                <strong>{ORIGIN[item.sourceMode]}</strong>
              </div>
            )}
            <div>
              <span>Use in answer</span>
              <strong>{kind.use}</strong>
            </div>
            {item.language && (
              <div>
                <span>Language</span>
                <LanguageBadge language={item.language} />
              </div>
            )}
          </div>
        </div>
        <div className="drawer-actions">
          {external ? (
            <a className="button" href={href} target="_blank" rel="noreferrer">
              <ExternalLink size={15} /> {item.source === "google_search" ? "Search again" : "Open source"}
            </a>
          ) : (
            <Link className="button" href={href} onClick={onClose}>
              <ExternalLink size={15} /> {isMoment ? `Open at ${secondsToClock(item.startSeconds!)}` : "Open"}
            </Link>
          )}
          <button className="button secondary" onClick={forget} disabled={forgetting}>
            <Trash2 size={15} /> {forgetting ? "Forgetting…" : "Forget"}
          </button>
        </div>
      </aside>
    </>
  );
}
