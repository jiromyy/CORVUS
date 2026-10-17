# Google Corvus — Your Personal Media Memory

> Working product brief, prototype specification, demo plan, and AI build prompt  
> Status: Draft for team review  
> Hackathon theme: **Media, Content & Digital Experiences**

---

## 0. How to use this document

This file is the source of truth for designing and building the Corvus hackathon prototype. Give the entire file to an AI coding agent and ask it to implement the phases in order. The agent must:

1. Treat **Core MVP** requirements as mandatory.
2. Treat items marked **Proposed — approval required** as backlog items until the team approves them.
3. Keep the prototype honest: simulated Google-like apps must be labeled as demo sources and must not claim unavailable integrations.
4. Favor a polished, reliable end-to-end story over a broad but fragile feature set.
5. Update this file when a product decision changes.

---

## 1. One-line pitch

**Corvus is a private, source-grounded memory layer for a person’s Google ecosystem activity—helping them recall, connect, and act on what they watched on YouTube, searched on Google, read on the web, listened to, and explored in Google Maps.**

---

## 2. The problem

People consume useful information across YouTube, Google Search, web pages, Google Maps, YouTube Music, and other Google experiences, but their memory is fragmented by app and format.

Existing history pages answer questions such as “what did I open?” A person’s actual need is usually closer to:

- “Where did I encounter this idea?”
- “What was the video that explained this concept last week?”
- “What sources shaped my current understanding?”
- “How is this article related to the lecture I watched?”
- “What would help me right now, given my goal and context?”

Conventional recommendation systems mostly optimize within one platform and often infer what will retain attention. They do not give the user a unified, inspectable memory of their own media life, nor do they reliably explain why an item is relevant to the user’s present intent.

### Core insight

Consumption history should not remain a passive log. With explicit user control, it can become an active personal knowledge system:

```text
Media activity → structured memories → semantic retrieval → grounded recall
              ↘ context + goals → transparent recommendations
```

---

## 3. Product vision

Corvus is an **assistant for memory, meaning, and momentum** across a person’s digital media activity.

It does three jobs:

1. **Remember:** Convert consented activity into searchable episodic memories.
2. **Understand:** Connect related ideas across media types, sessions, topics, places, and goals.
3. **Assist:** Retrieve original sources and recommend the most useful next content for the current context.

Corvus is not meant to be another infinite feed. It is a user-controlled intelligence layer that optimizes for relevance, recall, learning, and intentional use.

### Intended information sources

The full product vision is specifically a memory layer over activity from Google applications and Google-connected content, including:

- YouTube watch history, searches, watched segments, and transcripts;
- Google Search queries and opened results;
- websites and articles reached through Search or a browser;
- Google Maps place searches, saved places, routes, and user-authorized travel context;
- YouTube Music or other authorized listening activity;
- later, explicitly selected content from products such as Google Drive, Docs, News, Books, Calendar, or Photos where appropriate APIs and permissions exist.

These are the intended sources of truth for a future integrated version. The hackathon prototype does **not** connect to or read data from these live products. It recreates representative app experiences and sample histories so the team can demonstrate the complete Corvus workflow today.

---

## 4. Why this fits the hackathon theme

Corvus directly transforms:

- **Content discovery:** Recommendations can cross app and media boundaries.
- **Content understanding:** AI extracts topics, entities, claims, and relationships.
- **Content personalization:** Suggestions respond to current goals, routines, and context rather than only aggregate engagement.
- **Content experience:** Users can ask natural-language questions about their personal media history.
- **Education:** Learning material becomes a connected, revisitable knowledge trail.
- **Communication and publishing:** Every recalled answer links back to its source instead of presenting unsupported AI memory.

### Differentiator

The strongest positioning is not “one more AI assistant.” It is:

> **A source-grounded personal memory graph for your media life.**

Unlike ordinary history, Corvus understands meaning. Unlike ordinary recommendations, it sees cross-media context. Unlike a generic chatbot, it answers from the user’s own activity and shows its evidence.

---

## 5. Target users and first persona

### Primary hackathon persona: the commuting student

**Name:** Maya  
**Situation:** University student who watches lessons, searches unfamiliar terms, reads explainers, listens to music while commuting, and reviews material in the evening.  
**Pain:** Maya remembers an explanation but not where she found it. Her apps know her behavior separately, but none understands that she is currently studying a particular unit.  
**Desired outcome:** Recall the exact source, reconnect related learning, and receive appropriate suggestions for commute, study, and rest.

### Future personas

- Researcher tracing ideas and supporting evidence across papers, talks, and searches.
- Knowledge worker recovering decisions and references from browsing sessions.
- Traveler recalling places, videos, and articles used to plan a trip.
- Creator rediscovering inspiration with attribution.
- Lifelong learner reviewing topics over months or years.

The prototype should optimize for the student persona. Do not attempt to serve all personas in the first build.

---

## 6. Product principles

