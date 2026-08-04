# CloudPavilion Mobile Design

## Goal

Build one Expo React Native application that runs on Android and iOS against the existing CloudPavilion `/api/v1/` backend.

## Product direction

The mobile app is a pocket library for quick, repeated actions rather than a compressed admin dashboard. It keeps the Web visual language—deep ink green, paper white, terracotta actions, and Outfit-like editorial typography—but rebalances it for touch: 44px minimum targets, bottom navigation, horizontal book rails, short cards, and immediate action sheets.

## Architecture

Expo SDK 57 with React Native and TypeScript is the single cross-platform source. React Navigation provides native-style stack and bottom-tab transitions. A typed API client shares the backend contract with the Web app, injects JWT and `X-Family-ID`, refreshes access tokens once on 401, and stores session data in SecureStore. Context providers own auth and family selection; screen-level hooks own request state. The app does not duplicate server state in a global cache during the MVP.

## Navigation and screens

- Auth stack: Login, with optional family ID entry.
- Main tabs: Home, Catalog, Loans, Notifications.
- Stack screens: Book detail, Reservations, Reports, Settings.
- Home: greeting, current family, circulation summary, active loan, recommendation rail, next action.
- Catalog: debounced search, book cards, detail and copy actions.
- Loans: active loans first, return and renew buttons, historical records.
- Notifications: unread count, mark one/all read.
- Settings: current family ID/name, members and logout.

## API contract

The app targets `EXPO_PUBLIC_API_BASE_URL` and calls the same routes as the Web app. Protected requests include `Authorization: Bearer <access-token>` and family requests include `X-Family-ID`. The client covers token obtain/refresh/logout, reports dashboard/recommendations, books/book-copies, loans checkout/return/renew, reservations create/cancel, notifications and memberships.

## Native behavior

The first release includes Safe Area handling, keyboard-aware login, pull-to-refresh, loading skeletons, retryable error states, tactile disabled states, and native navigation. Expo Notifications, camera barcode scanning, biometric unlock, and WebSocket live events are isolated as future modules so the initial build remains deterministic and testable.

## Accessibility and performance

Text scales with the system font setting, controls expose labels and hints, colors remain readable on paper and ink surfaces, and large lists use `FlatList`. Images use remote book covers with a fallback color treatment. The app uses platform-specific navigation defaults and avoids heavy animation on reduced-motion settings.

## Acceptance criteria

1. Android and iOS can run the same project with Expo.
2. Login, token refresh, family selection, catalog search, book detail, checkout/return/renew, reservations, notifications and settings are wired to the backend.
3. Refreshing the app preserves the session through SecureStore until logout or token failure.
4. `npm run typecheck`, `npm run lint`, and `npm test -- --run` pass.
5. The new repository is published as `Kylinlixd/CloudPavilion-Mobile`.
