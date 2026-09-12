import AsyncStorage from "@react-native-async-storage/async-storage";

import { getAccessToken } from "./storage";

export type CacheScope =
  | "profile"
  | "families"
  | "books"
  | "loans"
  | "reservations";
export type QueuedMutation = {
  id: string;
  accountKey: string;
  familyId: string | null;
  method: "POST" | "PATCH" | "DELETE";
  path: string;
  body?: unknown;
  idempotencyKey: string;
  createdAt: string;
  retries: number;
  status: "pending" | "blocked";
  lastError?: string;
};

const scopeKey = (familyId?: string | null) => familyId || "global";
const cacheKey = (accountKey: string, scope: CacheScope, familyId?: string | null) =>
  `cloudpavilion.cache.${accountKey}.${scopeKey(familyId)}.${scope}`;
const outboxKey = (accountKey: string, familyId?: string | null) =>
  `cloudpavilion.outbox.${accountKey}.${scopeKey(familyId)}`;
const newId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

export function accountKeyFromToken(token: string | null) {
  if (!token) return "anonymous";
  try {
    const payload = token.split(".")[1];
    if (!payload) return "session";
    const decoded = JSON.parse(
      typeof globalThis.atob === "function"
        ? globalThis.atob(payload.replace(/-/g, "+").replace(/_/g, "/"))
        : Buffer.from(payload, "base64url").toString("utf8"),
    ) as { user_id?: number | string; sub?: number | string; username?: string };
    const subject = decoded.user_id ?? decoded.sub ?? decoded.username;
    return subject ? `user-${String(subject).replace(/[^a-zA-Z0-9_-]/g, "_")}` : "session";
  } catch {
    return "session";
  }
}

export async function currentAccountKey() {
  return accountKeyFromToken(await getAccessToken());
}

export async function readCache<T>(accountKey: string, scope: CacheScope, familyId?: string | null) {
  const raw = await AsyncStorage.getItem(cacheKey(accountKey, scope, familyId));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as { data: T; savedAt: string };
  } catch {
    return null;
  }
}

export async function writeCache<T>(accountKey: string, scope: CacheScope, data: T, familyId?: string | null) {
  await AsyncStorage.setItem(cacheKey(accountKey, scope, familyId), JSON.stringify({ data, savedAt: new Date().toISOString() }));
}

export async function listOutbox(accountKey: string, familyId?: string | null): Promise<QueuedMutation[]> {
  const raw = await AsyncStorage.getItem(outboxKey(accountKey, familyId));
  if (!raw) return [];
  try {
    const items = JSON.parse(raw) as QueuedMutation[];
    return items.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  } catch {
    return [];
  }
}

async function saveOutbox(accountKey: string, familyId: string | null | undefined, items: QueuedMutation[]) {
  if (items.length) await AsyncStorage.setItem(outboxKey(accountKey, familyId), JSON.stringify(items));
  else await AsyncStorage.removeItem(outboxKey(accountKey, familyId));
}

export async function enqueueMutation(
  accountKey: string,
  mutation: Omit<QueuedMutation, "id" | "accountKey" | "familyId" | "createdAt" | "retries" | "status"> & { familyId?: string | null },
) {
  const familyId = mutation.familyId ?? null;
  const items = await listOutbox(accountKey, familyId);
  const existing = items.find((item) => item.idempotencyKey === mutation.idempotencyKey);
  if (existing) return existing;
  const item: QueuedMutation = { ...mutation, familyId, id: newId(), accountKey, createdAt: new Date().toISOString(), retries: 0, status: "pending" };
  await saveOutbox(accountKey, familyId, [...items, item]);
  return item;
}

export async function flushOutbox(
  accountKey: string,
  familyId: string | null | undefined,
  sender: (item: QueuedMutation) => Promise<unknown>,
) {
  const items = await listOutbox(accountKey, familyId);
  let succeeded = 0;
  let blocked = 0;
  for (const item of items) {
    if (item.status === "blocked") {
      blocked += 1;
      continue;
    }
    try {
      await sender(item);
      const current = await listOutbox(accountKey, familyId);
      await saveOutbox(accountKey, familyId, current.filter((candidate) => candidate.id !== item.id));
      succeeded += 1;
    } catch (error) {
      const status = typeof error === "object" && error && "status" in error ? Number(error.status) : 0;
      const current = await listOutbox(accountKey, familyId);
      const next = current.map((candidate) => candidate.id === item.id ? { ...candidate, retries: candidate.retries + 1, status: status === 401 || status === 403 || status === 409 ? "blocked" as const : candidate.status, lastError: error instanceof Error ? error.message : "同步失败" } : candidate);
      await saveOutbox(accountKey, familyId, next);
      if (status === 401 || status === 403 || status === 409) blocked += 1;
      else break;
    }
  }
  return { succeeded, blocked };
}
