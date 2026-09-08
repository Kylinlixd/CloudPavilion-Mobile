import { beforeEach, describe, expect, it, vi } from "vitest";

import { apiClient } from "../lib/api";
import {
  addBookToFamily,
  checkBookDuplicate,
  createSubmissionGuard,
  lookupBookByIsbn,
  normalizeScannedIsbn,
  type BookDraft,
} from "../lib/books";

const draft: BookDraft = {
  title: " 活着 ",
  author: " 余华 ",
  isbn: "9787506365437",
  publisher: " 作家出版社 ",
  publish_date: "",
  category: " 小说 ",
  description: " 一本小说 ",
  cover_url: "https://covers.example/alive.jpg",
  barcode: " COPY-001 ",
  notes: " 客厅 ",
};

describe("book intake client", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("normalizes valid ISBN-13 scans and rejects other barcodes", () => {
    expect(normalizeScannedIsbn("978-7-5063-6543-7")).toBe("9787506365437");
    expect(normalizeScannedIsbn("6901234567892")).toBeNull();
    expect(normalizeScannedIsbn("9787506365438")).toBeNull();
  });

  it("looks up a normalized ISBN", async () => {
    const result = {
      title: "活着",
      author: "余华",
      isbn: "9787506365437",
      source: "google" as const,
    };
    const get = vi.spyOn(apiClient, "get").mockResolvedValue(result);

    await expect(lookupBookByIsbn("978-7-5063-6543-7")).resolves.toEqual(
      result,
    );

    expect(get).toHaveBeenCalledWith("/books/lookup/?isbn=9787506365437");
  });

  it("trims the intake payload and omits an empty publication date", async () => {
    const result = { book: { id: 9 }, copy: { id: 12 } };
    const post = vi.spyOn(apiClient, "post").mockResolvedValue(result);

    await expect(addBookToFamily(draft)).resolves.toEqual(result);

    expect(post).toHaveBeenCalledWith("/book-copies/add-book/", {
      title: "活着",
      author: "余华",
      isbn: "9787506365437",
      publisher: "作家出版社",
      category: "小说",
      description: "一本小说",
      cover_url: "https://covers.example/alive.jpg",
      barcode: "COPY-001",
      notes: "客厅",
    });
  });

  it("checks duplicate books before asking to add another copy", async () => {
    const post = vi
      .spyOn(apiClient, "post")
      .mockResolvedValue({ exists: true, copy_count: 2 });
    await expect(checkBookDuplicate(draft)).resolves.toMatchObject({
      exists: true,
      copy_count: 2,
    });
    expect(post).toHaveBeenCalledWith("/book-copies/check-duplicate/", {
      title: "活着",
      author: "余华",
      isbn: "9787506365437",
    });
  });

  it("drops a second submission while the first is in flight", async () => {
    let release!: () => void;
    const submit = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          release = resolve;
        }),
    );
    const guarded = createSubmissionGuard(submit);

    const first = guarded();
    await expect(guarded()).resolves.toBeUndefined();
    expect(submit).toHaveBeenCalledTimes(1);
    release();
    await first;

    const third = guarded();
    expect(submit).toHaveBeenCalledTimes(2);
    release();
    await third;
  });
});
