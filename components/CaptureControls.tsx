"use client";

import { Globe2, Laptop, Pause, Play, Plus, Radio, Search, ShieldCheck, Trash2, Video } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import type { CaptureSettings } from "@/lib/capture";
import { useEvidence } from "./Evidence";

export const CAPTURE_EVENT = "corvus:capture";

/** Shared capture settings state: loads once, saves through the API, and keeps every control in sync. */
export function useCaptureSettings() {
  const [settings, setSettings] = useState<CaptureSettings | undefined>();

  useEffect(() => {
    fetch("/api/capture/settings")
      .then((r) => (r.ok ? r.json() : undefined))
      .catch(() => undefined)
      .then((s) => s && setSettings(s));
    const onChange = (e: Event) => setSettings((e as CustomEvent<CaptureSettings>).detail);
    window.addEventListener(CAPTURE_EVENT, onChange);
    return () => window.removeEventListener(CAPTURE_EVENT, onChange);
  }, []);

  async function update(patch: Partial<CaptureSettings>) {
    const res = await fetch("/api/capture/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    }).catch(() => undefined);
    if (!res?.ok) return undefined;
    const next = (await res.json()) as CaptureSettings;
    window.dispatchEvent(new CustomEvent(CAPTURE_EVENT, { detail: next }));
    return next;
  }

  return { settings, update };
}

type ExtensionStatus = { paired: number; lastSeenAt: string | null; connected: boolean };

/** Whether the browser extension is paired and checking in; refreshed every minute. */
export function useExtensionStatus() {
  const [status, setStatus] = useState<ExtensionStatus | undefined>();
  useEffect(() => {
    let cancelled = false;
    const load = () =>
      fetch("/api/extension/status")
        .then((r) => (r.ok ? r.json() : undefined))
        .catch(() => undefined)
        .then((s) => !cancelled && s && setStatus(s));
    load();
    const id = window.setInterval(load, 60_000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);
  return status;
}

export function seenAgo(iso: string | null) {
  if (!iso) return "never";
  const m = Math.round((Date.now() - Date.parse(iso)) / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  if (m < 1440) return `${Math.round(m / 60)}h ago`;
  return `${Math.round(m / 1440)}d ago`;
}

/** Sidebar status card with a one-click pause. */
export function CaptureCard({ onNavigate }: { onNavigate: () => void }) {
  const { settings, update } = useCaptureSettings();
  const { notify } = useEvidence();
  const ext = useExtensionStatus();
  const paused = settings?.paused ?? false;
  const sources = [settings?.youtube !== false && "YouTube", settings?.search !== false && "Search", settings?.domains.length && `${settings.domains.length} site${settings.domains.length > 1 ? "s" : ""}`]
    .filter(Boolean)
    .join(" + ");
  // Only claim capture is on when an extension is actually paired and checking in.
  const state = !ext ? "loading" : !ext.paired ? "unpaired" : paused ? "paused" : !ext.connected ? "offline" : "on";
  const title = { loading: "Checking capture…", unpaired: "Extension not connected", paused: "Capture is paused", offline: "Extension offline", on: "Capture is on" }[state];
  const detail = {
    loading: "",
    unpaired: "Pair it to remember new activity",
    paused: "Nothing new is remembered",
    offline: `Last seen ${seenAgo(ext?.lastSeenAt ?? null)}`,
    on: sources || "No sources enabled",
  }[state];
  return (
    <div className="capture-card">
      <span className={`capture-dot ${state}`} />
      <Link href={state === "unpaired" ? "/extension" : "/settings#capture"} onClick={onNavigate} className="min-w-0 flex-1">
        <strong>{title}</strong>
        <span>{detail}</span>
      </Link>
      <button
        className="icon-button compact"
        disabled={!settings}
        aria-label={paused ? "Resume capture" : "Pause capture"}
        title={paused ? "Resume capture" : "Pause capture"}
        onClick={async () => {
          const next = await update({ paused: !paused });
          notify(next ? (next.paused ? "Capture paused" : "Capture resumed") : "Couldn’t change capture. Try again.");
        }}
      >
        {paused ? <Play size={14} /> : <Pause size={14} />}
      </button>
    </div>
  );
}

/** Settings: global pause, capture by site, and automatically remembered websites. */
export function CaptureControls() {
  const { settings, update } = useCaptureSettings();
  const ext = useExtensionStatus();
  const { notify } = useEvidence();
  const [domain, setDomain] = useState("");

  if (!settings) return <p className="loading-line">Loading capture settings…</p>;

  async function addDomain(e: FormEvent) {
    e.preventDefault();
    const before = settings!.domains.length;
    const next = await update({ domains: [...settings!.domains, domain] });
    if (!next) return notify("Couldn’t save. Try again.");
    if (next.domains.length === before) return notify("Enter a public website like example.com (YouTube and Google have their own switches)");
    notify(`${next.domains.at(-1)} will be remembered automatically`);
    setDomain("");
  }

  const enabled = [settings.youtube && "YouTube", settings.search && "Search"].filter(Boolean).join(" and ");
  const connection = !ext
    ? undefined
    : !ext.paired
      ? { tone: "neutral", text: "No browser extension is paired, so nothing new is captured yet." }
      : ext.connected
        ? { tone: "success", text: `Extension connected · last check-in ${seenAgo(ext.lastSeenAt)}` }
        : { tone: "warning", text: `Extension offline · last check-in ${seenAgo(ext.lastSeenAt)}. Open Chrome with the extension to resume.` };
  return (
    <div id="capture" className="scroll-mt-24">
      <section className={`capture-status ${settings.paused ? "paused" : ""}`}>
        <span className="privacy-orb">
          <Radio size={20} />
        </span>
        <div>
          <span className={`badge ${settings.paused ? "warning" : "success"}`}>{settings.paused ? "Capture paused" : "Capture active"}</span>
          <h2>{settings.paused ? "Nothing new is being remembered" : enabled ? `${enabled} ${settings.youtube && settings.search ? "are" : "is"} enabled` : "All sources are off"}</h2>
          <p>Incognito tabs, keystrokes, cookies, forms, and private page contents are never captured.</p>
          {connection && (
            <p className={`connection-line ${connection.tone}`}>
              <Laptop size={13} /> {connection.text}
              {!ext?.paired && (
                <Link href="/extension" className="text-link ml-1">
                  Pair it
                </Link>
              )}
            </p>
          )}
        </div>
        <button className="button secondary" onClick={() => update({ paused: !settings.paused })}>
          {settings.paused ? <Play size={15} /> : <Pause size={15} />} {settings.paused ? "Resume" : "Pause all"}
        </button>
      </section>

      <section className="panel settings-section" aria-labelledby="by-site-title">
        <h2 id="by-site-title">Capture by site</h2>
        <p>Each automatic source has its own switch. Corvus’s server enforces them, whatever the extension sends.</p>
        <SwitchRow icon={Video} title="YouTube watches" detail="After 30 seconds of playback; Gemini then finds the moments" on={settings.youtube} onChange={(v) => update({ youtube: v })} />
        <SwitchRow icon={Search} title="Google searches" detail="The submitted query and the results you click" on={settings.search} onChange={(v) => update({ search: v })} />
        <div className="setting-row">
          <div className="setting-with-icon">
            <Globe2 size={18} />
            <div>
              <h3>Other websites</h3>
              <p>Off by default; automatic only for the websites you approve below</p>
            </div>
          </div>
          <span className="badge">{settings.domains.length} allowed</span>
        </div>
      </section>

      <section className="panel settings-section" aria-labelledby="sites-title">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="sites-title" className="m-0 text-[17px]">
              Automatically remembered websites
            </h2>
            <p className="faint mt-1 text-[13.5px]">Approve a domain and the extension remembers the pages you open there from now on. Past browsing isn’t imported.</p>
          </div>
          <span className="badge accent">{settings.domains.length} allowed</span>
        </div>
        <form className="domain-form" onSubmit={addDomain}>
          <label className="search-field flex-1">
            <Globe2 size={16} />
            <span className="sr-only">Add website domain</span>
            <input value={domain} onChange={(e) => setDomain(e.target.value)} placeholder="example.com or https://example.com" />
          </label>
          <button className="button" disabled={!domain.trim()}>
            <Plus size={15} /> Add site
          </button>
        </form>
        <div className="domain-list">
          {settings.domains.map((d) => (
            <div key={d}>
              <span>
                <Globe2 size={17} />
              </span>
              <div>
                <h3>{d}</h3>
                <p>New pages you open on this website</p>
              </div>
              <span className="badge success">Automatic</span>
              <button
                aria-label={`Stop remembering ${d}`}
                onClick={async () => {
                  await update({ domains: settings.domains.filter((x) => x !== d) });
                  notify(`${d} won’t be remembered any more`);
                }}
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))}
          {!settings.domains.length && <p className="faint m-0 text-[13px]">No websites yet. Try a site you learn from, like docs.python.org.</p>}
        </div>
        <p className="domain-note">
          <ShieldCheck size={15} /> Needs the Corvus extension (v0.2+). Pages are remembered by title and link only, and only on HTTPS, never in incognito.
          <Link href="/import#extension" className="text-link ml-1 inline-flex items-center gap-1">
            <Laptop size={13} /> Get the extension
          </Link>
        </p>
      </section>
    </div>
  );
}

function SwitchRow({ icon: Icon, title, detail, on, onChange }: { icon: typeof Video; title: string; detail: string; on: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="setting-row">
      <div className="setting-with-icon">
        <Icon size={18} />
        <div>
          <h3>{title}</h3>
          <p>{detail}</p>
        </div>
      </div>
      <button className="switch" role="switch" aria-checked={on} aria-label={title} onClick={() => onChange(!on)}>
        <span />
      </button>
    </div>
  );
}
