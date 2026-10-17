"use client";

import Link from "next/link";
import { useState } from "react";
import { parseTakeoutFile, prepareImport, type ParsedFile, type TakeoutRecord } from "@/lib/takeout";

const BATCH = 100;

type VideoJob = { videoId: string; title: string; status: "queued" | "analysing" | "done" | "too_long" | "failed"; detail?: string };

type Phase =
  | { step: "pick" }
  | { step: "preview"; files: ParsedFile[]; records: TakeoutRecord[] }
  | { step: "uploading"; done: number; total: number }
  | { step: "analysing"; jobs: VideoJob[]; imported: number }
  | { step: "finished"; jobs: VideoJob[]; imported: number }
  | { step: "error"; message: string };

const KIND_LABEL: Record<ParsedFile["kind"], string> = {
  "my-activity": "My Activity",
  "watch-history": "YouTube watch history",
  "browser-history": "Chrome browsing history",
  unknown: "Not a supported Takeout file",
};

export function ImportView() {
  const [phase, setPhase] = useState<Phase>({ step: "pick" });
  const [includeVisited, setIncludeVisited] = useState(true);

  async function readFiles(list: FileList | null) {
    if (!list?.length) return;
    try {
      const files: ParsedFile[] = [];
      for (const file of Array.from(list)) {
        files.push(parseTakeoutFile(file.name, JSON.parse(await file.text())));
      }
      setPhase({ step: "preview", files, records: prepareImport(files, { includeVisited }) });
    } catch {
      setPhase({ step: "error", message: "Couldn’t read those files. Pick the .json files from your extracted Takeout folder." });
    }
  }

  async function upload(records: TakeoutRecord[]) {
    let done = 0;
    let skipped = 0;
    setPhase({ step: "uploading", done, total: records.length });
    for (let i = 0; i < records.length; i += BATCH) {
      const send = () =>
        fetch("/api/import/takeout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ records: records.slice(i, i + BATCH) }),
        }).catch(() => undefined);
      // One retry: a batch can hit a brief embedding quota limit.
      const res = (await send()) ?? undefined;
      const ok = res?.ok ? res : await send();
      if (!ok?.ok) {
        const detail = await ok?.json().then((b) => b.error).catch(() => undefined);
        return setPhase({
          step: "error",
          message: `Import stopped at ${done} of ${records.length} items${detail ? ` (${detail})` : ok ? ` (error ${ok.status})` : " (network error)"}. Items already imported are kept — you can try again.`,
        });
      }
      const result = await ok.json().catch(() => ({}));
      skipped += result.skipped ?? 0;
      done = Math.min(records.length, i + BATCH);
      setPhase({ step: "uploading", done, total: records.length });
    }
    const { queue } = await fetch("/api/import/queue?limit=10").then((r) => r.json());
    const jobs: VideoJob[] = queue.map((q: { videoId: string; title: string }) => ({ ...q, status: "queued" }));
    setPhase({ step: "analysing", jobs, imported: records.length - skipped });
    // Two videos at a time: about half the wait, without overloading the model quota.
    let next = 0;
    const worker = async () => {
      while (next < jobs.length) {
        const i = next++;
        jobs[i] = { ...jobs[i], status: "analysing" };
        setPhase({ step: "analysing", jobs: [...jobs], imported: records.length - skipped });
        try {
          const r = await fetch(`/api/videos/${jobs[i].videoId}/analyse`, { method: "POST" }).then((x) => x.json());
          jobs[i] =
            r.status === "done"
              ? { ...jobs[i], status: "done", detail: `${r.moments} moments${r.reused ? " (already analysed)" : ""}` }
              : r.status === "too_long"
                ? { ...jobs[i], status: "too_long", detail: `${Math.round(r.durationSeconds / 60)} min — too long to analyse` }
                : { ...jobs[i], status: "failed", detail: "Analysis failed; the title is still searchable" };
        } catch {
          jobs[i] = { ...jobs[i], status: "failed", detail: "Analysis failed; the title is still searchable" };
        }
        setPhase({ step: "analysing", jobs: [...jobs], imported: records.length - skipped });
      }
    };
    await Promise.all([worker(), worker()]);
    setPhase({ step: "finished", jobs, imported: records.length - skipped });
  }

  return (
    <div className="space-y-6">
      {phase.step === "pick" && (
        <>
          <ol className="list-decimal space-y-2 pl-5 text-[var(--muted)]">
            <li>Unzip your Google Takeout export.</li>
            <li>
              Pick these files (you can select several at once): <code>My Activity/Search/MyActivity.json</code>,{" "}
              <code>My Activity/YouTube/MyActivity.json</code>, <code>YouTube and YouTube Music/history/watch-history.json</code>,
              and optionally <code>Chrome/BrowserHistory.json</code>.
            </li>
            <li>Your browser reads them here. Only titles, links, times, and search text from the last 90 days are sent to Corvus.</li>
          </ol>
          <label className="flex w-full cursor-pointer flex-col items-center gap-2 rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface)] px-4 py-10 text-center hover:border-[var(--accent)]">
            <span className="font-medium">Choose Takeout .json files</span>
            <span className="text-sm text-[var(--muted)]">Nothing is uploaded until you confirm.</span>
            <input type="file" accept=".json,application/json" multiple className="sr-only" onChange={(e) => readFiles(e.target.files)} />
          </label>
        </>
      )}

      {phase.step === "preview" && (
        <Preview
          phase={phase}
          includeVisited={includeVisited}
          onToggleVisited={(v) => {
            setIncludeVisited(v);
            setPhase({ ...phase, records: prepareImport(phase.files, { includeVisited: v }) });
          }}
          onConfirm={() => upload(phase.records)}
          onCancel={() => setPhase({ step: "pick" })}
        />
      )}

      {phase.step === "uploading" && (
        <Progress label={`Remembering ${phase.done} of ${phase.total} items…`} value={phase.done / phase.total} />
      )}

      {(phase.step === "analysing" || phase.step === "finished") && (
        <div>
          <p className="font-medium">
            {phase.imported} items imported.{" "}
            {phase.step === "analysing" ? "Now Gemini is watching your most recent videos so you can recall exact moments:" : "Done."}
          </p>
          <ul className="mt-3 space-y-2">
            {phase.jobs.map((j) => (
              <li key={j.videoId} className="flex items-start gap-3 rounded-lg border border-[var(--border)] px-3 py-2 text-sm">
                <span aria-hidden className="mt-0.5 w-4">
                  {j.status === "done" ? "✓" : j.status === "analysing" ? "…" : j.status === "queued" ? "·" : "!"}
                </span>
                <span className="flex-1">
                  {j.title}
                  {j.detail && <span className="block text-[var(--muted)]">{j.detail}</span>}
                  {j.status === "analysing" && <span className="block animate-pulse text-[var(--muted)]">Analysing (30–100 s)…</span>}
                </span>
              </li>
            ))}
          </ul>
          {phase.step === "finished" && (
            <div className="mt-5 flex gap-4">
              <Link href="/" className="rounded-xl bg-[var(--accent)] px-5 py-2.5 font-medium text-white">
                Ask about your activity
              </Link>
              <Link href="/library" className="px-2 py-2.5 text-[var(--muted)] hover:underline">
                See your memory
              </Link>
            </div>
          )}
        </div>
      )}

      {phase.step === "error" && (
        <div className="rounded-xl border border-red-400/50 p-4">
          <p>{phase.message}</p>
          <button onClick={() => setPhase({ step: "pick" })} className="mt-2 text-sm text-[var(--accent)] hover:underline">
            Start again
          </button>
        </div>
      )}
    </div>
  );
}

