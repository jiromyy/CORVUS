# Corvus — Your Personal Media Memory

> Product brief, prototype specification, and AI build prompt
> Version: **v2 (2026-10-16)**. Previous version: `archive/CORVUS_PRODUCT_BUILD_SPEC.v1.md`
> Hackathon: Google Cloud AI Builder Cup (JAPAC), theme **Media, Content & Digital Experiences**
> Submission deadline: **October 19, 2026** (time zone to confirm)
> Companion plan: `CORVUS_DEVELOPMENT_PLAN.md`

---

## 0. How to use this document

This file is the source of truth for the Corvus prototype. Give it to an AI coding agent together with the development plan. The agent must:

1. Build in the priority order in §8. A higher tier is never started while a lower tier is broken.
2. Never claim live Google integrations that do not exist. Real data enters only through the paths in §9.
3. Prefer a reliable end-to-end demo over feature breadth. The deadline is three days away.
4. Update this file when a product decision changes.

### What changed from v1

| v1 | v2 | Why |
|---|---|---|
| "Google Corvus" | **Corvus** | Avoid using Google's trademark in a product name presented to Google judges |
| Five recreated Google apps with fictional data | **Hybrid:** seeded demo user with real public videos + real capture by URL + Google Takeout import | Real data is far more credible; recreated UIs cost time and score little |
| Gemini used for embeddings + answer text (basic RAG) | Gemini **watches videos**, runs an **agent** with tools, **generates audio**, works **across languages** | 65% of the score is Gen AI merit and innovation |
| Eight phases over weeks | Three-day build with ordered tiers | Deadline is October 19 |
| Maps and Music sources | Cut | They add UI work without strengthening the story |
| Video 3–4 min | **3 min maximum** | The hackathon brief says 3 minutes |

---

## 1. One-line pitch

**Corvus is a private, source-grounded memory for what you watch, search, and read—ask in any language, jump back to the exact video moment, and get a personalised recap made from your own learning.**

Tagline: **Remember the idea. Recover the source. Continue with purpose.**

---

## 2. The problem

People learn across YouTube, Google Search, and the web, often in more than one language. Later they remember the idea but not the source. History pages list what was opened, by time and by app. They do not answer:

- "Where did I see that analogy comparing error correction to a choir?"
- "Which video had the whiteboard diagram of qubits?"
- "What have I been struggling to understand this week?"
- "Give me a quick recap of what I studied, for my commute."

---

## 3. Differentiation

Judges will ask how Corvus differs from Google's own personal-history features (for example AI search over Chrome history, or Gemini using Search history for personalisation). Corvus's answer:

| Corvus does | Why it matters |
|---|---|
| **Moment-level recall** inside videos, including what was *shown* on screen, not only page titles | "The video with the choir diagram" works even if those words were never in the title |
| **Cross-app connections** between a video, a later search, and an article | Learning happens across apps; history pages are per app |
| **Cross-language recall** — ask in one language, find a source in another | APAC learners routinely mix languages |
| **Checkable citations** — every claim links to a stored memory, validated server-side | No invented memories |
| **Creates new content** from your history — an audio recap with source chapters | Turns consumption into something useful |
| **Agentic** — Corvus plans, searches, opens sources, and builds outputs, and shows its steps | Goes beyond question-and-answer |
| **User-controlled** — import, inspect, delete, reset; inferred data labelled | Personal history is sensitive |

---

## 4. Theme and JAPAC fit

- **Media, Content & Digital Experiences:** content understanding (video moments), discovery (recall and threads), personalisation (gaps and recaps), creation (audio recap), education (the student persona).
- **Build in JAPAC, for the world:** the region has huge multilingual learner populations and long transit commutes. Cross-language recall and commute audio recaps address that directly, and neither is region-locked.
- **Social impact / education reading of the brief:** Corvus helps self-directed learners retain and revisit what they learn for free online.

---

## 5. Persona

**Maya, university student.** Watches lecture videos, searches unfamiliar terms (sometimes in her first language), reads explainers, commutes by train. She remembers explanations but not where they came from, and does not notice which concepts she keeps getting stuck on.

