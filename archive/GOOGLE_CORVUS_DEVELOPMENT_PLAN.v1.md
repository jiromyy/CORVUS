# Google Corvus Development Plan

> Working execution plan, setup guide, phase checklist, decision log, and progress tracker  
> Product: **Google Corvus**  
> Theme: **Media, Content & Digital Experiences**  
> Last updated: 2026-10-16  
> Companion specification: `CORVUS_PRODUCT_BUILD_SPEC.md`

---

## 1. Purpose of this document

This is the working control document for building the Google Corvus prototype. It is designed to be used across multiple AI-assisted development sessions.

When the team says:

> **“Let’s start with Phase I.”**

the coding agent must read this file and `CORVUS_PRODUCT_BUILD_SPEC.md`, execute only the selected phase and its safe prerequisites, verify the exit criteria, and update the progress sections in this file.

This document must remain current. A phase is not complete because code was written; it is complete only when its exit criteria have evidence.

---

## 2. Product and prototype boundary

### Product vision

Google Corvus is a private, source-grounded memory and recommendation layer for activity across the Google ecosystem. It is intended to help a user recall where they encountered information, reopen the exact source, connect ideas across apps, and receive transparent suggestions based on current goals and context.

### Hackathon implementation

The prototype will recreate representative experiences for:

- YouTube;
- Google Search;
- websites opened from search;
- Google Maps;
- optionally, a compact YouTube Music experience.

These recreations use fictional content and sample history. They do not access a real Google account or claim live integration. Every simulated interaction emits the same normalized event contract that a future authorized connector could use.

### Naming

**Google Corvus** is named after the Corvus constellation, which represents a crow. The brand connects intelligence, observation, memory, adaptability, and complex social behavior to the product’s purpose. The assistant can be addressed as **Corvus** in the UI.

Prototype disclosure:

> Google Corvus is a hackathon concept and is not an official Google product.

---

## 3. Hackathon deliverables and release gates

All five deliverables are mandatory release work.

| Deliverable | Requirement | Working artifact | Owner | Status |
|---|---|---|---|---|
| Pitch deck | Use the prescribed presentation template | Final PPTX/PDF populated from `GOOGLE_CORVUS_PRESENTATION_CONTENT.md` | TBD | Not started |
| Demo video | 3–4 minutes and must clearly show working functionality | Script, recording, captions, final link | TBD | Not started |
| Deployed prototype | Publicly accessible and functional during evaluation | Cloud Run URL and health check | TBD | Not started |
| GitHub repository | Accessible throughout evaluation | Public or judge-accessible repository | TBD | Not started |
| Brief description | Explain the product and use of Firebase, Firestore, Cloud Run, and Gemini | Final copy in presentation content file | TBD | Drafted |

### Non-negotiable submission checks

- [ ] The deck follows the supplied template.
- [ ] The video is between 3:00 and 4:00 after final export.
- [ ] The video demonstrates the live working product, not only mockups.
- [ ] The deployed URL works from a private/incognito browser session.
- [ ] The prototype remains functional without a developer machine running.
- [ ] The GitHub link is accessible from a logged-out or judge-authorized account.
- [ ] The brief description explicitly names Firebase, Firestore, Cloud Run, and Gemini.
- [ ] All submitted links use stable final URLs.
- [ ] The team has a backup recording and screenshots.

---

## 4. Recommended technical stack

This stack optimizes for a small team, one deployable service, and visible use of the required Google technologies.

| Layer | Choice | Purpose |
|---|---|---|
| Web application | Next.js with TypeScript | UI and server routes in one Cloud Run service |
| Styling | Tailwind CSS | Rapid responsive design with consistent tokens |
| Validation | Zod | Validate event, API, and model-output schemas |
| Authentication | Firebase Authentication | Google sign-in after the seeded-user milestone |
| Primary database | Cloud Firestore | Users, content, activity, memories, context, recommendations |
| Semantic search | Firestore vector search | Retrieve personally relevant memories |
| Generation and embeddings | Gemini through Vertex AI using `@google/genai` | Grounded answers, metadata enrichment, embeddings |
| Hosting | Cloud Run | Public deployed prototype and server-side AI calls |
| Build | Cloud Build and Artifact Registry | Source-to-container build and image storage |
| Unit/integration tests | Vitest | Domain and API verification |
| Browser tests | Playwright | Hero flow and release checks |
| Source control | Git and GitHub | Mandatory accessible repository |

