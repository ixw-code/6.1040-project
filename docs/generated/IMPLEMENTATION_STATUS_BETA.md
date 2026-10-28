# Wikiplotter Beta — implementation status

Milestone 6 adds authenticated article management on top of transactional hubs. No commit was made for Milestone 6.

## Completed history

| Milestone | Significant decisions and verification |
| --- | --- |
| 1 — contracts | Accepted concepts keep accounts, sessions, anonymous cookie progress, articles, and assets separate. Hub and article changes use direct actions; no general deletion lifecycle. Initial design, framework, artifact, type, and 49 regression checks passed. Obsolete Alpha design references were later removed at the user's request. |
| 2 — identity | Registering persists unique usernames and provider subjects. Sessioning stores verifier hashes, checks fixed seven-day expiry, and revokes sessions. Full check passed with 55 tests. |
| 3 — authentication | Google OIDC and MIT SDG Commons use verified adapters; new users register only after Create account. Secure HttpOnly cookies, Origin checks, and protected routes were tested with provider mocks. Full check then passed with 61 tests. Live provider credentials and MIT SDG Commons deployment permission remain external requirements. Accounts.md still says “Wikimedia Commons”; the implemented provider is MIT SDG Commons. Account deletion remains disabled pending ownership cleanup. |
| 4 — reader | Anonymous progress uses signed, expiring cookies; authenticated progress uses Sessioning and ProgressRecording. Login import preserves account choices. Spoiler filtering stays server-side; missing progress differs from NotStarted. The behavior passed 64 tests before obsolete design references were removed. That removal left generated configuration and wire imports stale. |

## Milestone 5 files changed

| File | Change |
| --- | --- |
| compose.yaml | Runs the existing MongoDB service as one authenticated replica-set member on the same port inside and outside the container. Creates a keyfile in the existing volume only when absent. |
| .env.development.example | Documents the local replica-set URI and direct host connection. |
| .env.test.example | Documents the same replica set with a separate test database. |
| package.json | Makes db:up wait for replica initialization and primary readiness. |
| scripts/init-mongo-replica.ts | Validates loopback configuration, initializes only an uninitialized member, and waits for primary election; repeated starts preserve data. |
| scripts/seed.ts | Corrects the moved application import so fixtures remain usable. |
| src/db.ts | Keeps database profile guards, connects Bun directly to the local replica member, and adds the unique partial slug index. |
| src/concepts/HubCataloguing/HubCataloguing.ts | Stores creator and derived slug; adds slug update, deletion, ownership queries, duplicate validation, and optional transaction session. |
| src/concepts/HubCataloguing/registry.ts | Maps accepted slug refusals. |
| src/concepts/Checkpointing/Checkpointing.ts | Adds scoped whole-sequence deletion and optional transaction session. |
| src/concepts/Documenting/Documenting.ts | Adds author and accepted edit/delete/query methods so the Beta registration loads and hub deletion invokes Documenting's own action. |
| src/concepts/Documenting/registry.ts | Maps the accepted missing-document refusal. |
| src/concepts/RequirementTagging/RequirementTagging.ts | Adds accepted batch/token queries and transaction session support for rule cleanup. |
| src/concepts/ProgressRecording/ProgressRecording.ts | Adds transaction session support for scope cleanup. |
| src/assembly/concept-instances.ts | Passes a shared MongoDB session to concept instances for transactions and snapshots. |
| src/compositions/Hubs.ts | Declares framework endpoints and creator views for create, rename, slug, sequence listing, append, and relabel. Explicit denials prevent unmatched requests from hanging. |
| src/assembly/hubs.ts | Runs fixed framework workflows and iterative dependent cleanup in transactions, using each concept's own actions. Assets remain uploader-owned. |
| src/http/hubs.ts | Protects hub mutations with Sessioning cookies and Origin checks; ignores client user IDs and maps refusals to HTTP. |
| src/http/edge.ts | Routes protected hub endpoints and gives authenticated browse/read responses MongoDB snapshots. |
| src/http/reader.ts | Gives guest spoiler-filtered browse/read responses MongoDB snapshots. |
| src/assembly/assembly.ts | Removes old public HubManagement mutation routes while retaining local fixture setup; accepts a read session. |
| src/assembly/guest-reader.ts | Passes a read session through guest composition gateway. |
| src/compositions/HubManagement.ts | Supplies a local fixture creator for existing setup flows; no longer public. |
| src/compositions/ContentManagement.ts | Supplies a local fixture author for existing setup flows. |
| tests/concepts/HubCataloguing.test.ts | Covers creator and slug persistence, rename independence, deletion, invalid and concurrent duplicate slugs. |
| tests/concepts/Checkpointing.test.ts | Covers whole-sequence deletion and wrong-scope refusal. |
| tests/concepts/Documenting.test.ts | Supplies author inputs required by the accepted Beta contract. |
| tests/db/MongoPersistence.test.ts | Supplies creator/author inputs while retaining persistence and concurrency assertions. |
| tests/db/MongoReplica.test.ts | Proves primary readiness and transaction commit/rollback. |
| tests/mongo-test-db.ts | Exposes the disposable test connection's client for transaction tests. |
| tests/compositions/Hubs.test.ts | Covers transactional creation, creator-only changes, and cleanup of documents, rules, progress, and checkpoints. |
| tests/http/HubsHttp.test.ts | Covers session and CSRF protection, trusted ownership, slug updates, and deletion. |
| tests/compositions/ContentManagement.test.ts | Updates reader assembly route assertion after protected mutations move to the HTTP boundary. |
| tests/http/ReaderHttp.test.ts | Uses authenticated hub setup while retaining reader response and validation regression coverage. |
| tests/acceptance/AlphaJourney.test.ts | Uses an authenticated hub creator while retaining spoiler and reconnection regression coverage. |