Demo language pairing: English sources plus **one non-English language — to be chosen by the team** (see §20). All examples below say "[L2]" for that language.

---

## 6. Product principles

1. **Evidence before eloquence.** Every statement about the user's history cites a stored memory.
2. **User control before inference.** Users choose what enters, can delete anything, and see what was inferred.
3. **Inference is not fact.** Inferred threads, gaps, and goals are labelled and correctable.
4. **Graceful uncertainty.** Weak evidence → say so and show the closest matches.
5. **Honest prototype.** Real data comes only from the user's explicit import or URL capture. The seeded demo is labelled as sample data.

---

## 7. Decisions (locked 2026-10-16)

| Decision | Value |
|---|---|
| Product name | **Corvus** (assistant also "Corvus"). Disclosure: "Corvus is a hackathon concept and is not a Google product." |
| Deadline | October 19, 2026 |
| Team | All developers; Next.js + TypeScript |
| Data in | Hybrid: seeded demo user + real capture by URL + Google Takeout import |
| Approved features | Memory Threads, audio recap, Learning Gap Detector, cross-language recall, agentic Ask Corvus |
| Hosting | Single Next.js service on Cloud Run |
| Data | Cloud Firestore (with vector search); Cloud Storage for audio |
| AI | Gemini on Vertex AI via `@google/genai`: generation, video understanding, embeddings, TTS |
| Auth | No sign-in. Anonymous per-browser workspace (§12). Firebase Anonymous Auth only if time remains |
| Priority | App first; deck and video after the app is frozen |

---

## 8. Scope and build priority

### Tier 0 — must ship (the demo fails without these)

- Deployed Cloud Run URL with a seeded demo workspace that loads instantly.
- **Video moment memories:** Gemini analyses each seeded public YouTube video once, producing timestamped moments (what was said *and* shown).
- Search and article memories for the same learning thread.
- Embeddings in Firestore, vector search scoped to the workspace.
- **Agentic Ask Corvus** with tool calls, visible step trace, grounded answer, validated citations.
- **Source cards** that open the real YouTube video at the exact second (embedded player) or the article passage.
- Memory library with delete; deleted memories never come back in recall.
- **Cross-language recall** (comes almost free with multilingual embeddings; needs one [L2] seed item and an [L2] demo question).
- A "sample data" label on the seeded workspace and the not-a-Google-product disclosure.

### Tier 1 — the "wow" (build next, in this order)

1. **Audio recap** — Gemini writes a short script from a thread's memories, Gemini TTS voices it, playback shows source chapters.
2. **Memory Threads** — topic groups with a summary, source trail, and timeline.
3. **Add by URL (real capture)** — paste a YouTube or article URL; Corvus ingests it live.

### Tier 2 — strong extras

4. **Learning Gap Detector** — concepts the user keeps returning to, with evidence and a suggested next source.
5. **Google Takeout import** — upload YouTube watch history and Search activity JSON into a private workspace.

### Cut order if behind schedule

Cut from the bottom: Takeout import → Gap Detector → automatic thread assignment for new items (keep seeded threads) → Add by URL. **Never cut Tier 0.**

### Explicit non-goals

- Recreated YouTube/Search/Maps/Music UIs (v1 idea — dropped).
- Chrome extension (post-hackathon).
- Google Maps and YouTube Music sources.
- Google sign-in and live account access.
- Recommendation engine with weighted scoring (v1 idea — replaced by threads, gaps, and recaps).
- Medical, legal, financial advice; inference of sensitive traits.

---

## 9. How data gets in

All three paths emit the same `ActivityEvent` shape (§13), distinguished by `sourceMode`.

### 9.1 Seeded demo workspace (`sourceMode: "demo_seed"`)

