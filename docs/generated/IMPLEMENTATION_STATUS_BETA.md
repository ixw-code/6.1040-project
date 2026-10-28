# Wikiplotter Beta — implementation status

Milestone 7 adds private GridFS media storage and protected asset workflows. No Milestone 7 commit was made.

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