1. **Evidence before eloquence.** Recall answers must cite the memories and original sources used.
2. **User control before invisible inference.** Users choose sources, pause capture, inspect inferred context, and delete memories.
3. **Helpful, not addictive.** Optimize for the user’s stated intent rather than maximum session length.
4. **Cross-media by design.** A video, article, search, place, and audio item share one memory model.
5. **Inference is not fact.** The UI must label inferred goals and allow correction.
6. **Graceful uncertainty.** If evidence is weak, say so and show the closest matches.
7. **Prototype honestly.** Recreated Google app experiences demonstrate the intended ecosystem, but are always labeled as simulations and are never presented as live integrations.

---

## 7. Scope and product decisions

### Core MVP — mandatory

- A polished responsive web app deployed to Google Cloud.
- A unified demo shell containing recreated versions of the primary Google information sources:
  - **YouTube Demo:** video cards, search, transcripts, and watch progress.
  - **Google Search Demo:** search queries, result pages, and result clicks.
  - **Web Demo:** websites/articles opened from search, with reading progress and highlights.
  - **Google Maps Demo:** place searches, saved places, routes, and simulated commute context.
- A lightweight **YouTube Music Demo** signal may appear as a compact player rather than a full application.
- Every meaningful interaction creates an activity event.
- An ingestion pipeline turns events into normalized memories.
- Semantic recall from natural-language questions.
- Source cards with app, title, timestamp, relevant excerpt, and deep link into the simulated source.
- Context-aware recommendations with an explicit “Why this?” explanation.
- A timeline or memory library where users can inspect and delete captured memories.
- A privacy/control screen with capture pause, per-source toggles, and “clear demo data.”
- Seeded demo data and deterministic demo scenarios.
- Real Gemini/Vertex AI usage for at least answer synthesis; embeddings should also use Vertex AI when credentials are available.
- A local deterministic fallback so judges can still complete the demo if an external model call fails.

### Explicit non-goals for the hackathon

- Live ingestion from every Google product.
- Background surveillance of browsing activity.
- Perfect recommendation ranking at production scale.
- Training a custom foundation model.
- Claiming that the prototype has live access to a Google account or its history.
- Copying Google product interfaces pixel-for-pixel instead of creating recognizable but original demo recreations.
- Medical, legal, financial, or other high-stakes advice.
- Inferring sensitive traits or using sensitive data for recommendations.

---

## 8. Core user stories

### A. Source-grounded recall

> As Maya, I ask, “Where did I see that analogy comparing error correction to a choir?” Corvus returns the relevant video moment and related article passage, including when and where I encountered each.

Acceptance criteria:

- The answer is based only on retrieved memory records.
- Each factual claim has one or more visible source references.
- Each result includes source type, title, time consumed, and matching excerpt.
- Video sources can include a transcript timestamp.
- The assistant admits when no strong source is found.

### B. Cross-media connection

> As Maya, I see that a search about “qubits losing state” is related to a later article and a lecture segment about decoherence.

Acceptance criteria:

- Related memories can come from different simulated apps.
- The UI explains the relationship in one sentence.
- Users can open the original source or dismiss an incorrect connection.

### C. Context-aware suggestion

> As Maya, during a train commute Corvus suggests a short audio recap. During an evening study session it suggests the unfinished lesson and a targeted explainer.

Acceptance criteria:

- The active context is visible and editable.
- Recommendations combine current context, recent topics, stated goal, and consumption state.
- Each item shows “Why this?” with the signals used.
- Users can choose “less like this,” “not now,” or “wrong context.”

### D. User-controlled memory

> As Maya, I can see what Corvus stored, pause capture, remove one item, or reset the demo.

Acceptance criteria:

- A newly created activity appears in the memory library.
- Deletion removes it from future retrieval.
- Paused sources do not generate new events.
- Inferred fields are visually distinct from observed fields.

---

## 9. Demo ecosystem strategy

The intended information sources are Google applications. Because live integrations are not available for the prototype, build **original, clearly labeled recreations** inside one web application. Each recreation should contain enough familiar structure to communicate the intended source, but it must use fictional content, a Corvus visual wrapper, and a persistent **Demo simulation — no live Google data** label. Do not imply that the signed-in Google account or real history has been accessed.

The recreated apps are not disposable mockups. They act as working event producers: when a judge watches a video, performs a search, reads a page, opens a place, or plays audio, that interaction must emit the same normalized event shape that a future authorized connector would emit.

### Simulated surfaces

| Recreated source | User actions captured | Memory content produced |
|---|---|---|
| YouTube Demo | search, open, play, seek, pause, finish | title, description, transcript segments, watched range |
| Google Search Demo | submit query, open result | query text, clicked result, dwell time |
| Web Demo | open, scroll, highlight, finish | URL, title, article chunks, selected text, reading progress |
| Google Maps Demo | search place, open place, save route | place, category, route, simulated travel mode |
| YouTube Music Demo | play, skip, finish | title, format, topic or mood metadata |

### Shared demo shell

- Left navigation: Home, YouTube Demo, Search Demo, Web Demo, Maps Demo, Memory, Ask Corvus, Controls.
- Persistent compact Corvus button opens the assistant drawer.
- A demo context selector allows **Commute**, **Study**, and **Rest**.
- A small event indicator confirms when an interaction is remembered.
- Deep links use internal routes, for example `/youtube/video-1?t=142`. They visually represent a return to the source while remaining inside the prototype.

