"use client";

import { ArrowUpRight, ChevronRight, Link2, PanelRightOpen, RotateCcw, Search, Trash2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { SourceKind } from "@/lib/ai/schemas";
import type { MemoryView } from "@/lib/db/store";
import type { ThreadSummary } from "@/lib/threads";
import { secondsToClock } from "@/lib/time";
import { useEvidence } from "./Evidence";
import { MEMORY_FORGOTTEN_EVENT } from "./shell/events";
import { LanguageBadge, SOURCE_LABEL, SourceIcon, formatClockTime, memoryHref } from "./ui";

type Filter = "all" | SourceKind;

const TYPE_CLASS: Record<SourceKind, string> = { youtube: "", google_search: "search", web: "web" };
const ORIGIN_LABEL = { demo_seed: "Sample", user_import: "Takeout", user_capture: "Extension" } as const;

const dayLabel = (iso: string) =>
  new Intl.DateTimeFormat("en-PH", { weekday: "long", month: "short", day: "numeric", timeZone: "Asia/Manila" }).format(new Date(iso));

/** Everything Corvus remembers for this visitor, as a timeline, with forget, restore, and delete-all. */
export function LibraryView() {
  const { openEvidence, notify } = useEvidence();
  const [memories, setMemories] = useState<MemoryView[] | undefined>();
  const [hiddenCount, setHiddenCount] = useState(0);
  const [includeSample, setIncludeSample] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");
  const [showMoments, setShowMoments] = useState(false);
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState<string>();

  async function load() {
    const res = await fetch("/api/memories");
    const body = await res.json();
    setMemories(body.memories);
    setHiddenCount(body.hiddenCount);
    setIncludeSample(body.includeSample);
  }

  const [threads, setThreads] = useState<ThreadSummary[]>([]);

  useEffect(() => {
    fetch("/api/threads")
      .then((r) => (r.ok ? r.json() : { threads: [] }))
      .catch(() => ({ threads: [] }))
      .then((body) => setThreads(body.threads ?? []));
  }, [memories?.length]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/memories")
      .then((r) => r.json())
      .then((body) => {
        if (cancelled) return;
        setMemories(body.memories);
        setHiddenCount(body.hiddenCount);
        setIncludeSample(body.includeSample);
      });
    // Forgetting from the evidence drawer removes the row here too.
    const onForgot = (e: Event) => {
      const id = (e as CustomEvent<string>).detail;
      setMemories((all) => all?.filter((m) => m.id !== id && !m.id.startsWith(`${id}__`)));
      setHiddenCount((n) => n + 1);
    };
    window.addEventListener(MEMORY_FORGOTTEN_EVENT, onForgot);
    return () => {
      cancelled = true;
      window.removeEventListener(MEMORY_FORGOTTEN_EVENT, onForgot);
    };
  }, []);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (memories ?? []).filter(
      (m) =>
        (filter === "all" || m.source === filter) &&
        (showMoments || m.memoryType !== "video_moment") &&
        m.memoryType !== "article_passage" &&
        (!q || `${m.title} ${m.excerpt}`.toLowerCase().includes(q)),
    );
  }, [memories, filter, showMoments, query]);

  const days = useMemo(() => {
    const groups = new Map<string, MemoryView[]>();
    for (const m of visible) {
      const key = dayLabel(m.occurredAt);
      groups.set(key, [...(groups.get(key) ?? []), m]);
    }
    return [...groups.entries()];
  }, [visible]);

  async function remove(id: string) {
    setBusy(id);
    await fetch(`/api/memories/${encodeURIComponent(id)}`, { method: "DELETE" });
    setMemories((all) => all?.filter((m) => m.id !== id && !m.id.startsWith(`${id}__`)));
    setHiddenCount((n) => n + 1);
    setBusy(undefined);
    notify("Forgotten. It won’t be used in future answers.");
  }

  async function reset() {
    setBusy("reset");
    await fetch("/api/workspace/reset", { method: "POST" });
    await load();
    setBusy(undefined);
    notify("Sample memories restored");
  }

  async function toggleSample(value: boolean) {
    setBusy("sample");
    await fetch("/api/workspace", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ includeSample: value }),
    });
    await load();
    setBusy(undefined);
  }

  async function deleteOwn() {
    if (!window.confirm("Delete everything you imported or captured? Raven's sample data is not affected.")) return;
    setBusy("delete-all");
    await fetch("/api/workspace", { method: "DELETE" });
    await load();
    setBusy(undefined);
    notify("Your imported and captured data was deleted");
  }

  if (!memories) return <p className="loading-line">Loading memories…</p>;

  return (
    <div>
      <div className="memory-toolbar">
        <div role="group" aria-label="Source" className="segmented">
          {(["all", "youtube", "google_search", "web"] as Filter[]).map((f) => (
            <button key={f} onClick={() => setFilter(f)} aria-pressed={filter === f}>
              {f === "all" ? "All" : SOURCE_LABEL[f]}
            </button>
          ))}
        </div>
        <label className="search-field">
          <Search size={16} />
          <span className="sr-only">Filter memories</span>
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Filter by title…" />
        </label>
      </div>

      <div className="memory-options">
        <label className="check-row">
          <input type="checkbox" checked={includeSample} disabled={busy === "sample"} onChange={(e) => toggleSample(e.target.checked)} />
          Include Raven’s sample data
        </label>
        <label className="check-row">
          <input type="checkbox" checked={showMoments} onChange={(e) => setShowMoments(e.target.checked)} />
          Show individual video moments
        </label>
        <span className="faint text-[13px]">{visible.length} shown</span>
        {hiddenCount > 0 && (
          <button onClick={reset} disabled={busy === "reset"} className="text-link inline-flex items-center gap-1.5 text-[13px]">
            <RotateCcw size={13} /> Restore {hiddenCount} forgotten sample memor{hiddenCount === 1 ? "y" : "ies"}
          </button>
        )}
      </div>

      {threads[0] && (
        <div className="thread-strip">
          <Link href={`/library/thread?t=${threads[0].id}`} className="thread-highlight">
            <span className="thread-icon">
              <Link2 size={20} />
            </span>
            <div className="min-w-0">
              <span className="badge accent">Active interest thread</span>
              <h2 className="capitalize">{threads[0].topic}</h2>
              <p>
                {[threads[0].counts.videos && `${threads[0].counts.videos} videos`, threads[0].counts.pages && `${threads[0].counts.pages} pages`, threads[0].counts.searches && `${threads[0].counts.searches} searches`]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </div>
            <div className="mini-network" aria-hidden>
              <i />
              <i />
              <i />
              <i />
            </div>
            <ChevronRight size={20} />
          </Link>
          {threads.length > 1 && (
            <div className="thread-chips">
              <span className="faint text-[12.5px]">More threads:</span>
              {threads.slice(1, 6).map((t) => (
                <Link key={t.id} href={`/library/thread?t=${t.id}`} className="chip capitalize">
                  {t.topic} <small className="faint">{t.count}</small>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      <section className="timeline" aria-label="Memory timeline">
        {days.map(([day, items]) => (
          <div key={day}>
            <div className="timeline-day">
              <span>{day}</span>
              <small>
                {items.length} activit{items.length === 1 ? "y" : "ies"}
              </small>
            </div>
            {items.map((m) => {
              const href = memoryHref(m);
              const external = href.startsWith("http");
              return (
                <article className="memory-row" key={m.id}>
                  <div className="time-column">{formatClockTime(m.occurredAt)}</div>
                  <span className={`memory-type ${TYPE_CLASS[m.source]}`}>
                    <SourceIcon source={m.source} size={17} />
                  </span>
                  <div className="memory-main">
                    <h3>{m.title}</h3>
                    {m.excerpt && m.excerpt !== m.title && <p>{m.excerpt}</p>}
                    <div className="memory-meta">
                      <span className="badge">{SOURCE_LABEL[m.source]}</span>
                      {m.topics[0] && <span className="badge accent capitalize">{m.topics[0]}</span>}
                      {m.memoryType === "video_moment" && m.startSeconds !== undefined && (
                        <span className="badge accent">Moment · {secondsToClock(m.startSeconds)}</span>
                      )}
                      <LanguageBadge language={m.language} />
                      <span className="faint text-xs">{ORIGIN_LABEL[m.sourceMode]}</span>
                    </div>
                  </div>
                  <div className="row-actions">
                    {external ? (
                      <a href={href} target="_blank" rel="noreferrer" aria-label={`Open ${m.title}`}>
                        <ArrowUpRight size={17} />
                      </a>
                    ) : (
                      <Link href={href} aria-label={`Open ${m.title}`}>
                        <ArrowUpRight size={17} />
                      </Link>
                    )}
                    <button aria-label={`Inspect evidence: ${m.title}`} onClick={() => openEvidence(m)}>
                      <PanelRightOpen size={17} />
                    </button>
                    <button className="forget" aria-label={`Forget memory: ${m.title}`} disabled={busy === m.id} onClick={() => remove(m.id)}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        ))}
      </section>
      {!visible.length && <p className="muted mt-6">No memories match.</p>}

      <section className="panel danger-zone">
        <div>
          <h3>Delete my data</h3>
          <p>Remove everything you imported or captured. Raven’s sample is not affected.</p>
        </div>
        <button onClick={deleteOwn} disabled={busy === "delete-all"} className="button danger">
          <Trash2 size={15} /> {busy === "delete-all" ? "Deleting…" : "Delete all"}
        </button>
      </section>
    </div>
  );
}
