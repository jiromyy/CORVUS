/** Small shared UI pieces: source icons, badges, date formatting. Server- and client-safe. */
import type { SourceKind } from "@/lib/ai/schemas";

export const SOURCE_LABEL: Record<SourceKind, string> = {
  youtube: "YouTube",
  google_search: "Google Search",
  web: "Article",
};

export function SourceIcon({ source, className = "h-4 w-4" }: { source: SourceKind; className?: string }) {
  const common = { className, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, "aria-hidden": true } as const;
  if (source === "youtube")
    return (
      <svg {...common}>
        <rect x="2.5" y="5" width="19" height="14" rx="4" />
        <path d="M10 9.5v5l4.5-2.5z" fill="currentColor" stroke="none" />
      </svg>
    );
  if (source === "google_search")
    return (
      <svg {...common}>
        <circle cx="11" cy="11" r="6.5" />
        <path d="m16 16 4.5 4.5" strokeLinecap="round" />
      </svg>
    );
  return (
    <svg {...common}>
      <path d="M6 3h8l4 4v14H6z" strokeLinejoin="round" />
      <path d="M9 12h6M9 16h6M9 8h3" strokeLinecap="round" />
    </svg>
  );
}

const LANGUAGE_NAME: Record<string, string> = { en: "English", fil: "Filipino", tl: "Filipino" };

export function LanguageBadge({ language }: { language: string }) {
  const name = LANGUAGE_NAME[language] ?? language.toUpperCase();
  return (
    <span className="rounded-full border border-[var(--border)] px-2 py-0.5 text-xs text-[var(--muted)]" title={`Language: ${name}`}>
      {name}
    </span>
  );
}

export function formatSeen(iso: string) {
  return new Intl.DateTimeFormat("en-PH", { month: "short", day: "numeric", timeZone: "Asia/Manila" }).format(new Date(iso));
}

export function SampleDataNotice() {
  return (
    <p className="text-xs text-[var(--muted)]">
      Sample history for “Maya”, built from public YouTube videos. Corvus does not connect to your Google account. Corvus is
      a hackathon concept and is not a Google product.
    </p>
  );
}
