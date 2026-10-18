/**
 * Firestore access for content, memories, and workspaces (spec §13).
 * Every memory query is filtered by workspaceId. Embeddings are stored as Firestore vectors.
 */
import { FieldValue, type DocumentSnapshot } from "firebase-admin/firestore";
import { ContentItem, MemoryRecord } from "../ai/schemas";
import { getDb } from "./firestore";

const CONTENT = "content";
const MEMORIES = "memories";
const WORKSPACES = "workspaces";

/** Fields returned to the app; never the embedding. */
const MEMORY_FIELDS = [
  "workspaceId", "memoryType", "source", "sourceMode", "contentId", "sourceEventIds", "title", "text",
  "excerpt", "visualDescription", "deepLink", "startSeconds", "endSeconds", "language", "occurredAt",
  "topics", "threadIds", "provenance", "embeddingModel", "active", "deletedAt",
] as const;

export type MemoryView = Omit<MemoryRecord, "embedding">;

function toMemory(doc: DocumentSnapshot): MemoryView {
  const data = { ...doc.data() } as Record<string, unknown>;
  delete data.embedding;
  return { id: doc.id, ...data } as MemoryView;
}

// ---------- content ----------

export async function saveContent(item: ContentItem) {
  await getDb().collection(CONTENT).doc(item.id).set(ContentItem.parse(item));
}

export async function getContent(id: string): Promise<ContentItem | undefined> {
  const snap = await getDb().collection(CONTENT).doc(id).get();
  return snap.exists ? (snap.data() as ContentItem) : undefined;
}

// ---------- memories ----------

/** Replaces all memories of a workspace (used by the demo seed). */
export async function replaceWorkspaceMemories(workspaceId: string, memories: MemoryRecord[]) {
  const db = getDb();
  const existing = await db.collection(MEMORIES).where("workspaceId", "==", workspaceId).select().get();
  for (let i = 0; i < existing.docs.length; i += 400) {
    const batch = db.batch();
    existing.docs.slice(i, i + 400).forEach((d) => batch.delete(d.ref));
    await batch.commit();
  }
  await saveMemories(memories);
}

export async function saveMemories(memories: MemoryRecord[]) {
  invalidateMemoryCache();
  const db = getDb();
  for (let i = 0; i < memories.length; i += 400) {
    const batch = db.batch();
    for (const m of memories.slice(i, i + 400)) {
      const { id, embedding, ...rest } = MemoryRecord.parse(m);
      batch.set(db.collection(MEMORIES).doc(id), { ...rest, embedding: FieldValue.vector(embedding) });
    }
    await batch.commit();
  }
}

export async function getMemory(id: string): Promise<MemoryView | undefined> {
  const snap = await getDb().collection(MEMORIES).doc(id).get();
  return snap.exists ? toMemory(snap) : undefined;
}

/** Short-lived cache: one Ask can search several times, and each search lists memories. */
const LIST_TTL_MS = 30_000;
const listCache = new Map<string, { at: number; value: Promise<MemoryView[]> }>();

export function invalidateMemoryCache() {
  listCache.clear();
}

/** All active memories of the given workspaces, newest first (no embeddings). Cached for 30 s. */
export async function listMemories(workspaceIds: string[], limit = 500): Promise<MemoryView[]> {
  const key = `${[...workspaceIds].sort().join("|")}:${limit}`;
  const hit = listCache.get(key);
  if (hit && Date.now() - hit.at < LIST_TTL_MS) return hit.value;
  const value = loadMemories(workspaceIds, limit);
  listCache.set(key, { at: Date.now(), value });
  value.catch(() => listCache.delete(key));
  return value;
}

async function loadMemories(workspaceIds: string[], limit: number): Promise<MemoryView[]> {
  const snap = await getDb()
    .collection(MEMORIES)
    .where("workspaceId", "in", workspaceIds)
    .where("active", "==", true)
    .select(...MEMORY_FIELDS)
    .limit(limit)
    .get();
  return snap.docs.map(toMemory).sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
}

export async function vectorSearch(workspaceId: string, vector: number[], limit = 20) {
  const snap = await getDb()
    .collection(MEMORIES)
    .where("workspaceId", "==", workspaceId)
    .where("active", "==", true)
    .findNearest({
      vectorField: "embedding",
      queryVector: vector,
      limit,
      distanceMeasure: "COSINE",
      distanceResultField: "vectorDistance",
    })
    .get();
  return snap.docs.map((d) => ({ memory: toMemory(d), distance: Number(d.get("vectorDistance")) }));
}

export async function deactivateMemory(id: string) {
  invalidateMemoryCache();
  await getDb().collection(MEMORIES).doc(id).update({ active: false, deletedAt: new Date().toISOString() });
}

// ---------- workspaces ----------

