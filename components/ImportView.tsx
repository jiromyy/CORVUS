"use client";

import { AlertCircle, ArrowRight, Check, CheckCircle2, Clock3, FileArchive, Loader2, ShieldCheck, UploadCloud } from "lucide-react";
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
    <div className="space-y-5">
      {phase.step === "pick" && (
        <div className="two-col">
          <label className="drop-zone">
            <span className="upload-orb">
              <UploadCloud size={26} />
            </span>
            <strong>Choose Takeout .json files</strong>
            <span>You can select several at once. Nothing is uploaded until you confirm.</span>
            <input type="file" accept=".json,application/json" multiple className="sr-only" onChange={(e) => readFiles(e.target.files)} />
          </label>
          <div className="panel p-6">
            <h3 className="m-0 mb-3 text-[15px]">Which files to pick</h3>
            <ol className="steps">
              <li>Unzip your Google Takeout export.</li>
              <li>
                Pick <code>My Activity/Search/MyActivity.json</code>, <code>My Activity/YouTube/MyActivity.json</code>,{" "}
                <code>YouTube and YouTube Music/history/watch-history.json</code>, and optionally <code>Chrome/BrowserHistory.json</code>.
              </li>
              <li>Your browser reads them here. Only titles, links, times, and search text from the last 90 days are sent to Corvus.</li>
            </ol>
            <p className="mt-4 flex items-start gap-2 text-[13px] faint">
              <ShieldCheck size={15} className="mt-0.5 shrink-0 text-[var(--success)]" /> Everything else in your files stays on this device.
            </p>
          </div>
        </div>
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
        <div className="panel p-6">
          <Progress label={`Remembering ${phase.done} of ${phase.total} items…`} value={phase.done / phase.total} />
        </div>
      )}

      {(phase.step === "analysing" || phase.step === "finished") && (
        <div className="panel p-6">
          <div className="flex items-start gap-4">
            <span className="success-orb shrink-0">
              {phase.step === "finished" ? <CheckCircle2 size={26} className="text-[var(--success)]" /> : <Loader2 size={26} className="spin" />}
            </span>
            <div>
              <h2 className="serif m-0 text-[30px]">{phase.imported} items imported</h2>
              <p className="muted mt-1">
                {phase.step === "analysing" ? "Now Gemini is watching your most recent videos so you can recall exact moments." : "Done. Your memory is ready."}
              </p>
            </div>
          </div>
          <ul className="mt-4">
            {phase.jobs.map((j) => (
              <li key={j.videoId} className="job-row">
                <span className={j.status === "done" ? "done" : j.status === "analysing" ? "analysing" : j.status === "queued" ? "" : "failed"} aria-hidden>
                  {j.status === "done" ? <Check size={15} /> : j.status === "analysing" ? <Loader2 size={15} className="spin" /> : j.status === "queued" ? <Clock3 size={15} /> : <AlertCircle size={15} />}
                </span>
                <span>
                  {j.title}
                  {j.detail && <small>{j.detail}</small>}
                  {j.status === "analysing" && <small className="loading-line">Analysing (30–100 s)…</small>}
                </span>
              </li>
            ))}
          </ul>
          {phase.step === "finished" && (
            <div className="mt-5 flex flex-wrap gap-3">
              <Link href="/" className="button">
                Ask about your activity <ArrowRight size={15} />
              </Link>
              <Link href="/library" className="button secondary">
                See your memory
              </Link>
            </div>
          )}
        </div>
      )}

      {phase.step === "error" && (
        <div className="error-note">
          <AlertCircle size={17} />
          <div>
            <p className="m-0">{phase.message}</p>
            <button onClick={() => setPhase({ step: "pick" })} className="text-link mt-2 text-sm">
              Start again
            </button>
          </div>
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
    <div className="panel p-6">
      <div className="flex items-center gap-3">
        <span className="upload-orb m-0! h-12! w-12!">
          <FileArchive size={22} />
        </span>
        <div>
          <h2 className="m-0 text-[17px]">Ready to remember from the last 90 days</h2>
          <p className="faint m-0 mt-1 text-[13px]">
            {phase.files.map((f) => `${f.name} (${KIND_LABEL[f.kind]}, ${f.records.length})`).join(" · ")}
          </p>
        </div>
      </div>
      <div className="stat-grid">
        <div className="metric">
          <span>Videos watched</span>
          <strong>{count("watched")}</strong>
        </div>
        <div className="metric">
          <span>Searches</span>
          <strong>{count("searched")}</strong>
        </div>
        <div className="metric">
          <span>Pages visited</span>
          <strong>{count("visited")}</strong>
        </div>
      </div>
      <p className="muted text-[13.5px]">Sent to Corvus: title, link, time, search text, channel name. Everything else in your files stays on this device.</p>
      {hasBrowser && (
        <label className="check-row mt-3">
          <input type="checkbox" checked={includeVisited} onChange={(e) => onToggleVisited(e.target.checked)} />
          Include pages visited (latest 300)
        </label>
      )}
      <div className="mt-5 flex flex-wrap gap-3">
        <button onClick={onConfirm} disabled={!phase.records.length} className="button">
          Import {phase.records.length} items
        </button>
        <button onClick={onCancel} className="button ghost">
          Cancel
        </button>
      </div>
    </div>
  );
}

function Progress({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="mb-3 mt-0 font-medium">{label}</p>
      <div className="progress-track" role="progressbar" aria-valuenow={Math.round(value * 100)} aria-valuemin={0} aria-valuemax={100}>
        <div style={{ width: `${Math.round(value * 100)}%` }} />
      </div>
    </div>
  );
}
