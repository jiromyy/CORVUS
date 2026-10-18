"use client";

import { AlertCircle, ArrowRight, ArrowUp, Bug, Calculator, CheckCircle2, ChevronDown, Download, History, Sparkles, type LucideIcon } from "lucide-react";
import { useEffect, useState, type FormEvent, type KeyboardEvent } from "react";
import type { AskResult } from "@/lib/agent/run";
import { Mark } from "./Brand";
import { NEW_CONVERSATION_EVENT } from "./shell/events";
import { SourceCard } from "./SourceCard";
import { SpeakButton } from "./SpeakButton";

const SUGGESTIONS: Array<{ icon: LucideIcon; text: string }> = [
  { icon: Bug, text: "Where did I see how to fix the TypeError when adding a number to input()?" },
  { icon: Download, text: "Saan ko napanood kung paano mag-install ng Python?" },
  { icon: Calculator, text: "Which video showed a tip calculator?" },
  { icon: History, text: "Give me a summary of my week" },
];

const TRACE_LABEL: Record<string, string> = {
  search_memories: "Searched memories for",
  summarize_activity: "Reviewed your activity",
  get_memory: "Opened memory",
};

const CONFIDENCE = {
  high: "Strong match · every claim is cited",
  medium: "Likely match · check the sources",
  low: "Weak match · Corvus isn’t sure",
} as const;

/** Rough guess so "Listen" picks a Filipino voice for Filipino or Taglish questions. */
const looksFilipino = (text: string) => /\b(saan|ako|ko|ng|mga|ang|paano|ba|yung|nung|napanood|ano)\b/i.test(text);

type State =
  | { status: "idle" }
  | { status: "loading"; question: string }
  | { status: "done"; question: string; result: AskResult & { ms: number } }
  | { status: "error"; question: string; message: string };

function greeting(hour: number) {
  if (hour < 5 || hour >= 18) return "Good evening.";
  if (hour < 12) return "Good morning.";
  return "Good afternoon.";
}

