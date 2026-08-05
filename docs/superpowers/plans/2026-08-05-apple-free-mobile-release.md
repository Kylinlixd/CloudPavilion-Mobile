# Apple-Free Mobile Release Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish Android production output and an iOS Simulator archive for v1.0.0 without Apple Developer credentials.

**Architecture:** Keep the existing Android `production` EAS profile and add a separate iOS `simulator` profile. GitHub Actions will run two platform-specific EAS builds, download their artifacts into separate directories, and attach both to the existing `v1.0.0` GitHub Release.

**Tech Stack:** Expo SDK 57, EAS CLI, GitHub Actions, JSON configuration, Markdown documentation.

---

### Task 1: Add the iOS Simulator EAS profile

**Files:**
- Modify: `/Users/leexd/CloudPavilion-Mobile/eas.json`

- [ ] Add a `simulator` profile with `distribution: internal` and `ios.simulator: true`, keeping `production` unchanged for Android.
- [ ] Validate the profile with `npx expo config --type public` and `npx expo-doctor`.

### Task 2: Split the release workflow by platform

**Files:**
- Modify: `/Users/leexd/CloudPavilion-Mobile/.github/workflows/mobile-release.yml`

- [ ] Replace the combined `--platform all --profile production` command with an Android production build and an iOS simulator build.
- [ ] Download Android artifacts into `artifacts/android` and iOS Simulator archives into `artifacts/ios`.
- [ ] Fail explicitly when either artifact directory is empty, then upload both directories to the existing `v1.0.0` release.

### Task 3: Document release artifact expectations

**Files:**
- Modify: `/Users/leexd/CloudPavilion-Mobile/README.md`

- [ ] State that Android is the device-installable production artifact.
- [ ] State that iOS output is for macOS Xcode Simulator only and is not an IPA for physical iPhones or App Store submission.
- [ ] Include the simulator build command for local reproduction.

### Task 4: Verify, commit, and run the release

**Files:**
- Verify: `/Users/leexd/CloudPavilion-Mobile/eas.json`
- Verify: `/Users/leexd/CloudPavilion-Mobile/.github/workflows/mobile-release.yml`
- Verify: `/Users/leexd/CloudPavilion-Mobile/README.md`

- [ ] Run `npm run typecheck`, `npm run lint`, `npm test -- --run`, `npx expo-doctor`, and `git diff --check`.
- [ ] Commit and push the configuration and documentation changes to `main`.
- [ ] Trigger `mobile-release.yml` with `tag=v1.0.0` and verify the GitHub Release has Android and iOS Simulator assets.