- A fixed workspace `demo-maya` that every visitor sees by default, read-only for structure but deletions allowed (reset restores it).
- Uses **real, public, embeddable educational YouTube videos** (prefer Creative Commons licence) and short **original articles written by the team** (avoid copying third-party text).
- Activity history (watch times, searches, rewatches) is fabricated for Maya and labelled "Sample history".
- All Gemini processing (video moments, embeddings, threads, one pre-generated recap) runs **once, offline, via a seed script**, and results are stored in Firestore. The live demo never waits on video analysis.

### 9.2 Add by URL (`sourceMode: "user_capture"`)

- In the user's own workspace: paste a YouTube URL or an article URL.
- YouTube: Gemini analyses the public video (§14.2). Show progress; typical latency is tens of seconds to minutes depending on length, so cap at ~20 minutes of video for the prototype.
- Article: server fetches the page, extracts readable text (e.g., `@mozilla/readability` + `jsdom`), chunks, embeds. Respect robots/paywalls; failures show a clear error.

### 9.3 Google Takeout import (`sourceMode: "user_import"`)

- User exports from Google Takeout selecting **YouTube → history** and **My Activity → Search**, with **JSON** format (Takeout defaults to HTML; the UI must say this).
- Upload the `watch-history.json` and/or `MyActivity.json` files (or the zip).
- Parse server-side, keep only: title, URL, time, and query text. Discard everything else.
- Create lightweight memories for every item (title/query level). Run deep video analysis only on the **N most recent watched videos** (default 10) to cap cost and time; others can be deep-analysed on demand ("Analyse this video").
- The uploaded file itself is never stored.

### 9.4 Honesty label

Shown on onboarding and in Controls:

> "The demo workspace uses public YouTube videos and sample viewing history. Your own workspace contains only what you add by URL or import from Google Takeout. Corvus does not connect to your Google account. Corvus is a hackathon concept and is not a Google product."

---

## 10. Hero demo (≤ 3:00 total video; live run ≈ 2:30)

Seed state: Maya's workspace with a "Quantum Computing" thread (2–3 videos, searches including a repeated one, an article, one [L2] article) and a "Kyoto Trip" thread.

1. **(0:00–0:20) Problem.** "We remember the idea, not the source."
2. **(0:20–0:50) Recall by visual memory.** Ask: "Which video showed error correction as a choir?" The step trace shows Corvus searching, then answering with a source card. Click → the real video opens at the exact second.
3. **(0:50–1:15) Cross-app and cross-language.** Ask in [L2]: "How is that related to what I searched about decoherence?" Corvus answers in [L2], citing the English video moment, the search, and the [L2] article.
4. **(1:15–1:40) Learning gap.** Open the thread: "You searched *decoherence* 3 times and rewatched 2:10–2:40 twice." Suggested next source shown with evidence.
5. **(1:40–2:10) Audio recap.** Click "Make a 2-minute commute recap". Play a few seconds; chapters link back to sources.
6. **(2:10–2:30) Real data and control.** Paste a new YouTube URL (or show a Takeout import finishing) → it becomes searchable. Delete one memory, repeat a query, show it is gone.
7. **(2:30–2:50) Architecture overlay and close.**

**Wow moments:** jumping into the exact video second from a visual description; the [L2] answer citing English sources; hearing a recap made from your own history.

---

## 11. Feature specifications

### F1. Video moment understanding (Tier 0)

- Input: public YouTube URL.
- Gemini call with the video as `fileData` (YouTube URL) plus a prompt to return JSON: list of moments `{ startSeconds, endSeconds, spokenSummary, visualDescription, keyTerms[], language }`, plus video-level `{ title, summary, topics[] }`.
- Moment length roughly 20–60 s. Cap moments per video (~40).
- Each moment becomes a `MemoryRecord` of type `video_moment`, with embedding text = title + spokenSummary + visualDescription + keyTerms.
- **Day-0 verification required:** confirm Vertex AI accepts YouTube URLs for the chosen model in the chosen region. Fallback if not: use the Gemini Developer API (AI Studio key, server-side) for the analysis step only, or download a CC-licensed copy to Cloud Storage and pass a `gs://` URI.

### F2. Agentic Ask Corvus (Tier 0)