### Architectural constraint

Use one deployable Cloud Run service for the hackathon. Do not create microservices unless a later measured limitation requires them.

### Embedding constraint

Use a configurable embedding provider. For Firestore vector search, request an embedding dimension supported by the Firestore index, such as 768, instead of assuming the embedding model’s maximum output dimension.

---

## 5. Setup responsibilities

Some setup steps require an account owner, billing authorization, or interactive login. The AI coding agent can prepare commands, configuration, source code, rules, and validation, but the team must complete or explicitly authorize account-bound actions.

### Team-owned actions

- Choose the final Google Cloud project and billing account.
- Confirm the project ID and preferred deployment region.
- Grant required project roles to team members.
- Complete Google Cloud and GitHub interactive sign-in.
- Create or approve the GitHub repository and its visibility.
- Add Firebase to the selected Google Cloud project.
- Approve Firestore location because it cannot be casually changed later.
- Approve public unauthenticated access for the judging URL, if used.
- Own final submission, link sharing, and video upload.

### AI-assisted actions

- Scaffold and implement the application.
- Add safe configuration templates without secrets.
- Prepare Firestore indexes and security rules.
- Prepare seed/reset utilities and fictional demo content.
- Implement and test Gemini and embedding providers.
- Prepare Cloud Run deployment configuration.
- Run local tests and release audits.
- Maintain phase status, decision log, risks, and handoff notes.
- Draft presentation, brief description, and demo script.

---

## 6. Required setup before full development

Phase I will verify these items. Do not paste passwords, API keys, service-account JSON, or billing data into chat or commit them to the repository.

### 6.1 Accounts and access

- [ ] Every developer has a Google account permitted to join the project.
- [ ] A Google Cloud project is created or selected.
- [ ] Billing is enabled or a suitable hackathon credit arrangement is confirmed.
- [ ] Team members have least-privilege IAM roles for their work.
- [ ] A GitHub organization or owner is selected.
- [ ] A repository visibility decision is recorded.

### 6.2 Local tools

Verify rather than assume:

```powershell
git --version
node --version
npm --version
gcloud --version
firebase --version
```

Required:

- Git, or GitHub Desktop with a usable Git installation;
- current supported Node.js LTS and npm;
- Google Cloud CLI;
- Firebase CLI, installed after Node.js if the project uses its emulator/rules workflow;
- a Chromium browser for Playwright tests.

Optional:

- Docker Desktop. Cloud Run source deployment can build remotely, so Docker is not a Phase I blocker.

Current environment note: a previous terminal check did not find `git` on PATH. Phase I must re-check this before repository initialization; GitHub Desktop may provide Git even when the command is not globally available.

### 6.3 Google Cloud project configuration

Use the same underlying project for Firebase and Google Cloud services.

Record the final values:

```text
Project display name: Google Corvus
Project ID: TBD
Project number: TBD
Billing account attached: TBD
Primary Cloud Run region: suggested asia-southeast1, confirm availability
Firestore location: TBD — decide carefully before creation
Gemini/Vertex location: global where supported
```

Enable the required services after project selection:

```powershell
gcloud services enable `
  run.googleapis.com `
  cloudbuild.googleapis.com `
  artifactregistry.googleapis.com `
  aiplatform.googleapis.com `
  firestore.googleapis.com
