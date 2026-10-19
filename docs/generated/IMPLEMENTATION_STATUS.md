# Implementation status — through Milestone 6B

Milestone 4A HubManagement, Milestone 4B ContentManagement, and Milestone 6A/6B ReaderProgress and Reading are implemented through MongoDB-backed sync-engine gateways. Milestone 5 seeds a local demonstration fixture through the setup gateway. ContentManagement is selected only by the local setup assembly; the reader assembly has no `/setup/*` routes. HTTP serving and the Vue reader flow remain for later milestones.

ContentManagement creates a required, scope-unique document title plus ordered TEXT and IMAGE blocks. It checks hub existence before creation; checks document or block ownership before tagging and untagging; and validates every requirement token against the hub's checkpoint sequence. Tagging replaces the full rule. An explicit empty rule permits eligibility without checkpoint requirements; removing a rule makes the item ineligible. NotStarted is a valid checkpoint token.

## Files changed for Milestone 4B

| File | Change |
| --- | --- |
| `src/compositions/ContentManagement.ts` | Add the three local setup gateway workflows, ownership views, checkpoint validation, ordered block result, and input validation. |
| `src/assembly.ts` | Select ContentManagement only in `assembleSetupWikiplotter`; keep the reader assembly free of setup routes. |
| `src/application.ts` | Build the local gateway from the setup assembly. |
| `generated.config.ts` | Point design tooling at the setup assembly and use the `@` import alias. |
| `src/concepts/Documenting.ts` | Keep required titles in document state, create only TEXT/IMAGE blocks, add scoped `_title`, and omit legacy stored TITLE rows from block reads. |
| `src/concepts/Checkpointing.ts` | Add scoped `_contains` to validate every token in one sequence, including NotStarted. |
| `src/concepts.ts` | Use `@` imports for concept registrations. |
| `src/concept-instances.ts` | Use `@` imports for the five MongoDB concept classes. |
| `src/main.ts` | Use the `@` alias for the reader assembly import. |
| `design/concepts/Documenting.md` | Define TEXT/IMAGE as the block kinds, keep titles required in document state, and specify `_title`. |
| `design/concepts/Checkpointing.md` | Specify `_contains` and its scoped, all-token validation rule. |
| `design/compositions/ContentManagement.md` | Align hub ID lookup, document/block ownership checks, checkpoint validation, and responses with the implementation. |
| `design/compositions/Reading.md` | Specify future title reads from document state and full inclusive-prefix tokens; no Reading code was implemented. |
| `docs/decisions/ALPHA.md` | Align the high-level Alpha description with title state, TEXT/IMAGE blocks, existing ownership queries, and inclusive checkpoint tokens. |
| `tests/compositions/ContentManagement.test.ts` | Exercise the setup gateway, ordering, image-only content, scope isolation, invalid references, rule replacement/removal, and reader route separation. |
| `tests/concepts/Documenting.test.ts` | Verify title state, no generated TITLE block, scoped title reads, and legacy read compatibility. |
| `tests/concepts/Checkpointing.test.ts` | Verify `_contains` with empty, valid, foreign-scope, and unknown tokens. |
| `tests/db/MongoPersistence.test.ts` | Verify persisted documents have only submitted blocks and retain their title after reconnect. |
| `docs/generated/IMPLEMENTATION_STATUS.md` | Record this increment, decisions, verification, and remaining work. |

## Decisions and limits

- Document titles are required, trimmed, and unique per hub. Titles are no longer blocks. Existing stored TITLE blocks are left in MongoDB but omitted from `_blocks`; this increment does not migrate old records or their tags.
- Checkpointing owns the all-token membership query; ContentManagement combines it with hub and item ownership checks. Concepts remain independent.
- The setup and reader assemblies use the same concept state but select different composition routes. No HTTP adapter routes or fixture data were added.
- Hub creation remains a multi-action flow without a database transaction; an infrastructure failure after hub insertion can leave partial state.

## Verification

- Focused ContentManagement, Documenting, Checkpointing, and persistence tests: **20 passed, 0 failed**.
- Complete MongoDB-backed suite, including HubManagement: **35 passed, 0 failed**.
- Design form check for 10 files, backend type check, frontend type check, and `git diff --check`: passed.
- Framework and artifact checks: 28 unresolved declarations for future ReaderProgress and Reading compositions plus unused Contributor. No HubManagement or ContentManagement mismatch was reported.

Milestone 4A was committed as `55d5da0 feat(alpha): implement HubManagement gateway workflows`. The sync-engine skill bootstrap previously could not start because analysis and catalog packages were installed locally but absent from declared development dependencies; version 1.1.0 public guidance and examples were used directly.

## Suggested commit message

`feat(alpha): implement ContentManagement setup workflows`

