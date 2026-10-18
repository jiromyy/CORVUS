"use client";

import { ArrowRight, FileArchive, Laptop, ShieldCheck, Sparkles } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { formatSeen } from "./ui";

type Summary = { videos: number; searches: number; pages: number; moments: number; latest: string | null };
type Sources = {
  sample: Summary & { included: boolean; hidden: number };
  takeout: Summary;
  extension: Summary & { pairedBrowsers: number };
};

const total = (s: Summary) => s.videos + s.searches + s.pages;

/** Each source of memory, what it has contributed, and how to add or change it. */
export function SourcesView() {
  const [data, setData] = useState<Sources | undefined>();

  useEffect(() => {
    fetch("/api/sources")
      .then((r) => (r.ok ? r.json() : undefined))
      .catch(() => undefined)
      .then((body) => body && setData(body));
  }, []);

  return (
    <div className="content-wide">
      <header className="page-header">
        <div>
          <span className="eyebrow">Memory sources</span>
          <h1>
            Know exactly what <em>Corvus can see</em>
          </h1>
          <p>
            Imports and capture are separate, inspectable sources. Corvus never connects to your Google account; it only knows
            what you import or capture here.
          </p>
        </div>
        <div className="page-actions">
          <Link href="/import" className="button">
            <FileArchive size={16} /> Import history
          </Link>
        </div>
      </header>

      {!data ? (
        <p className="loading-line">Checking your sources…</p>
      ) : (
        <div className="source-grid stagger">
          <SourceTile
            icon={Sparkles}
            title="Raven’s sample history"
            status={data.sample.included ? "Included" : "Hidden"}
            tone={data.sample.included ? "success" : "neutral"}
            summary={data.sample}
            description="Two weeks of a student learning Python, built from real public YouTube videos, so you can try Corvus right away."
            actions={
              <Link href="/settings" className="button secondary compact">
                {data.sample.included ? "Hide or restore" : "Include it"}
              </Link>
            }
            note={data.sample.hidden ? `${data.sample.hidden} sample memories forgotten by you` : undefined}
          />
          <SourceTile
            icon={FileArchive}
            title="Google Takeout import"
            status={total(data.takeout) ? "Imported" : "Not imported"}
            tone={total(data.takeout) ? "success" : "neutral"}
            summary={data.takeout}
            description="Your past YouTube watches, Google searches, and Chrome pages from a Takeout export. Your browser reads the files; only titles, links, times, and search text are sent."
            actions={
              <Link href="/import" className="button compact">
                {total(data.takeout) ? "Import more" : "Import Takeout"} <ArrowRight size={14} />
              </Link>
            }
          />
          <SourceTile
            icon={Laptop}
            title="Chrome extension"
            status={data.extension.pairedBrowsers ? `${data.extension.pairedBrowsers} browser${data.extension.pairedBrowsers > 1 ? "s" : ""} paired` : "Not paired"}
            tone={data.extension.pairedBrowsers ? "success" : "neutral"}
            summary={data.extension}
            description="Captures new YouTube watches (after 30 seconds) and Google searches from now on. Nothing on other sites; pause any time from the popup."
            actions={
              <Link href="/import#extension" className="button compact">
                {data.extension.pairedBrowsers ? "Pair another browser" : "Pair the extension"} <ArrowRight size={14} />
              </Link>
            }
          />
        </div>
      )}

      <div className="panel mt-4 flex items-center gap-3 p-4 text-[13.5px] muted">
        <ShieldCheck size={18} className="shrink-0 text-[var(--success)]" />
        <span>
          A direct Google connection (Data Portability API) is on the roadmap, not connected. Corvus never claims access it
          doesn’t have.
        </span>
        <Link href="/settings" className="text-link ml-auto shrink-0">
          Privacy controls
        </Link>
      </div>
    </div>
  );
}

function SourceTile({
  icon: Icon,
  title,
  status,
  tone,
  summary,
  description,
  actions,
  note,
}: {
  icon: typeof Laptop;
  title: string;
  status: string;
  tone: "success" | "neutral";
  summary: Summary;
  description: string;
  actions: React.ReactNode;
  note?: string;
}) {
  return (
    <section className="panel source-tile">
      <div className="source-tile-top">
        <span className="source-logo">
          <Icon size={21} />
        </span>
        <span className={`badge ${tone === "success" ? "success" : ""}`}>{status}</span>
      </div>
      <h2>{title}</h2>
      <p>{description}</p>
      <div className="source-stats">
        <span className="badge">{summary.videos} videos</span>
        <span className="badge">{summary.searches} searches</span>
        <span className="badge">{summary.pages} pages</span>
        {summary.moments > 0 && <span className="badge accent">{summary.moments} video moments</span>}
      </div>
      <small className="faint text-[12.5px]">{summary.latest ? `Latest activity ${formatSeen(summary.latest)}` : "No activity yet"}{note ? ` · ${note}` : ""}</small>
      <div className="tile-actions">{actions}</div>
    </section>
  );
}