### Honesty label

Display this message in the onboarding flow and demo settings:

> “This prototype recreates YouTube, Google Search, web, Google Maps, and listening activity using fictional sample data. It does not connect to your Google account or access live Google history. These simulations demonstrate how Corvus could work with future user-authorized integrations.”

---

## 10. The hero demonstration

The entire judged demo should take about three minutes.

### Before the demo

- Seed Maya’s account with two weeks of varied activity.
- Ensure the “quantum error correction” learning thread has high-quality records across YouTube Demo, Google Search Demo, and Web Demo.
- Seed both commute and study recommendation candidates.
- Warm the backend and verify the fallback mode.

### Live sequence

1. **Create a memory:** Open YouTube Demo and play a short lecture segment containing the “choir” analogy.
2. **Show passive understanding:** Open Google Search Demo and query “why qubits lose information,” then open the result in Web Demo and read its explanation of decoherence.
3. **Recall:** Ask Corvus, “Where did I hear the choir analogy about correcting errors?”
4. **Prove grounding:** Open the returned source at the matching transcript timestamp and show the related article.
5. **Prove cross-media intelligence:** Ask, “How is that related to what I searched about decoherence?”
6. **Prove context:** Switch the demo context to Commute. Show a short audio recap recommendation and its “Why this?” explanation.
7. **Prove agency:** Open Memory, delete the new search event, repeat a relevant query, and show that the deleted item is no longer used.

### Expected wow moment

The strongest moment is not the chat response itself. It is opening the exact original moment, then showing that Corvus connects it to activity in another media format and can explain why it recommends the next item.

---

## 11. Proposed feature opportunities — approval required

These ideas fit the theme but are **not approved for implementation yet**. Select at most two as stretch features.

### P1. Memory Threads — recommended

Automatically group related activity into evolving topic threads such as “Quantum Computing Unit 3” or “Japan Trip Planning.” Each thread has a summary, source trail, open questions, and recent changes.

Why it matters: makes cross-media understanding visible and gives the product a distinctive visual object beyond chat.

Complexity: medium.

### P2. Intent Modes — recommended

Let the user select or schedule Study, Commute, Create, or Rest. The system may suggest a mode, but the user can always override it.

Why it matters: makes contextual personalization understandable and controllable.

Complexity: low.

### P3. Learning Gap Detector

Compare the user’s current topic thread with its own source material, identify concepts repeatedly searched or replayed, and suggest a short explanation or prerequisite.

Why it matters: strong education story and more meaningful than generic content recommendation.

Complexity: medium.

### P4. Contradiction Lens

Surface when consumed sources make conflicting claims and show both sources side by side without deciding unsupported “truth.”

Why it matters: supports media literacy, publishing, and responsible understanding.

Complexity: medium to high.

### P5. Create From Memory

Turn selected memories into a study guide, annotated reading list, trip plan, or creator inspiration board, with source links preserved.

Why it matters: converts consumption into creation and broadens alignment with the theme.

Complexity: medium.

### P6. Weekly Memory Digest

Generate a private recap of themes, rediscovered items, unfinished content, and suggested next steps.

Why it matters: supports reflection and re-engagement without an infinite feed.

Complexity: low.

### P7. Shared Thread

Allow a user to share a deliberately selected topic thread with a classmate while keeping the rest of their history private.

Why it matters: adds a communication and collaborative-learning angle.

Complexity: high; avoid for MVP unless collaboration is central to judging.

### Recommended decision

For the hackathon, approve **P1 Memory Threads** and **P2 Intent Modes**. If time remains, add **P5 Create From Memory** as a single “Generate study guide” action. Defer the rest.

---

## 12. Responsible AI and privacy model

Personal media history can be extremely sensitive. Privacy is a product feature, not a footer.

### Required safeguards

- Explicit onboarding consent before activity capture.
- Per-source capture toggles.
- A global pause/incognito control.
- Clear distinction between:
  - **Observed:** an event the system received.
  - **Extracted:** content derived directly from a source, such as transcript text.
  - **Inferred:** a model guess, such as “likely studying quantum computing.”
- Inspect, correct, and delete controls for memories and inferred goals.
- No inference of sensitive traits.
- No use of private memory to train shared models.
- User-scoped database queries and access rules.
- Short excerpts rather than unnecessary full content copies.
- Source citations in generated answers.
- An “I’m not sure” path when retrieval confidence is low.
- A reset mechanism that deletes all prototype data for the current demo user.

### Recommendation objective

Rank candidates for **user value**, not predicted watch time. A simple prototype score can be:

```text
score =
  0.35 × topic_relevance
+ 0.25 × current_goal_fit
+ 0.15 × context_fit
+ 0.15 × continuity_or_completion
+ 0.10 × freshness
- repetition_penalty
- dismissed_topic_penalty
```

Every recommendation must expose the top two or three contributing reasons in plain language.

### Data retention defaults for the demo