- Implemented as a Gemini **function-calling loop** in a Next.js route handler (max 6 steps, overall timeout ~25 s). Google's Agent Development Kit may be used if the team is comfortable with it; not required.
- Tools (all scoped to the current workspace):

| Tool | Purpose |
|---|---|
| `search_memories(query, sources?, from?, to?, threadId?, limit?)` | Hybrid vector + keyword search; returns memory summaries with IDs |
| `get_memory(memoryId)` | Full memory with excerpt and deep link |
| `list_threads()` / `get_thread(threadId)` | Thread summaries and member memories |
| `find_learning_gaps(threadId)` | Runs F6 and returns gaps with evidence IDs (Tier 2) |
| `create_audio_recap(threadId or memoryIds[], language, targetSeconds)` | Runs F5 and returns a recap ID (Tier 1) |

- Final turn must return structured JSON:

```ts
type AgentAnswer = {
  answer: string;              // in the user's question language
  confidence: "high" | "medium" | "low";
  citations: Array<{ memoryId: string; supportingClaim: string }>;
  actions?: Array<{ type: "open_recap" | "open_thread"; id: string }>;
  suggestedFollowUps: string[];
};
```

- **Citation validation:** server rejects any `memoryId` not returned by a tool during this turn; if all citations are invalid, return a low-confidence response listing the closest retrieved memories.
- UI shows a compact **step trace** ("Searched memories for 'choir analogy' → 4 results → opened 1 memory").
- System instruction:

```text
You are Corvus, a personal media-memory assistant.
Use the tools to find evidence in the user's own memories before answering.
Answer only from tool results. Every statement about what the user watched, searched, or read must cite memory IDs returned by tools in this conversation.
Never invent titles, URLs, timestamps, quotes, or events.
Answer in the language of the user's question, even if sources are in another language.
Label anything inferred (for example a guessed goal) as inferred.
If evidence is weak, say so briefly and list the closest matches.
Return JSON matching the provided schema.
```

### F3. Cross-language recall (Tier 0)

- Use a multilingual embedding model (e.g., `gemini-embedding-001`) with task types `RETRIEVAL_DOCUMENT` for memories and `RETRIEVAL_QUERY` for questions.
- Store `language` on each memory; show a language badge on source cards.
- Agent answers in the question's language (system instruction above).
- Acceptance: an [L2] question retrieves the English video moment in the top 3, and an English question retrieves the [L2] article in the top 3.

### F4. Memory Threads (Tier 1)

- A thread = topic group with `title`, `summary`, member memory IDs, `updatedAt`, `provenance: "inferred"`.
- Seeded threads are created by the seed script (Gemini names and summarises clusters).
- New memories: compare embedding to each thread centroid; above a threshold → assign; otherwise Gemini decides "existing thread X" or "new thread" with a title. Thread summary is regenerated (debounced) after changes.
- UI: thread page with summary, source trail across apps on a timeline, "Make recap" and "Find gaps" buttons. Users can remove a memory from a thread or rename it.

### F5. Audio recap (Tier 1)

- Input: a thread or selected memories, language, target length (default 120 s).
- Step 1: Gemini writes a spoken script as JSON segments, each with `text` and `memoryIds[]` it draws from. Optionally two voices (host and guest) if multi-speaker TTS is available.
- Step 2: Gemini TTS voices the script. Convert PCM output to WAV/MP3 server-side, upload to Cloud Storage, store a recap record with chapter timings.
- Player shows chapters; each chapter links to its source memories.
- Seed script pre-generates one recap for the demo so the live demo can play instantly; generating a new one live is a bonus.
- Validate that every `memoryId` in the script exists in the input set.

### F6. Learning Gap Detector (Tier 2)

- Deterministic signals first (cheap and explainable):
  - same or similar query searched ≥ 2 times (Takeout and seed both give this);
  - the same video span rewatched (seed data; from Takeout we only know repeat watches);
  - concepts that appear in many memories but are never the main topic of any source;
  - questions the user asked Corvus about the thread.
