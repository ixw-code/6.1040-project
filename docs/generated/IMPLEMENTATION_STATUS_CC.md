# Wikiplotter Code Complete — implementation status

## Milestone summary

| Increment | Outcome and significant decisions |
| --- | --- |
| 1A — Account deletion backend | Added trusted-session self-deletion with an ownership blocker. The application coordinator journals cleanup of sessions, provider registration, saved progress, and owned media. Recovery replays completed steps safely before account or application operations continue. Article documents remain unchanged; existing reader placeholders cover missing media. |
| 1B — Account deletion frontend | Added a protected delete flow in account settings with typed confirmation, ownership-blocker messaging, retryable errors, and logout redirect after success. |
| 2A — Hub flow and navigation | Added a dedicated name-only hub creation page, starts new hubs with only NotStarted, shows duplicate-name/slug errors inline, and resolves hub progress before rendering the hub page. |
| 2B — Progress and return navigation | Reuses a spoiler-aware progress popup in hubs and account data, confirms before advancing progress, and safely resumes internal return paths after login or registration. |

## 1A backend changes

| File | Responsibility updated |
| --- | --- |
| `design/concepts/Registering.md` | Clarifies that unregistering releases the provider identity and later sign-in requires explicit fresh registration. |
| `design/compositions/Accounts.md` | Defines session-derived deletion, the pre-mutation owned-hub refusal, cleanup scope, retained article references, and replay/recovery behavior. |
| `src/compositions/Accounts.ts` | Adds `Accounts.DeleteAccount`; derives the user from the session, refuses owned hubs, ends sessions, and unregisters the user. |
| `src/assembly/accounts.ts` | Runs deletion through the existing operation journal, clears user progress and media safely, and exposes a session-derived eligibility check; deletion repeats the ownership check before mutation. |
| `src/http/accounts.ts` | Replaces the 501 response with authenticated, CSRF-protected deletion; returns a clear hub blocker, reports recovery failures, and clears session/progress cookies after success. |
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

## Milestone 2A — Hub flow and navigation

| File | Responsibility updated |
| --- | --- |
| `frontend/src/features/Home/HomePage.vue` | Changes Start a Hub from an expanding homepage form to a link to the dedicated creation page. |
| `frontend/src/features/Hub/HubCreatePage.vue` | Adds the name-only creation page using the registration card layout, with an inline conflict message and redirect to the new hub. |
| `frontend/src/App.vue` | Adds `/hubs/new`; checks progress while the route is loading and replaces a progress-less hub URL with its welcome URL before rendering. Shows a retry state if progress cannot be checked. |
| `frontend/src/features/Hub/HubHome.vue` | Removes its late mounted redirect because App resolves progress before rendering this page. |
| `frontend/src/features/Hub/HubSettings.vue` | Groups hub details, checkpoints, and deletion into settings sections; stages name/slug edits behind Change controls and a confirmed Save action; requires the exact hub name to delete and explains cleanup consequences. Back link, name label, inline slug editor, and delete alignment follow the requested layout. |
| `frontend/src/features/Hub/hub-settings.ts`, `frontend/tests/hubs.test.ts` | Encodes and tests exact-name confirmation for hub deletion. |
| `frontend/src/components/HubChrome.vue` | Hosts the shared reading-progress control in hub navigation. |
| `frontend/src/api/Hubs.ts`, `frontend/src/lib/routes.ts` | Makes hub creation name-only and adds creation/progress route helpers. |
| `frontend/src/styles/features.css`, `frontend/src/styles/layout.css`, `frontend/src/styles/responsive.css` | Styles the registration-like creation page, compact centered progress selector, and hub settings layout/dialog; removes the old homepage form styles. |
| `design/compositions/Hubs.md`, `src/compositions/Hubs.ts` | Updates CreateHub to create a NotStarted-only sequence; creators add ordinary checkpoints later. |
| `src/assembly/hubs.ts`, `src/http/hubs.ts` | Accepts name-only creation and preserves recovery of already-journaled legacy creations. |
| `tests/fixture-application.ts` and hub/reader HTTP, composition, acceptance tests | Updates creation fixtures and verifies new hubs begin with NotStarted only. |
| `frontend/tests/routes.test.ts` | Covers `/hubs/new` and welcome-versus-hub routing for missing progress versus NotStarted. |