- Demo events: retained until reset.
- Raw model prompts/responses: do not persist unless debug mode is explicitly enabled.
- Debug logs: redact source content and user queries where practical.
- Secrets: server-side environment variables or Secret Manager only; never ship credentials to the browser.

---

## 13. Technical architecture

### Recommended hackathon architecture

```text
Browser / Responsive Web App
  ├─ Recreated Google app surfaces
  ├─ Ask Corvus interface
  ├─ Memory timeline and controls
  └─ Context simulator
             │ HTTPS / JSON
             ▼
Cloud Run: full-stack web service
  ├─ UI server and API routes
  ├─ event ingestion
  ├─ retrieval and ranking
  ├─ recommendation service
  ├─ Gemini answer synthesis
  └─ deterministic fallback
             │
       ┌─────┴─────────────┐
       ▼                   ▼
Cloud Firestore       Vertex AI
  ├─ users              ├─ Gemini generation
  ├─ activities         └─ text embeddings
  ├─ memories
  ├─ content
  └─ recommendations
```

### Why this architecture

- One Cloud Run service reduces deployment risk and keeps the prototype easy to operate.
- Firestore stores structured records and supports nearest-neighbor vector queries.
- Vertex AI supplies Google-native generative AI and embeddings.
- The recreated Google app surfaces use the same event contract future authorized connectors would use.
- The adapter boundary allows future authorized imports without rebuilding the memory layer.

### Important implementation constraint

Firestore vector indexes support a maximum of 2,048 dimensions. If using `gemini-embedding-001`, request an output dimensionality of **768 or 1,024** instead of storing its default 3,072-dimensional output.

### Suggested stack

- Language: TypeScript.
- Web framework: Next.js with App Router, or another TypeScript framework the team already knows.
- Styling: Tailwind CSS or plain CSS modules with accessible components.
- Runtime: Node.js current LTS supported by the chosen framework.
- Database: Cloud Firestore.
- AI SDK: Google Gen AI SDK configured for Vertex AI.
- Deployment: Docker container on Cloud Run.
- Authentication: one seeded demo user for the first milestone; Google sign-in through Firebase Authentication only after the core demo works.

Do not split into microservices for the hackathon.

---

## 14. Canonical data model

All records must include `userId`. Never retrieve across users.

### `ActivityEvent`

```ts
type ActivityEvent = {
  id: string;
  userId: string;
  source:
    | "youtube"
    | "google_search"
    | "web"
    | "google_maps"
    | "youtube_music";
  sourceMode: "prototype_simulation" | "authorized_integration" | "user_import";
  action:
    | "opened"
    | "searched"
    | "played"
    | "paused"
    | "seeked"
    | "highlighted"
    | "saved"
    | "completed"
    | "dismissed";
  contentId?: string;
  occurredAt: string; // ISO 8601
  sessionId: string;
  context: {
    mode?: "commute" | "study" | "rest" | "create";
    travelMode?: "train" | "walking" | "stationary";
    localTimeBucket?: "morning" | "afternoon" | "evening" | "night";
  };
  payload: Record<string, unknown>;
};
```

### `ContentItem`

```ts
type ContentItem = {
  id: string;
  source: ActivityEvent["source"];
  title: string;
  creator?: string;
  canonicalUrl: string; // internal demo URL for MVP
  thumbnailUrl?: string;
  description?: string;
  durationSeconds?: number;
  publishedAt?: string;
  topics: string[];
  transcriptSegments?: Array<{
    startSeconds: number;
    endSeconds: number;
    text: string;
  }>;
  bodyChunks?: Array<{
    chunkId: string;
    heading?: string;
    text: string;
  }>;
};
```

### `MemoryRecord`

```ts
type MemoryRecord = {
  id: string;
  userId: string;
  sourceEventIds: string[];
  contentId?: string;
  memoryType: "episode" | "passage" | "query" | "place" | "preference";
  title: string;
  text: string;
  excerpt: string;
  source: ActivityEvent["source"];
  sourceMode: ActivityEvent["sourceMode"];
  sourceUrl: string;
  sourceOffsetSeconds?: number;
  occurredAt: string;
  observedFields: string[];
  inferredFields: string[];
  topics: string[];
  entities: string[];
  embedding?: number[];
  embeddingModel?: string;
  confidence: number;
  deletedAt?: string;
};
```

### `UserContext`

```ts
type UserContext = {
  userId: string;
  activeMode: "commute" | "study" | "rest" | "create";
  activeGoal?: string;
  recentTopics: Array<{ topic: string; weight: number }>;
  observedAt: string;
  provenance: {
    activeMode: "user_selected" | "simulated" | "inferred";
    activeGoal?: "user_selected" | "inferred";
  };
};
```

### `Recommendation`

```ts
type Recommendation = {
  id: string;
  userId: string;
  contentId: string;
  score: number;
  reasonCodes: Array<
    | "recent_topic"
    | "active_goal"
    | "context_fit"
    | "continue_unfinished"
    | "related_memory"
  >;
  reasonText: string;
  generatedAt: string;
};
```

### Suggested Firestore collections

```text
users/{userId}
users/{userId}/activities/{activityId}
users/{userId}/memories/{memoryId}
users/{userId}/contexts/current
users/{userId}/recommendations/{recommendationId}
content/{contentId}
threads/{threadId}                 # only if P1 is approved
```