- Gemini receives the signals plus the thread's memories and returns up to 3 gaps: `{ concept, why (citing evidence memory IDs), suggestedNext: memoryId | searchQuery }`.
- Every gap is labelled **inferred**, cites evidence, and can be dismissed.

---

## 12. Workspaces, privacy, and responsible AI

### Workspaces

- No sign-in. On first visit the browser gets a random workspace ID in an httpOnly, signed cookie (`HMAC` with a server secret).
- `demo-maya` is shared and visible to all; deletions there are scoped to the visitor via a per-visitor "hidden memories" overlay, or the demo is reset nightly — pick the overlay if simple, otherwise accept shared state and provide a "Reset demo" button.
- User workspaces (`ws_<random>`) hold Add-by-URL and Takeout data, visible only to that cookie.
- The server derives the workspace from the cookie, never from the request body. Every Firestore query filters by workspace.

### Safeguards

- Clear consent text before upload/capture.
- Takeout file parsed in memory and discarded; only minimal fields stored.
- Delete one memory; "Delete my workspace" deletes all its documents and audio files.
- Observed vs inferred labelled (text label + icon, never colour alone).
- Prompts and responses not persisted except the final answer shown to the user. Logs exclude source text and queries.
- No inference of sensitive traits; the gap detector is about learning topics only.
- Secrets live in Cloud Run environment / Secret Manager only.

---

## 13. Data model

All workspace-owned records include `workspaceId`.

```ts
type SourceKind = "youtube" | "google_search" | "web";
type SourceMode = "demo_seed" | "user_capture" | "user_import";

type ActivityEvent = {
  id: string;                  // idempotency key (e.g., hash of source+url+time)
  workspaceId: string;
  source: SourceKind;
  sourceMode: SourceMode;
  action: "watched" | "rewatched_span" | "searched" | "read" | "added";
  contentId?: string;
  occurredAt: string;          // ISO 8601
  payload: {
    query?: string;
    url?: string;
    spanStartSeconds?: number;
    spanEndSeconds?: number;
  };
};

type ContentItem = {
  id: string;                  // e.g., "yt_<videoId>" or "web_<hash>"
  source: SourceKind;
  title: string;
  url: string;                 // real URL
  creator?: string;
  language?: string;           // BCP-47
  durationSeconds?: number;
  summary?: string;
  topics: string[];
  analysisStatus: "none" | "pending" | "done" | "failed";
};

type MemoryRecord = {
  id: string;
  workspaceId: string;
  memoryType: "video_moment" | "video" | "search" | "article_passage" | "article";
  source: SourceKind;
  sourceMode: SourceMode;
  contentId?: string;
  sourceEventIds: string[];
  title: string;
  text: string;                // embedding text
  excerpt: string;             // short, shown on card
  visualDescription?: string;  // video moments
  deepLink: string;            // e.g., https://youtu.be/<id>?t=142 or /read/<contentId>#chunk-3
  startSeconds?: number;
  endSeconds?: number;
  language: string;
  occurredAt: string;
  topics: string[];
  threadIds: string[];
  provenance: { observed: string[]; extracted: string[]; inferred: string[] };
  embedding: number[];         // Firestore vector, 768 dims
  embeddingModel: string;
  deletedAt?: string;
};

type Thread = {
  id: string;
  workspaceId: string;
  title: string;
  summary: string;
  memoryIds: string[];
  centroid?: number[];
  updatedAt: string;
  provenance: "inferred" | "user_edited";
};

type Recap = {
  id: string;
  workspaceId: string;
  threadId?: string;
  language: string;
  audioUrl: string;            // signed Cloud Storage URL
  durationSeconds: number;
  chapters: Array<{ startSeconds: number; title: string; memoryIds: string[] }>;
  createdAt: string;
};

type LearningGap = {
  id: string;
  workspaceId: string;
  threadId: string;
  concept: string;
  why: string;
  evidenceMemoryIds: string[];
  suggestedNext?: { memoryId?: string; searchQuery?: string };
  dismissed: boolean;
};
```

### Firestore layout