```

The exact command may be adjusted for the authenticated shell and any additional Firebase services.

### 6.4 Local Google Cloud authentication

Team member performs the interactive login:

```powershell
gcloud init
gcloud config set project YOUR_PROJECT_ID
gcloud auth application-default login
```

Principles:

- Use Application Default Credentials for local development.
- Use a Cloud Run runtime service account after deployment.
- Do not download long-lived service-account keys unless there is no safer supported alternative.
- Do not commit credential or ADC files.

### 6.5 Firebase and Firestore

In the Firebase console:

1. Add Firebase to the existing Google Cloud project.
2. Register a web application named `Google Corvus Web`.
3. Create Cloud Firestore in Native mode.
4. Choose the Firestore location only after confirming regional requirements.
5. Defer production authentication rules until the seeded-user flow works, but never deploy an unrestricted database.

Local package setup will eventually include:

```powershell
npm install firebase firebase-admin @google/genai zod
```

The Firebase web configuration is not a server secret, but all privileged Admin SDK and model calls must remain server-side.

### 6.6 GitHub repository

Recommended repository name:

```text
google-corvus
```

Required repository files by Phase I:

- `README.md`
- `CORVUS_PRODUCT_BUILD_SPEC.md`
- `GOOGLE_CORVUS_DEVELOPMENT_PLAN.md`
- `GOOGLE_CORVUS_PRESENTATION_CONTENT.md`
- `.gitignore`
- `.env.example`
- `LICENSE` or an explicit “all rights reserved for hackathon prototype” decision

Never commit:

- `.env.local`;
- service-account JSON;
- ADC credentials;
- downloaded personal history;
- private test data;
- unlicensed media.

### 6.7 Environment variables

Prepare `.env.example` with names only:

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
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
```

Keep model IDs configurable because model availability can change.

---

## 7. Phase execution protocol

When asked to start a phase, the coding agent must:

1. Read this development plan and the product specification.
2. Read the latest progress log, decision log, blockers, and handoff notes.
3. State the selected phase’s objective and exit criteria.
4. Inspect the repository and preserve existing work.
5. Identify account-bound actions that require the team.
6. Implement the smallest complete vertical slice.
7. Run the phase verification commands.
8. Update checkboxes, status, evidence, decisions, and next action in this file.
9. Stop at the exit condition unless the team explicitly requests the next phase.

### Status values

- `Not started`
- `In progress`
- `Blocked`
- `Ready for review`
- `Complete`

### Definition of done for any phase

- Required code and documentation exist.
- Relevant tests pass.
- A production build succeeds.
- No known secret is committed.
- New user-visible behavior has empty, loading, error, and success states as relevant.
- Phase evidence is recorded below.

---

## 8. Master roadmap

| Phase | Name | Primary outcome | Status |
|---|---|---|---|
| I | Foundation and environment | Reproducible local app, project decisions, repository baseline | Not started |
| II | Experience shell and data contracts | Navigable Google Corvus UI and validated event model | Not started |
| III | Recreated Google ecosystem | Working YouTube, Search, Web, Maps, and optional Music demo sources | Not started |
| IV | Personal memory pipeline | Events become inspectable, searchable Firestore memories | Not started |
| V | Grounded recall assistant | Natural-language recall with valid source cards and deep links | Not started |
| VI | Contextual recommendations and controls | Mode-aware suggestions, explanations, privacy controls | Not started |
| VII | Authentication and Google Cloud deployment | Judge-accessible Cloud Run build using Firebase and Vertex AI | Not started |
| VIII | Quality, benchmarking, and submission | Tested release plus deck, video, repository, and links | Not started |

---

## 9. Phase I — Foundation and environment

### Objective

Create a reproducible project foundation and verify that the team can build, test, authenticate, and deploy a minimal application.

### Decisions required at phase start

- Team members and technical owners.
- Deadline and internal freeze date.
- Google Cloud project ID.
- Cloud Run and Firestore locations.
- GitHub owner and repository visibility.
- Confirmation of Next.js/TypeScript unless the team chooses another stack.
- Whether P1 Memory Threads and P2 Intent Modes are approved.

### Tasks