For fastest implementation, use 768-dimensional embeddings and create a Firestore vector index on `users/{userId}/memories.embedding`. If collection-group limitations complicate user filtering, use a top-level `memories` collection with mandatory `userId` filtering and strict security rules.

---

## 15. Event-to-memory pipeline

### Pipeline steps

1. Receive and schema-validate an event.
2. Reject the event if capture is paused for its source.
3. Store the raw event.
4. Load the referenced content and relevant passage or transcript window.
5. Normalize it into memory text that includes source, title, action, passage, and timestamp.
6. Extract topics and entities using deterministic seed metadata first; optionally enrich with Gemini.
7. Generate an embedding with Vertex AI.
8. Store the `MemoryRecord` with provenance fields.
9. Update recent-topic weights and invalidate recommendation cache.

### Idempotency

Use `event.id` as the idempotency key. Replaying a demo action must not create duplicate memories unless the action occurred at a meaningfully different time or source offset.

### Local fallback

When cloud credentials are absent:

- Use seeded topic tags and keyword extraction.
- Use a small deterministic local similarity function based on token overlap and topic matches.
- Use answer templates that cite retrieved results.
- Display a subtle “Demo fallback mode” badge.

The app must still be functional, but the normal deployed path should use Vertex AI.

---

## 16. Retrieval and grounded answering

### Query pipeline

1. Parse optional filters: source, time range, topic, or active thread.
2. Create a query embedding.
3. Retrieve semantic candidates from the current user’s non-deleted memories.
4. Retrieve lexical candidates for exact names and phrases.
5. Apply time/source filters.
6. Re-rank using semantic similarity, phrase match, recency, and source-offset specificity.
7. If evidence is below threshold, return closest matches without inventing an answer.
8. Send only the top evidence records to Gemini for synthesis.
9. Require structured JSON output.
10. Validate cited memory IDs against the retrieved set before returning the answer.

### Suggested re-ranking score

```text
recall_score =
  0.55 × semantic_similarity
+ 0.20 × lexical_match
+ 0.10 × recency_fit
+ 0.10 × source_specificity
+ 0.05 × interaction_strength
```

### Structured model output

```ts
type RecallAnswer = {
  answer: string;
  confidence: "high" | "medium" | "low";
  citations: Array<{
    memoryId: string;
    supportingClaim: string;
  }>;
  suggestedFollowUps: string[];
};
```

### Model system instruction

```text
You are Corvus, a personal media-memory assistant.
Answer only from the evidence records supplied to you.
Every factual statement about what the user consumed must cite one or more supplied memory IDs.
Never invent a title, URL, timestamp, quote, event, preference, or relationship.
Distinguish observed data from inferred data.
If the evidence is insufficient, say so briefly and offer the closest matching sources.
Keep answers concise and make it easy to return to the original source.
Return JSON that matches the provided schema.
```

### Citation rendering

The API should return stable source objects. Render citations as interactive cards, not raw IDs. A card must show:

- source icon/type;
- title;
- “seen on” timestamp;
- matched excerpt;
- relevance or confidence label;
- `Open source` action;
- transcript offset where applicable.

---

## 17. Recommendation engine

The prototype does not need collaborative filtering. A transparent content-based ranker is more aligned with the product story.

### Candidate generation

- unfinished items;
- unseen content sharing recent topics;
- short-form or audio items appropriate to commute;
- deeper explainers appropriate to study;
- deliberately calming or unrelated items appropriate to rest;
- related items from the active Memory Thread if P1 is approved.

### Explanation template

Examples:

- “Because you’re in Study mode and recently explored decoherence.”
- “A 7-minute audio recap for your simulated train commute.”
- “Continue the lesson you left at 12:41.”

Never display opaque claims such as “The AI knows you’ll like this.”

---

## 18. API contract

### Events

```text
POST   /api/events
GET    /api/events?source=&from=&to=
```

`POST /api/events` returns the stored event and created/updated memory IDs.

### Recall

```text
POST   /api/recall
```

Request:

```json
{
  "query": "Where did I hear the choir analogy?",
  "filters": {
    "sources": ["watch", "read"],
    "from": null,
    "to": null
  }
}
```

Response:

```json
{
  "answer": "You encountered it in…",
  "confidence": "high",
  "sources": [],
  "suggestedFollowUps": []
}
```

### Memory controls

```text
GET    /api/memories?query=&source=&topic=
DELETE /api/memories/:id
POST   /api/memories/reset
```

### Context and recommendations

```text
GET    /api/context
PUT    /api/context
GET    /api/recommendations
POST   /api/recommendations/:id/feedback
```

### Demo administration

```text
POST   /api/demo/seed
POST   /api/demo/reset
GET    /api/health
```

All mutation endpoints must validate input. Production mode must derive `userId` from the authenticated session, never from an arbitrary request body.

---

## 19. UX and visual direction

### Brand idea

