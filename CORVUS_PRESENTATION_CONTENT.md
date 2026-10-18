# Corvus Presentation Content

> Working content for the prescribed AI Builder Cup presentation template  
> Product: **Corvus**  
> Status: Draft; replace all `[TBD]` fields before submission  
> **v2 note (2026-10-16):** Only the product name and video length are updated so far. The slide content still describes v1 (recreated Google apps, Maps/Music, weighted recommendations). Rewrite it from `CORVUS_PRODUCT_BUILD_SPEC.md` v2 after the app freeze on Oct 18. Original: `archive/GOOGLE_CORVUS_PRESENTATION_CONTENT.v1.md`  
> Source template reviewed: 16 pages  
> Companion documents: `CORVUS_PRODUCT_BUILD_SPEC.md` and `CORVUS_DEVELOPMENT_PLAN.md`

---

## 1. Presentation strategy

### Core story

People remember ideas but forget where they encountered them. Corvus turns user-authorized activity across YouTube, Google Search, websites, Google Maps, and listening experiences into a private, source-grounded memory that can recall the original source, connect related experiences, and suggest the most useful next content for the user’s current context.

### Important prototype disclosure

The hackathon build uses functional recreations of Google app experiences with fictional data. It does not access a real Google account or live Google history.

### Brand story

Corvus is named after the **Corvus constellation**, representing a crow. Crows are associated with intelligence, observation, memory, adaptability, and complex social behavior. Those qualities mirror an assistant that observes only consented activity, remembers its source, connects knowledge, and helps users act on it.

Use this small disclosure in the deck footer or final slide:

> Corvus is a hackathon concept and is not a Google product.

### Presentation rule

Keep slide text sparse. Use screenshots, diagrams, and one strong user journey. Detailed explanations belong in presenter notes.

---

## 2. Template map

| Template page | Required heading/purpose | Corvus content status |
|---:|---|---|
| 1 | Team Details | Copy drafted; team fields pending |
| 2 | Template download instruction | Instruction page; determine whether organizers expect removal |
| 3 | Brief about the idea | Drafted |
| 4 | Opportunities | Drafted |
| 5 | List of features | Drafted |
| 6 | Process flow/use-case diagram | Diagram specification drafted |
| 7 | Wireframes/mock diagrams, optional | Screenshot/wireframe plan drafted |
| 8 | Architecture diagram | Diagram specification drafted |
| 9 | Technologies | Drafted |
| 10 | Estimated implementation cost, optional | Measurement approach drafted |
| 11 | Prototype snapshots | Capture plan drafted |
| 12 | Performance/benchmarking | Metrics and targets drafted |
| 13 | Additional details/future development | Drafted |
| 14 | Repository, video, product links | Placeholders prepared |
| 15 | Blank template page | Recommended: Responsible AI & Trust |
| 16 | Thank you | Drafted |

Do not rearrange the prescribed template unless the hackathon rules explicitly permit it.

---

## 3. Slide-by-slide content

## Slide 1 — Team Details

### On-slide copy

**Team name:** Corvus  
**Team leader:** [TBD]  
**Team members:** [TBD]  

**Problem statement**

> Our knowledge is scattered across YouTube, Google Search, websites, Maps, and other media. We remember the idea—but often lose the source, context, and next useful step.

### Presenter note

“We are building Corvus, a personal media-memory assistant named after the Corvus constellation and the crow—symbols of intelligence, observation, and memory.”

### Visual recommendation

- Small Corvus constellation mark connecting several app-source points.
- One-line subtitle: **Your Google ecosystem, remembered with sources.**

---

## Slide 2 — Template instruction page

This page tells teams to download the template as PowerPoint and avoid edit requests.

### Action

- Confirm whether this instruction page should remain in the final submission.
- If removal is permitted, delete it before export.
- If template page count must remain unchanged, retain it without modification.

Do not place product content on this page unless organizers permit replacing instruction pages.

---

## Slide 3 — Brief About the Idea

### Headline

**An AI memory for everything you discover across Google.**

### On-slide copy

Corvus transforms consented activity from YouTube, Google Search, websites, Google Maps, and listening experiences into a private personal memory.

