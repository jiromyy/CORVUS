# Corvus Development Plan

> Three-day execution plan, setup checklist, and progress tracker
> Version: **v2 (2026-10-16)**. Previous version: `archive/GOOGLE_CORVUS_DEVELOPMENT_PLAN.v1.md`
> Product spec: `CORVUS_PRODUCT_BUILD_SPEC.md` (v2)
> Deadline: **October 19, 2026** — time and time zone to confirm

---

## 1. Ground rules

1. **App first.** Deck and video start only after the app freeze (Day 2 evening).
2. **Deploy on Day 0** and redeploy at least twice a day. Never discover deployment problems on Day 3.
3. **Tier order is law** (spec §8). Nobody works on Tier 1 while Tier 0 is broken on the deployed URL.
4. **Cut from the bottom** when behind: Takeout import → Gap Detector → automatic thread assignment → Add by URL. Tier 0 is never cut.
5. One `main` branch, short-lived feature branches, merge often. Whoever breaks the deployed demo fixes it before anything else.
6. No secrets in Git, chat, or docs.

---

## 2. Calendar

| Day | Date | Goal | Freeze point |
|---|---|---|---|
| Day 0 | Fri Oct 16 (today, evening) | Cloud project ready, AI capabilities verified, skeleton deployed | Hello-world on Cloud Run |
| Day 1 | Sat Oct 17 | **Tier 0 complete** on deployed URL | Hero steps 2, 3, 6 (delete) work end to end |
| Day 2 | Sun Oct 18 | Tier 1, then Tier 2; seed content final | **App freeze 20:00 local**; final deploy |
| Day 3 | Mon Oct 19 | Eval numbers, bug fixes only, video, deck PDF, submit | Submit with ≥ 3 h buffer before deadline |

Adjust if the deadline time turns out to be early on Oct 19.

---

## 3. Workstreams

Assign one owner each. With fewer people, merge A+D and B+C.

| Stream | Owns | Spec |
|---|---|---|
| **A. Ingestion & data** | Firestore layer, event→memory pipeline, video analysis, article fetch, embeddings, seed script, Takeout parser | §9, §11 F1, §13, §14.1–14.2, §17 |
| **B. Agent & retrieval** | `search_memories` and other tools, agent loop, citation validation, cross-language behaviour, eval script | §11 F2–F3, §14.3–14.4, §21 |
| **C. Frontend** | Shell, onboarding, Ask + step trace, source cards, YouTube source viewer, library, add/import UI, controls | §16 |
| **D. Threads, recap, gaps** | Thread grouping and pages, audio recap (script + TTS + storage + player), gap detector | §11 F4–F6 |

Contracts first: on Day 0, Stream B writes `lib/ai/schemas.ts` and the Zod types from spec §13 so all streams code against the same shapes.

---

## 4. Day 0 — Friday Oct 16 (setup + spikes)

### Team-owned setup (needs account owners)

- [ ] Create/select Google Cloud project; confirm billing or credits.
- [ ] Choose region (suggest `asia-southeast1`) and Firestore location (cannot be changed later).
- [ ] Enable APIs: Cloud Run, Cloud Build, Artifact Registry, Vertex AI, Firestore, Cloud Storage, Secret Manager.
- [ ] Create Firestore (Native mode) and one Cloud Storage bucket for recaps.
- [ ] Each developer: `gcloud auth login` and `gcloud auth application-default login`.
- [ ] Create GitHub repo (`corvus`) and decide visibility; add teammates.

```powershell
gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com aiplatform.googleapis.com firestore.googleapis.com storage.googleapis.com secretmanager.googleapis.com
```

### Capability spikes (one small script each, 30–60 min total) — **most important task today**

Scripts are written (`spikes/`, run with `npm run spike:*`); they still need a configured project to run.

