"use client";

import { useEffect, useMemo, useState } from "react";
import type { SourceKind } from "@/lib/ai/schemas";
import type { MemoryView } from "@/lib/db/store";
import { SourceCard } from "./SourceCard";
import { SOURCE_LABEL } from "./ui";

type Filter = "all" | SourceKind;

/** Everything Corvus remembers for this visitor, with delete and reset. */
export function LibraryView() {
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
    return () => {
      cancelled = true;
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

  async function remove(id: string) {
    setBusy(id);
    await fetch(`/api/memories/${encodeURIComponent(id)}`, { method: "DELETE" });
    setMemories((all) => all?.filter((m) => m.id !== id && !m.id.startsWith(`${id}__`)));
    setHiddenCount((n) => n + 1);
    setBusy(undefined);
  }

  async function reset() {
    setBusy("reset");
    await fetch("/api/workspace/reset", { method: "POST" });
    await load();
    setBusy(undefined);
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
    if (!window.confirm("Delete everything you imported or captured? Maya's sample data is not affected.")) return;
    setBusy("delete-all");
    await fetch("/api/workspace", { method: "DELETE" });
    await load();
    setBusy(undefined);
  }

  if (!memories) return <p className="animate-pulse text-[var(--muted)]">Loading memories…</p>;

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <label htmlFor="filter-q" className="sr-only">
          Filter memories
        </label>
        <input
          id="filter-q"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filter by title…"
          className="min-w-0 flex-1 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2 outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
        />
        <div role="group" aria-label="Source" className="flex flex-wrap gap-1">
          {(["all", "youtube", "google_search", "web"] as Filter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              aria-pressed={filter === f}
              className={`rounded-full border px-3 py-1.5 text-sm ${
                filter === f ? "border-[var(--accent)] text-[var(--foreground)]" : "border-[var(--border)] text-[var(--muted)]"
              }`}
            >
              {f === "all" ? "All" : SOURCE_LABEL[f]}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-[var(--muted)]">
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={includeSample} disabled={busy === "sample"} onChange={(e) => toggleSample(e.target.checked)} />
          Include Maya’s sample data
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={showMoments} onChange={(e) => setShowMoments(e.target.checked)} />
          Show individual video moments
        </label>
        <span>{visible.length} shown</span>
        {hiddenCount > 0 && (
          <button onClick={reset} disabled={busy === "reset"} className="text-[var(--accent)] hover:underline">
            Restore {hiddenCount} deleted sample memor{hiddenCount === 1 ? "y" : "ies"}
          </button>
        )}
      </div>

      <ul className="mt-5 grid gap-3">
        {visible.map((m) => (
          <li key={m.id} className="relative">
            <SourceCard memory={m} />
            <button
              onClick={() => remove(m.id)}
              disabled={busy === m.id}
              className="absolute right-3 bottom-3 rounded-lg border border-[var(--border)] px-3 py-1 text-sm text-[var(--muted)] hover:border-red-400 hover:text-red-500 disabled:opacity-50"
              aria-label={`Delete memory: ${m.title}`}
            >
              {busy === m.id ? "Deleting…" : "Delete"}
            </button>
          </li>
        ))}
      </ul>
      {!visible.length && <p className="mt-6 text-[var(--muted)]">No memories match.</p>}

      <div className="mt-10 border-t border-[var(--border)] pt-4">
        <button onClick={deleteOwn} disabled={busy === "delete-all"} className="text-sm text-red-500 hover:underline disabled:opacity-50">
          {busy === "delete-all" ? "Deleting…" : "Delete my imported and captured data"}
        </button>
      </div>
    </div>
  );
}
