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
