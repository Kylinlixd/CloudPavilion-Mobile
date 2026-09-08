# Cover Enrichment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make book cover enrichment reliable by preferring high-confidence online metadata and providing local photo/album upload as a fallback.

**Architecture:** The Django backend remains the single metadata and image-validation boundary. Mobile requests ranked candidates, previews cover thumbnails, and uploads a local image through a dedicated multipart endpoint before saving the book draft.

**Tech Stack:** Django REST Framework, requests, Pillow/private media storage, Expo ImagePicker, React Native, Vitest, pytest.

---

### Task 1: Strengthen metadata confidence and cover normalization

**Files:**
- Modify: `/Users/leexd/CloudPavilion/catalog/reading.py`
- Modify: `/Users/leexd/CloudPavilion/catalog/metadata.py`
- Modify: `/Users/leexd/CloudPavilion/catalog/reading_views.py`
- Test: `/Users/leexd/CloudPavilion/catalog/tests/test_reading.py`

- [ ] Write failing tests for ISBN-exact filtering, HTTPS cover normalization, and provider fallback when a result has no cover.
- [ ] Run `DJANGO_SETTINGS_MODULE=cloudpavilion.settings_dev .venv/bin/python -m pytest catalog/tests/test_reading.py -q` and verify the new tests fail.
- [ ] Add a shared metadata confidence helper that normalizes ISBN-10/ISBN-13 and rejects an ISBN candidate that conflicts with the requested ISBN.
- [ ] Ensure Google, Douban, and Open Library candidates always pass cover URLs through `_https_url`; retain text-only candidates without replacing an existing cover.
- [ ] Run the focused tests and then the full backend suite; expected result is all tests passing.
- [ ] Commit as `feat: rank metadata candidates and validate covers`.

### Task 2: Add authenticated local cover upload endpoint

**Files:**
- Modify: `/Users/leexd/CloudPavilion/catalog/reading_views.py`
- Modify: `/Users/leexd/CloudPavilion/catalog/urls.py`
- Modify: `/Users/leexd/CloudPavilion/catalog/serializers.py`
- Test: `/Users/leexd/CloudPavilion/catalog/tests/test_reading.py`

- [ ] Write failing API tests for valid JPEG/PNG upload, invalid MIME/oversized image rejection, missing family rejection, and response URL/path.
- [ ] Run the focused tests and verify failure before implementation.
- [ ] Implement `POST /api/v1/book-metadata/cover/` with `IsAuthenticated` and `IsFamilyMember`, reuse `clean_image`, save to private storage, and return a stable cover reference.
- [ ] Add cleanup on persistence failure and rate limiting using the existing upload throttle.
- [ ] Run focused and full backend tests; expected result is all passing.
- [ ] Commit as `feat: add local cover upload endpoint`.

### Task 3: Wire mobile local cover selection and upload

**Files:**
- Modify: `/Users/leexd/CloudPavilion-Mobile/src/lib/reading.ts`
- Modify: `/Users/leexd/CloudPavilion-Mobile/src/lib/books.ts`
- Modify: `/Users/leexd/CloudPavilion-Mobile/src/components/MetadataPicker.tsx`
- Modify: `/Users/leexd/CloudPavilion-Mobile/src/screens/AddBookScreen.tsx`
- Test: `/Users/leexd/CloudPavilion-Mobile/src/test/api.test.ts`
- Test: `/Users/leexd/CloudPavilion-Mobile/src/test/books.test.ts`

- [ ] Add tests for multipart cover upload and preserving the returned cover URL in a `BookDraft`.
- [ ] Run `npm test -- --run` and verify new tests fail.
- [ ] Add `pickCoverFromLibrary` and `takeCoverPhoto` helpers using Expo ImagePicker; upload selected assets to `/book-metadata/cover/` and return the server cover URL.
- [ ] Add explicit “从相册选择封面” and “拍照封面” controls in the manual form, keeping manual fields intact when permission is denied or upload fails.
- [ ] Use the online `cover_url` first; when empty or upload succeeds, show the local cover preview and send it with the book intake request.
- [ ] Run typecheck, lint, and Vitest; expected result is all passing.
- [ ] Commit as `feat: support local cover fallback on mobile`.

### Task 4: Show cover confidence and thumbnails in candidate picker

**Files:**
- Modify: `/Users/leexd/CloudPavilion-Mobile/src/components/MetadataPicker.tsx`
- Modify: `/Users/leexd/CloudPavilion-Mobile/src/lib/books.ts`
- Test: `/Users/leexd/CloudPavilion-Mobile/src/test/books.test.ts`

- [ ] Add a test fixture with Google, Douban, Open Library, and text-only candidates and assert source/cover fields remain intact.
- [ ] Render a small cover thumbnail when `cover_url` exists, source label, and a clear no-cover label otherwise.
- [ ] Keep selection as an explicit user action; never auto-save a low-confidence result.
- [ ] Run mobile checks and commit as `feat: preview metadata cover candidates`.

### Task 5: Deploy and verify on production and iPhone

**Files:**
- Modify: `/Users/leexd/CloudPavilion/deploy/docker-compose.prod.yml` only if the endpoint requires an existing media setting change.
- Modify: `/Users/leexd/CloudPavilion/deploy/nginx.conf` only if upload limits need adjustment.

- [ ] Run backend and mobile verification suites.
- [ ] Create a dated server backup of changed backend files and production database metadata before deployment.
- [ ] Deploy the backend, run migrations if required, and check `/cloudpavilion/health/ready/`.
- [ ] Smoke test authenticated Chinese search with `余华`, verify a Douban candidate contains an HTTPS cover URL, upload a local JPEG, and confirm the returned cover reference.
- [ ] Build a signed Release app with team `M7U9C9L2DF`, install to UDID `00008130-0002345A02E2001C`, and validate manual search, cover preview, album upload, camera permission fallback, and saved cover in catalog/detail.
- [ ] Commit any deployment documentation separately; do not alter user-owned `README.md`, `core/static/`, or `src/lib/books.ts` changes unrelated to this feature.
