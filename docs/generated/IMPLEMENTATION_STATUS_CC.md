# Wikiplotter Code Complete — implementation status

## Milestone summary

| Increment | Outcome and significant decisions |
| --- | --- |
| 1A — Account deletion backend | Added trusted-session self-deletion with an ownership blocker. The application coordinator journals cleanup of sessions, provider registration, saved progress, and owned media. Recovery replays completed steps safely before account or application operations continue. Article documents remain unchanged; existing reader placeholders cover missing media. |
| 1B — Account deletion frontend | Proposed steps only; frontend source was not changed in this increment. |

## 1A backend changes

| File | Responsibility updated |
| --- | --- |
| `design/concepts/Registering.md` | Clarifies that unregistering releases the provider identity and later sign-in requires explicit fresh registration. |
| `design/compositions/Accounts.md` | Defines session-derived deletion, the pre-mutation owned-hub refusal, cleanup scope, retained article references, and replay/recovery behavior. |
| `src/compositions/Accounts.ts` | Adds `Accounts.DeleteAccount`; derives the user from the session, refuses owned hubs, ends sessions, and unregisters the user. |
| `src/assembly/accounts.ts` | Runs deletion through the existing operation journal; clears user progress and removes owned media bytes before metadata. Recovery treats already-removed records as complete. |
| `src/http/accounts.ts` | Replaces the 501 response with authenticated, CSRF-protected deletion; returns a clear hub blocker, reports recovery failures, and clears session/progress cookies after success. |
| `src/http/edge.ts` | Runs account API requests through the application gate. Verified-provider callbacks enter the gate after external identity verification. |
| `tests/compositions/Accounts.test.ts` | Covers blocker/no-mutation, full cleanup, retained article references, invalidated sessions, and fresh provider registration. |
| `tests/http/AccountsHttp.test.ts` | Covers session-only authorization, forged user IDs, blocker messaging, interrupted cleanup/retry, session invalidation, and fresh registration through the provider callback. |

Owned hub detection happens before the operation journal or any cleanup mutation. For eligible accounts, sessions and provider registration are removed before progress and media cleanup. Media bytes are deleted before their metadata so recovery can retry using the still-present metadata. Account and application requests wait for pending recovery. Existing image/video unavailable messages remain the fallback for article references whose media was deleted.

## 1B proposed steps

1. Add a typed `AccountsApi.delete()` method in `frontend/src/api/Accounts.ts`, preserving the backend error code and message.
2. Add a focused `DeleteAccountDialog.vue` for the consequences, typed `DELETE` confirmation, loading state, cancellation, server blocker, and retryable failure display.
3. Add a red Delete Account section to the settings tab in `frontend/src/features/Account/AccountPage.vue`; open the dialog from that section and redirect to `/` after success.
4. Add only the small danger-button and dialog styles needed in `frontend/src/styles/features.css`. Keep the existing account layout and modal layering conventions.
5. Add focused frontend tests for confirmation gating and API error handling. `ArticleReader.vue` already shows unavailable-media placeholders, so no reader change is planned.

## Verification

- `bun --env-file=.env.test.local test` — passed: **101 tests across 32 files, 658 assertions** on isolated standalone MongoDB test databases.
- Focused account run — passed: **11 tests across 3 files, 112 assertions**.
- `bun run check:design` — passed for all 15 design files.
- `bun run check:framework` — passed for both application configurations, with 10 existing advisories each.
- `bun x sync-engine artifacts check` and `bun x sync-engine artifacts check --config generated.reader.config.ts` — passed.
- `git diff --check` — passed.
- `bun run typecheck:backend` — reports a TypeScript error in the untouched `tests/compositions/MediaAssets.test.ts` at its `_id` string filter; no new backend source or account test errors were reported.

## Suggested commit message

`feat(accounts): support recoverable account deletion`

- Guard deletion with the authenticated session and refuse users who own hubs.
- Journal session, registration, progress, and media cleanup with retry-safe recovery.
- Preserve article records and require fresh registration for a deleted provider identity.
- Add authorization, blocker, cleanup, retry, and HTTP coverage.

## Remaining Code Complete work

- Implement the proposed 1B account settings dialog and API integration.
- Resolve the existing TypeScript error in `tests/compositions/MediaAssets.test.ts` separately.