URL changes: `/hubs/new` is the dedicated creation page. Existing hub URLs remain `/<slug>`; when progress is missing, the app replaces that URL with `/<slug>/welcome` before rendering. `POST /api/hubs/create` keeps its path but now accepts `{ name }` without a first-checkpoint label.

## Verification

- `bun --env-file=.env.test.local test` — passed: **106 tests across 33 files, 679 assertions** on isolated standalone MongoDB test databases.
- Focused account run — passed: **11 tests across 3 files, 112 assertions**.
- `bun run check:design` — passed for all 15 design files.
- `bun run check:framework` — passed for both application configurations, with 10 existing advisories each.
- `bun x sync-engine artifacts check` and `bun x sync-engine artifacts check --config generated.reader.config.ts` — passed.
- `git diff --check` — passed.
- Previous backend typecheck failure in `tests/compositions/MediaAssets.test.ts` was a test collection typing mismatch; fixed by declaring the stored string `_id` type. The latest full static check passes.
- `bun run typecheck:frontend` — passed.
- `bun run build:frontend:prod` — passed; Vite emitted the existing Node built-in externalization warnings from sync-engine browser dependencies.
- `bun test frontend/tests/accounts.test.ts` — passed: **4 tests, 13 assertions**.
- `bun --env-file=.env.test.local test tests/http/AccountsHttp.test.ts` — passed: **5 tests, 64 assertions**.
- Milestone 2A: `bun run typecheck:frontend`, `bun run check:design`, `bun run check:framework`, and `bun run check:artifacts` passed; framework checks report 10 existing advisories per configuration.
- Milestone 2A production frontend build passed with existing sync-engine Node built-in externalization warnings.
- `git diff --check` — passed after the implementation changes.
- Follow-up hub UI refinement: `bun run typecheck:frontend`, `bun test frontend/tests` (**22 tests, 69 assertions**), `bun run build:frontend:prod`, and `git diff --check` all passed. The production build reports the existing sync-engine Node built-in externalization warnings.
- Follow-up settings polish: widened the centered progress selector to 60% of its popup line, moved the blue Back to hub link above the settings header, made the Hub name label regular weight, placed the slug input inline beside Change, and right-aligned Delete below its consequence text. Frontend typecheck, tests, build, and diff check passed again.
- Hub details spacing: tightened the name/slug spacing and placed both validation messages in one shared error line directly below the slug. Frontend typecheck, tests, and diff check passed.
- Slug input pattern: escaped the hyphen for HTML `pattern` Unicode-set parsing, eliminating the browser regexp error while retaining lowercase letters, digits, and hyphens. Frontend typecheck, tests, production build, and diff check passed.

## Milestone 2B — Progress and return navigation

| File | Responsibility updated |
| --- | --- |
| `frontend/src/components/ReaderProgressControl.vue` | Extracts the shared progress icon and popup for hub chrome and saved-progress rows; teleports the popup outside scroll containers while anchoring it to the icon; warns before advancing, closes on outside click, and confirms unsaved changes before clearing. |
| `frontend/src/components/HubChrome.vue`, `frontend/src/features/Account/AccountPage.vue` | Reuses the shared control in hubs and account data; the saved-progress list is bounded and scrollable. Clearing from hub navigation goes to welcome; clearing from Account Data reloads the current settings page. |
| `frontend/src/features/Hub/HubWelcome.vue`, `frontend/src/lib/readerProgress.ts` | Centers initial progress selection and warns when joining at a later checkpoint; shares the checkpoint-position advancement check. |
| `frontend/src/lib/routes.ts`, `frontend/src/api/Accounts.ts`, `frontend/src/lib/navigation.ts` | Sanitizes same-origin return destinations, avoids returning to login/registration routes, and supports route replacement after a confirmation already succeeded. |
| `frontend/src/components/GlobalHeader.vue`, `frontend/src/features/Home/HomePage.vue`, `frontend/src/features/Account/SignInPage.vue`, `frontend/src/features/Account/RegisterPage.vue`, `frontend/src/App.vue` | Preserves the current internal path, query, and hash for login and registration, including the Start a Hub login prompt; resumes the original route after authentication. |
| `src/http/accounts.ts`, `tests/http/AccountsHttp.test.ts` | Includes the safe return path on the registration page and retains it through registration; server-side validation rejects external and auth-loop destinations. |
| `frontend/src/features/Article/ArticleEditor.vue`, `frontend/src/App.vue` | Preserves query and hash when canonicalizing editor routes, canceling edit entry, and restoring Back/Forward state. |
| `frontend/src/styles/layout.css`, `frontend/tests/routes.test.ts`, `frontend/tests/checkpoints.test.ts` | Centers welcome progress controls, matches label/dropdown sizing, increases dropdown height by about 3 px, and tests safe return paths and progress advancement. |

