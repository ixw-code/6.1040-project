# Wikiplotter Code Complete — implementation status

## Milestone summary

| Increment | Outcome and significant decisions |
| --- | --- |
| 1A — Account deletion backend | Added trusted-session self-deletion with an ownership blocker. The application coordinator journals cleanup of sessions, provider registration, saved progress, and owned media. Recovery replays completed steps safely before account or application operations continue. Article documents remain unchanged; existing reader placeholders cover missing media. |
| 1B — Account deletion frontend | Added a protected delete flow in account settings with typed confirmation, ownership-blocker messaging, retryable errors, and logout redirect after success. |

## 1A backend changes

| File | Responsibility updated |
| --- | --- |
| `design/concepts/Registering.md` | Clarifies that unregistering releases the provider identity and later sign-in requires explicit fresh registration. |
| `design/compositions/Accounts.md` | Defines session-derived deletion, the pre-mutation owned-hub refusal, cleanup scope, retained article references, and replay/recovery behavior. |
| `src/compositions/Accounts.ts` | Adds `Accounts.DeleteAccount`; derives the user from the session, refuses owned hubs, ends sessions, and unregisters the user. |
| `src/assembly/accounts.ts` | Runs deletion through the existing operation journal; clears user progress and removes owned media bytes before metadata. Recovery treats already-removed records as complete. |
| `src/http/accounts.ts` | Replaces the 501 response with authenticated, CSRF-protected deletion; returns a clear hub blocker, reports recovery failures, and clears session/progress cookies after success. |
| `src/assembly/accounts.ts` | Adds a read-only eligibility check derived from the authenticated session; deletion still repeats the ownership check before mutation. |
| `src/http/edge.ts` | Runs account API requests through the application gate. Verified-provider callbacks enter the gate after external identity verification. |
| `tests/compositions/Accounts.test.ts` | Covers blocker/no-mutation, full cleanup, retained article references, invalidated sessions, and fresh provider registration. |
| `tests/http/AccountsHttp.test.ts` | Covers session-only authorization, forged user IDs, blocker messaging, interrupted cleanup/retry, session invalidation, and fresh registration through the provider callback. |

Owned hub detection happens before the operation journal or any cleanup mutation. For eligible accounts, sessions and provider registration are removed before progress and media cleanup. Media bytes are deleted before their metadata so recovery can retry using the still-present metadata. Account and application requests wait for pending recovery. Existing image/video unavailable messages remain the fallback for article references whose media was deleted.

## 1B frontend changes

| File | Responsibility updated |
| --- | --- |
| `frontend/src/api/Accounts.ts` | Adds `AccountsApi.delete()` without a caller-supplied identity and preserves backend error codes and messages. |
| `src/http/accounts.ts` | Adds the authenticated `GET /api/accounts/delete-eligibility` preflight so owners see the blocker before confirmation. |
| `frontend/src/api/Accounts.ts` | Adds the read-only eligibility request and preserves blocker and server error messages. |
| `frontend/src/features/Account/DeleteAccountDialog.vue` | Checks eligibility first; owners see only the blocker, while eligible users get concise consequences, exact `DELETE` confirmation, loading, cancellation, and retryable failures. |
| `frontend/src/features/Account/delete-account.ts` | Shares the exact confirmation check with the focused frontend test. |
| `frontend/src/features/Account/AccountPage.vue` | Keeps settings in one panel, places deletion under a divided Security section, leaves Log out after the sections, and redirects home after successful deletion. |
| `frontend/src/styles/features.css` | Styles the divided Security section and centered dialog using the existing modal layer. |
| `frontend/tests/accounts.test.ts` | Covers confirmation matching, identity-free request construction, and blocker code/message handling. |

The eligibility check uses only the trusted session cookie and returns no hub details. The existing `POST /api/accounts/delete` endpoint remains the final authorization boundary and repeats the ownership check to handle changes after preflight. No concept, composition, or generated-client changes were needed. Existing unavailable-media placeholders remain the fallback for article references to deleted media.

## Verification

- `bun --env-file=.env.test.local test` — passed: **105 tests across 33 files, 675 assertions** on isolated standalone MongoDB test databases.
- Focused account run — passed: **11 tests across 3 files, 112 assertions**.
- `bun run check:design` — passed for all 15 design files.
- `bun run check:framework` — passed for both application configurations, with 10 existing advisories each.
- `bun x sync-engine artifacts check` and `bun x sync-engine artifacts check --config generated.reader.config.ts` — passed.
- `git diff --check` — passed.
- `bun run typecheck:backend` — reports a TypeScript error in the untouched `tests/compositions/MediaAssets.test.ts` at its `_id` string filter; no new backend source or account test errors were reported.
- `bun run typecheck:frontend` — passed.
- `bun run build:frontend:prod` — passed; Vite emitted the existing Node built-in externalization warnings from sync-engine browser dependencies.
- `bun test frontend/tests/accounts.test.ts` — passed: **4 tests, 13 assertions**.
- `bun --env-file=.env.test.local test tests/http/AccountsHttp.test.ts` — passed: **5 tests, 64 assertions**.
- `bun --env-file=.env.test.local test` — passed: **105 tests across 33 files, 675 assertions**.
- `git diff --check` — passed after the implementation changes.

## Suggested commit message

`feat(accounts): complete protected account deletion flow`

- Complete backend deletion with ownership safeguards and retry-safe cleanup.
- Check hub ownership before prompting, then keep the delete-time authorization check.
- Add the settings dialog with clear consequences, typed confirmation, and success redirect.
- Cover deletion authorization, recovery, and frontend request handling.

## Remaining Code Complete work

- Resolve the existing TypeScript error in `tests/compositions/MediaAssets.test.ts` separately.
