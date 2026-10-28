# Wikiplotter Beta — implementation status

Milestone 7.5 reconciles the current design with the assembled reader, generated wires, and build. No Milestone 7.5 commit was made.

## Completed history

| Milestone | Significant decisions and verification |
| --- | --- |
| 1 — contracts | Accepted concepts keep accounts, sessions, anonymous progress, articles, and assets separate. Hub and article actions remain direct. Design, framework, artifact, type, and 49 regression checks passed at that point. Obsolete Alpha design references were later removed by request. |
| 2 — identity | Registering enforces unique usernames/provider subjects. Sessioning stores verifier hashes, expires at seven days, and revokes sessions. 55 tests passed. |
| 3 — authentication | Google OIDC and MIT SDG Commons use verified adapters; first-time registration requires Create account. Cookies, Origin checks, and provider mocks passed 61 tests. Live credentials and Commons deployment permission remain external. Accounts.md still says “Wikimedia Commons”; implementation uses MIT SDG Commons. Account deletion remains disabled pending ownership cleanup. |
| 4 — reader | Anonymous signed progress cookies and Sessioning-backed account progress preserve existing choices on import. Server-side spoiler filtering distinguishes missing progress from NotStarted. 64 tests passed before obsolete design references were removed. |
| 5 — hubs | An authenticated single-node MongoDB replica set kept the existing volume and separate guarded test database. Creator-owned hubs have unique slugs; transactional creation/deletion coordinates documents, rules, progress, and checkpoints. Reader responses use snapshots. 71 tests passed. Legacy hubs lack creator/slug and need an explicit migration decision before creator management. |
| 6 — articles | Authenticated author-only creation, full saves, renaming, tagging, editing views, and deletion use transactions. Block IDs survive edits, obsolete rules are removed, and explicit rules prevent partial-save spoilers. New media authoring was fail-closed until M7. 77 tests passed; backend typecheck and frontend build passed. Article routes remain imperative composition code rather than authored sync-engine endpoint declarations. |

## Milestone 7 files changed

| File | Change |
| --- | --- |
| src/concepts/MediaAssetManaging/MediaAssetManaging.ts | Implements accepted PENDING/READY metadata lifecycle, uploader/filename uniqueness, READY reference write, delete, and uploader listing. Stores no bytes. |
| src/concepts/MediaAssetManaging/registry.ts | Registers the accepted concept specification and refusals with sync-engine. |
| src/storage/GridFsMedia.ts | Stores private bytes in a separate GridFS bucket with opaque object IDs; supports retrieval and idempotent deletion. |
| src/compositions/MediaAssets.ts | Resolves session users, validates media type and size, coordinates start/finalize, uploader views, reference-aware deletion, and best-effort private-byte cleanup. |
| src/compositions/Articles.ts | Replaces the temporary media refusal with transactional READY/kind validation and reference writes for each media block. |
| src/db.ts | Adds unique metadata indexes for uploader/filename and storage key. |
| src/assembly/concepts.ts | Registers MediaAssetManaging in the application concept set. |
| src/assembly/concept-instances.ts | Supplies the metadata concept with the shared MongoDB transaction session. |
| src/http/media.ts | Adds protected upload, finalize, library, metadata, preview, contextual reader retrieval, and delete routes; keeps storage keys private. |
| src/http/edge.ts | Routes media requests and delegates contextual byte reads to the existing filtered Reading HTTP path. |
| tests/compositions/MediaAssets.test.ts | Covers metadata uniqueness, PENDING/READY behavior, ownership, GridFS persistence, reference reuse, deletion refusal, invalid bytes, and unreferenced cleanup. |
| tests/http/MediaHttp.test.ts | Covers session and Origin protection, uploader-only preview, and checkpoint-filtered reader bytes. |

## Milestone 7 decisions and verification