**Google Corvus** is named after the Corvus constellation, which represents a crow. The name connects the product to intelligence, observation, memory, adaptability, and complex social behavior—the same qualities the assistant brings to a user’s digital knowledge. The product name is Google Corvus; the assistant may be addressed simply as **Corvus** in the interface. The visual identity should feel intelligent and calm, not ominous.

During the hackathon, include a small disclosure where appropriate: **“Google Corvus is a hackathon concept and is not an official Google product.”**

### Design tone

- Warm charcoal, soft cloud white, electric indigo, and one bright memory accent.
- Strong typography and generous spacing.
- Cards should feel like pieces of remembered media.
- Use subtle connecting lines or constellations for related memories.
- Motion should reinforce capture, retrieval, and connection.
- Avoid a generic chatbot-first layout; the memory and source trail are the hero.

### Required screens

1. Onboarding and consent.
2. Home with current context and recommendations.
3. Four simulated media surfaces.
4. Ask Corvus recall workspace.
5. Memory timeline/library.
6. Memory detail with provenance.
7. Controls/privacy.
8. Memory Threads screen only if P1 is approved.

### Accessibility

- Keyboard-accessible navigation and dialogs.
- Visible focus states.
- Semantic headings and form labels.
- Sufficient color contrast.
- Reduced-motion support.
- Never use color alone to communicate observed versus inferred data.

---

## 20. Seed content plan

Create a compact, internally consistent fictional catalog. Do not scrape or reproduce copyrighted content.

### Topic thread: quantum computing

- YouTube Demo: “Quantum Error Correction, Visually Explained”
  - Include an original transcript segment using a choir analogy.
- Google Search Demo query: “why qubits lose information”
- Web Demo: “Decoherence Without the Jargon”
- YouTube Music Demo: “Seven-Minute Qubit Review”
- YouTube Demo: “The No-Cloning Rule in Five Minutes”

### Secondary thread: Japan trip planning

- Google Search Demo: “quiet neighborhoods in Kyoto”
- Web Demo: “A Respectful Guide to Temple Visits”
- Google Maps Demo: saved place and simulated train route.
- YouTube Demo: short cultural explainer.

### Neutral/rest catalog

- instrumental playlist;
- short nature video;
- light design article.

Each item needs enough metadata to demonstrate relevance, continuity, and contextual format selection.

---

## 21. Repository structure

The AI coding agent may adapt this to the chosen framework, but keep domain logic separate from UI components.

```text
/
├─ app/
│  ├─ api/
│  ├─ ask/
│  ├─ controls/
│  ├─ maps/
│  ├─ memory/
│  ├─ web/
│  ├─ search/
│  └─ youtube/
├─ components/
│  ├─ assistant/
│  ├─ memory/
│  ├─ recommendations/
│  └─ shell/
├─ lib/
│  ├─ ai/
│  ├─ db/
│  ├─ demo/
│  ├─ events/
│  ├─ recommendations/
│  ├─ retrieval/
│  └─ validation/
├─ public/
├─ scripts/
│  └─ seed-demo.*
├─ tests/
├─ Dockerfile
├─ README.md
├─ .env.example
└─ CORVUS_PRODUCT_BUILD_SPEC.md
```

---

## 22. Environment variables

```dotenv
GOOGLE_CLOUD_PROJECT=
GOOGLE_CLOUD_LOCATION=global
GOOGLE_GENAI_USE_VERTEXAI=true
GEMINI_MODEL=
EMBEDDING_MODEL=gemini-embedding-001
EMBEDDING_DIMENSION=768
FIRESTORE_DATABASE=(default)
DEMO_USER_ID=maya-demo
DEMO_FALLBACK_MODE=false
```

Select an available Gemini model at implementation time and keep its name configurable. Do not commit secrets or service-account key files.

---

## 23. Implementation plan

### Phase 0 — decisions and scaffolding

- Confirm proposed feature selections.
- Choose framework based on team familiarity.
- Initialize repository, linting, formatting, test runner, and environment validation.
- Add a short architecture decision record.

Exit condition: application boots locally and `/api/health` passes.

### Phase 1 — recreated Google ecosystem

- Build the shared shell and the YouTube, Google Search, Web, and Google Maps demo recreations.
- Add original seed content and context switcher.
- Implement the event contract and local in-memory or Firestore-backed event store.
- Add visible capture feedback.

Exit condition: the demo sequence produces inspectable activity records.

### Phase 2 — memory pipeline

- Normalize events into memory records.
- Add embedding provider interface.
- Implement Vertex AI provider and deterministic fallback provider.
- Store provenance and deletion state.
- Build Memory timeline and detail views.

Exit condition: new interactions become searchable memories and can be deleted.

### Phase 3 — recall

- Implement semantic plus lexical retrieval.
- Add evidence thresholds and ranking.
- Add Gemini grounded synthesis with validated structured output.
- Build source cards and deep links to exact demo content positions.

Exit condition: the choir-analogy question reliably opens the correct source moment.

### Phase 4 — recommendations

- Implement context state and mode switcher.
- Generate candidates and transparent scores.
- Render “Why this?” and feedback actions.
- Ensure different modes visibly change recommendations.

Exit condition: Commute and Study produce meaningfully different, explainable results.

