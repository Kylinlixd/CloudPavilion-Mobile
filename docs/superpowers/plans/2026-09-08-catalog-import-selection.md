# Catalog Import and Selection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Rename the home tab, consolidate catalog imports into a top-right menu, and add multi-select book management.

**Architecture:** Keep existing navigation destinations and API clients. CatalogScreen owns menu/selection state and a virtualized six-column grid; bulk operations call existing endpoints where available and show explicit feedback where a backend capability is absent.

**Tech Stack:** React Native, React Navigation, FlatList, Alert/Modal, existing API client, Vitest.

---

### Task 1: Rename navigation and add import menu

**Files:**
- Modify: `/Users/leexd/CloudPavilion-Mobile/src/navigation/RootNavigator.tsx`
- Modify: `/Users/leexd/CloudPavilion-Mobile/src/screens/CatalogScreen.tsx`
- Modify: `/Users/leexd/CloudPavilion-Mobile/src/test/app-shell.test.ts`

- [ ] Change the tab title from `工作台` to `首页`.
- [ ] Remove the inline scan/manual and ebook import buttons from the catalog body.
- [ ] Add top-right `导入` and `选择` actions beside the catalog header.
- [ ] Open an ActionSheet/Modal with scan/manual entity book and ebook import actions, closing after navigation.
- [ ] Run mobile tests and commit `feat: consolidate catalog import actions`.

### Task 2: Implement selection mode and select-all state

**Files:**
- Modify: `/Users/leexd/CloudPavilion-Mobile/src/screens/CatalogScreen.tsx`
- Test: `/Users/leexd/CloudPavilion-Mobile/src/test/books.test.ts`

- [ ] Add selected ID state, `全选/取消全选`, and `取消` controls.
- [ ] Make grid cards toggle selection in selection mode and preserve normal detail navigation otherwise.
- [ ] Render selected checkmarks over covers and a fixed bottom action bar with safe-area padding.
- [ ] Verify selection remains stable while searching/sorting and resets after leaving mode.
- [ ] Add unit tests for select-all/toggle behavior and run Vitest.
- [ ] Commit `feat: add catalog multi-select mode`.

### Task 3: Add bulk operations and feedback

**Files:**
- Modify: `/Users/leexd/CloudPavilion-Mobile/src/screens/CatalogScreen.tsx`
- Modify: `/Users/leexd/CloudPavilion-Mobile/src/lib/api.ts` only if a DELETE helper is required.
- Test: `/Users/leexd/CloudPavilion-Mobile/src/test/api.test.ts`

- [ ] Add confirmation before bulk delete and call `DELETE /books/{id}/` for each selected book, then refresh.
- [ ] Add category action that prompts for a category and patches each selected book with `{ category }`.
- [ ] Add read/unread action that targets ebooks when available; if no supported endpoint exists, show a clear “电子书阅读状态在详情中管理” message without mutating data.
- [ ] Keep batch cancel local-only and clear selection after successful operations.
- [ ] Test DELETE/PATCH request construction and run typecheck, lint, and Vitest.
- [ ] Commit `feat: support catalog bulk actions`.

### Task 4: Build, install, and verify on iPhone

**Files:**
- No source changes unless device verification reveals a regression.

- [ ] Build Release with development team `M7U9C9L2DF` and install to UDID `00008130-0002345A02E2001C`.
- [ ] Verify bottom labels：首页/藏书/借阅/我的.
- [ ] Verify import menu actions, selection mode, select-all, cancel, delete confirmation, category prompt, and bottom bar safe area.
- [ ] Run mobile tests and report any iPhone Mirroring camera limitations separately.