export function AskPanel() {
  const [question, setQuestion] = useState("");
  const [state, setState] = useState<State>({ status: "idle" });
  const [hello, setHello] = useState("Hello.");

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- local time is only known in the browser
    setHello(greeting(new Date().getHours()));
    const reset = () => {
      setState({ status: "idle" });
      setQuestion("");
    };
    window.addEventListener(NEW_CONVERSATION_EVENT, reset);
    return () => window.removeEventListener(NEW_CONVERSATION_EVENT, reset);
  }, []);

  async function ask(q: string) {
    const text = q.trim();
    if (!text || state.status === "loading") return;
    setQuestion("");
    setState({ status: "loading", question: text });
    window.scrollTo({ top: 0, behavior: "smooth" });
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

  const composer = (variant: "hero" | "follow-up") => (
    <Composer
      variant={variant}
      value={question}
      onChange={setQuestion}
      onSubmit={() => ask(question)}
      busy={state.status === "loading"}
    />
  );

  if (state.status === "idle") {
    return (
      <section aria-label="Ask Corvus" className="home-hero">
        <div className="hero-mark-wrap">
          <Mark className="hero-mark brand-accent" />
        </div>
        <div className="hero-copy">
          <span className="eyebrow">Your media memory</span>
          <h1>
            {hello}
            <br />
            <em>What do you remember?</em>
          </h1>
          <p>Ask about anything you watched, searched, or read, in English or Filipino, and jump back to the exact moment.</p>
        </div>
        {composer("hero")}
        <div className="prompt-grid stagger">
          {SUGGESTIONS.map(({ icon: Icon, text }) => (
            <button key={text} className="prompt-card" onClick={() => ask(text)}>
              <Icon size={18} />
              <span>{text}</span>
              <ArrowRight size={16} />
            </button>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section aria-label="Conversation" className="conversation">
      <div className="user-message">{state.question}</div>
      <div className="assistant-message" aria-live="polite">
        <div className="assistant-avatar">
          <Mark className="brand-accent" />
        </div>
        <div className="answer-body">
          {state.status === "loading" && (
            <p className="thinking">
              <i aria-hidden>
                <b />
                <b />
                <b />
              </i>
              Corvus is searching your memories…
            </p>
          )}
          {state.status === "error" && (
            <p className="error-note">
              <AlertCircle size={17} /> Couldn’t answer that: {state.message}
            </p>
          )}
          {state.status === "done" && <Answer question={state.question} result={state.result} onAsk={ask} />}
        </div>
      </div>
      <div className="mt-10">{composer("follow-up")}</div>
    </section>
  );
}

function Composer({
  variant,
  value,
  onChange,
  onSubmit,
  busy,
}: {
  variant: "hero" | "follow-up";
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  busy: boolean;
}) {
  function submit(e: FormEvent) {
    e.preventDefault();
    onSubmit();
  }
  function onKey(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      onSubmit();
    }
  }
  return (
    <form className={`composer ${variant === "hero" ? "hero-composer" : "p-3"}`} onSubmit={submit}>
      <label htmlFor={`question-${variant}`} className="sr-only">
        Ask about something you watched, searched, or read
      </label>
      <textarea
        id={`question-${variant}`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKey}
        placeholder={variant === "hero" ? "Where did I see…? Ask in any language" : "Ask a follow-up…"}
        rows={variant === "hero" ? 2 : 1}
        maxLength={500}
        autoComplete="off"
      />
      <div className="composer-footer">
        <span className="composer-hint">
          <Sparkles size={14} /> Searches only your memories · cites every source
        </span>
        <button className="send-button" aria-label="Ask" type="submit" disabled={busy || !value.trim()}>
          <ArrowUp size={18} />
        </button>
      </div>
    </form>
  );
}

function Answer({ question, result, onAsk }: { question: string; result: AskResult & { ms: number }; onAsk: (q: string) => void }) {
  const claims = new Map(result.citations.map((c) => [c.memoryId, c.supportingClaim]));
  const steps = result.trace.length;
  return (
    <>
      {steps > 0 && (
        <details className="agent-trace">
          <summary>
            <Sparkles size={14} />
            <span>
              {result.trace.map((t) => t.resultCount).reduce((a, b) => a + b, 0)} memories checked in {steps} step{steps > 1 ? "s" : ""} ·{" "}
              {(result.ms / 1000).toFixed(1)} s
            </span>
            <ChevronDown size={13} className="chev" />
          </summary>
          <ol>
            {result.trace.map((t, i) => (
              <li key={i}>
                {TRACE_LABEL[t.tool] ?? t.tool} “{t.input}” → {t.resultCount}{" "}
                {t.tool === "summarize_activity" ? "activities" : t.resultCount === 1 ? "result" : "results"}
              </li>
            ))}
            <li>Checked every citation against the memories it found</li>
          </ol>
        </details>
      )}
      <p className="answer-text">{result.answer}</p>
      <p className={`confidence-note ${result.confidence}`}>
        {result.confidence === "high" ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />} {CONFIDENCE[result.confidence]}
        {result.mode === "fallback" && " · fallback mode"}
      </p>

      {result.sources.length > 0 && (
        <div className="mt-6">
          <span className="eyebrow">{result.citations.length ? "Sources from your memory" : "Closest matches"}</span>
          <div className="source-list stagger">
            {result.sources.map((s, i) => (
              <SourceCard key={s.id} memory={s} index={i} claim={claims.get(s.id)} />
            ))}
          </div>
        </div>
      )}

      {result.suggestedFollowUps.length > 0 && (
        <div className="mt-5 flex flex-wrap gap-2">
          {result.suggestedFollowUps.map((f) => (
            <button key={f} className="chip" onClick={() => onAsk(f)}>
              <ArrowRight size={13} /> {f}
            </button>
          ))}
        </div>
      )}

      <div className="response-meta">
        <span>Based on your memories in this browser</span>
        <SpeakButton text={result.answer} language={looksFilipino(question) ? "fil" : "en"} />
      </div>
    </>
  );
}
