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

  if (!contentId) return <p className="muted">No article selected.</p>;
  if (content === undefined) return <p className="loading-line">Loading…</p>;
  if (content === null) return <p className="muted">This article is unavailable.</p>;

  return (
    <article className="content-reading">
      <div className="flex items-center gap-2 text-sm text-[var(--muted)]">
        <span>{content.creator}</span>
        {content.language && <LanguageBadge language={content.language} />}
      </div>
      <h1 className="mt-3 text-[34px] font-medium leading-tight tracking-[-0.035em]">{content.title}</h1>
      <div className="mt-6 space-y-3">
        {(content.bodyChunks ?? []).map((chunk, n) => {
          const id = `chunk-${n}`;
          return (
            <section
              key={id}
              id={id}
              className={`article-chunk ${target === id ? "cited" : ""}`}
            >
              {chunk.heading && <h2 className="mb-1 font-semibold">{chunk.heading}</h2>}
              <p className="m-0 text-[16px] leading-[1.75]">{chunk.text}</p>
              {target === id && <span className="badge accent mt-3">Corvus cited this passage</span>}
            </section>
          );
        })}
      </div>
      <Link href="/" className="button ghost compact mt-8">
        ← Back to Ask
      </Link>
    </article>
  );
}
