# Wikiplotter Beta — implementation status

## Completed work

| Milestone | Outcome and significant decisions |
| --- | --- |
| 1 — design | Current concepts/types/compositions aligned to Beta. Independent state ownership retained; direct concept actions used without generalized lifecycle states. |
| 2 — identity | Registering owns usernames/provider identities. Sessioning persists only `verifierHash` and expires/revokes sessions. |
| 3 — authentication | Google OIDC and MIT SDG Commons adapters verify provider identities. New users remain pending until explicit registration. Secure cookies and CSRF checks stay at HTTP boundary. |
| 4 — reader | Anonymous progress remains in signed expiring cookies; authenticated progress belongs to Registering users. Login import preserves existing account selections. Missing progress remains distinct from NotStarted. |
| 5 — hubs | Creator ownership, unique slugs, checkpoints, and multi-concept deletion use MongoDB transactions. Existing local data volume was preserved; tests use isolated `wikiplotter_test_*` databases. |
| 6 — articles | Any authenticated user may create/edit; hub creator alone may delete. Full ordered saves and requirement updates are transactional; stable surviving block IDs and fail-closed spoiler filtering are preserved. |
| 7 — media | Metadata is concept-owned and bytes are private GridFS objects. Upload validation, uploader-only management, eligible reader retrieval, and referenced-asset deletion protection are tested. Failed final GridFS cleanup can leave inaccessible orphan bytes; no sweeper exists. |
| 7.5 — alignment | Removed obsolete setup compositions and reconciled current reader wires/assemblies. |
| 8A / integration | Typed frontend APIs follow existing routes and generated reader client. Article editing resolves scoped titles to stable IDs; no backend route is invented for unavailable data operations. |
| 8I — routes/editor | Readable slugs/titles, refresh/back navigation, exact breadcrumbs, spoiler warning, dirty-state guards, and destructive confirmations implemented. |
| 8.1 — UI | Checkpoint controls use NotStarted baseline and dropdowns; missing progress routes to Welcome. Header and hub navigation styling retained. Editor image preview uses uploader preview or checkpoint-filtered contextual retrieval. |

## Milestone 10 — acceptance and fixes

| File | Change |
| --- | --- |
| frontend/src/App.vue | Re-evaluate current route and spoiler-filtered content after progress changes. |
| frontend/src/api/Hubs.ts; frontend/src/api/ReaderProgress.ts | Use position-zero NotStarted baseline, distinguish missing progress, and resolve saved checkpoint labels. |
| frontend/src/components/HubChrome.vue | Replace checkpoint strip with dropdown; clearing progress returns to Welcome. |
| frontend/src/features/Account/AccountPage.vue | Display exact saved checkpoint labels and persist progress changes through existing APIs. |
| frontend/src/features/Article/ArticleEditor.vue; frontend/src/lib/routes.ts | Keep previews within existing media authorization; Cancel returns to the saved title route after draft title changes. |
| frontend/src/features/Article/ArticleReader.vue; frontend/src/features/Hub/HubHome.vue; frontend/src/features/Hub/HubWelcome.vue | Redirect missing progress to Welcome and default selection to NotStarted. |
| frontend/src/features/Hub/HubSettings.vue | Reload after accepted name/slug changes to refresh canonical navigation data. |
| frontend/src/styles/layout.css; frontend/src/styles/responsive.css | Polish header alignment and place hub navigation below, aligned with, and colored to match the banner. |
| frontend/tests/checkpoints.test.ts; frontend/tests/routes.test.ts | Cover NotStarted and saved-label semantics, missing progress, encoded titles, and Cancel route stability. |
| design/compositions/Accounts.md | Correct provider wording to MIT SDG Commons, matching BETA.md and the verified adapter. |
| docs/generated/IMPLEMENTATION_STATUS_BETA.md | Condense prior milestone history while preserving decisions, blockers, and verification. |

The acceptance review found no permission mismatch in the covered HTTP/composition boundaries. Tests exercise distinct users making direct article/hub/media requests; forged identities, invalid/expired sessions and cookies, cross-hub checkpoints, spoiler-filtered content/media, transactional saves/deletions, and progress import conflicts. No backend authorization or concept contract was weakened.

NotStarted is the reader's initial baseline; the editor presents it for no-additional-checkpoint requirements but leaves an unchanged explicit empty rule intact. Image previews use uploader-only preview first and checkpoint-filtered contextual read second. This preserves server-side spoiler rules.

## Verification

`bun run check` passes: design forms (15 files), framework source checks (8 concepts; 10 existing nonfatal advisories in each assembly), generated artifact checks, backend/frontend typechecks, production frontend build, and **89 tests across 29 files, 613 assertions** on isolated MongoDB test databases. `git diff --check` passes. The build retains existing sync-engine browser externalization advisories for `node:crypto` and `node:util`.

Browser-driven acceptance was unavailable: no browser binary or browser automation package is installed. Existing route/confirmation tests and live HTTP-server tests cover their respective boundaries, but a manual browser pass remains required. Provider tests use verified-provider mocks; live Google/Commons credentials are not configured. No production deployment or production database was accessed.

## Remaining Beta acceptance blockers

- `/api/accounts/delete` returns `501 ACCOUNT_DELETION_UNAVAILABLE` although the Accounts design describes deletion; implementation needs an ownership-safe transaction and UI flow.
- Manage Data cannot list authored articles because no authenticated author-index HTTP operation exists.
- Live provider callbacks, production HTTPS/cookie behavior, and deployment infrastructure have not been validated. Deployment must provision Google and MIT SDG Commons settings and persistent media storage.
- Existing legacy hubs without creator/slug metadata need an explicit migration decision before management can be enabled for them.
- Media deletion can leave inaccessible GridFS orphans after metadata removal; automated orphan cleanup is not implemented.

## Production health check

| File | Change |
| --- | --- |
| `.env.example`; `src/main.ts` | Configure `0.0.0.0:3000`; start listening before MongoDB connection/index preparation. Return `503 STARTING` for ordinary requests until the application handler is ready. Stop the listener and propagate database initialization failures. |
| `src/http/health.ts`; `src/http/edge.ts` | Serve public `GET /health` with `{ "status": "ok" }` before application routing; no session, provider, or database access is required by the endpoint. |
| `tests/http/HealthHttp.test.ts` | Verify unauthenticated health response, method handling, and pass-through of ordinary requests. |

MongoDB startup still runs `connectMongo()` and index preparation before application routes become available. Its server selection timeout is 5 seconds; during initialization ordinary requests receive `503 STARTING`, while a failed initialization stops the listener and fails process startup. The health response reports process liveness and does not conceal that failure. The application binds to the configured `HOST` and `PORT`; the production example now matches the platform's `0.0.0.0:3000` settings.

Verification: `bun run typecheck` passed; `bun run build:frontend:prod` passed with existing sync-engine `node:util`/`node:crypto` browser externalization advisories; `bun test tests/http/HealthHttp.test.ts` passed (1 test, 10 assertions). `bun test tests/http/ReaderHttp.test.ts` could not initialize its MongoDB fixture (`ECONNREFUSED 127.0.0.1:27018`), so the focused health test invokes the exact HTTP handler directly and verifies ordinary-route pass-through without database setup. An initial socket-backed health test attempt failed to bind Bun's ephemeral port (`EADDRINUSE`); no application test assertions ran in that attempt.