```text
content/{contentId}                     # shared catalogue (no personal data)
memories/{memoryId}                     # top-level; mandatory workspaceId filter
events/{eventId}
threads/{threadId}
recaps/{recapId}
gaps/{gapId}
workspaces/{workspaceId}                # created time, settings
```

Top-level collections with a mandatory `workspaceId` equality filter keep the vector index simple. Create a **composite vector index** on `memories` with `workspaceId` (equality) + `embedding` (768-dim, cosine). Exclude `deletedAt != null` with a boolean `active` field rather than inequality filters.

---

## 14. Pipelines

### 14.1 Event → memory

1. Validate event (Zod); dedupe on `event.id`.
2. Resolve or create `ContentItem`.
3. Create memories: search → one `search` memory; article → `article` + chunk `article_passage` memories; video → `video` memory, plus `video_moment` memories when analysis is done.
4. Embed (batch) and store.
5. Assign threads (F4), debounced.

### 14.2 Video analysis job

- Runs in the request for Add by URL (with progress polling), and in the seed script for the demo.
- Retries once; on failure, mark `analysisStatus: "failed"` and keep the title-level memory.
- Cache by `contentId` across workspaces: the analysis of a public video is not personal data, so a second user adding the same video reuses it.

### 14.3 Retrieval (inside `search_memories`)

1. Embed query (`RETRIEVAL_QUERY`).
2. Firestore `findNearest` with `workspaceId` and `active == true` filters, top ~20.
3. Keyword boost for exact phrases in `title`/`excerpt` (simple in-process scoring over the 20 candidates, plus a small keyword-only query for exact titles).
4. Re-rank: `0.7 × vector + 0.2 × keyword + 0.1 × recency`; return top `limit` (default 6).

### 14.4 Fallback

- If Gemini generation fails: return the top retrieved memories as source cards with a "Corvus couldn't write a summary right now" note.
- If embeddings fail: keyword-only search over the workspace.
- Show a small "fallback mode" badge. Do not build a separate deterministic answer engine.

---

## 15. API

```text
POST   /api/ask                    { question } → AgentAnswer + step trace (stream if simple)
GET    /api/memories?threadId=&source=&q=
DELETE /api/memories/:id
POST   /api/capture                { url } → contentId + status
GET    /api/capture/:contentId     → analysis status
POST   /api/import/takeout         multipart upload → counts
GET    /api/threads
GET    /api/threads/:id
POST   /api/threads/:id/recap      { language, targetSeconds } → recapId
GET    /api/recaps/:id
POST   /api/threads/:id/gaps       → LearningGap[]
POST   /api/gaps/:id/dismiss
POST   /api/workspace/reset        (demo) / DELETE /api/workspace (own)
GET    /api/health
```

All mutations validate input with Zod and derive the workspace from the cookie.

---

## 16. UX

### Screens

1. **Onboarding** (one screen): what Corvus is, honesty label, two buttons — "Explore Maya's demo" and "Start my own memory".
2. **Home / Ask**: large question box (the hero), recent threads, recap card, language-agnostic placeholder text.
3. **Answer view**: answer, confidence, step trace (collapsible), source cards.
4. **Source viewer**: embedded YouTube player seeking to `startSeconds` (YouTube IFrame Player API), moment list beside it; or article reader scrolled to the cited passage.
5. **Thread page**: summary, cross-source timeline, gaps panel, recap player.
6. **Memory library**: filter by source/thread/language, observed/inferred labels, delete.
7. **Add**: paste URL; upload Takeout files with export instructions.
8. **Controls**: honesty label, delete/reset workspace.

### Source card

Source icon and type · title · "seen" date · excerpt or visual description · timestamp chip (videos) · language badge · "Open at 2:21".

### Visual direction

Warm charcoal, cloud white, electric indigo, one bright accent. Thin constellation-style lines connecting related sources on the thread page. Calm, not ominous. Mobile-first layout (commute use), works on desktop for judging.

### Accessibility

Keyboard navigation, visible focus, labelled inputs, sufficient contrast, reduced-motion support, captions/transcript text for the audio recap.

---

