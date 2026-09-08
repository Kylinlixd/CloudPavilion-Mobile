export type BookDetailMetadata = {
  author?: string;
  publisher?: string;
  publish_date?: string | null;
  category?: string;
  description?: string;
  cover_url?: string;
};

export function bookDetailCoverWidth(windowWidth: number, isTablet: boolean) {
  const contentWidth = Math.max(0, windowWidth - 32);
  const preferred = Math.round(contentWidth * (isTablet ? 0.3 : 0.405));
  return Math.min(
    isTablet ? 230 : 130,
    Math.max(isTablet ? 190 : 112, preferred),
  );
}

export function pickDescription(candidates: { description?: string }[]) {
  return (
    candidates
      .find((candidate) => candidate.description?.trim())
      ?.description?.trim() || ""
  );
}

export function missingMetadataPatch(
  local: BookDetailMetadata,
  remote: BookDetailMetadata,
) {
  const patch: BookDetailMetadata = {};
  for (const field of [
    "author",
    "publisher",
    "publish_date",
    "category",
    "description",
    "cover_url",
  ] as const) {
    if (!local[field] && remote[field]) patch[field] = remote[field];
  }
  return patch;
}