### Phase 5 — approved stretch feature

- Implement P1 and/or P2 only after approval.
- Add P5 only if the core demo is already reliable.

Exit condition: the stretch feature strengthens the core narrative and adds no demo fragility.

### Phase 6 — hardening and deployment

- Add security rules and server-side user scoping.
- Test empty, loading, error, offline/fallback, and low-confidence states.
- Add seed/reset controls.
- Build container and deploy to Cloud Run.
- Run the full demo from the public Cloud Run URL.
- Capture a backup demo video.

Exit condition: a fresh judge can open the URL and complete the hero flow without team assistance.

---

## 24. Testing strategy

### Unit tests

- Event schema validation.
- Idempotency.
- Memory normalization.
- Retrieval scoring.
- Recommendation scoring and reason codes.
- Citation ID validation.
- Capture-pause and deletion enforcement.

### Integration tests

- Event → memory → retrieval.
- Delete memory → absent from recall.
- Context change → recommendation change.
- Vertex failure → deterministic fallback.
- User A cannot retrieve User B records.

### End-to-end tests

- Seed/reset flow.
- Hero demo sequence.
- Exact video deep link and transcript offset.
- Low-confidence query.
- Mobile viewport and keyboard navigation.

### Demo readiness checklist

- [ ] Public Cloud Run URL loads over HTTPS.
- [ ] Seed/reset works without developer tools.
- [ ] All hero queries have stable results.
- [ ] Source links land at the correct content and offset.
- [ ] Gemini failure does not break the flow.
- [ ] No credential appears in browser code or logs.
- [ ] Privacy controls visibly change capture behavior.
- [ ] The simulated nature of source apps is disclosed.
- [ ] Backup video and screenshots are available.

---

## 25. Success metrics for the prototype

### Product metrics

- **Recall success:** top three results include the seeded correct source for at least 9 of 10 prepared questions.
- **Citation integrity:** 100% of rendered citations refer to retrieved records.
- **Context sensitivity:** at least three of five top recommendations change between Commute and Study modes.
- **Control correctness:** deleted memories never appear in subsequent recall.
- **Time to source:** user can go from question to original source in under 20 seconds.

### Demo/judging signals

- Judges can explain the product in one sentence after the demo.
- Cross-media retrieval is visible, not merely described.
- Google Cloud services are essential to the working path.
- The team clearly distinguishes current prototype behavior from future integrations.
- Privacy controls feel integral rather than decorative.

---

## 26. Risks and mitigations

| Risk | Mitigation |
|---|---|
| Scope explodes across too many simulated apps | Keep four shallow surfaces and one strong end-to-end thread |
| AI hallucinates consumption history | Evidence-only prompts, structured output, citation validation, confidence threshold |
| Cloud/model call fails during judging | Deterministic fallback, cached seed embeddings, backup video |
| Demo looks like fake Google integration | Clear simulation label, original UI, adapter architecture explanation |
| Privacy concerns overshadow value | Make consent, provenance, pause, and delete visible during the demo |
| Recommendations seem ordinary | Demonstrate mode change, cross-media context, and plain-language reasons |
| Firestore vector dimension mismatch | Request 768-dimensional embeddings and test index creation early |
| Deep links fail | Use stable internal content IDs and automated end-to-end checks |

---

## 27. Source strategy and future integration path

The MVP uses events generated by recreated Google app experiences. Each record must use `sourceMode: "prototype_simulation"` so simulated history can never be mistaken for live account data. Future connectors should implement the same normalized event contract with `sourceMode: "authorized_integration"` or `sourceMode: "user_import"`.

Potential, subject to product/API availability and user consent:

- User-uploaded Google Takeout archives for historical backfill from supported exports.
- YouTube APIs for permitted account and content data, without assuming access to every watch-history signal.
- Google Search or browser activity only through a permitted, user-initiated mechanism such as an export or deliberately saved page.
- Google Maps places or location context only where supported and with clear, granular permission.
- YouTube Music or listening activity only through supported, authorized access.
- Google Drive documents explicitly selected by the user.
- Google Calendar context deliberately chosen by the user.
- Publisher and education-platform connectors.

Never describe these as already implemented. Each connector requires separate API, privacy, legal, quota, and retention review.

---

## 28. Cloud deployment outline

1. Create or select a Google Cloud project and billing account.
2. Enable Cloud Run, Cloud Build, Artifact Registry, Firestore, and Vertex AI APIs.
3. Create Firestore in an appropriate region.
4. Create required composite/vector indexes.
5. Use Application Default Credentials locally.
6. Create a least-privilege runtime service account.
7. Store secrets in Secret Manager or Cloud Run environment configuration.
8. Deploy from source or a container image.
9. Configure memory, CPU, minimum/maximum instances, and request timeout conservatively.
10. Run seed/reset and hero-flow checks against the deployed URL.

Example deployment shape; finalize flags after the app exists:

```bash
gcloud run deploy corvus \
  --source . \
  --region YOUR_REGION \
  --service-account YOUR_RUNTIME_SERVICE_ACCOUNT \
  --set-env-vars GOOGLE_CLOUD_PROJECT=YOUR_PROJECT,GOOGLE_GENAI_USE_VERTEXAI=true \
  --allow-unauthenticated
```