Redirect behavior: the unauthenticated Start a Hub link enters `/login?returnTo=%2Fhubs%2Fnew`. Global-header login links carry the current path, query, and hash. The OAuth callback redirects an unregistered identity to `/register?returnTo=…`; the sealed pending-registration cookie retains the same value, and successful registration returns there. Both frontend and server reject external paths, protocol-relative paths, backslashes, and login/registration destinations that could loop. Clearing progress in hub navigation replaces the current URL with `/<slug>/welcome`; clearing from Account Data reloads the current Account Data route. The app replaces a progress-less direct hub URL with its welcome URL before rendering. Back/Forward continues through `popstate`; unsaved-change cancellation restores the full previous path, query, and hash. Refresh loads the route from the current URL.

URL changes: no route paths changed. Login links now carry a `returnTo` query, and the OAuth callback adds the same query to `/register` so an expired registration can resume the intended internal page.

Milestone 2B verification:

- `bun run typecheck:frontend` — passed.
- `bun test frontend/tests` — passed: **24 tests, 80 assertions**.
- `bun run build:frontend:prod` — passed with the existing sync-engine Node built-in externalization warnings.
- `bun --env-file=.env.test.local test tests/http/AccountsHttp.test.ts` — passed: **5 tests, 66 assertions**, including registration return-path preservation.
- `git diff --check` — passed.
- `bun run typecheck:backend` — passed after fixing the `MediaAssets.test.ts` collection type.
- Follow-up: teleported the progress popup to `body` so it is not clipped by Account Data’s scroll box; it repositions with scrolling and viewport changes. Frontend typecheck, tests, production build, and diff check passed.
- Follow-up: clearing a progress row from Account Data now reloads the current settings page; hub-page clear actions still route to welcome. Frontend checks passed.

## Suggested commit message

`feat(accounts): complete protected account deletion flow`

- Complete backend deletion with ownership safeguards and retry-safe cleanup.
- Check hub ownership before prompting, then keep the delete-time authorization check.
- Add the settings dialog with clear consequences, typed confirmation, and success redirect.
- Cover deletion authorization, recovery, and frontend request handling.

## Suggested Milestone 2A commit message

`feat(hubs): improve hub creation and entry flow`

- Add a dedicated name-only hub creation page and start each hub at NotStarted.
- Show name and slug conflicts beside their fields without shifting settings layout.
- Resolve saved progress before rendering hub pages and route new readers to welcome.
- Match hub creation and settings controls to existing account UI; close the progress popup on outside click and require typed hub-name confirmation for deletion.
- Update the Hubs composition and navigation tests for the revised flow.

## Suggested Milestone 2B commit message

`feat(navigation): preserve progress and auth return flows`

- Reuse one spoiler-aware reading-progress popup in hubs and account data.
- Warn before advancing checkpoints and send cleared progress to the hub welcome page.
- Preserve safe internal return paths through login and fresh registration.
- Keep query/hash state across history navigation and test routing safeguards.

## Current application validation

- `bun run check:static` — passed design checks (15 files), framework checks (10 existing advisories per configuration), generated-artifact checks, backend typecheck, and frontend typecheck.
- `bun --env-file=.env.test.local test` — passed: **109 tests across 34 files, 701 assertions** against the isolated test databases. This includes the HTTP suites for health, built frontend serving, accounts/auth callbacks, reader/progress, hub management, article management, media, and guest/session identity.
- `bun run build:frontend:prod` — passed; Vite reports existing sync-engine `node:util` and `node:crypto` browser externalization warnings.
- `git diff --check` — passed.

Endpoint coverage review: added HTTP-level success coverage for `POST /api/assets/my`, `/api/assets/get`, and `/api/assets/delete`; these routes previously had composition coverage or refusal-path coverage only. The full suite now passes with the added checks.