- Ask where you encountered an idea.
- Return to the exact source or video moment.
- Connect related knowledge across different apps.
- Receive transparent suggestions based on your current goal and context.

**Prototype:** Functional Google-app recreations with fictional data, powered by Gemini, Firestore, Firebase, and Cloud Run.

### Presenter note

“History pages can tell us what we opened. Corvus helps us recover what it meant, where it came from, how it connects, and what will help next.”

### Visual recommendation

Center Corvus as a constellation hub with lines to YouTube, Search, Web, Maps, and Music-style source cards. Mark the sources as simulations in the prototype.

---

## Slide 4 — Opportunities

The template asks how the idea differs, how it solves the problem, and its USP.

### On-slide copy

**What is different?**

- One memory layer across media types—not another app-specific history page.
- Retrieves evidence from the user’s own activity instead of answering from generic model memory.
- Personalizes for current intent, not only predicted engagement.

**How it solves the problem**

- Converts activity into searchable, source-linked memories.
- Uses semantic retrieval to find ideas even when the user cannot remember exact words.
- Reopens the original source and connects related encounters.

**Unique value proposition**

> **Remember the idea. Recover the source. Continue with purpose.**

### Presenter note

Emphasize that the source trail is the differentiator. The AI does not merely tell the user an answer; it restores the exact evidence from the user’s media history.

---

## Slide 5 — Features Offered

### On-slide copy

1. **Source-grounded recall**  
   Ask “Where did I see this?” and recover the original source, time, and relevant excerpt.

2. **Cross-media connections**  
   Link a YouTube explanation to a later Google Search, article, place, or listening session.

3. **Context-aware suggestions**  
   Recommend a short recap while commuting or a deeper lesson during Study mode.

4. **Memory timeline**  
   Inspect, filter, open, and delete captured activity.

5. **Transparent recommendations**  
   Show “Why this?” using visible signals such as mode, topic, and unfinished content.

6. **Privacy and control**  
   Pause capture, disable a source, correct an inference, or clear demo data.

### Optional approved features

- Memory Threads: evolving topic journeys across apps.
- Create From Memory: generate a sourced study guide from selected memories.

Do not show optional features as complete until they work in the deployed prototype.

---

## Slide 6 — Process Flow / Use Case

### Recommended diagram

```text
1. USER INTERACTS
YouTube Demo | Search Demo | Web Demo | Maps Demo
                     │
                     ▼
2. CORVUS CAPTURES A CONSENTED EVENT
source + action + content + time + context
                     │
                     ▼
3. MEMORY PIPELINE
normalize → extract provenance → embed → store
                     │
          ┌──────────┴──────────┐
          ▼                     ▼
4A. ASK CORVUS           4B. GET SUGGESTIONS
retrieve evidence        rank by goal + context
          │                     │
          └──────────┬──────────┘
                     ▼
5. USER ACTS
open exact source | inspect why | correct/delete memory
```

### Use-case caption

> Raven remembers a “choir” analogy but not its source. Corvus finds the exact YouTube transcript moment, connects it to their later search on decoherence, and suggests a short audio recap for their train commute.

### Presenter note

The key closed loop is user control: users can reopen, dismiss, correct, pause, or delete. Corvus is not a hidden surveillance process.

---

## Slide 7 — Wireframes / Mock Diagrams

### Recommended three-panel layout

1. **Home / Context**
   - Current mode: Study or Commute
   - Continue learning card
   - “Why this?” explanation

2. **Ask Corvus**
   - Question input
   - Concise grounded response
   - Source cards with timestamp and excerpt

3. **Memory**
   - Cross-app timeline
   - Observed vs inferred labels
   - Delete and pause controls

### Caption

> One coherent memory experience layered over recreated Google content journeys.

Replace wireframes with real deployed screenshots once Phase VII is complete.

---

## Slide 8 — Architecture Diagram

### Recommended diagram

```text
Responsive Web App on Cloud Run
├─ Recreated YouTube, Search, Web, Maps, and Music experiences
├─ Ask Corvus and source cards
├─ Memory timeline and privacy controls
└─ Firebase Authentication
                    │
                    ▼
Server routes on Cloud Run
├─ Event ingestion and validation
├─ Memory normalization
├─ Semantic + lexical retrieval
├─ Recommendation ranking
├─ Citation validation
└─ Deterministic fallback
           │                         │
           ▼                         ▼
Cloud Firestore                 Vertex AI
├─ activity events              ├─ Gemini response synthesis
├─ memory records               └─ semantic embeddings
├─ content catalog
├─ user context
└─ vector indexes
```

