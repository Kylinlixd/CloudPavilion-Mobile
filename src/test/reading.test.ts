import { beforeEach, describe, expect, it, vi } from "vitest";

import { apiClient } from "../lib/api";
import { uploadFile } from "../lib/reading";

vi.mock("expo-file-system", () => ({
  File: class FakeFile extends Blob {
    name: string;

    constructor(uri: string) {
      super([`file:${uri}`], { type: "image/jpeg" });
      this.name = uri.split("/").pop() || "upload.jpg";
    }
  },
}));

describe("reading uploads", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("uses a real Blob-backed file part for images", async () => {
    const upload = vi.spyOn(apiClient, "upload").mockResolvedValue({ id: 1 });

    await uploadFile(
      "/excerpts/",
      "image",
      {
        uri: "file:///tmp/quote.jpg",
        name: "quote.jpg",
        mimeType: "image/jpeg",
      },
      8,
      "今天的摘录",
    );

    const form = upload.mock.calls[0][1];
    const image = form.get("image");
    expect(image).toBeInstanceOf(Blob);
    expect((image as Blob).type).toBe("image/jpeg");
    expect(form.get("book")).toBe("8");
    expect(form.get("content")).toBe("今天的摘录");
  });

  it("supports a text-only multipart excerpt without an image part", async () => {
    const upload = vi.spyOn(apiClient, "upload").mockResolvedValue({ id: 2 });

    await uploadFile("/excerpts/", "image", undefined, 8, "只有文字");

    const form = upload.mock.calls[0][1];
    expect(form.get("image")).toBeNull();
    expect(form.get("content")).toBe("只有文字");
  });
});
