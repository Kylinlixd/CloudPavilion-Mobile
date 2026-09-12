import { beforeEach, describe, expect, it, vi } from "vitest";
import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  accountKeyFromToken,
  enqueueMutation,
  flushOutbox,
  listOutbox,
  readCache,
  writeCache,
} from "../lib/offlineStore";

describe("offline cache and outbox", () => {
  const values = new Map<string, string>();

  beforeEach(() => {
    values.clear();
    vi.mocked(AsyncStorage.getItem).mockImplementation(async (key) => values.get(key) ?? null);
    vi.mocked(AsyncStorage.setItem).mockImplementation(async (key, value) => { values.set(key, value); });
    vi.mocked(AsyncStorage.removeItem).mockImplementation(async (key) => { values.delete(key); });
  });

  it("derives a stable account scope from the JWT subject", () => {
    const payload = Buffer.from(JSON.stringify({ user_id: 42 })).toString("base64url");
    expect(accountKeyFromToken(`header.${payload}.signature`)).toBe("user-42");
  });

  it("deduplicates queued mutations by idempotency key", async () => {
    await enqueueMutation("user-42", { familyId: "7", method: "PATCH", path: "/auth/me/", body: { nickname: "新名字" }, idempotencyKey: "profile-1" });
    const duplicate = await enqueueMutation("user-42", { familyId: "7", method: "PATCH", path: "/auth/me/", body: { nickname: "新名字" }, idempotencyKey: "profile-1" });
    expect((await listOutbox("user-42", "7"))).toHaveLength(1);
    expect(duplicate.idempotencyKey).toBe("profile-1");
  });

  it("keeps account and book pavilion caches isolated", async () => {
    await enqueueMutation("user-42", { familyId: "7", method: "POST", path: "/one/", body: {}, idempotencyKey: "same" });
    await enqueueMutation("user-42", { familyId: "8", method: "POST", path: "/two/", body: {}, idempotencyKey: "same" });
    expect(await listOutbox("user-42", "7")).toHaveLength(1);
    expect(await listOutbox("user-42", "8")).toHaveLength(1);
  });

  it("stores a large shelf snapshot outside SecureStore limits", async () => {
    const books = Array.from({ length: 80 }, (_, index) => ({ id: index, title: `书籍 ${index}`, description: "缓存内容".repeat(20) }));
    await writeCache("user-42", "books", books, "7");
    const cached = await readCache<typeof books>("user-42", "books", "7");
    expect(cached?.data).toEqual(books);
    expect(cached?.savedAt).toEqual(expect.any(String));
  });

  it("flushes mutations in order and removes successful entries", async () => {
    await enqueueMutation("user-42", { familyId: "7", method: "PATCH", path: "/one/", body: {}, idempotencyKey: "one" });
    await enqueueMutation("user-42", { familyId: "7", method: "POST", path: "/two/", body: {}, idempotencyKey: "two" });
    const sender = vi.fn().mockResolvedValue(undefined);
    const result = await flushOutbox("user-42", "7", sender);
    expect(sender.mock.calls.map(([item]) => item.idempotencyKey)).toEqual(["one", "two"]);
    expect(result.succeeded).toBe(2);
    expect(await listOutbox("user-42", "7")).toEqual([]);
  });

  it("marks conflict and permission failures instead of retrying forever", async () => {
    await enqueueMutation("user-42", { familyId: "7", method: "POST", path: "/borrow/", body: {}, idempotencyKey: "borrow-1" });
    const result = await flushOutbox("user-42", "7", vi.fn().mockRejectedValue({ status: 409, message: "已被借出" }));
    expect(result.blocked).toBe(1);
    expect((await listOutbox("user-42", "7"))[0].status).toBe("blocked");
  });
});