- [ ] Inspect the workspace and existing documents.
- [ ] Verify Git, Node.js, npm, gcloud, and Firebase CLI.
- [ ] Install or guide the team through missing tools.
- [ ] Initialize Git without overwriting existing files.
- [ ] Scaffold Next.js with TypeScript and Tailwind.
- [ ] Add linting, formatting, Vitest, and Playwright configuration.
- [ ] Add `.gitignore` and `.env.example`.
- [ ] Create a health endpoint and a minimal branded landing page.
- [ ] Add the Google Corvus concept disclosure.
- [ ] Configure environment validation.
- [ ] Create a GitHub repository or prepare the exact steps for the owner.
- [ ] Select/add Firebase to the Cloud project.
- [ ] Configure local ADC after the team signs in.
- [ ] Document architecture decision ADR-001.
- [ ] Run lint, unit smoke test, and production build.

### Deliverables

- Bootable local application.
- Repository baseline with documentation.
- Valid `/api/health` response.
- Confirmed cloud project and locations.
- Setup record without secrets.

### Exit criteria

- [ ] `npm install` succeeds from a clean checkout.
- [ ] `npm run dev` starts the app.
- [ ] `npm run lint` passes.
- [ ] `npm test` passes.
- [ ] `npm run build` passes.
- [ ] `/api/health` returns an expected JSON response.
- [ ] Project ID, region, owners, and feature approvals are recorded.
- [ ] No secret or credential file is tracked.

---

## 10. Phase II — Experience shell and data contracts

### Objective

Build the visual foundation and stable domain contracts before adding complex AI behavior.

### Tasks

- [ ] Implement Google Corvus design tokens and responsive app shell.
- [ ] Add navigation for Home, YouTube Demo, Search Demo, Web Demo, Maps Demo, Memory, Ask Corvus, and Controls.
- [ ] Add persistent “Demo simulation — no live Google data” labeling.
- [ ] Implement the context selector for Study, Commute, and Rest.
- [ ] Define Zod and TypeScript schemas for content, events, memories, context, recommendations, and citations.
- [ ] Create repository interfaces with in-memory adapters.
- [ ] Add fictional seed catalog and the Maya demo persona.
- [ ] Implement onboarding and consent explanation.
- [ ] Add global loading, empty, error, and fallback components.
- [ ] Add responsive and keyboard navigation smoke tests.

### Exit criteria

- [ ] Every core route is navigable on desktop and mobile.
- [ ] Schemas reject malformed events.
- [ ] Seed data loads without Firestore.
- [ ] Context mode visibly changes in application state.
- [ ] The simulation disclosure is visible from onboarding and controls.
- [ ] Production build and shell end-to-end test pass.

---

## 11. Phase III — Recreated Google ecosystem

### Objective

Create believable, functional demo sources that produce normalized memory events.

### Tasks

- [ ] Build YouTube Demo: catalog, search, player controls, transcript, progress, deep-link timestamp.
- [ ] Build Google Search Demo: query entry, result list, click tracking.
- [ ] Build Web Demo: fictional article, reading progress, highlight action.
- [ ] Build Google Maps Demo: place search, saved place, route, simulated travel mode.
- [ ] Add optional compact YouTube Music Demo only after the four core surfaces work.
- [ ] Emit validated events from meaningful actions.
- [ ] Set `sourceMode: "prototype_simulation"` on every demo event.
- [ ] Add capture feedback and a simple developer event viewer.
- [ ] Add idempotency keys and deterministic event timestamps for seeded scenarios.
- [ ] Write end-to-end tests for the hero interaction sequence.

### Exit criteria

- [ ] A judge can interact with all four core source recreations.
- [ ] Each meaningful action creates exactly one valid event.
- [ ] The event viewer shows correct source, action, content, context, and timestamp.
- [ ] The YouTube deep link opens the correct transcript position.
- [ ] No screen claims live access to Google history.

---

## 12. Phase IV — Personal memory pipeline

### Objective

Convert activity events into inspectable personal memories and store them in Firestore.

### Tasks