## 17. Seed content plan

### Thread A — Quantum computing (English + [L2])

- 2–3 **public, embeddable** YouTube videos on quantum error correction / decoherence / no-cloning. Prefer Creative Commons. At least one must contain an analogy or visual the team can ask about. (If no video has a "choir" analogy, change the demo question to match what the real video actually shows — do not invent it.)
- Searches: "why qubits lose information", "decoherence meaning" ×3 (gap signal), "[L2] query about qubits".
- One original English article (team-written, ~600 words) on decoherence.
- One original [L2] article (team-written or Gemini-drafted then reviewed) on error correction.
- Rewatch events on one span of a video (gap signal).

### Thread B — Kyoto trip

- 1 public travel/culture video, 2 searches, 1 original article.

### Seed script

`scripts/seed-demo.ts`: writes content, events, runs video analysis, embeds, builds threads, generates one recap, writes everything to Firestore and Cloud Storage. Idempotent. Run once against the real project; commit the resulting JSON snapshot (minus embeddings if large) so it can be re-loaded without re-calling Gemini.

---

## 18. Architecture

```text
Browser (Next.js app, mobile-first)
  Ask · Source viewer (YouTube IFrame) · Threads · Library · Add/Import · Controls
        │ HTTPS
        ▼
Cloud Run — one Next.js service
  Route handlers: ask (agent loop) · capture · import · threads · recaps · gaps
  lib/: ingestion · video analysis · retrieval · agent tools · recap · gaps
        │                      │                         │
        ▼                      ▼                         ▼
Cloud Firestore          Vertex AI (Gemini)          Cloud Storage
  content, memories,       generation + function       recap audio
  events, threads,         calling, video
  recaps, gaps,            understanding, TTS,
  vector index             multilingual embeddings
```

Why: one deployable service, Google-native AI everywhere it matters, Firestore vector search avoids a separate vector DB, nothing to operate.

---

## 19. Implementation notes

- Stack: Next.js (App Router) + TypeScript, Tailwind, Zod, `@google/genai` (Vertex mode), `firebase-admin` (Firestore), `@google-cloud/storage`, Vitest.
- Keep all model IDs in env vars; **verify availability in the chosen region on Day 0** (generation, YouTube-URL video input, TTS, embeddings).
- Embedding dimension 768 (`outputDimensionality`) to fit Firestore's 2,048-dim index limit.
- Long-running work (video analysis, recap) runs inside the request with a generous Cloud Run timeout (e.g., 300 s) for the prototype; the UI polls status. No queues.
- Cloud Run: min instances 1 during judging to avoid cold starts.

### Environment variables

```dotenv
GOOGLE_CLOUD_PROJECT=
GOOGLE_CLOUD_LOCATION=            # region for Gemini; verify features there, or "global"
GOOGLE_GENAI_USE_VERTEXAI=true
GEMINI_MODEL=                     # fast model for agent loop
GEMINI_VIDEO_MODEL=               # model used for video analysis (may equal GEMINI_MODEL)
GEMINI_TTS_MODEL=
EMBEDDING_MODEL=gemini-embedding-001
EMBEDDING_DIMENSION=768
FIRESTORE_DATABASE=(default)
GCS_BUCKET=
WORKSPACE_COOKIE_SECRET=
DEMO_WORKSPACE_ID=demo-maya
GEMINI_API_KEY=                   # only if Vertex lacks YouTube-URL input (fallback, server-side)
```

### Repository structure

```text
app/
  (routes) ask/ thread/[id]/ source/[id]/ library/ add/ controls/
  api/ ask/ memories/ capture/ import/ threads/ recaps/ gaps/ workspace/ health/
components/  ask/ sources/ threads/ recap/ library/ shell/
lib/
  ai/          client, prompts, schemas
  agent/       loop, tools
  ingest/      events, takeout parser, article fetch, video analysis
  retrieval/   embed, search, rerank
  threads/ recap/ gaps/
  db/          firestore, storage
  workspace/   cookie, scoping
scripts/seed-demo.ts
tests/
```