### Architecture principles

- One deployable service for hackathon reliability.
- Every data access is user-scoped.
- Gemini receives retrieved evidence, not unrestricted history.
- Simulated and future integrated records use the same event contract.

---

## Slide 9 — Technologies Used

### Required Google technologies

**Firebase**

- Web app configuration and user authentication.
- Provides a familiar, scalable application foundation.

**Cloud Firestore**

- Stores activity, content, memories, context, controls, and recommendations.
- Vector search retrieves memories by meaning, not only keywords.

**Gemini on Vertex AI**

- Synthesizes evidence-grounded answers.
- Produces semantic embeddings and structured output.

**Cloud Run**

- Hosts the complete containerized web application and server APIs.
- Provides a stable HTTPS link for judges.

### Supporting technologies

- Next.js, TypeScript, Tailwind CSS
- Google Gen AI SDK
- Zod validation
- Vitest and Playwright
- GitHub and Cloud Build

### Presenter note

Explain why each Google technology is necessary to the user journey. Avoid presenting a logo wall without architectural purpose.

---

## Slide 10 — Estimated Implementation Cost (Optional)

### Recommended on-slide approach

Do not publish invented cost numbers. Populate this slide after deployment using measured traffic and the Google Cloud pricing calculator.

| Cost driver | Hackathon usage assumption | Estimated cost |
|---|---:|---:|
| Cloud Run | [TBD requests, CPU, memory, active time] | [TBD] |
| Firestore | [TBD reads/writes/storage/vector queries] | [TBD] |
| Gemini generation | [TBD input/output tokens] | [TBD] |
| Embeddings | [TBD texts/tokens] | [TBD] |
| Artifact storage/build | [TBD build minutes and image size] | [TBD] |
| **Total prototype period** | [TBD dates] | **[TBD]** |

### Recommended takeaway

> Serverless, usage-based architecture keeps a low-traffic prototype inexpensive and allows each component to scale independently.

If the team cannot validate the estimate before submission, omit this optional slide content instead of guessing.

---

## Slide 11 — Prototype Snapshots

### Capture these final screens from the deployed build

1. **Cross-app Home**  
   Context mode, recent Memory Thread, and explainable recommendations.

2. **Grounded Recall**  
   “Where did I hear the choir analogy?” with YouTube timestamp and related web source.

3. **Memory and Controls**  
   Timeline, provenance labels, per-source controls, and delete action.

### Screenshot requirements

- Use the deployed Cloud Run build.
- Use consistent seeded data and browser dimensions.
- Crop browser chrome unless the deployment URL is intentionally shown.
- Do not show local URLs, credentials, console errors, or personal accounts.
- Add one-sentence captions; do not fill the slide with UI text.

---

## Slide 12 — Prototype Performance / Benchmarking

### On-slide scorecard

Replace targets with measured values from the final deployed revision.

| Measure | Target | Final result |
|---|---:|---:|
| Correct source in top 3 for 10 prepared recall questions | ≥ 90% | [TBD] |
| Rendered citations that match retrieved evidence | 100% | [TBD] |
| Deleted memories absent from repeated recall | 100% | [TBD] |
| Top-5 recommendations changed between Study and Commute | ≥ 3 | [TBD] |
| Recall latency on deployed build | Report p50/p95 | [TBD] |
| Fallback hero-flow completion during model outage | 100% | [TBD] |

### Test note

> Tested on `[date]` against Cloud Run revision `[revision]` in `[region]`, using `[sample size]` requests. Report warm/cold-start conditions.

### Presenter note

The most important quality metric is citation integrity. A fluent answer without a valid personal source is a failure for Corvus.

---

## Slide 13 — Additional Details / Future Development

### On-slide copy

**From simulation to authorized integration**

- User-imported Google Takeout archives for supported historical data.
- Authorized YouTube, Search/browser, Maps, Drive, Calendar, and other connectors where APIs and permissions allow.
- Connector-specific consent, retention, and deletion controls.