type WorkspaceDoc = { createdAt: string; hiddenMemoryIds?: string[]; includeSample?: boolean; focusOverride?: string | null; ownerUid?: string };

export type WorkspaceState = { hidden: Set<string>; includeSample: boolean; focusOverride?: string };

/** Hidden demo memories and whether Raven's sample data is shown alongside the visitor's own. */
export async function getWorkspaceState(workspaceId: string): Promise<WorkspaceState> {
  const doc = (await getDb().collection(WORKSPACES).doc(workspaceId).get()).data() as WorkspaceDoc | undefined;
  return {
    hidden: new Set(doc?.hiddenMemoryIds ?? []),
    includeSample: doc?.includeSample ?? true,
    focusOverride: doc?.focusOverride ?? undefined,
  };
}

/** The user's correction of the inferred focus; null goes back to inferring. */
export async function setFocusOverride(workspaceId: string, focusOverride: string | null) {
  await getDb().collection(WORKSPACES).doc(workspaceId).set({ focusOverride }, { merge: true });
}

export async function setIncludeSample(workspaceId: string, includeSample: boolean) {
  await getDb().collection(WORKSPACES).doc(workspaceId).set({ includeSample }, { merge: true });
}

/** Deletes every memory and event of a workspace and resets its settings. */
export async function deleteWorkspaceData(workspaceId: string) {
  invalidateMemoryCache();
  const db = getDb();
  for (const name of [MEMORIES, "events", "extension_tokens"]) {
    const snap = await db.collection(name).where("workspaceId", "==", workspaceId).select().get();
    for (let i = 0; i < snap.docs.length; i += 400) {
      const batch = db.batch();
      snap.docs.slice(i, i + 400).forEach((d) => batch.delete(d.ref));
      await batch.commit();
    }
  }
  // Merge so a signed-in owner stays linked to the (now empty) workspace.
  await db
    .collection(WORKSPACES)
    .doc(workspaceId)
    .set({ createdAt: new Date().toISOString(), hiddenMemoryIds: [], includeSample: true, focusOverride: null }, { merge: true });
}

// ---------- accounts ----------

const USERS = "users";

export type UserProfile = { uid: string; name?: string; email?: string; photoURL?: string };
type UserDoc = Omit<UserProfile, "uid"> & { workspaceId: string; createdAt: string; lastSignInAt: string };

/** The workspace a Google account is linked to, if it has signed in before. */
export async function getUserWorkspace(uid: string): Promise<string | undefined> {
  const snap = await getDb().collection(USERS).doc(uid).get();
  return (snap.data() as UserDoc | undefined)?.workspaceId;
}

export async function getWorkspaceOwner(workspaceId: string): Promise<string | undefined> {
  const snap = await getDb().collection(WORKSPACES).doc(workspaceId).get();
  return (snap.data() as WorkspaceDoc | undefined)?.ownerUid;
}

/** Links an account to a workspace (both directions) and refreshes the stored profile. */
export async function linkUserWorkspace(profile: UserProfile, workspaceId: string) {
  const db = getDb();
  const now = new Date().toISOString();
  const { uid, ...rest } = profile;
  const user = db.collection(USERS).doc(uid);
  const existing = await user.get();
  await user.set({ ...rest, workspaceId, lastSignInAt: now, ...(existing.exists ? {} : { createdAt: now }) }, { merge: true });
  await db.collection(WORKSPACES).doc(workspaceId).set({ ownerUid: uid }, { merge: true });
}

export async function getUserProfile(uid: string): Promise<UserProfile | undefined> {
  const snap = await getDb().collection(USERS).doc(uid).get();
  const data = snap.data() as UserDoc | undefined;
  return data && { uid, name: data.name, email: data.email, photoURL: data.photoURL };
}

export async function ensureWorkspace(id: string) {
  const ref = getDb().collection(WORKSPACES).doc(id);
  const snap = await ref.get();
  if (!snap.exists) await ref.set({ createdAt: new Date().toISOString(), hiddenMemoryIds: [] } satisfies WorkspaceDoc);
}

/** Demo memories a visitor deleted. The shared demo stays intact for everyone else. */
export async function getHiddenMemoryIds(workspaceId: string): Promise<Set<string>> {
  const snap = await getDb().collection(WORKSPACES).doc(workspaceId).get();
  return new Set((snap.data() as WorkspaceDoc | undefined)?.hiddenMemoryIds ?? []);
}

export async function hideMemories(workspaceId: string, memoryIds: string[]) {
  await getDb()
    .collection(WORKSPACES)
    .doc(workspaceId)
    .set({ hiddenMemoryIds: FieldValue.arrayUnion(...memoryIds) }, { merge: true });
}

export async function clearHiddenMemories(workspaceId: string) {
  await getDb().collection(WORKSPACES).doc(workspaceId).set({ hiddenMemoryIds: [] }, { merge: true });
}

