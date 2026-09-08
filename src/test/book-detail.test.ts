import { describe, expect, it } from "vitest";
import {
  bookDetailCoverWidth,
  missingMetadataPatch,
  pickDescription,
} from "../lib/bookDetail";

describe("book detail metadata layout", () => {
  it("uses a wider cover ratio on phone and compact ratio on tablet", () => {
    expect(bookDetailCoverWidth(390, false)).toBe(145);
    expect(bookDetailCoverWidth(1024, true)).toBe(250);
  });

  it("chooses the first candidate with a non-empty description", () => {
    expect(
      pickDescription([{ description: "" }, { description: "简介" }]),
    ).toBe("简介");
  });

  it("patches only fields missing locally", () => {
    expect(
      missingMetadataPatch(
        { author: "", publisher: "本地出版社", description: "" },
        {
          author: "余华",
          publisher: "联网出版社",
          description: "联网简介",
          cover_url: "https://cover",
        },
      ),
    ).toEqual({
      author: "余华",
      description: "联网简介",
      cover_url: "https://cover",
    });
  });
});