- Create scoped documents with required titles and ordered text/image blocks.
- Validate hub, item, and checkpoint ownership before replacing or removing requirement rules.
- Separate setup routes from the reader assembly and cover gateway failures with MongoDB-backed tests.

## Local environment configuration

Ignored `.env`, `.env.test.local`, and `.env.production.local` share generated MongoDB credentials and select `wikiplotter_dev`, `wikiplotter_test_local` (plus disposable `wikiplotter_test_<id>` databases), and `wikiplotter` respectively. Compose reads credentials and host port 27018 from `.env` and uses the dedicated `mongo-secure-data` volume. `src/db.ts` refuses database names outside the selected profile before connecting or creating indexes. The obsolete `wikiplotter_alpha_demo_worktree` database and its `project-mongo-1` container were removed; the current Wikiplotter container and old volumes remain.

### Files changed

| File | Change |
| --- | --- |
| `.env`, `.env.test.local`, `.env.production.local` (ignored) | Store matching Mongo credentials and port, distinct database URLs/profile markers, and local host ports with mode 0600. |
| `.env.example`, `.env.test.example`, `.env.production.example` | Document placeholder credentials, profile markers, and exact database names without real secrets. |
| `compose.yaml` | Interpolate credentials and host port from `.env`; share one Mongo server across three database profiles. |
| `package.json` | Explicitly load dev, test, and production env files for Bun/Vite commands; pass `.env` to Compose; remove literal credentials from `db:shell`. |
| `src/db.ts`, `tests/db/MongoTarget.test.ts` | Reject database/profile mismatches before connection or index creation; cover permitted and forbidden targets. |
| `tests/mongo-test-db.ts` | Require a `wikiplotter_test_*` input before creating each disposable test database. |
| `frontend/vite.config.ts` | Read backend/frontend host and port from the selected profile and name the Vite mode in configuration errors. |
| `src/assembly.ts` | Use `MONGODB_URL` for the no-argument tooling assembly. |
| `README.md` | Document three profiles, exact database names, command routing, port settings, and MongoDB first-initialization behavior. |
| `docs/generated/IMPLEMENTATION_STATUS.md` | Record the configuration work, verification, and remaining limits. |

### Verification

- Connected through all three profiles and confirmed exactly `wikiplotter`, `wikiplotter_dev`, and `wikiplotter_test_local` in the current MongoDB container; removed the obsolete database and container.
- `bun run test`: **38 passed, 0 failed**, including three new guard tests. The initial sandbox-only run could not reach loopback MongoDB; the authorized rerun passed.
- Backend and frontend type checks, frontend build, design form check, and `git diff --check`: passed.
- Framework and artifact checks still report 28 unfinished ReaderProgress/Reading declarations and unused Contributor; no new configuration issue was reported.

### Suggested commit message

`chore(config): isolate MongoDB profiles and guard database targets`

- Select separate production, development, and test databases with profile-specific env files and scripts.
- Reject database/profile mismatches before MongoDB connection or index creation; cover the guard in tests.
- Purge the obsolete Wikiplotter database and container while preserving the current MongoDB server.

## Milestone 5 — local demonstration fixture

`bun run seed` populated `wikiplotter_dev` with **2 hubs**, each with NotStarted and three ordered ordinary checkpoints; **5 titled documents** with **12 ordered TEXT/IMAGE blocks**, including one image-only document; and **17 explicit requirement rules**. Public documents and blocks use empty rules. Later checkpoint rules reveal both whole documents and independent blocks progressively. Images use self-contained SVG data URLs.

| File | Change |
| --- | --- |
| `scripts/seed.ts` | Define the fixture, create hubs/checkpoints/documents and tag items only through the local setup gateway; use read-only MongoDB lookups to reuse matching IDs, fill missing rules, and refuse conflicting existing fixture data. Require the development profile and database. |
| `docs/generated/IMPLEMENTATION_STATUS.md` | Record seeded data, verification, and remaining limits. |

The script does not reset data or seed test/production. A failure can leave a partial fixture; rerunning fills missing matching data, while changed checkpoint labels, document blocks, or rules require manual review. No global dataset validator, ReaderProgress, or Reading workflow was added.

### Verification

- First `bun run seed`: **2 hubs, 6 ordinary checkpoints, 5 documents, 17 rules created**. Second run: **0 created** in every category.
- Read-only sanity check: confirmed two ordered NotStarted sequences, five titled documents, one image-only document, 17 rules, and progressive eligibility at selected checkpoints.
- Direct test and production profile invocations refused before connecting. The 38-test MongoDB suite, backend/frontend type checks, design form check, and standalone seed-script type check passed.
- Framework/artifact checks remain subject to the 28 previously reported unfinished ReaderProgress/Reading and unused Contributor issues; they were not rerun for this fixture-only change.