The accepted `create → finalize` PENDING/READY lifecycle and `confirmReadyReference` write are unchanged. Upload starts with server-validated bytes in private GridFS and PENDING metadata; finalize checks stored bytes before READY. The API accepts base64 JSON bytes with a 20 MiB decoded limit and PNG, JPEG, WebP, MP4, or WebM signatures. Asset IDs may be reused in multiple articles. Preview requires the uploader session; reader retrieval requires hub, article, block, and asset context and delegates eligibility to Reading. A guessed asset ID cannot retrieve bytes directly. No raw storage key appears in HTTP responses.

Article saves and asset deletion both write the asset metadata record in MongoDB transactions, creating a conflict when they race. Deletion checks surviving article blocks through existing HubCataloguing and Documenting queries. After metadata deletion commits, GridFS byte deletion is attempted. If that final step fails, private orphan bytes remain inaccessible through the API; an automated orphan sweeper is not yet present. A failed upload tries to remove both metadata and partial bytes. The server validates signatures and size; it does not decode full image or video structures.

The full suite passed: **81 tests across 27 files, 620 assertions**. Design syntax passed for 15 files. Backend typecheck and frontend production build passed. Frontend typecheck still fails on the existing deleted `generated/reader/wire.ts` and cascading client types. Framework and artifact checks report existing authored design coverage gaps; they now also report the newly registered MediaAssetManaging instance as undeclared despite its `design/types.md` binding. These framework diagnostics remain unresolved. `git diff --check` passed. The imperative MediaAssets HTTP/composition service follows the existing Articles boundary pattern but is not authored as sync-engine endpoint declarations.

## Milestone 7 suggested commit message

    feat(beta): add private media asset management

    - Persist uploader-owned asset metadata with pending and ready states
    - Store validated upload bytes in private MongoDB GridFS
    - Allow reusable ready media references in transactional article saves
    - Protect uploader previews and checkpoint-filtered reader retrieval
    - Refuse deletion of referenced assets and clean up unreferenced bytes
    - Cover metadata, persistence, composition, storage, and HTTP behavior

## Milestone 7.5 files changed

