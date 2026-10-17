"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import type { ContentItem } from "@/lib/ai/schemas";
import { LanguageBadge } from "./ui";

/** Article reader; scrolls to and highlights the cited passage (#chunk-<n>). */
export function ReadView() {
  const contentId = useSearchParams().get("c");
  const [content, setContent] = useState<ContentItem | null | undefined>();
  const [target, setTarget] = useState<string>();

  useEffect(() => {
    if (!contentId) return;
    let cancelled = false;
    fetch(`/api/content/${encodeURIComponent(contentId)}`)
      .then((r) => (r.ok ? r.json() : { content: null }))
      .then((body) => {
        if (cancelled) return;
        setContent(body.content);
        setTarget(window.location.hash.slice(1));
      });
    return () => {
      cancelled = true;
    };
  }, [contentId]);

  useEffect(() => {
    if (content && target) document.getElementById(target)?.scrollIntoView({ block: "center" });
  }, [content, target]);

  if (!contentId) return <p className="text-[var(--muted)]">No article selected.</p>;
  if (content === undefined) return <p className="animate-pulse text-[var(--muted)]">Loading…</p>;
  if (content === null) return <p className="text-[var(--muted)]">This article is unavailable.</p>;

  return (
    <article className="mx-auto max-w-2xl">
      <div className="flex items-center gap-2 text-sm text-[var(--muted)]">
        <span>{content.creator}</span>
        {content.language && <LanguageBadge language={content.language} />}
      </div>
      <h1 className="mt-2 text-2xl font-semibold leading-tight">{content.title}</h1>
      <div className="mt-6 space-y-6">
        {(content.bodyChunks ?? []).map((chunk, n) => {
          const id = `chunk-${n}`;
          return (
            <section
              key={id}
              id={id}
              className={`rounded-xl p-3 transition-colors ${target === id ? "bg-[var(--surface)] ring-1 ring-[var(--accent)]" : ""}`}
            >
              {chunk.heading && <h2 className="mb-1 font-semibold">{chunk.heading}</h2>}
              <p className="leading-relaxed">{chunk.text}</p>
              {target === id && <p className="mt-2 text-xs text-[var(--accent)]">Corvus cited this passage</p>}
            </section>
          );
        })}
      </div>
      <Link href="/" className="mt-8 inline-block text-sm text-[var(--muted)] hover:underline">
        ← Back to Ask
      </Link>
    </article>
  );
}
