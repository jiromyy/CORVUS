/**
 * Anonymous per-browser workspace (spec §12). The workspace ID lives in an httpOnly cookie
 * signed with WORKSPACE_COOKIE_SECRET, so the server never trusts a workspace ID from the request body.
 * Call only from Route Handlers or Server Functions (they may set the cookie).
 */
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { ensureWorkspace, getWorkspaceState } from "./db/store";
import { getEnv } from "./env";

export const COOKIE_NAME = "corvus_ws";
const MAX_AGE = 60 * 60 * 24 * 90;

function secret() {
  const value = getEnv().WORKSPACE_COOKIE_SECRET;
  if (!value) throw new Error("WORKSPACE_COOKIE_SECRET is not set");
  return value;
}

export function sign(id: string, key = secret()) {
  return `${id}.${createHmac("sha256", key).update(id).digest("base64url")}`;
}

export function verify(value: string | undefined, key = secret()): string | undefined {
  if (!value) return undefined;
  const dot = value.lastIndexOf(".");
  if (dot < 1) return undefined;
  const id = value.slice(0, dot);
  const expected = Buffer.from(sign(id, key));
  const actual = Buffer.from(value);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return undefined;
  return /^ws_[a-f0-9]{24}$/.test(id) ? id : undefined;
}

export type Workspace = { id: string; demoId: string; isNew: boolean };

/** The visitor's workspace, creating it (and setting the cookie) on first use. */
export async function getWorkspace(): Promise<Workspace> {
  const jar = await cookies();
  const demoId = getEnv().DEMO_WORKSPACE_ID;
  const existing = verify(jar.get(COOKIE_NAME)?.value);
  if (existing) return { id: existing, demoId, isNew: false };

  const id = `ws_${randomBytes(12).toString("hex")}`;
  await ensureWorkspace(id);
  jar.set(COOKIE_NAME, sign(id), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE,
  });
  return { id, demoId, isNew: true };
}

/** The visitor's workspace plus the memory scope for queries: their own, and the sample unless hidden. */
export async function getScope() {
  const ws = await getWorkspace();
  const state = await getWorkspaceState(ws.id);
  return {
    ws,
    hidden: state.hidden,
    includeSample: state.includeSample,
    focusOverride: state.focusOverride,
    workspaceIds: state.includeSample ? [ws.demoId, ws.id] : [ws.id],
  };
}