If public access is inappropriate for the event, require authentication and give judges access in advance.

---

## 29. Instructions for an AI coding agent

Copy the prompt below and attach this entire file.

### Master build prompt

```text
You are the lead product engineer for Corvus. Build the hackathon prototype described in CORVUS_PRODUCT_BUILD_SPEC.md from scratch.

Operating rules:
1. Read the entire specification before changing files.
2. Inspect the repository and preserve existing work.
3. Ask only questions that materially block implementation; otherwise make a documented, reversible assumption.
4. Implement Core MVP features first. Do not implement any “approval required” feature unless it is listed as approved in the Decisions section.
5. Use an original visual design and clearly label simulated media sources.
6. Keep one deployable Cloud Run service and avoid premature microservices.
7. Keep Google model names configurable through environment variables.
8. Provide a deterministic local fallback for AI and embedding failures.
9. Ground every recall response in retrieved memory records and validate all citation IDs server-side.
10. Scope every data access by authenticated user; use the seeded demo user only while authentication is intentionally deferred.
11. Never expose credentials to client code or commit secrets.
12. Add tests alongside each domain feature.
13. At the end of each phase, run relevant tests, summarize changes, and update the implementation checklist.
14. Do not claim live Google app integrations. Use adapters and data emitted by the recreated Google app experiences.

First task:
- Audit the repository.
- Propose the exact framework and package choices, favoring team familiarity and Cloud Run compatibility.
- Create a short implementation plan mapped to Phases 0–6.
- Identify any blocking decision.
- Then implement Phase 0 and verify the app locally.
```

### Follow-on prompt for each phase

```text
Continue Corvus with the next incomplete phase in CORVUS_PRODUCT_BUILD_SPEC.md.
Before editing, state the phase exit condition and inspect the current implementation.
Implement the smallest complete vertical slice that advances that exit condition.
Run relevant tests and a production build.
Report files changed, verification results, known limitations, and the next phase.
```

### Final audit prompt

```text
Audit Corvus against every Core MVP requirement and the Demo Readiness Checklist in CORVUS_PRODUCT_BUILD_SPEC.md.
Do not add new features.
Fix correctness, security, accessibility, responsiveness, grounding, fallback, seed/reset, and deployment issues.
Run unit, integration, end-to-end, and production-build checks.
Return a concise pass/fail table with evidence and exact remaining blockers.
```

---

## 30. Decisions to complete with the team

Update this section after the team responds.

| Decision | Current value |
|---|---|
| Product name | Google Corvus; assistant short name: Corvus |
| Primary persona | Commuting university student |
| Core demo topic | Quantum computing / error correction |
| Deployment | Google Cloud Run |
| Database | Cloud Firestore with vector search |
| Generative AI | Gemini through Vertex AI |
| Approved proposed features | **Pending team confirmation** |
| Authentication for first milestone | Seeded demo user; Firebase Auth later |
| UI framework | Pending team experience |
| Team size and deadline | Pending |
| Available Google Cloud credits/project | Pending |

---

## 31. Follow-up questions

1. What is the submission deadline, team size, and each member’s strongest technical skill?
2. Does the hackathon require or reward specific Google technologies beyond deployment on Google Cloud?
3. Do you approve the recommended stretch features **P1 Memory Threads** and **P2 Intent Modes**? Should **P5 Create From Memory** be the optional third?
4. Should the first persona remain a university student, or does the team want a broader knowledge-worker pitch?
5. Is “Corvus” the intended product name, and do you want an original crow-inspired identity?
6. Does the team already have a Google Cloud project with billing, Vertex AI access, and a preferred region?
7. Which web stack does the team know best: Next.js/TypeScript, React plus Python, or something else?
8. Will judges interact with the prototype directly, or will the team control the demo?

---

## 32. Official references

- [Cloud Run deployment documentation](https://docs.cloud.google.com/run/docs/deploying)
- [Vertex AI text embeddings](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/embeddings/get-text-embeddings)
- [Cloud Firestore vector search](https://firebase.google.com/docs/firestore/vector-search)
- [Vertex AI function calling and structured output](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/multimodal/function-calling)
- [Firebase Authentication for web](https://firebase.google.com/docs/auth/web/start)
- [Google Takeout data export](https://support.google.com/accounts/answer/3024190)

---

## 33. Final pitch draft

> Every day, useful knowledge passes through YouTube, Google Search, websites, Google Maps, and listening experiences. When we need it again, we often remember the idea but forget the source. Corvus turns user-authorized activity across the Google ecosystem into a private, source-grounded memory. Ask where you encountered an idea, reopen the exact moment, connect it to what you discovered in another app, and get a next recommendation shaped by your goal and context—not just an engagement algorithm. Our prototype recreates these Google app experiences with fictional data and working event capture, then uses Gemini on Vertex AI, semantic retrieval, Firestore, and Cloud Run to demonstrate the complete future experience. Corvus does not just recommend what to consume next. It helps you remember and use what you already experienced.
