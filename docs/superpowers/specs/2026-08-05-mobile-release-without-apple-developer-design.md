# Mobile v1.0 Release Without Apple Developer Membership

## Goal

Publish a usable v1.0 release from the existing Expo project without requiring a paid Apple Developer account.

## Decision

Use two EAS build profiles in one GitHub Actions release workflow:

- Android `production`: produce the normal Android release artifact.
- iOS `simulator`: produce an iOS Simulator artifact with `ios.simulator: true`.

The GitHub Release will contain the Android release artifact and the iOS Simulator archive. The release notes and README must state that the iOS artifact runs on macOS Xcode Simulator and cannot be installed on a physical iPhone or submitted to the App Store.

## Configuration

`eas.json` will keep the existing `production` profile for Android and add a `simulator` profile with `distribution: internal` and `ios.simulator: true`. The workflow will build Android and iOS separately because EAS profiles differ by platform, then download each platform's latest artifact into clearly named release directories.

The existing Expo project ID, owner, slug, package identifiers, and app version remain unchanged. No Apple credentials are requested for the simulator profile.

## Verification and failure handling

Before cloud builds, CI continues to run typecheck, lint, tests, and Expo Doctor. The workflow must fail if either EAS build fails or if an expected artifact is not downloaded. Android failures remain independent of iOS simulator credential requirements; iOS simulator output is explicitly not treated as an IPA.

## Acceptance criteria

1. CI validation passes on `main`.
2. Android production build completes and its artifact is attached to GitHub Release `v1.0.0`.
3. iOS Simulator build completes without Apple Developer credentials and its archive is attached to the same release.
4. Release documentation clearly distinguishes simulator output from a device-installable IPA.