| File | Change |
| --- | --- |
| generated.config.ts; generated.reader.config.ts | Bind the accepted types, ReaderProgress, and Reading design files to the selected assembly; point the default artifact at `generated/application`. |
| generated/application/*; generated/reader/* | Regenerate framework artifacts and the typed reader HTTP wire from the reconciled design. |
| src/compositions/Reading.ts | Align reader declaration names and route with `Reading.ReadArticle`, `ReadableArticle`, `ArticleDirectory`, and `ArticleContent`. |
| src/compositions/ReaderProgress.ts; src/auth/progress-cookie.ts | Align the local progress import declaration and route with `ImportAnonymousProgress`; keep the existing login import behavior. |
| src/http/edge.ts; src/http/reader.ts; src/http/media.ts | Route reads through `/api/articles/read`; block the local-only import route from public HTTP. |
| frontend/src/api.ts | Use the regenerated reader wire for reader calls and typed protected POSTs for existing hub/checkpoint HTTP routes outside that wire. |
| src/assembly/assembly.ts | Assemble only current reader compositions. |
| src/compositions/HubManagement.ts; src/compositions/ContentManagement.ts; src/assembly/application.ts | Remove obsolete local setup compositions and assembly. |
| scripts/seed.ts | Seed development fixtures through concept owners without obsolete setup endpoints. |
| tests/fixture-application.ts; affected reader, HTTP, and acceptance tests | Seed legacy reader fixtures through test-only concept actions and verify the current `/articles/read` route. |
| tests/compositions/HubManagement.test.ts; tests/compositions/ContentManagement.test.ts | Remove obsolete composition tests; current Hubs, Articles, Documenting, RequirementTagging, and reader tests cover their behavior. |

## Milestone 7.5 decisions and verification

No concept contract or product behavior was added. The default and reader artifact configs select the current reader assembly and its accepted design declarations. The local progress-import endpoint is selected for contract checking but blocked at `/api/internal/*`; login still reaches it through the local gateway. Development fixtures retain direct concept setup so legacy image and missing-rule reader cases remain testable without exposing authoring setup routes.

Design syntax, framework source agreement, generated artifact checks, backend/frontend typechecks, and the frontend production build pass. The full MongoDB suite passed: **73 tests across 25 files, 556 assertions** after removing eight obsolete composition tests. A subsequent focused reader HTTP run passed three tests and 40 assertions, including the new private-route check. Hubs and Articles tests continue to cover authenticated management, ownership, transactions, and requirement behavior; reader acceptance tests continue to cover spoiler filtering. Framework check reports ten nonfatal advisories about guarded endpoint fallbacks and order-sensitive formers. No data was deleted or migrated.

## Milestone 7.5 suggested commit message

    refactor(beta): align reader assembly and generated design wires

    - Bind generated artifacts to current types and reader composition contracts
    - Rename reading declarations and route to Article terminology
    - Remove obsolete setup compositions and seed through concept owners
    - Restore typed reader client and protect the local progress import route
    - Preserve hub, article, and spoiler regression coverage

## Milestone 8A files changed

| File | Change |
| --- | --- |
| frontend/src/api/Accounts.ts | Adds typed wrappers for current account, provider login URL, registration, logout, and username change. |
| frontend/src/api/Hubs.ts | Adds typed wrappers for the generated hub directory/browse calls and existing hub, slug, deletion, sequence, and checkpoint routes. |
| frontend/src/api/Articles.ts | Adds typed generated reading plus existing authenticated create, editing, save/rename, tag, untag, and delete operations. |
| frontend/src/api/ReaderProgress.ts | Wraps generated progress get, record, and clear operations; cookie reader identity remains boundary supplied. |
| frontend/src/api/MediaAssets.ts | Adds typed upload, finalize, list, metadata, preview, contextual retrieval, and delete wrappers for existing routes. |
| frontend/src/api/http.ts; frontend/src/api/readerClient.ts | Shares JSON/binary HTTP helpers and retains the generated sync-engine reader client with typed errors. |
| frontend/src/api.ts; frontend/src/App.vue | Preserves the current screen API facade and moves account HTTP calls into AccountsApi. |

## Milestone 8A operation inventory and decisions

The API layer mirrors existing routes; it adds no backend endpoints. Generated `ReaderWireHttp` remains the source for hub listing/browsing, article reading, and progress calls. Existing imperative HTTP handlers back protected mutations and media operations.

| Beta operation | Route/status |
| --- | --- |
| Account current, provider login/callback, explicit registration, logout, username change | `/api/accounts/current`, `/api/accounts/login`, `/auth/{google,commons}/callback`, `/api/accounts/register`, `/api/accounts/logout`, `/api/accounts/set-username` — implemented. |
| Account deletion | `/api/accounts/delete` — route intentionally returns `501 ACCOUNT_DELETION_UNAVAILABLE`; no successful API operation is exposed. |
| Hub directory, sequence/checkpoint listing | Generated `/hubs/list`; `/api/hubs/sequences`, `/api/checkpoints/list` — implemented. |
| Hub create, rename, slug update, delete; checkpoint append/relabel | `/api/hubs/{create,rename,slug,delete}`, `/api/checkpoints/{append,relabel}` — implemented. |
| Article read, create, editing view, full save/rename, tag, untag, delete | Generated `/api/articles/read`; `/api/articles/{create,editing,save,tag,untag,delete}` — implemented. |
| Reader progress get, record, clear; login import | Generated `/api/progress/{get,record,clear}`; internal `/api/internal/progress/import` is blocked from public HTTP and used locally during login — implemented. |
| Asset upload/finalize, own list/metadata/preview, contextual reader retrieval, delete | `/api/assets/{start,finish,my,get,preview,read,delete}` — implemented. |
| Account data page: list hubs with progress, authored article listing, account data export/clear | No matching routes — unavailable. |
| Frontend article editor, hub slug/settings/delete UI, asset library/upload UI, account settings/data UI | Backend operations above exist where listed; frontend screens are not implemented in 8A. |

Response types follow handler payloads, including nullable missing requirements in article editing and binary media responses. Account deletion and data-page operations are recorded as unavailable rather than represented by fabricated successful calls. Existing screen behavior is preserved through `api.ts` compatibility exports.

## Milestone 8A verification and suggested commit message

Frontend typecheck and production build pass. No tests were added or run because this increment only reorganizes the frontend HTTP boundary and the requested checks are typecheck/build.

    refactor(frontend): establish typed beta API modules

    - Split account, hub, article, progress, and media calls into typed modules
    - Keep reader operations on the generated sync-engine client
    - Document available and unavailable Beta HTTP operations
    - Preserve current screen behavior through the existing API facade

## Frontend integration repair files

| File | Change |
| --- | --- |
| frontend/src/App.vue; frontend/src/lib/routes.ts | Resolve hub URLs from the generated slug directory, resolve visible article title URLs to stable document IDs, and use server-confirmed hub creator access before showing protected controls. |
| frontend/src/features/Hub/HubSettings.vue; frontend/src/features/Article/ArticleEditor.vue; frontend/src/features/Media/MediaPicker.vue | Fix Vue template type errors, initialize and update the current slug, preserve title-based article links, and fetch finalized asset metadata through its actual route. |
| frontend/src/api/Hubs.ts; frontend/src/api/Articles.ts; frontend/src/api/MediaAssets.ts | Match actual backend response shapes for slug updates, article block records, and upload finalization; cache directory and eligible article mappings. |
| src/compositions/Reading.ts; generated/reader/*; generated/application/* | Return the slug already required by Reading design, using HubCataloguing._get without changing the concept query contract; regenerate typed wires and documentation. |
| src/compositions/Hubs.ts; src/http/hubs.ts; design/compositions/Hubs.md | Expose the existing IsCreator decision as authenticated `/api/hubs/access`, returning only `canManage` for UI permission display. |
| tests/http/HubsHttp.test.ts; tests/http/ReaderHttp.test.ts; tests/compositions/Reading.test.ts; tests/acceptance/AlphaJourney.test.ts; frontend/tests/routes.test.ts | Cover creator access, slug directory output and links; update prior directory assertions to include the accepted slug field. |

## Frontend integration diagnosis and remaining blockers

The original Vue typecheck failed because HubSettings called imported API methods directly from template expressions. Component handlers fixed the Vue template typing issue. API contract review also corrected article create/save block response types and asset finalization's ID-only response. Vite proxy configuration already forwards `/api` and `/auth` to the configured backend host and port; same-origin JSON requests carry session cookies and Origin for mutation CSRF checks.

Reading design already specified slug-bearing hub directory output, but the composition omitted it. The implementation now obtains slugs through the existing `_get` query, preserving HubCataloguing._hubs() and its accepted signature. The frontend uses internal IDs for API calls and human-readable slugs/titles in visible navigation. The Hubs composition already owned creator checks; `/api/hubs/access` exposes only a boolean so UI controls can reflect the server's decision without leaking creator IDs.

The account data page still cannot list authored articles because no such endpoint exists. Account deletion remains disabled with HTTP 501. Local development has no provider credentials configured, so live Google/Commons login returns `PROVIDER_UNAVAILABLE`; provider callback, explicit registration, and logout flows are covered by mock-backed HTTP tests.

## Frontend integration verification

Backend and frontend typechecks, frontend production build, framework checks, generated artifact checks, design checks, and `git diff --check` pass. Framework check retains ten nonfatal advisories. Frontend route/permission tests pass: **6 tests, 25 assertions**. The full suite passes: **79 tests across 27 files, 586 assertions**. Focused HTTP suites pass: **9 tests across 5 files, 113 assertions**.

Live Vite proxy smoke checks passed for homepage serving, hub directory and creator permissions, progress selection, article creation/read/edit, asset upload/finalize/preview/contextual retrieval and deletion protection, hub rename/slug/checkpoint management, hub deletion, and logout. The check also confirmed the expected provider-login 503 with no local OAuth provider configured. Smoke data was removed from the isolated test database afterward. Production build reports existing Node `crypto`/`util` browser externalization notices from the sync-engine runtime.

    fix(frontend): align Beta pages with backend contracts

    - Resolve readable hub slugs and visible article title routes
    - Expose authenticated hub creator access for protected UI controls
    - Correct article and media API response types and template handlers
    - Verify reader, management, editing, and media flows through Vite proxy
    - Preserve documented provider and authored-article index blockers

## Milestone 8I files changed

| File | Change |
| --- | --- |
| frontend/src/lib/routes.ts; frontend/src/api/Hubs.ts; frontend/src/features/Home/HomePage.vue; frontend/src/App.vue | Build public hub/article paths from API-resolved slugs and article titles, encode title segments, canonicalize legacy ID paths when backend data resolves them, and keep internal IDs for API operations. |
| src/compositions/Articles.ts; tests/compositions/Articles.test.ts; tests/http/ArticlesHttp.test.ts | Let the existing authenticated editing view resolve an exact title within the supplied hub when the route parameter is not a document ID; return the stable document ID and complete ordered blocks/rules. |
| frontend/src/features/Article/ArticleEditor.vue; frontend/src/features/Article/ArticleReader.vue; frontend/src/features/Hub/HubHome.vue | Load/edit by stable ID, show the requested hub/article/editing breadcrumb levels, preserve block IDs, and navigate to the canonical title route after save. |
| frontend/src/lib/confirm.ts; frontend/src/lib/navigation.ts; frontend/src/components/ConfirmationDialog.vue; frontend/src/App.vue | Add reusable confirmation UI and navigation guards for spoiler exposure, unsaved edits, browser Back, refresh/close, and destructive actions. |
| frontend/src/features/Hub/HubSettings.vue; frontend/src/features/Media/MediaLibrary.vue; frontend/src/features/Article/ArticleEditor.vue; frontend/tests/confirm.test.ts; frontend/tests/routes.test.ts | Confirm hub, asset, article, and block deletion; cover encoded routes, breadcrumbs, dirty-state comparison, confirmation outcomes, and deletion cancellation. |
| frontend/src/styles/features.css | Style the confirmation dialog using the existing Beta panel and button styles. |

## Milestone 8I decisions and verification

Readable hub routes use only slugs returned by the hub directory; new hub creation refreshes that directory before navigation. Article routes use exact titles from the spoiler-filtered article directory. When that directory cannot resolve an editor route (for example, no reader progress or a hidden article), the existing authenticated `/api/articles/editing` operation now resolves an exact, hub-scoped title through Documenting's current queries and returns the same editing response; saves still use the returned stable document ID. No endpoint, concept, or response shape was added. Reader content remains checkpoint-filtered.

Editor dirty state compares the full title, ordered block records/IDs, and article/block requirement selections against the loaded or last-saved snapshot. Internal links, Cancel, breadcrumbs, logout, and browser Back pass through the discard dialog; `beforeunload` protects refresh and close. SPA route transitions stay in the loading state until API title-to-ID resolution completes, preventing article reads with a title where the backend requires an ID. Canonical URL replacement updates route state without remounting the editor. A successful save resets the baseline before replacing the editor history entry with the canonical article URL. After a canceled browser Back, accepting discard moves back one history entry to the intended route. Destructive actions require a second explicit confirmation, and cancellation does not call the deletion operation.

Backend/frontend typechecks and the production frontend build pass. Frontend tests pass: **10 tests, 36 assertions**. The full MongoDB application suite passes: **83 tests across 28 files, 600 assertions**, including new title-resolution checks at composition and HTTP boundaries. A headless Chrome smoke through Vite dev verified hub-to-article navigation, direct article refresh, the encoded `A/B: Route Guide` title, edit warning and editor content, editor refresh, and both cancel/confirm paths for browser Back. `git diff --check` passes. Build output retains the existing sync-engine `node:crypto`/`node:util` browser externalization advisories.

    feat(frontend): add Beta UI and repair route integration

    - Add the Beta pages and management flows
    - Resolve readable hub and article routes from backend data
    - Fix dev navigation timing and authenticated article editing
    - Confirm spoiler exposure, unsaved navigation, and destructive actions
    - Verify routes, refresh, editor loading, and confirmation outcomes