**Deeper intelligence**

- Memory Threads that evolve over time.
- Learning Gap Detector for education.
- Contradiction Lens for media literacy.
- Create From Memory for study guides, trip plans, and creator boards.

**Responsible scaling**

- More inference review and correction tools.
- On-device or privacy-preserving processing where practical.
- Enterprise/school governance and retention policies.

### Presenter note

Be explicit that these are future directions, not current integrations.

---

## Slide 14 — Submission Links

### On-slide copy

**GitHub repository**  
`[TBD — accessible repository URL]`

**Demo video — 3 minutes**  
`[TBD — stable video URL]`

**Deployed Corvus prototype**  
`[TBD — Cloud Run URL]`

### Link verification

- [ ] GitHub opens for the intended judge audience.
- [ ] Video plays without requesting edit access.
- [ ] Prototype opens from incognito and a second network.
- [ ] QR codes, if used, resolve to the same final URLs.
- [ ] URLs are selectable/clickable in the exported PDF.

---

## Slide 15 — Responsible AI & Trust

The supplied page is blank. If the template permits content here, use it for trust because personal activity is sensitive.

### On-slide copy

**Your memory. Your evidence. Your control.**

- Explicit consent and per-source capture controls.
- Clear observed, extracted, and inferred labels.
- Source citations for every recall answer.
- Pause, correct, delete, and reset at any time.
- No real account history required for the prototype.
- No sensitive-trait inference or engagement-at-all-costs ranking.

### Visual recommendation

A simple trust loop:

```text
Consent → Observe → Explain → Let the user act → Correct/Delete
```

If organizers require this slide to remain blank, move the trust bullets to Slides 5 and 13.

---

## Slide 16 — Thank You

### On-slide copy

**Corvus**

> **Remember the idea. Recover the source. Continue with purpose.**

`[QR code to deployed prototype]`

Corvus is a hackathon concept and is not a Google product.

### Closing line

“Corvus turns scattered consumption into a source-grounded memory—so our digital experiences do not disappear the moment we close the tab.”

---

## 4. Three-minute demo video script

Target duration: **2:45–2:55**. The official brief says 3 minutes. The script below is from v1 and must be rewritten to the v2 hero demo (spec §10).

| Time | Visual/action | Narration |
|---:|---|---|
| 0:00–0:20 | Brand screen, then fragmented source cards | “We consume useful ideas across YouTube, Search, websites, Maps, and audio. Later, we remember the idea—but not where it came from.” |
| 0:20–0:38 | Corvus Home | “Corvus is a private, source-grounded memory for activity across the Google ecosystem. This prototype uses recreated apps and fictional data; it does not access a real Google account.” |
| 0:38–1:05 | YouTube Demo: play the choir-analogy segment | “As Raven watches, Corvus captures the source, exact transcript moment, topic, time, and current Study context.” |
| 1:05–1:28 | Search Demo, then Web Demo article | “Raven later searches why qubits lose information and reads an article about decoherence. The activity comes from another source, but enters the same personal memory layer.” |
| 1:28–2:05 | Ask Corvus: choir analogy query | “Days later, Raven remembers the analogy but not the video. Corvus retrieves their own history, answers only from matching evidence, and links to the exact original moment.” |
| 2:05–2:30 | Open source at timestamp; show related web source | “The answer is inspectable. They can reopen the video and see how it connects to their later search and reading.” |
| 2:30–2:55 | Change Study to Commute; recommendations update | “Now Raven switches to Commute. Instead of a long lecture, Corvus recommends a seven-minute audio recap and explains the reason.” |
| 2:55–3:15 | Memory and Controls; delete one event | “Every memory remains under their control. They can inspect what was observed or inferred, pause a source, or delete an item.” |
| 3:15–3:35 | Architecture/technology overlay and closing screen | “Firebase handles the app and identity, Firestore stores and retrieves memories, Gemini grounds recall and understanding, and Cloud Run hosts the working prototype. Corvus helps you remember and use what you already experienced.” |

### Recording rules