---

## 20. Open decisions

| # | Decision | Needed by |
|---|---|---|
| 1 | Submission deadline **time and time zone** on Oct 19 | Now |
| 2 | Second demo language [L2] | Day 1 morning (seed content) |
| 3 | Which real YouTube videos to seed (licence + embeddable) and the exact demo question that matches them | Day 1 morning |
| 4 | Google Cloud project ID, billing, region | Day 0 |
| 5 | Demo workspace: per-visitor overlay vs shared + reset button | Day 1 |
| 6 | GitHub owner and visibility | Day 0 |

---

## 21. Testing (lean)

- Unit (Vitest): Takeout parser, citation validator, workspace scoping, rerank.
- Scripted eval: 10 fixed questions against the seeded workspace (include 3 in [L2] and 2 unanswerable). Record top-3 hit rate and citation validity. Run before freeze; numbers go on the benchmark slide.
- Manual run of the hero demo on the deployed URL from an incognito window, twice, before recording.

---

## 22. Risks

| Risk | Mitigation |
|---|---|
| Three-day deadline | Strict tiers and cut order (§8); deploy on Day 0 |
| Vertex AI doesn't accept YouTube URLs for chosen model/region | Verify Day 0; fall back to Gemini Developer API key or `gs://` copy |
| Video analysis slow or costly | Seed offline; cap video length and Takeout deep-analysis count; cache by content |
| Hallucinated memories | Tool-only evidence, structured output, server-side citation validation |
| Agent loop slow during demo | Fast model, max 6 steps, stream step trace, warm instance |
| Copyright | Embed videos via official player, don't rehost; team-written articles; short excerpts only |
| Personal data in Takeout | Minimal fields, file discarded, delete workspace, no logging of content |
| Seed demo question doesn't match real video | Write questions after watching the chosen videos |

---

## 23. Prompts for the coding agent

### Start

```text
You are building Corvus from CORVUS_PRODUCT_BUILD_SPEC.md (v2) following CORVUS_DEVELOPMENT_PLAN.md.
Read both files fully. Work on the current day's tasks only, in tier order.
Never start a higher tier while Tier 0 is broken. Keep model IDs in env vars.
Ground every answer in tool results and validate citations server-side.
Scope every query by workspace derived from the signed cookie.
At the end of each task: run tests and a production build, deploy if the plan says so, and update the progress log in the plan.
```

### Final audit

```text
Audit Corvus against Tier 0 and the hero demo in CORVUS_PRODUCT_BUILD_SPEC.md.
Do not add features. Fix correctness, grounding, scoping, deletion, and deployment issues.
Run the 10-question eval and report results with the Cloud Run revision.
```

---

## 24. Pitch draft

> We learn across YouTube, Search, and the web—often in more than one language—and later remember the idea but not the source. Corvus is a private memory for what you watch, search, and read. Gemini watches the videos you've seen and remembers their moments, so you can ask "which video showed error correction as a choir?" in any language and jump to the exact second. Corvus connects that moment to what you searched and read later, notices the concepts you keep getting stuck on, and turns your week of learning into a two-minute audio recap with sources. Bring your own history with Google Takeout, or add any video by URL. Built with Gemini on Vertex AI, Firestore vector search, Cloud Storage, and Cloud Run.

---

## 25. References

- [Cloud Run deployment](https://cloud.google.com/run/docs/deploying)
- [Gemini on Vertex AI — video understanding](https://cloud.google.com/vertex-ai/generative-ai/docs/multimodal/video-understanding)
- [Gemini on Vertex AI — function calling](https://cloud.google.com/vertex-ai/generative-ai/docs/multimodal/function-calling)
- [Vertex AI text embeddings](https://cloud.google.com/vertex-ai/generative-ai/docs/embeddings/get-text-embeddings)
- [Firestore vector search](https://firebase.google.com/docs/firestore/vector-search)
- [Google Takeout](https://support.google.com/accounts/answer/3024190)
- [YouTube IFrame Player API](https://developers.google.com/youtube/iframe_api_reference)