- [ ] **Video:** Gemini on Vertex analyses a public YouTube URL and returns timestamped moments JSON. If it fails → test Gemini Developer API key path or `gs://` copy, record the outcome in §9.
- [ ] **Embeddings:** `gemini-embedding-001` at 768 dims; check an English and an [L2] sentence on the same idea land close together.
- [ ] **TTS:** generate 10 s of speech in English and [L2]; confirm output format.
- [ ] **Function calling:** one tool call round trip with the chosen fast model.
- [ ] **Firestore vector:** create the composite vector index (`workspaceId` + `embedding`) and run one `findNearest`.

### Skeleton

- [x] Scaffold Next.js + TypeScript + Tailwind + Vitest; `.gitignore`, `.env.example` (spec §19).
- [x] `/api/health`, landing page with disclosure.
- [x] Shared schemas (`lib/ai/schemas.ts`) and Firestore client.
- [ ] Deploy to Cloud Run with a least-privilege service account (Vertex AI User, Firestore User, Storage Object Admin on the bucket).

**Exit:** deployed URL returns health OK; all five spikes pass or have a recorded fallback.

---

## 5. Day 1 — Saturday Oct 17 (Tier 0)

### Morning

- [ ] **Decide seed content** (team, 1 hour max): pick 2–3 real embeddable YouTube videos, watch them, write the demo questions that match what they actually show. Choose [L2]. Draft the two original articles.
- [ ] A: event→memory pipeline; video analysis module; article chunking; embedding batcher.
- [ ] B: `search_memories` with vector + keyword rerank; workspace scoping.
- [ ] C: app shell, onboarding, Ask page, source card component, YouTube viewer that seeks to a timestamp.
- [ ] D: help A with the seed script; draft thread data for the seed.

### Afternoon

- [ ] A: seed script runs end to end against the real project (content, events, moments, embeddings).
- [ ] B: agent loop with tools, structured answer, citation validation, step trace output, fallback behaviour.
- [ ] C: answer view with step trace; memory library with delete; signed-cookie workspace.
- [ ] D: thread grouping in seed; thread page skeleton.

### Evening

- [ ] Deploy. From an incognito window: ask the visual-memory question → correct video opens at the right second.
- [ ] Ask the [L2] question → answer in [L2] citing English sources.
- [ ] Delete a memory → it no longer appears.

**Exit (Tier 0 done):** all three checks above pass on the deployed URL.

---

## 6. Day 2 — Sunday Oct 18 (Tier 1 → Tier 2 → freeze)

### Tier 1 (morning to early afternoon)

- [ ] D: audio recap — script generation with memory IDs, TTS, WAV/MP3 to Cloud Storage, chapters; pre-generated demo recap in seed.
- [ ] C: recap player with chapters linking to sources; thread page complete.
- [ ] A: Add by URL — YouTube and article capture with progress status, content-level analysis cache.
- [ ] B: `create_audio_recap` and `get_thread` tools wired into the agent.

### Tier 2 (afternoon, only if Tier 1 is deployed and working)

- [ ] D: Learning Gap Detector (signals + Gemini) and gaps panel.
- [ ] A: Takeout import (JSON files; deep-analyse 10 most recent videos).
- [ ] C: Add/Import screen with Takeout export instructions; Controls screen (delete/reset workspace).
- [ ] B: 10-question eval script (3 in [L2], 2 unanswerable).

### Freeze (20:00 local)

- [ ] Final deploy; set Cloud Run min instances = 1.
- [ ] Run the full hero demo twice from incognito.
- [ ] Record revision ID and URL in §9.

---

## 7. Day 3 — Monday Oct 19 (submit)

- [ ] Run eval script against the deployed revision; record results (do not invent numbers).
- [ ] Bug fixes only — no features.
- [ ] Record the demo video (**≤ 3:00**) from the deployed app; upload as public YouTube/Vimeo/Drive link; check it plays logged out.
- [ ] Build the deck from `CORVUS_PRESENTATION_CONTENT.md`; export PDF; check links are clickable.
- [ ] Select theme: **Media, Content & Digital Experiences**.
- [ ] Final link audit (prototype, video, deck, repo); submit with buffer.

---

## 8. Hackathon submission requirements (from the official brief)