- [ ] Add Firestore server adapter and emulator/local fallback.
- [ ] Store users, content, activity, memory, context, and controls.
- [ ] Implement event ingestion and idempotency.
- [ ] Create memory text from source metadata and relevant transcript/article passage.
- [ ] Preserve observed, extracted, and inferred provenance.
- [ ] Add an embedding provider interface.
- [ ] Implement Vertex AI embedding provider with configurable dimension.
- [ ] Implement deterministic local similarity fallback.
- [ ] Create Firestore vector/composite indexes.
- [ ] Build Memory timeline, filters, detail view, and deletion.
- [ ] Add seed/reset workflow for the Maya demo.
- [ ] Test that deletion removes a memory from later retrieval.

### Exit criteria

- [ ] New events produce non-duplicate memory records.
- [ ] Memory records are stored with source provenance and user scope.
- [ ] Semantic or fallback search returns the seeded correct source.
- [ ] Users can inspect and delete a memory.
- [ ] Seed/reset can restore the demonstration without developer tools.

---

## 13. Phase V — Grounded recall assistant

### Objective

Let a user ask where they encountered information and return an evidence-grounded answer with exact source links.

### Tasks

- [ ] Implement lexical and semantic candidate retrieval.
- [ ] Add time, source, and topic filters.
- [ ] Re-rank candidates and define confidence thresholds.
- [ ] Integrate Gemini through Vertex AI with structured output.
- [ ] Validate model citation IDs against retrieved memory IDs.
- [ ] Implement low-confidence and no-answer behavior.
- [ ] Build Ask Corvus workspace and assistant drawer.
- [ ] Render source cards with app, title, time, excerpt, and deep link.
- [ ] Support exact YouTube transcript timestamps.
- [ ] Add deterministic fallback answers.
- [ ] Test prepared recall questions and adversarial unsupported questions.

### Exit criteria

- [ ] “Where did I hear the choir analogy?” returns the correct YouTube Demo source.
- [ ] The source opens at the expected transcript moment.
- [ ] Cross-media follow-up connects the YouTube source to the Web/Search memory.
- [ ] Every citation points to a retrieved record.
- [ ] Unsupported questions admit insufficient evidence.
- [ ] Vertex AI failure activates fallback without breaking the flow.

---

## 14. Phase VI — Contextual recommendations and controls

### Objective

Demonstrate transparent personalization that changes with current intent and remains under user control.

### Tasks

- [ ] Implement or finalize Intent Modes: Study, Commute, Rest, and optional Create.
- [ ] Generate candidates from unfinished content, recent topics, format, and current mode.
- [ ] Implement deterministic scoring and reason codes.
- [ ] Render “Why this?” explanations.
- [ ] Add “Not now,” “Less like this,” and “Wrong context” feedback.
- [ ] Add capture pause and per-source controls.
- [ ] Ensure paused sources stop generating events.
- [ ] Ensure deletion immediately affects recall and recommendations.
- [ ] Implement Memory Threads only if formally approved.
- [ ] Add Create From Memory only if core demo reliability is already high.

### Exit criteria

- [ ] Commute and Study produce visibly different ranked results.
- [ ] Every recommendation has a plain-language reason.
- [ ] Changing mode updates the interface and recommendations.
- [ ] Capture pause, per-source controls, delete, and reset behave correctly.
- [ ] Stretch work has not weakened the hero flow.

---

## 15. Phase VII — Authentication and Google Cloud deployment

### Objective

Deploy a secure, judge-accessible prototype that visibly uses Firebase, Firestore, Cloud Run, and Gemini.

### Tasks

- [ ] Add Firebase Authentication with Google sign-in or document the final seeded-demo approach.
- [ ] Enforce server-side user derivation and Firestore user scoping.
- [ ] Create least-privilege Cloud Run runtime service account.
- [ ] Configure required IAM roles without broad Owner use at runtime.
- [ ] Configure Cloud Run environment variables and service identity.
- [ ] Add Dockerfile only if needed; otherwise use Cloud Run source deployment.
- [ ] Deploy to Cloud Run.
- [ ] Configure public judge access or verify the selected authentication flow.
- [ ] Test from an incognito browser and a second device/network.
- [ ] Add uptime/health checking plan for the evaluation period.
- [ ] Record deployed revision, region, URL, and rollback process.

