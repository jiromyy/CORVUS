/**
 * Chrome extension pairing (spec §8 Tier 1 item 3). The web app issues a short one-time code
 * (10 minutes); the extension exchanges it for a long random token. Only token hashes are stored.
 */
import { createHash, randomBytes, randomInt } from "node:crypto";
import { getDb } from "./db/firestore";
import { getScope } from "./workspace";

const CODES = "pairing_codes";
const TOKENS = "extension_tokens";
const CODE_TTL_MS = 10 * 60_000;
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O or 1/I

const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

export async function createPairingCode(workspaceId: string) {
  const code = Array.from({ length: 8 }, () => ALPHABET[randomInt(ALPHABET.length)]).join("");
  const expiresAt = new Date(Date.now() + CODE_TTL_MS).toISOString();
  await getDb().collection(CODES).doc(code).set({ workspaceId, expiresAt });
  return { code: `${code.slice(0, 4)}-${code.slice(4)}`, expiresAt };
}

/** Single use: the code is deleted whether or not it was valid. */
export async function exchangePairingCode(input: string): Promise<string | undefined> {
  const code = input.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (code.length !== 8) return undefined;
  const db = getDb();
  const ref = db.collection(CODES).doc(code);
  const snap = await ref.get();
  if (!snap.exists) return undefined;
  await ref.delete();
  const { workspaceId, expiresAt } = snap.data() as { workspaceId: string; expiresAt: string };
  if (Date.parse(expiresAt) < Date.now()) return undefined;
  const token = randomBytes(32).toString("base64url");
  await db.collection(TOKENS).doc(sha256(token)).set({ workspaceId, createdAt: new Date().toISOString() });
  return token;
}

export async function workspaceForToken(token: string | undefined): Promise<string | undefined> {
  if (!token || token.length < 40) return undefined;
  const snap = await getDb().collection(TOKENS).doc(sha256(token)).get();
  return snap.exists ? (snap.data() as { workspaceId: string }).workspaceId : undefined;
}

export const bearer = (request: Request) => /^Bearer\s+(.+)$/i.exec(request.headers.get("authorization") ?? "")?.[1];

/** Workspace from an extension token if present, otherwise from the browser cookie. */
export async function workspaceFromRequest(request: Request): Promise<string | undefined> {
  const token = bearer(request);
  if (token) return workspaceForToken(token);
  return (await getScope()).ws.id;
}

/** How many browsers are paired to a workspace (tokens are only ever stored hashed). */
export async function pairedBrowsers(workspaceId: string) {
  const snap = await getDb().collection(TOKENS).where("workspaceId", "==", workspaceId).count().get();
  return snap.data().count;
}