function Preview({
  phase,
  includeVisited,
  onToggleVisited,
  onConfirm,
  onCancel,
}: {
  phase: { files: ParsedFile[]; records: TakeoutRecord[] };
  includeVisited: boolean;
  onToggleVisited: (v: boolean) => void;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const count = (k: TakeoutRecord["kind"]) => phase.records.filter((r) => r.kind === k).length;
  const hasBrowser = phase.files.some((f) => f.kind === "browser-history");
  return (
    <div className="space-y-4">
      <ul className="space-y-1 text-sm">
        {phase.files.map((f) => (
          <li key={f.name}>
            <span className="font-medium">{f.name}</span> — {KIND_LABEL[f.kind]} ({f.records.length} items)
          </li>
        ))}
      </ul>
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
        <p className="font-medium">Ready to remember from the last 90 days:</p>
        <p className="mt-1 text-[var(--muted)]">
          {count("watched")} videos watched · {count("searched")} searches · {count("visited")} pages visited
        </p>
        <p className="mt-3 text-sm text-[var(--muted)]">
          Sent to Corvus: title, link, time, search text, channel name. Everything else in your files stays on this device.
        </p>
        {hasBrowser && (
          <label className="mt-3 flex items-center gap-2 text-sm">
            <input type="checkbox" checked={includeVisited} onChange={(e) => onToggleVisited(e.target.checked)} />
            Include pages visited (latest 300)
          </label>
        )}
      </div>
      <div className="flex gap-3">
        <button
          onClick={onConfirm}
          disabled={!phase.records.length}
          className="rounded-xl bg-[var(--accent)] px-5 py-2.5 font-medium text-white disabled:opacity-50"
        >
          Import {phase.records.length} items
        </button>
        <button onClick={onCancel} className="px-3 py-2.5 text-[var(--muted)] hover:underline">
          Cancel
        </button>
      </div>
    </div>
  );
}

function Progress({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="mb-2">{label}</p>
      <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--surface)]" role="progressbar" aria-valuenow={Math.round(value * 100)} aria-valuemin={0} aria-valuemax={100}>
        <div className="h-full bg-[var(--accent)] transition-all" style={{ width: `${Math.round(value * 100)}%` }} />
      </div>
    </div>
  );
}