### Exit criteria

- [ ] Cloud Run public/judge URL is reachable over HTTPS.
- [ ] A clean visitor can enter the demo without developer assistance.
- [ ] Firestore persists seeded and live demo interactions.
- [ ] Gemini answer generation works from the deployed service.
- [ ] No privileged credential is exposed to the client.
- [ ] The full hero flow passes against production.

---

## 16. Phase VIII — Quality, benchmarking, and submission

### Objective

Freeze a reliable release and complete every hackathon deliverable.

### Product hardening

- [ ] Run unit, integration, end-to-end, accessibility, and production smoke tests.
- [ ] Verify loading, empty, error, low-confidence, fallback, and reset states.
- [ ] Test mobile and desktop layouts.
- [ ] Validate source citations and user isolation.
- [ ] Measure recall success, latency, context sensitivity, and deletion correctness.
- [ ] Fix critical/high issues; document accepted low-risk limitations.
- [ ] Tag the final release and record the Cloud Run revision.

### Submission package

- [ ] Populate the prescribed deck from `GOOGLE_CORVUS_PRESENTATION_CONTENT.md`.
- [ ] Capture final screenshots from the deployed prototype.
- [ ] Record a 3–4 minute demo using the approved script.
- [ ] Add captions and verify readable resolution.
- [ ] Upload the video and verify link permissions.
- [ ] Complete README setup, architecture, privacy, and demo instructions.
- [ ] Verify repository access from a logged-out/judge account.
- [ ] Write the final brief description.
- [ ] Run a link audit for deck, video, repository, and prototype.
- [ ] Create a backup archive and backup video copy.

### Exit criteria

- [ ] All mandatory submission checks in Section 3 pass.
- [ ] Benchmark slide contains measured, reproducible results.
- [ ] Deck uses the prescribed structure and has no placeholders except approved team data.
- [ ] Video duration is valid and demonstrates the working release.
- [ ] Deployed prototype and repository remain accessible.
- [ ] Final submission is reviewed by at least one teammate who did not prepare it.

---

## 17. Verification commands

Finalize exact scripts in `package.json` during Phase I.

```powershell
npm run lint
npm run typecheck
npm test
npm run test:e2e
npm run build
```

Suggested deployed checks:

```powershell
Invoke-WebRequest -UseBasicParsing https://YOUR_CLOUD_RUN_URL/api/health
gcloud run services describe google-corvus --region YOUR_REGION
gcloud run services logs read google-corvus --region YOUR_REGION --limit 50
```

Do not place access tokens or credentials directly in commands saved to documentation.

---

## 18. Benchmark plan

The presentation template asks for prototype performance or benchmarking. Measure these against the deployed build.

| Metric | Method | Target | Actual |
|---|---|---:|---:|
| Prepared recall top-3 success | 10 fixed recall questions | ≥ 90% | TBD |
| Citation integrity | Check every citation in test suite | 100% | TBD |
| Deletion correctness | Delete then repeat related recall | 100% absent | TBD |
| Mode sensitivity | Compare top 5 in Study vs Commute | ≥ 3 items change | TBD |
| Health endpoint latency | 20 deployed requests | p95 < 1 s | TBD |
| Seeded recall latency | 20 deployed recall requests | p95 target TBD after baseline | TBD |
| Fallback completion | Disable model provider and run hero query | 100% functional | TBD |
| Accessibility smoke | Keyboard flow plus automated checks | No critical issues | TBD |

Do not invent benchmark numbers. Record test date, deployed revision, region, sample size, and whether results are warm or cold starts.

---

## 19. Security and privacy checklist