- [ ] Proposal deck as **PDF**: problem, impact, alignment to one theme, feasibility, scalability.
- [ ] Working prototype using Google AI models, deployed on **Cloud Run or Firebase**.
- [ ] Public **YouTube / Vimeo / Google Drive** video link, **3 minutes**.
- [ ] Theme/problem statement identified.
- [ ] All materials in English.

Judging: Technical merit & Gen AI 40% · Problem alignment & impact 25% · Innovation & creativity 25% · UX 10%.

Open question: the earlier plan listed a mandatory GitHub repo, a brief description naming Firebase/Firestore/Cloud Run/Gemini, and a 16-page template. These are not in the brief docx — confirm with organisers before Day 3.

---

## 9. Environment record (fill in; no secrets)

```text
Project ID:                 TBD
Region (Cloud Run):         TBD
Firestore location:         TBD
Gemini location:            TBD
GCS bucket:                 TBD
Fast model (agent):         TBD
Video model:                TBD   YouTube URL on Vertex: TBD (yes / fallback used)
TTS model:                  TBD
Embedding model / dims:     gemini-embedding-001 / 768 (verify)
[L2] language:              TBD
Cloud Run URL:              TBD
Final revision:             TBD
GitHub repo:                TBD
```

---

## 10. Decision log

| Date | Decision | Reason |
|---|---|---|
| 2026-10-16 | Name is **Corvus** (not "Google Corvus") | Avoid Google trademark in product name |
| 2026-10-16 | Deadline Oct 19; three-day plan | Team confirmation |
| 2026-10-16 | Next.js + TypeScript; all members are developers | Team confirmation |
| 2026-10-16 | Hybrid data: seeded demo + Add by URL + Takeout import | Real data is more credible than recreated apps |
| 2026-10-16 | Approved: Memory Threads, audio recap, Learning Gap Detector, cross-language recall, agentic Ask | Team confirmation; ordered in tiers |
| 2026-10-16 | App first; deck and video after freeze | Team confirmation |
| 2026-10-16 | Dropped recreated Google app UIs, Maps, Music, weighted recommender, Firebase Auth | Three-day scope |

---

## 11. Risks and blockers

| ID | Risk | Mitigation | Status |
|---|---|---|---|
| R1 | Three days is very tight | Tiers, cut order, deploy Day 0 | Open |
| R2 | YouTube-URL video input unavailable on Vertex in region | Day-0 spike; fallback paths in spec §11 F1 | Open |
| R3 | Agent loop latency during demo | Fast model, ≤ 6 steps, warm instance | Open |
| R4 | Firestore vector index setup | Day-0 spike | Open |
| R5 | Google Cloud CLI not installed on the main dev machine (git, Node 22, npm, Docker are present) | Install gcloud before Cloud setup and deploy | Open |
| R6 | Deadline hour unknown | Confirm today | Open |

---

## 12. Progress log

| Date/time | Stream | Work completed | Evidence | Next |
|---|---|---|---|---|
| 2026-10-16 | Planning | v2 spec and three-day plan written | Docs updated | Day 0 setup and spikes |
| 2026-10-16 | Day 0 | Next.js app scaffolded at repo root; env validation, Gemini and Firestore clients, shared Zod schemas + citation validator, `/api/health`, landing page, Dockerfile, six spike scripts, README with Cloud setup commands; local git repo initialised (no commits) | lint, typecheck, 3 unit tests, `next build`, standalone server returned health OK locally | Blocked on: gcloud CLI, Cloud project. Then Cloud setup, spikes, first Cloud Run deploy |

---

## 13. Current handoff

- Active: **Day 0 — setup and spikes**
- Build: scaffolded (Next.js 16.4, standalone output, Dockerfile); lint, typecheck, unit tests, production build and local `/api/health` pass
- Deployed URL: none
- Next: team installs gcloud and finishes the Cloud setup in §4, fills `.env.local`, then runs the spikes in order (models → embeddings → tools → firestore → tts → video) and first deploy.