### Suggested commit message

`feat(alpha): seed local demonstration hubs and spoiler rules`

- Add two hubs with ordered checkpoints and five titled demo documents.
- Tag documents and blocks through the setup gateway for public and progressive visibility.
- Make the development seed rerunnable without resetting or duplicating matching data.

## Milestone 6A — reader progress

ReaderProgress provides `/progress/get`, `/progress/record`, and `/progress/clear` through both local assemblies. It checks hub IDs against HubCataloguing._hubs and record selections against that hub's checkpoint sequence before writing. Missing progress returns `{ checkpoint: null }`; NotStarted remains a selectable checkpoint. Clear reports whether a record existed.

| File | Change |
| --- | --- |
| `src/compositions/ReaderProgress.ts` | Add hub and selection views, nullable progress result, and guarded get/record/clear workflows with input validation. |
| `src/assembly.ts` | Register ReaderProgress in reader and setup assemblies; add no HTTP host or route. |
| `design/compositions/ReaderProgress.md` | Correct the name-query drift and document the selected nullable-result view. |
| `tests/compositions/ReaderProgress.test.ts` | Cover gateway success, NotStarted, backward progress, clearing, invalid inputs/references, and reader/hub isolation. |
| `docs/generated/IMPLEMENTATION_STATUS.md` | Record this milestone and verification. |

The nullable result uses a small many-row view around ProgressRecording._checkpoint so the former can yield a scalar or null in the framework's supported form operation. No concept contract, schema, or HTTP surface changed.

### Verification

- Focused ReaderProgress gateway tests: **3 passed, 0 failed**. Full MongoDB-backed suite: **41 passed, 0 failed**.
- Backend/frontend type checks, design form check for 10 files, and `git diff --check`: passed.
- Framework and artifact checks now report **17 existing issues**: unresolved Reading declarations and unused Contributor. The baseline before ReaderProgress was 28 issues; no ReaderProgress issue remains.

### Suggested commit message

`feat(alpha): implement ReaderProgress gateway workflows`

- Validate hub and scoped checkpoint selection before recording reader progress.
- Preserve missing versus NotStarted progress, backward movement, isolation, and idempotent clearing.
- Add focused MongoDB-backed gateway tests and register progress in local assemblies.

## Milestone 6B — spoiler-filtered reading

Reading lists hubs, browses eligible titles, and returns only eligible document blocks through local gateways. It derives tokens from the reader's saved checkpoint and the hub's inclusive Checkpointing prefix. Missing progress returns `PROGRESS_NOT_SET`; an explicit NotStarted selection supplies its token. Unknown hubs return `HUB_NOT_FOUND`, and unavailable documents return `{ content: null }`. Missing rules hide items; explicit empty rules allow them. Restricted titles and block IDs, bodies, image URLs, alt text, and other block metadata are absent from responses.

| File | Change |
| --- | --- |
| `src/compositions/Reading.ts` | Add hub list, browse, and read workflows with scoped progress, document, and block eligibility views and response formers. |
| `src/assembly.ts` | Select Reading in both local assemblies without adding an HTTP host. |
| `src/concepts/Checkpointing.ts` | Add `_prefixTokens`, a read-only one-row form of the existing inclusive prefix for query bindings. |
| `design/concepts/Checkpointing.md`, `design/compositions/Reading.md`, `docs/decisions/ALPHA.md` | Specify the token-array query, missing-progress response, and actual Reading data flow. |
| `tests/compositions/Reading.test.ts` | Exercise local gateway filtering, hidden-data absence, backward progress, image-only content, and scope isolation. |
| `tests/concepts/Checkpointing.test.ts` | Verify ordered inclusive token arrays and invalid-reference behavior. |
| `docs/generated/IMPLEMENTATION_STATUS.md` | Record the increment, decisions, and verification. |

The `_prefix` query remains unchanged. `_prefixTokens` is the smallest contract addition needed to supply RequirementTagging._eligible with a token array: framework formers construct response values and cannot feed their output back into a query-bound view. Reading uses no database writes or peer concept calls.

### Verification

- Focused Reading gateway tests: **3 passed, 0 failed**. Full MongoDB-backed suite: **44 passed, 0 failed**.
- Backend/frontend type checks, design form check for 10 files, and `git diff --check`: passed.
- Framework and artifact checks each report **one preexisting issue**, the unused `Contributor` type. The baseline before Reading had 17 issues, including unresolved Reading declarations; no Reading issue remains.

### Suggested commit message

`feat(alpha): implement spoiler-filtered Reading workflows`

- Derive scoped inclusive checkpoint tokens from saved reader progress.
- Filter document titles and ordered text/image blocks by explicit requirement rules.
- Verify hidden metadata stays out of gateway responses across progress changes.
