# CloudPavilion Mobile Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Build and publish a shared Expo React Native app for Android and iOS.

**Architecture:** Expo SDK 57, React Native, TypeScript, React Navigation, SecureStore, typed API client, auth/family contexts, and focused screens. One codebase produces Android and iOS builds.

**Tech Stack:** Expo, React Native, TypeScript, React Navigation, Expo SecureStore, Vitest, React Native Testing Library.

---

### Task 1: Bootstrap the Expo workspace

**Files:**
- Create: `package.json`, `app.json`, `babel.config.js`, `tsconfig.json`, `metro.config.js`
- Create: `App.tsx`, `index.ts`, `.env.example`, `.gitignore`, `README.md`

- [ ] **Step 1:** Add Expo SDK 57 scripts and dependencies for navigation, SecureStore, safe-area handling, and testing.
- [ ] **Step 2:** Configure a shared iOS/Android bundle identifier, app display name, colors, and API env variable.
- [ ] **Step 3:** Run `npm install` and `npm run typecheck`.

### Task 2: Implement mobile API, persistence, auth, family context, and navigation

**Files:**
- Create: `src/lib/api.ts`, `src/lib/types.ts`, `src/lib/storage.ts`
- Create: `src/context/AuthContext.tsx`, `src/context/FamilyContext.tsx`
- Create: `src/navigation/RootNavigator.tsx`, `src/navigation/types.ts`
- Create: `src/screens/LoginScreen.tsx`, `src/components/Screen.tsx`, `src/components/LoadingState.tsx`, `src/components/ErrorState.tsx`
- Create: `src/test/api.test.ts`, `src/test/AuthContext.test.tsx`

- [ ] **Step 1:** Write failing tests for auth headers, token refresh, and SecureStore logout.
- [ ] **Step 2:** Implement the typed request helper, one-time refresh, persistence, and contexts.
- [ ] **Step 3:** Add auth stack, bottom tabs, protected app stack, and login form.
- [ ] **Step 4:** Run tests and typecheck.

### Task 3: Build the native visual system and home screen

**Files:**
- Create: `src/theme/colors.ts`, `src/theme/spacing.ts`, `src/theme/typography.ts`
- Create: `src/components/AppHeader.tsx`, `src/components/BookCover.tsx`, `src/components/MetricTile.tsx`, `src/components/BookRail.tsx`
- Create: `src/screens/HomeScreen.tsx`

- [ ] **Step 1:** Define ink/paper/terracotta tokens, type scale, spacing, radii, and shadows.
- [ ] **Step 2:** Implement home greeting, family context, metrics, active loan, recommendation rail, and primary actions.
- [ ] **Step 3:** Add pull-to-refresh, loading state, empty family state, and retryable errors.

### Task 4: Implement catalog and lending screens

**Files:**
- Create: `src/components/BookCard.tsx`, `src/components/ActionButton.tsx`, `src/components/StatusPill.tsx`
- Create: `src/screens/CatalogScreen.tsx`, `src/screens/BookDetailScreen.tsx`, `src/screens/LoansScreen.tsx`, `src/screens/ReservationsScreen.tsx`

- [ ] **Step 1:** Add debounced catalog search and FlatList rendering.
- [ ] **Step 2:** Add book detail copy state, checkout, reserve, return and renew actions.
- [ ] **Step 3:** Add reservation cancellation and native confirmation states.

### Task 5: Implement notifications, reports, settings, verification, and publish

**Files:**
- Create: `src/screens/NotificationsScreen.tsx`, `src/screens/ReportsScreen.tsx`, `src/screens/SettingsScreen.tsx`
- Create: `src/components/ReportBar.tsx`, `src/test/screens.test.tsx`
- Modify: `README.md`, `package.json`

- [ ] **Step 1:** Add notification list, mark-read/all actions, reports summary, and settings members/logout.
- [ ] **Step 2:** Run `npm run lint`, `npm run typecheck`, `npm test -- --run`, and `npx expo export --platform android`.
- [ ] **Step 3:** Run `npx expo export --platform ios` when the local Expo toolchain supports the export target.
- [ ] **Step 4:** Initialize Git, create `Kylinlixd/CloudPavilion-Mobile`, and push `main`.