- Record the deployed Cloud Run build.
- Use a prepared seeded user and stable network.
- Hide browser bookmarks, notifications, and personal accounts.
- Capture at 1080p if possible.
- Keep cursor motion deliberate.
- Add captions and readable zoom for source cards.
- Do not accelerate the video until UI text becomes unreadable.
- Export once, then time the final encoded file.

---

## 5. Submission brief description

### Recommended version

> **Corvus is a private, source-grounded AI memory for a user’s media activity across the Google ecosystem.** It helps people recall where they encountered an idea, reopen the exact source, connect related knowledge across apps, and receive transparent recommendations based on their current goal and context. Because live product integrations are outside the prototype scope, our working demo recreates YouTube, Google Search, web, Google Maps, and listening experiences using fictional data while preserving the event contract future authorized connectors would use. Firebase supports the web application and authentication; Cloud Firestore stores activity, memory, context, and vector-search data; Gemini on Vertex AI generates embeddings and synthesizes evidence-grounded responses; and Cloud Run hosts the deployed full-stack prototype. Corvus is named after the Corvus constellation and the crow—symbols of intelligence, observation, memory, adaptability, and complex social behavior.

### Short version

> Corvus turns consented media activity into a private, source-grounded memory. Ask where you encountered an idea, reopen the exact source, connect it across apps, and receive transparent suggestions shaped by your current context. The prototype recreates Google media experiences with fictional data and uses Firebase, Firestore, Gemini on Vertex AI, and Cloud Run.

---

## 6. Presenter Q&A preparation

### “Why not use ordinary browser or YouTube history?”

History lists events by time. Corvus retrieves by meaning, connects related activity across sources, and returns the original evidence with context.

### “How are you integrating with Google apps?”

The hackathon prototype does not claim live integrations. It uses functional recreations that emit a normalized event contract. Future integrations would require supported APIs or user-authorized imports, separate consent, and connector-specific review.

### “How do you prevent hallucinated memories?”

Corvus retrieves user-scoped memory records first, asks Gemini to answer only from that evidence, requires structured citations, and rejects citation IDs that were not retrieved. Low-confidence searches return closest sources instead of an invented answer.

### “How is this different from a normal recommendation algorithm?”

Corvus uses the user’s visible goal and context across media formats, ranks for usefulness rather than only engagement, and explains the signals behind each recommendation.

### “Isn’t this a privacy risk?”

That risk shapes the product. Capture is opt-in and source-specific; inferred information is labeled; users can pause, inspect, correct, delete, or reset; and the prototype uses fictional data rather than real history.

### “Why these Google Cloud services?”

Firebase provides the app and identity layer, Firestore stores structured and vector-search data, Gemini provides semantic understanding and grounded synthesis, and Cloud Run provides a scalable, accessible deployment target.

### “What would make this production-ready?”

Authorized connectors, deeper privacy and threat modeling, retention controls, large-scale retrieval evaluation, cost/latency optimization, content-rights review, and long-running user research.

---

## 7. Final presentation checklist

- [ ] Team names and problem statement are final.
- [ ] All `[TBD]` placeholders are resolved or intentionally removed.
- [ ] Optional feature claims match the deployed prototype.
- [ ] Simulated integrations are clearly disclosed.
- [ ] Architecture reflects the actual implementation.
- [ ] Cost slide uses measured assumptions or is omitted.
- [ ] Screenshots come from the final deployed revision.
- [ ] Benchmark numbers are measured and reproducible.
- [ ] GitHub, video, and product links work for judges.
- [ ] Deck follows the prescribed template.
- [ ] Exported PDF has selectable links and no clipped content.
- [ ] Product name is consistently **Corvus**.
- [ ] Hackathon-concept disclosure appears at least once.

---

## 8. Source requirements captured from the supplied materials

The submission materials require:

- a pitch deck using the prescribed template;
- a working-solution video demonstration lasting 3 minutes;
- a valid, accessible deployed prototype link that remains functional during evaluation;
- an accessible GitHub repository containing relevant source and supporting material;
- a brief product description that explains the use of Firebase, Firestore, Cloud Run, and Gemini.

Template pages request team details, the idea, opportunities and USP, features, flow/use-case diagram, optional wireframes, architecture, technologies, optional cost, prototype snapshots, performance/benchmarking, future development, submission links, and a closing page.

