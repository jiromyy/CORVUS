"use client";

import { AlertCircle, ArrowRight, ArrowUp, CheckCircle2, ChevronDown, ExternalLink, FileText, Globe2, History, Languages, Search, Sparkles, Video, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, type FormEvent, type KeyboardEvent } from "react";
import type { AskResult } from "@/lib/agent/run";
import type { Prompt, PromptKind } from "@/lib/prompts";
import { Mark } from "./Brand";
import { ASK_EVENT, NEW_CONVERSATION_EVENT } from "./shell/events";
import { rememberQuestion } from "./shell/RecentQuestions";
import { SourceCard } from "./SourceCard";
import { SpeakButton } from "./SpeakButton";

/** Icons for the starter questions, which come from the visitor's most recent memories (lib/prompts.ts). */
const PROMPT_ICON: Record<PromptKind, LucideIcon> = {
  search: Search,
  video: Video,
  article: FileText,
  filipino: Languages,
  summary: History,
  explore: Globe2,
};

const TRACE_LABEL: Record<string, string> = {
  search_memories: "Searched memories for",
  summarize_activity: "Reviewed your activity",
  get_memory: "Opened memory",
  google_search: "Searched the web for",
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
  | { status: "empty"; question: string; signedIn: boolean }
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
  const [explore, setExplore] = useState(false);
  const [prompts, setPrompts] = useState<{ prompts: Prompt[]; signedIn: boolean } | undefined>();

  useEffect(() => {
    fetch("/api/ask/suggestions")
      .then((r) => (r.ok ? r.json() : { prompts: [], signedIn: false }))
      .catch(() => ({ prompts: [], signedIn: false }))
      .then(setPrompts);
  }, []);

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

  async function ask(q: string, opts: { explore?: boolean } = {}) {
    const useExplore = opts.explore ?? explore;
    if (opts.explore !== undefined) setExplore(opts.explore);
    const text = q.trim();
    if (!text || state.status === "loading") return;
    setQuestion("");
    setState({ status: "loading", question: text });
    rememberQuestion(text);
    window.scrollTo({ top: 0, behavior: "smooth" });
    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: text, explore: useExplore }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? `Request failed (${res.status})`);
      if (body.empty) setState({ status: "empty", question: text, signedIn: body.signedIn });
      else setState({ status: "done", question: text, result: body });
    } catch (err) {
      setState({ status: "error", question: text, message: err instanceof Error ? err.message : "Something went wrong" });
    }
  }

  // A question passed in the link (e.g. "Ask about this" on Insights) is asked straight away.
  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get("ask");
    if (!q) return;
    window.history.replaceState(null, "", "/");
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the question only exists in the browser URL
    void ask(q);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once, on arrival
  }, []);

  // Recent questions in the sidebar re-ask without leaving the page.
  useEffect(() => {
    const onAsk = (e: Event) => void ask((e as CustomEvent<string>).detail);
    window.addEventListener(ASK_EVENT, onAsk);
    return () => window.removeEventListener(ASK_EVENT, onAsk);
  });

  const composer = (variant: "hero" | "follow-up") => (
    <Composer
      variant={variant}
      value={question}
      onChange={setQuestion}
      onSubmit={() => ask(question)}
      busy={state.status === "loading"}
      explore={explore}
      onExplore={setExplore}
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
        {prompts === undefined ? (
          <div className="prompt-grid" aria-hidden>
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="prompt-card prompt-skeleton" />
            ))}
          </div>
        ) : prompts.prompts.length ? (
          <div className="prompt-grid stagger" aria-label="Suggested questions from your recent memories">
            {prompts.prompts.map((p) => {
              const Icon = PROMPT_ICON[p.kind];
              return (
                <button key={p.text} className={`prompt-card ${p.explore ? "explore" : ""}`} onClick={() => ask(p.text, p.explore ? { explore: true } : {})}>
                  <Icon size={18} />
                  <span>{p.text}</span>
                  {p.explore ? <span className="badge accent">Explore</span> : <ArrowRight size={16} />}
                </button>
              );
            })}
          </div>
        ) : (
          <div className="w-full max-w-[760px]">
            <EmptyMemory signedIn={prompts.signedIn} onExplore={() => setExplore(true)} />
          </div>
        )}
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
          {state.status === "empty" && <EmptyMemory signedIn={state.signedIn} onExplore={() => setExplore(true)} />}
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
  explore,
  onExplore,
}: {
  variant: "hero" | "follow-up";
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  busy: boolean;
  explore: boolean;
  onExplore: (v: boolean) => void;
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
        placeholder={explore ? "e.g. Find more readings related to the article I read" : variant === "hero" ? "Where did I see…? Ask in any language" : "Ask a follow-up…"}
        rows={variant === "hero" ? 2 : 1}
        maxLength={500}
        autoComplete="off"
      />
      <div className="composer-footer">
        <div className="flex min-w-0 items-center gap-2">
          <button
            type="button"
            className={`explore-toggle ${explore ? "on" : ""}`}
            role="switch"
            aria-checked={explore}
            onClick={() => onExplore(!explore)}
            title="Also search public websites with Google Search"
          >
            <Globe2 size={14} /> Explore the web
          </button>
          <span className="composer-hint">
            {explore ? (
              "Your memories + public sources, all cited"
            ) : (
              <>
                <Sparkles size={14} /> Only your memories · cites every source
              </>
            )}
          </span>
        </div>
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
        {result.mode === "explore" && " · Explore mode: includes public web sources"}
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

      {result.webSources && result.webSources.length > 0 && (
        <div className="mt-6">
          <span className="eyebrow">From the web · found with Google Search</span>
          <div className="web-sources stagger">
            {result.webSources.map((w, i) => (
              <a key={w.url} href={w.url} target="_blank" rel="noreferrer" className="web-source">
                <span className="cite-num">{i + 1}</span>
                <span className="min-w-0">
                  <strong>{w.title}</strong>
                  <small>{w.domain}</small>
                </span>
                <ExternalLink size={14} />
              </a>
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

/** No memories to answer from: explain, and offer the ways to get some (or to look beyond memory). */
function EmptyMemory({ signedIn, onExplore }: { signedIn: boolean; onExplore: () => void }) {
  async function trySample() {
    await fetch("/api/workspace", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ includeSample: true }) });
    window.location.reload();
  }
  return (
    <div className="empty-memory">
      <h2>Corvus doesn’t have any memories to answer from yet</h2>
      <p>
        Import your Google Takeout or pair the browser extension, and Corvus will answer from what you actually watched,
        searched, and read. Or switch on Explore to search public websites.
      </p>
      <div className="flex flex-wrap gap-2">
        <Link href="/import" className="button compact">
          Import history
        </Link>
        <Link href="/extension" className="button secondary compact">
          Pair the extension
        </Link>
        <button className="button secondary compact" onClick={onExplore}>
          <Globe2 size={14} /> Turn on Explore
        </button>
        {!signedIn && (
          <button className="button ghost compact" onClick={trySample}>
            Try Raven’s sample data
          </button>
        )}
      </div>
    </div>
  );
}
