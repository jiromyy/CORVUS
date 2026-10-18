# Corvus

A private, source-grounded memory for what you watch, search, and read. Built for the Google Cloud AI Builder Cup (Media, Content & Digital Experiences).

> Corvus is a hackathon concept and is not a Google product.

- Product spec: [CORVUS_PRODUCT_BUILD_SPEC.md](CORVUS_PRODUCT_BUILD_SPEC.md)
- Three-day plan and progress: [CORVUS_DEVELOPMENT_PLAN.md](CORVUS_DEVELOPMENT_PLAN.md)

## Stack

Next.js 16 (App Router, TypeScript, Tailwind) · Gemini on Google Cloud via `@google/genai` · Cloud Firestore (vector search) · Cloud Storage · Cloud Run.

## Local setup

1. Node.js 22 and the [Google Cloud CLI](https://cloud.google.com/sdk/docs/install).
2. Sign in (opens a browser):
   ```bash
   gcloud auth login
   gcloud auth application-default login
   gcloud config set project YOUR_PROJECT_ID
   ```
3. `npm install`
4. Copy `.env.example` to `.env.local` and fill in the values (no secrets in Git).
5. `npm run dev` → http://localhost:3000, health at `/api/health`.

## Scripts

| Command                                                 | What it does                                           |
| ------------------------------------------------------- | ------------------------------------------------------ |
| `npm run dev`                                         | Dev server                                             |
| `npm run build`                                       | Production build (standalone output for the container) |
| `npm run lint` / `npm run typecheck` / `npm test` | Checks                                                 |
| `npm run seed` | Seed Raven's demo memories (reuses cached video analyses; `-- --fresh` re-analyses) |
| `npm run seed:catalog` | Write the curated suggestion catalogue with embeddings |
| `npm run seed:recap` | Pre-generate Raven's audio recap (`-- fil` for Filipino) |
| `npm run ext:zip` | Rebuild `public/corvus-capture.zip` from `extension/` (Windows PowerShell) |
| `npm run spike:models`                                | List Gemini models visible to the project/location     |
| `npm run spike:video -- "<youtube url>"`              | Gemini video → timestamped moments                    |
| `npm run spike:embeddings`                            | Cross-language embedding similarity                    |
| `npm run spike:tts`                                   | Gemini TTS → WAV files in `spikes/out/`             |
| `npm run spike:tools`                                 | Agent loop: tool call → cited JSON answer             |
| `npm run spike:firestore`                             | Workspace-filtered Firestore vector search             |

## Optional Google sign-in

Corvus works without an account (an anonymous workspace per browser). Signing in with Google through Firebase Authentication links that workspace to the account so it follows you to other browsers. It proves identity only; no Google data scopes are requested.

1. Add Firebase to the Google Cloud project, then **Authentication → Sign-in method → Google → Enable**.
2. **Authentication → Settings → Authorized domains**: add `localhost` and the Cloud Run hostname.
3. Register a web app and put its `apiKey`, `authDomain`, and `appId` in `FIREBASE_API_KEY`, `FIREBASE_AUTH_DOMAIN`, `FIREBASE_APP_ID` (`.env.local`, and `--update-env-vars` on Cloud Run). These values are public by design.

The first sign-in on a browser keeps that browser's memories; signing in on another browser switches to the account's workspace. Signing out starts a fresh anonymous workspace.

## Chrome extension (automatic capture)

`extension/` is a Manifest V3 extension that remembers YouTube videos watched for 30+ seconds and Google searches (and clicked results). It talks only to the Corvus server.

1. `chrome://extensions` → Developer mode → **Load unpacked** → choose `extension/` (or unzip `/corvus-capture.zip` from the app).
2. In Corvus → **Import** → **Get pairing code**; enter it in the extension popup (choose "Local development" when testing against localhost:3000).
3. Pause/resume capture from the popup. Deleting your data in Corvus also disconnects the extension.

## Google Cloud setup (once per project)

```bash
gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com aiplatform.googleapis.com firestore.googleapis.com storage.googleapis.com secretmanager.googleapis.com

# Firestore (Native mode). The location cannot be changed later.
gcloud firestore databases create --location=asia-southeast1

# Bucket for audio recaps
gcloud storage buckets create gs://corvus-511804-corvus-recaps --location=asia-southeast1 --uniform-bucket-level-access

# Vector index for memories (768 dims, filtered by workspace and active)
gcloud firestore indexes composite create --collection-group=memories --query-scope=COLLECTION --field-config=field-path=workspaceId,order=ASCENDING --field-config=field-path=active,order=ASCENDING --field-config=field-path=embedding,vector-config='{"dimension":"768","flat":"{}"}'

# Runtime service account for Cloud Run
gcloud iam service-accounts create corvus-run --display-name="Corvus Cloud Run"
for role in roles/aiplatform.user roles/datastore.user; do
  gcloud projects add-iam-policy-binding corvus-511804 --member="serviceAccount:corvus-run@Ycorvus-511804.iam.gserviceaccount.com" --role="$role"
done
gcloud storage buckets add-iam-policy-binding gs://corvus-511804-corvus-recaps --member="serviceAccount:corvus-run@corvus-511804.iam.gserviceaccount.com" --role=roles/storage.objectAdmin
```

## Deploy to Cloud Run

The `Dockerfile` builds the Next.js standalone server. Cloud Build builds it remotely, so Docker is not required locally.

```bash
gcloud run deploy corvus --source . --region asia-southeast1 --service-account corvus-run@YOUR_PROJECT_ID.iam.gserviceaccount.com --allow-unauthenticated --timeout 300 --set-env-vars GOOGLE_CLOUD_PROJECT=YOUR_PROJECT_ID,GOOGLE_CLOUD_LOCATION=global,GEMINI_MODEL=...,EMBEDDING_MODEL=gemini-embedding-2,EMBEDDING_DIMENSION=768
```

Put `WORKSPACE_COOKIE_SECRET` (and `GEMINI_API_KEY` if used) in Secret Manager and attach with `--set-secrets`. Check with `curl https://<service-url>/api/health`.