## Decisions and verification

The existing wikiplotter-dev_mongo-secure-data volume was kept. Before conversion, wikiplotter_dev contained two hubs; after a container restart and an idempotent db:up, the replica set was primary and the same two hubs remained. Development and test databases still share one service but have separately guarded names. The new transaction test proves commit and rollback. MongoDB authentication stays enabled, with its keyfile only in the existing volume.

Hub creation and deletion use MongoDB transactions, without beginDelete or lifecycle status. Deletion collects article and block identities, removes their requirement rules, then deletes documents, progress, sequence, and hub atomically. Reader content responses use snapshot transactions. The sync-engine endpoint DSL handles fixed workflows; the dynamic deletion loop is application composition code. Database writes remain concept-owned.

The full test suite passed: **71 tests across 23 files, 540 assertions**. Design syntax passed for 15 files. The frontend build passed with HOST, PORT, FRONTEND_HOST, and FRONTEND_PORT set. Backend and frontend typechecks still fail because generated/reader/wire.ts imports removed src/concepts.ts. Framework and artifact checks still fail because generated configuration points to that removed module. These generated-artifact failures preceded Milestone 5; generated files were not hand-edited. The initial frontend build without required host/port settings failed as configured.

Existing hubs from before Beta have no registered creator or slug. They remain readable but cannot be creator-managed until an explicit ownership migration decision; no owner was invented or data overwritten. Local fixture routes remain available to tests and seed data, but not through public reader HTTP. Asset management remains a later milestone.

## Milestone 5 suggested commit message

    feat(beta): add transactional creator-managed hubs

    - Run local MongoDB as an authenticated single-node replica set without replacing its data volume
    - Add creator ownership, unique slugs, sequence deletion, and protected Hubs operations
    - Delete hub documents, rules, progress, and checkpoints in one transaction
    - Read spoiler-filtered content from consistent MongoDB snapshots
    - Cover concept persistence, ownership, HTTP protection, cleanup, and transaction behavior

## Milestone 6 files changed

| File | Change |
| --- | --- |
| src/compositions/Articles.ts | Coordinates registered-user article creation, author-only editing and deletion, full block/rule replacement, scoped tagging, and unfiltered author views. Every multi-concept write uses one MongoDB transaction. |
| src/http/articles.ts | Exposes the accepted article paths with Sessioning-derived identity, Origin checks on mutations, bounded JSON, and explicit error mapping. Client-supplied author IDs are ignored. |
| src/http/edge.ts | Routes article requests to the protected boundary and removes a stale backend dependency on the deleted generated reader wire type. |
| tests/concepts/Documenting.test.ts | Verifies ordered replacement, stable surviving block IDs, author lookup, rename, deletion, and persistence after reconnect. |
| tests/concepts/RequirementTagging.test.ts | Verifies batch rule lookup, explicit empty rules, token lookup, and removal. |
| tests/compositions/Articles.test.ts | Covers author ownership, explicit article/block rules, spoiler filtering, obsolete-rule cleanup, deletion, media refusal, and rollback after a duplicate title occurs mid-save. |
| tests/http/ArticlesHttp.test.ts | Covers authenticated creation, CSRF, forged author IDs, author-only editing, save, tagging, untagging, and deletion. |

## Milestone 6 decisions and verification

Create and save require an explicit rule array for the article and every block. An empty array means visible with no checkpoint requirement; a missing rule is not silently treated as empty. Save preserves supplied block IDs belonging to the article, allocates IDs for new blocks, removes omitted block rules, and commits the title, blocks, and rules together. Tagging, untagging, and deletion are author-only and transactional. Reader responses continue to use the Milestone 5 snapshot boundary.

New IMAGE and VIDEO authoring references fail with ASSET_NOT_READY until Milestone 7 supplies MediaAssetManaging and READY validation. Existing Alpha images remain readable. No media bytes or metadata are created here. No accepted concept signature or state was changed in this milestone.

The dynamic block/rule loop and MongoDB transaction boundary are implemented in local Articles composition code because sync-engine reactions do not provide cross-concept transactions or dynamic action iteration. The accepted article route names and identity bindings are preserved. These article routes are not yet authored as sync-engine endpoint declarations; this is an implementation-level framework alignment issue, not a proposed product contract change.

The full test suite passed: **77 tests across 25 files, 587 assertions**. Design syntax passed for 15 files, backend typecheck passed, and the frontend production build passed with required host/port settings. Frontend typecheck fails because generated/reader/wire.ts was deleted in the existing working tree; framework and artifact checks fail with “The URL must be of scheme file” from modified generated configs. Git diff whitespace check reports a trailing space in generated.config.ts. Those generated files/configs were not edited for Milestone 6. Existing live provider requirements and the legacy-hub ownership migration decision remain outstanding.

## Milestone 6 suggested commit message

    feat(beta): add transactional author-managed articles

    - Add authenticated article creation, editing views, full saves, tagging, and deletion
    - Preserve block identities and remove obsolete rules in atomic MongoDB transactions
    - Reject unverified media references until asset management is available
    - Protect article HTTP routes with session identity and CSRF checks
    - Cover spoiler-safe rollback, ownership, persistence, and reader regressions