- [ ] All demo content is fictional or licensed for use.
- [ ] No real user history is required for judging.
- [ ] Every prototype event is marked `prototype_simulation`.
- [ ] Model prompts contain only the evidence required for the answer.
- [ ] Raw prompts/responses are not persisted by default.
- [ ] Firestore access is scoped by authenticated user or controlled demo identity.
- [ ] Runtime service account follows least privilege.
- [ ] Secrets remain server-side.
- [ ] `.env*` and credential patterns are excluded from Git.
- [ ] Logs avoid source text and personal queries where practical.
- [ ] Capture pause, deletion, and reset are tested.
- [ ] UI distinguishes observed, extracted, and inferred data.
- [ ] The prototype discloses that it is not an official Google product.

---

## 20. Decision log

| Date | Decision | Reason | Owner |
|---|---|---|---|
| 2026-10-16 | Product name is Google Corvus; assistant short name is Corvus | Corvus constellation/crow symbolism matches intelligence, observation, memory, and social behavior | Team |
| 2026-10-16 | Prototype recreates Google app experiences instead of using live integrations | Demonstrates the ecosystem without claiming unavailable access | Team |
| 2026-10-16 | Cloud Run, Firestore, Firebase, and Gemini are required architectural components | Matches the hackathon deliverables and product needs | Team |
| TBD | Approve P1 Memory Threads | Pending | Team |
| TBD | Approve P2 Intent Modes | Recommended; pending explicit approval | Team |
| TBD | Approve optional P5 Create From Memory | Pending core-demo stability | Team |
| TBD | Choose GitHub owner and visibility | Required for submission | Team |
| TBD | Choose Cloud project and locations | Required before cloud setup | Team |

---

## 21. Risks and blockers

| ID | Risk/blocker | Impact | Mitigation | Status |
|---|---|---|---|---|
| R1 | Google integrations are unavailable for prototype | Cannot use real cross-app history | Functional recreated apps and normalized connector contract | Accepted |
| R2 | Gemini/network failure during judging | Recall could fail | Deterministic fallback and backup video | Open |
| R3 | Scope expands across too many apps | Fragile core experience | Four core source recreations, one strong hero story | Controlled |
| R4 | Firestore location chosen incorrectly | Hard-to-change infrastructure decision | Confirm region before database creation | Open |
| R5 | Repository or prototype inaccessible | Submission failure | Logged-out checks and evaluation-period monitoring | Open |
| R6 | Missing local Git command | Blocks repository workflow | Re-check PATH; install Git or configure GitHub Desktop Git | Open |
| R7 | Unmeasured benchmark claims | Weak credibility | Automated measurement during Phase VIII | Open |

---

## 22. Progress log

Add a row whenever meaningful phase work is completed.

| Date/time | Phase | Work completed | Verification/evidence | Blockers | Next action |
|---|---|---|---|---|---|
| 2026-10-16 | Planning | Product specification, phased plan, and presentation content structure prepared | Working Markdown documents created | Team/cloud details pending | Start Phase I after team confirmation |

---

## 23. Current handoff

### Current status

- Active phase: **None — awaiting Phase I start**
- Last completed phase: **Planning only**
- Current build: **Not scaffolded**
- Deployed URL: **Not available**
- Repository URL: **Not available**

### Information needed from the team

1. Submission deadline and time zone.
2. Team member names and technical strengths.
3. Google Cloud project ID or permission to create/select one.
4. Billing/credits status.
5. Preferred region and any data-location restriction.
6. GitHub account or organization that will own the repository.
7. Confirmation of Next.js/TypeScript.
8. Approval status for Memory Threads, Intent Modes, and Create From Memory.

### Next invocation

> **Let’s start with Phase I.**

The coding agent should then perform the Phase I audit, report which team-owned setup steps are required, scaffold the project, verify the build, and update this document.

---

## 24. Official setup references

- [Google Cloud local development environment](https://docs.cloud.google.com/docs/get-started/developer-environment)
- [Gemini API in Vertex AI quickstart](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/start/quickstart)
- [Add Firebase to a JavaScript project](https://firebase.google.com/docs/web/setup)
- [Cloud Run Node.js deployment quickstart](https://docs.cloud.google.com/run/docs/quickstarts/build-and-deploy/deploy-nodejs-service)
- [Cloud Firestore vector search](https://firebase.google.com/docs/firestore/vector-search)

