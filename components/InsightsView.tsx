"use client";

import { Activity, Clock3, Languages, MessageSquare, Repeat, Search } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { Insights, Range } from "@/lib/insights";

const RANGE_LABEL: Record<Range, string> = { "7d": "Last 7 days", "30d": "Last 30 days", all: "All time" };
const LANGUAGE_NAME: Record<string, string> = { en: "English", fil: "Filipino", tl: "Filipino" };
const BUCKET_NAME: Record<string, string> = {
  "12a": "after midnight",
  "3a": "in the early hours",
  "6a": "in the early morning",
  "9a": "in the late morning",
  "12p": "around midday",
  "3p": "in the afternoon",
  "6p": "in the early evening",
  "9p": "late in the evening",
};
const FORMATS = [
  { key: "videos", label: "Videos watched", color: "var(--accent)" },
  { key: "searches", label: "Searches", color: "var(--warning)" },
  { key: "articles", label: "Pages opened", color: "var(--success)" },
] as const;

const ask = (q: string) => `/?ask=${encodeURIComponent(q)}`;
const pct = (n: number) => `${Math.round(n * 100)}%`;

/** What Corvus can tell about your media intake, counted from your own memories. */
export function InsightsView() {
  const [range, setRange] = useState<Range>("30d");
  const [data, setData] = useState<Insights | undefined>();

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/insights?range=${range}`)
      .then((r) => (r.ok ? r.json() : undefined))
      .catch(() => undefined)
      .then((body) => !cancelled && body && setData(body));
    return () => {
      cancelled = true;
    };
  }, [range]);

  const loading = !data || data.range !== range;

  return (
    <div className="content-wide">
      <header className="page-header">
        <div>
          <span className="eyebrow">
            {RANGE_LABEL[range]}
            {data && ` · ${data.total} activities`}
          </span>
          <h1>
            Your media intake, <em>without judgment</em>
          </h1>
          <p>Patterns are descriptive and counted only from what you imported or captured. Nothing here is treated as a permanent trait.</p>
        </div>
        <div className="page-actions">
          <div role="radiogroup" aria-label="Time range" className="segmented">
            {(Object.keys(RANGE_LABEL) as Range[]).map((r) => (
              <button key={r} role="radio" aria-checked={range === r} onClick={() => setRange(r)}>
                {RANGE_LABEL[r]}
              </button>
            ))}
          </div>
        </div>
      </header>

      {!data ? (
        <p className="loading-line">Counting your activity…</p>
      ) : data.total === 0 ? (
        <div className="panel p-8 text-center">
          <h2 className="serif m-0 text-[28px]">Nothing in this period yet</h2>
          <p className="muted">Try a longer range, or import your history to see your own patterns.</p>
          <Link href="/import" className="button mt-2">
            Import history
          </Link>
        </div>
      ) : (
        <div className={loading ? "opacity-60 transition-opacity" : "transition-opacity"} aria-busy={loading}>
          <div className="insight-metrics stagger">
            <Metric icon={Activity} label="Activities" value={String(data.total)} detail={`${data.counts.videos} videos · ${data.counts.searches} searches · ${data.counts.articles} pages`} />
            <Metric icon={Clock3} label="Active days" value={String(data.activeDays)} detail={`${data.sessions} sessions`} />
            <Metric
              icon={Languages}
              label="Languages"
              value={String(data.languages.length)}
              detail={data.languages.map((l) => LANGUAGE_NAME[l.language] ?? l.language).join(" · ")}
            />
            <Metric
              icon={Repeat}
              label="Repeated searches"
              value={String(data.repeatedSearches.length)}
              detail={data.repeatedSearches[0] ? `top: ×${data.repeatedSearches[0].times}` : "none in this period"}
            />
          </div>

          <div className="insight-grid">
            <section className="panel insight-panel" aria-labelledby="mix-title">
              <div className="section-heading">
                <div>
                  <h2 id="mix-title">What you take in</h2>
                  <p>By format, across everything in this period</p>
                </div>
              </div>
              <div className="donut-row">
                <Donut total={data.total} parts={FORMATS.map((f) => ({ value: data.counts[f.key], color: f.color }))} />
                <div className="legend">
                  {FORMATS.map((f) => (
                    <div key={f.key}>
                      <span>
                        <i style={{ background: f.color }} /> {f.label}
                      </span>
                      <strong>{pct(data.counts[f.key] / data.total)}</strong>
                    </div>
                  ))}
                  {data.languages.length > 1 && (
                    <p className="faint m-0 mt-2 text-[12.5px]">
                      {data.languages.map((l) => `${pct(l.count / data.total)} ${LANGUAGE_NAME[l.language] ?? l.language}`).join(" · ")}
                    </p>
                  )}
                </div>
              </div>
            </section>

            <section className="panel insight-panel" aria-labelledby="rhythm-title">
              <div className="section-heading">
                <div>
                  <h2 id="rhythm-title">Your daily rhythm</h2>
                  <p>Activities by time of day (Philippine time)</p>
                </div>
                <span className="badge accent">Inferred</span>
              </div>
              <div className="bar-chart" role="img" aria-label={data.rhythm.map((r) => `${r.label}: ${r.count}`).join(", ")}>
                {data.rhythm.map((r) => {
                  const max = Math.max(...data.rhythm.map((x) => x.count), 1);
                  return (
                    <div key={r.label} className={`bar-group ${data.peak?.label === r.label && r.count ? "active" : ""}`}>
                      <i style={{ height: `${Math.max(4, (r.count / max) * 100)}%` }} title={`${r.count} activities`} />
                      <span>{r.label}</span>
                    </div>
                  );
                })}
              </div>
              {data.peak && data.peak.count > 0 && (
                <div className="pattern-callout">
                  <span>
                    <Clock3 size={16} />
                  </span>
                  <div>
                    <strong>You’re most active {BUCKET_NAME[data.peak.label]}</strong>
                    <p>
                      {data.peak.count} activities across {data.peak.days} day{data.peak.days === 1 ? "" : "s"} · a pattern, not an assumption
                    </p>
                  </div>
                  <Link href={ask(`What did I watch and search ${BUCKET_NAME[data.peak.label]}?`)} className="text-link text-[13px]">
                    Ask
                  </Link>
                </div>
              )}
            </section>
          </div>

          <section className="panel insight-panel mt-4" aria-labelledby="topics-title">
            <div className="section-heading">
              <div>
                <h2 id="topics-title">Topics you return to</h2>
                <p>Share of activities that touch each topic</p>
              </div>
            </div>
            {data.topics.length ? (
              <ul className="topic-bars stagger">
                {data.topics.map((t) => (
                  <li key={t.label}>
                    <Link href={ask(`What have I learned about ${t.label}?`)}>
                      <span className="capitalize">{t.label}</span>
                      <i>
                        <b style={{ width: pct(t.share) }} />
                      </i>
                      <small>
                        {t.count} · {pct(t.share)}
                      </small>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted">No topic came up more than once in this period.</p>
            )}
          </section>

          <section className="panel insight-panel mt-4" aria-labelledby="patterns-title">
            <div className="section-heading">
              <div>
                <h2 id="patterns-title">Patterns Corvus may use</h2>
                <p>For suggestions and recaps. Each one comes from your activity, and you can ask about it.</p>
              </div>
            </div>
            {data.repeatedSearches.map((r) => (
              <PatternRow
                key={r.query}
                icon={Search}
                title={`You searched “${r.query}” ${r.times} times`}
                detail="Observed · a question that keeps coming back may still be open"
                href={ask(`Where did I see the answer to "${r.query}"?`)}
              />
            ))}
            {data.peak && data.peak.count > 1 && (
              <PatternRow
                icon={Clock3}
                title={`Most of your activity happens ${BUCKET_NAME[data.peak.label]}`}
                detail={`Inferred from ${data.peak.count} activities · a habit, not a rule; pick your context in For you`}
                href="/for-you"
                cta="For you"
              />
            )}
            {data.languages.length > 1 && (
              <PatternRow
                icon={Languages}
                title={`You learn in ${data.languages.map((l) => LANGUAGE_NAME[l.language] ?? l.language).join(" and ")}`}
                detail="Observed · Corvus answers in the language you ask in and searches across both"
                href={ask("Saan ko napanood kung paano mag-install ng Python?")}
              />
            )}
            {!data.repeatedSearches.length && data.languages.length < 2 && (!data.peak || data.peak.count < 2) && (
              <p className="muted">No clear patterns in this period yet.</p>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

function Metric({ icon: Icon, label, value, detail }: { icon: typeof Activity; label: string; value: string; detail: string }) {
  return (
    <div className="metric">
      <span className="flex items-center gap-1.5">
        <Icon size={14} /> {label}
      </span>
      <strong>{value}</strong>
      <small className="faint text-[12px]">{detail}</small>
    </div>
  );
}

function Donut({ total, parts }: { total: number; parts: Array<{ value: number; color: string }> }) {
  const shown = parts.filter((p) => p.value > 0);
  const stops = shown.map((p, i) => {
    const before = shown.slice(0, i).reduce((n, q) => n + q.value, 0);
    return `${p.color} ${(before / total) * 360}deg ${((before + p.value) / total) * 360}deg`;
  });
  return (
    <div className="donut" style={{ background: `conic-gradient(${stops.join(", ")})` }} aria-hidden>
      <div>
        <strong>{total}</strong>
        <span>activities</span>
      </div>
    </div>
  );
}

function PatternRow({ icon: Icon, title, detail, href, cta = "Ask about this" }: { icon: typeof Activity; title: string; detail: string; href: string; cta?: string }) {
  return (
    <div className="pattern-row">
      <span>
        <Icon size={16} />
      </span>
      <div>
        <strong>{title}</strong>
        <small>{detail}</small>
      </div>
      <Link href={href} className="button secondary compact">
        <MessageSquare size={14} /> {cta}
      </Link>
    </div>
  );
}
