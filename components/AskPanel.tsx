"use client";

import { useState } from "react";
import type { AskResult } from "@/lib/agent/run";
import { SourceCard } from "./SourceCard";

const SUGGESTIONS = [
  "Where did I see how to fix the TypeError when adding a number to input()?",
  "Saan ko napanood kung paano mag-install ng Python?",
  "Which video showed a tip calculator?",
  "What have I searched about Python errors?",
];

type State =
  | { status: "idle" }
  | { status: "loading"; question: string }
  | { status: "done"; question: string; result: AskResult & { ms: number } }
  | { status: "error"; question: string; message: string };

export function AskPanel() {
  const [question, setQuestion] = useState("");
  const [state, setState] = useState<State>({ status: "idle" });

  async function ask(q: string) {
    const text = q.trim();
    if (!text || state.status === "loading") return;
    setQuestion(text);
    setState({ status: "loading", question: text });
    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: text }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? `Request failed (${res.status})`);
      setState({ status: "done", question: text, result: body });
    } catch (err) {
      setState({ status: "error", question: text, message: err instanceof Error ? err.message : "Something went wrong" });
    }
  }

  return (
    <section aria-label="Ask Corvus" className="w-full">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          ask(question);
        }}
        className="flex flex-col gap-2 sm:flex-row"
      >
        <label htmlFor="question" className="sr-only">
          Ask about something you watched, searched, or read
        </label>
        <input
          id="question"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Where did I see…? (any language)"
          className="min-w-0 flex-1 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-base outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
          maxLength={500}
          autoComplete="off"
        />
        <button
          type="submit"
          disabled={state.status === "loading" || !question.trim()}
          className="rounded-xl bg-[var(--accent)] px-5 py-3 font-medium text-white disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
        >
          {state.status === "loading" ? "Searching…" : "Ask"}
        </button>
      </form>

      {state.status === "idle" && (
        <div className="mt-4 flex flex-wrap gap-2">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => ask(s)}
              className="rounded-full border border-[var(--border)] px-3 py-1.5 text-left text-sm text-[var(--muted)] hover:border-[var(--accent)] hover:text-[var(--foreground)]"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      <div aria-live="polite" className="mt-6">
        {state.status === "loading" && (
          <p className="animate-pulse text-[var(--muted)]">Corvus is searching your memories…</p>
        )}
        {state.status === "error" && (
          <p className="rounded-xl border border-red-400/50 p-4 text-sm">Couldn’t answer that: {state.message}</p>
        )}
        {state.status === "done" && <Answer result={state.result} onAsk={ask} />}
      </div>
    </section>
  );
}

function Answer({ result, onAsk }: { result: AskResult & { ms: number }; onAsk: (q: string) => void }) {
  const confidence = { high: "High confidence", medium: "Medium confidence", low: "Low confidence" }[result.confidence];
  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
        <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-[var(--muted)]">
          <span className="font-medium uppercase tracking-wide text-[var(--accent)]">Corvus</span>
          <span>{confidence}</span>
          {result.mode === "fallback" && <span>· Fallback mode</span>}
          <span>· {(result.ms / 1000).toFixed(1)} s</span>
        </div>
        <p className="text-lg leading-relaxed">{result.answer}</p>
        {result.trace.length > 0 && (
          <details className="mt-4 text-sm text-[var(--muted)]">
            <summary className="cursor-pointer">How Corvus found this ({result.trace.length} step{result.trace.length > 1 ? "s" : ""})</summary>
            <ol className="mt-2 list-decimal space-y-1 pl-5">
              {result.trace.map((t, i) => (
                <li key={i}>
                  {t.tool === "search_memories" ? "Searched memories for" : "Opened memory"} “{t.input}” → {t.resultCount} result
                  {t.resultCount === 1 ? "" : "s"}
                </li>
              ))}
              <li>Checked every citation against the memories it found</li>
            </ol>
          </details>
        )}
      </div>

      {result.sources.length > 0 && (
        <div>
          <h2 className="mb-3 text-sm font-medium text-[var(--muted)]">
            {result.citations.length ? "Sources from your memory" : "Closest matches"}
          </h2>
          <div className="grid gap-3">
            {result.sources.map((s, i) => (
              <SourceCard key={s.id} memory={s} index={i} />
            ))}
          </div>
        </div>
      )}

      {result.suggestedFollowUps.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {result.suggestedFollowUps.map((f) => (
            <button
              key={f}
              onClick={() => onAsk(f)}
              className="rounded-full border border-[var(--border)] px-3 py-1.5 text-sm text-[var(--muted)] hover:border-[var(--accent)] hover:text-[var(--foreground)]"
            >
              {f}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
