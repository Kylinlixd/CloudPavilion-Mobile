import {
  clearSession,
  getAccessToken,
  getFamilyId,
  getRefreshToken,
  setAccessToken,
  setSession,
} from "./storage";
import {
  currentAccountKey,
  enqueueMutation,
  flushOutbox,
  readCache,
  writeCache,
  type CacheScope,
  type QueuedMutation,
} from "./offlineStore";

const defaultApiBaseUrl =
  typeof __DEV__ !== "undefined" && __DEV__
    ? "http://127.0.0.1:8000/api/v1"
    : "https://leexd.top/cloudpavilion/api/v1";

export const API_BASE_URL = (
  process.env.EXPO_PUBLIC_API_BASE_URL || defaultApiBaseUrl
).replace(/\/$/, "");

export class ApiError extends Error {
  status: number;
  payload: unknown;

  constructor(status: number, message: string, payload: unknown = null) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.payload = payload;
  }
}

function parsePayload(value: string) {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function messageFromPayload(payload: unknown, fallback: string) {
  if (payload && typeof payload === "object" && "detail" in payload) {
    const detail = payload.detail;
    if (typeof detail === "string") return detail;
    if (Array.isArray(detail))
      return (
        detail.filter((item) => typeof item === "string").join("\n") || fallback
      );
  }
  if (payload && typeof payload === "object") {
    const messages = Object.values(payload)
      .flatMap((value) => (Array.isArray(value) ? value : [value]))
      .filter((value): value is string => typeof value === "string");
    if (messages.length) return messages.join("\n");
  }
  return fallback;
}

let onSessionInvalidated: (() => void) | undefined;
let refreshPromise: Promise<boolean> | null = null;

export function setSessionInvalidationHandler(
  handler: (() => void) | undefined,
) {
  onSessionInvalidated = handler;
}

async function refreshAccessToken() {
  const refresh = await getRefreshToken();
  if (!refresh) return false;
  const response = await fetch(`${API_BASE_URL}/auth/token/refresh/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh }),
  });
  if (!response.ok) {
    if (response.status === 401) {
      await clearSession();
      onSessionInvalidated?.();
    }
    return false;
  }
  const result = (await response.json()) as {
    access: string;
    refresh?: string;
  };
  if (result.refresh) await setSession(result.access, result.refresh);
  else await setAccessToken(result.access);
  return true;
}

function refreshAccessTokenOnce() {
  if (!refreshPromise)
    refreshPromise = refreshAccessToken().finally(() => {
      refreshPromise = null;
    });
  return refreshPromise;
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  allowRefresh = true,
): Promise<T> {
  const headers = new Headers(options.headers);
  if (
    options.body &&
    !(options.body instanceof FormData) &&
    !headers.has("Content-Type")
  )
    headers.set("Content-Type", "application/json");
  const [access, familyId] = await Promise.all([
    getAccessToken(),
    getFamilyId(),
  ]);
  if (access) headers.set("Authorization", `Bearer ${access}`);
  if (familyId) headers.set("X-Family-ID", familyId);

  let response: Response;
  try {
    response = await fetch(
      /^https?:\/\//.test(path) ? path : `${API_BASE_URL}${path}`,
      { ...options, headers },
    );
  } catch {
    throw new ApiError(0, "网络连接失败，请稍后重试。", null);
  }
  if (
    response.status === 401 &&
    allowRefresh &&
    path !== "/auth/token/refresh/"
  ) {
    if (await refreshAccessTokenOnce()) return request<T>(path, options, false);
  }
  const payload = parsePayload(await response.text());
  if (!response.ok)
    throw new ApiError(
      response.status,
      messageFromPayload(payload, `请求失败（${response.status}）`),
      payload,
    );
  return payload as T;
}

let offlineFlushPromise: Promise<{ succeeded: number; blocked: number }> | null = null;

async function flushOfflineQueueInternal() {
  const [accountKey, familyId] = await Promise.all([
    currentAccountKey(),
    getFamilyId(),
  ]);
  if (accountKey === "anonymous") return { succeeded: 0, blocked: 0 };
  return flushOutbox(accountKey, familyId, async (item: QueuedMutation) => {
    await request(item.path, {
      method: item.method,
      headers: { "Idempotency-Key": item.idempotencyKey },
      body: item.body === undefined ? undefined : JSON.stringify(item.body),
    }, false);
  });
}

/** Flushes at most one queue at a time so app resume and network recovery cannot duplicate writes. */
export function flushOfflineQueue() {
  if (!offlineFlushPromise) {
    offlineFlushPromise = flushOfflineQueueInternal().finally(() => {
      offlineFlushPromise = null;
    });
  }
  return offlineFlushPromise;
}

export async function getWithOfflineCache<T>(path: string, scope: CacheScope) {
  const [accountKey, familyId] = await Promise.all([
    currentAccountKey(),
    getFamilyId(),
  ]);
  try {
    const data = await request<T>(path);
    await writeCache(accountKey, scope, data, familyId);
    void flushOfflineQueue();
    return { data, offline: false };
  } catch (error) {
    if (error instanceof ApiError && error.status === 0) {
      const cached = await readCache<T>(accountKey, scope, familyId);
      if (cached) return { data: cached.data, offline: true };
    }
    throw error;
  }
}

export async function mutateWithOfflineQueue<T>(options: {
  path: string;
  method: "POST" | "PATCH" | "DELETE";
  body?: unknown;
  idempotencyKey: string;
}) {
  const [accountKey, familyId] = await Promise.all([
    currentAccountKey(),
    getFamilyId(),
  ]);
  try {
    return { data: await request<T>(options.path, {
      method: options.method,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    }), queued: false };
  } catch (error) {
    if (!(error instanceof ApiError && error.status === 0)) throw error;
    const queued = await enqueueMutation(accountKey, {
      ...options,
      familyId,
    });
    return { queued: true, queuedMutation: queued };
  }
}

export const apiClient = {
  upload: <T>(path: string, body: FormData) =>
    request<T>(path, { method: "POST", body }),
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: "POST",
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
  patch: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "PATCH", body: JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
  getWithOfflineCache,
  mutateWithOfflineQueue,
  flushOfflineQueue,
};
