# Library and Profile Navigation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Redesign the mobile catalog for dense six-column browsing and replace the bottom Notifications tab with a useful My/Profile area.

**Architecture:** Keep existing catalog, loans, and notifications APIs. Refactor only the mobile presentation and navigation: CatalogScreen owns search/sort and a virtualized six-column grid; ProfileScreen composes account, family, notification summary, and reading metrics while linking to the existing full NotificationsScreen.

**Tech Stack:** React Native, React Navigation bottom tabs/native stack, FlatList virtualization, existing API client and contexts, Vitest.

---

### Task 1: Add profile tab and notification summary data

**Files:**
- Modify: `/Users/leexd/CloudPavilion-Mobile/src/navigation/types.ts`
- Modify: `/Users/leexd/CloudPavilion-Mobile/src/navigation/RootNavigator.tsx`
- Create: `/Users/leexd/CloudPavilion-Mobile/src/screens/ProfileScreen.tsx`
- Test: `/Users/leexd/CloudPavilion-Mobile/src/test/app-shell.test.ts`

- [ ] Add `Profile` to `MainTabParamList` and replace the `Notifications` tab with it.
- [ ] Create `ProfileScreen` that loads `/auth/me/`, `/notifications/`, `/reports/annual/`, and `/reports/dashboard/` when a family is selected.
- [ ] Render user identity, current family, unread count, latest three notifications, annual loans, reading progress, and excerpt count; add links to Settings and full NotificationsScreen.
- [ ] Preserve loading/error/empty states and safe-area bottom padding.
- [ ] Update navigation tests and run `npm test -- --run`.
- [ ] Commit as `feat: add profile tab with notification summary`.

### Task 2: Refactor catalog into dense six-column virtualized shelf

**Files:**
- Modify: `/Users/leexd/CloudPavilion-Mobile/src/screens/CatalogScreen.tsx`
- Modify: `/Users/leexd/CloudPavilion-Mobile/src/components/BookCover.tsx`
- Test: `/Users/leexd/CloudPavilion-Mobile/src/test/books.test.ts`

- [ ] Add a sort selector for recent, title, category, and reading order; map each selection to API ordering/search parameters.
- [ ] Change `FlatList` to six columns with calculated item width, stable `columnWrapperStyle`, `initialNumToRender`, `maxToRenderPerBatch`, and `windowSize`.
- [ ] Keep search, pull-to-refresh, add-book, ebook import, and detail navigation intact.
- [ ] Ensure empty/missing cover cards use the CloudPavilion placeholder and titles truncate to two lines.
- [ ] Add tests for ordering query construction and six-column item rendering assumptions.
- [ ] Run typecheck, lint, and tests; commit as `feat: optimize catalog shelf for large libraries`.

### Task 3: Add long-press book actions and polish responsive layout

**Files:**
- Modify: `/Users/leexd/CloudPavilion-Mobile/src/screens/CatalogScreen.tsx`
- Modify: `/Users/leexd/CloudPavilion-Mobile/src/screens/BookDetailScreen.tsx`

- [ ] Add long-press action menu with borrow/detail, share excerpt, and edit/delete placeholders only where existing APIs support the action.
- [ ] Keep unsupported destructive actions out of the menu; show a clear detail action instead.
- [ ] Verify content bottom padding remains above the permanent tab bar on iPhone 15 Pro Max.
- [ ] Run mobile checks and commit as `feat: add shelf item actions and spacing polish`.

### Task 4: Verify full flow on production and device

**Files:**
- No source changes unless verification exposes a regression.

- [ ] Run mobile typecheck, lint, and Vitest; run backend regression suite.
- [ ] Build Release with team `M7U9C9L2DF`, install to UDID `00008130-0002345A02E2001C`.
- [ ] Create or use a family containing enough books to visually inspect six-column scrolling and search/sort.
- [ ] Verify bottom tabs are 工作台/藏书/借阅/我的, notification summary links to full notifications, and Settings remains reachable.
- [ ] Capture any remaining mirror-only limitations separately from real-device behavior.
