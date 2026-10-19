# Implementation status — Milestone 4A HubManagement

HubManagement is implemented through the local sync-engine gateway. It creates and renames hubs; creates a checkpoint sequence and first ordinary checkpoint with a new hub; lists sequences and ordered checkpoints; and appends and relabels checkpoints. Gateway checks reject missing or cross-hub references. A nonblank create label is validated before hub creation so that input cannot leave a partial hub.

The assembly now selects all five MongoDB-backed concepts and the HubManagement composition. `createApplication(db)` returns the assembly and gateway for local callers. The no-argument assembly form builds unconnected MongoDB handles for design tooling; it does not start a listener or connect to the database.

`HubCataloguing._hub(name)` now resolves a name to a hub ID, matching its concept contract. HubManagement checks ID membership through `_hubs`. `Checkpointing._prefix` now includes NotStarted and every checkpoint through the selected one. The affected concept and composition specifications and tests reflect these rules.

Verification on this increment:

- Focused gateway, concept, and MongoDB persistence tests: 16 passed, 0 failed.
- Design form check: passed for 10 files.
- Backend and frontend type checks: passed.
- Framework check: 41 unresolved declarations remain for ContentManagement, ReaderProgress, and Reading, plus the unused future Contributor type. It reports no HubManagement or unselected-instance issue.
- `git diff --check`: passed.

ContentManagement and later milestones remain unimplemented. Hub creation is a multi-action flow, not a database transaction; an infrastructure failure after hub insertion can leave partial state. The sync-engine skill work bootstrap could not start because the analysis and catalog packages are installed locally but are absent from the declared development dependencies. Public framework guidance and examples matching version 1.1.0 were used directly.

Suggested commit message:

`feat(alpha): implement HubManagement gateway workflows`

- Register MongoDB concepts and assemble HubManagement for local gateway calls.
- Create, list, append, rename, and relabel scoped hubs and checkpoints.
- Align hub lookup and inclusive checkpoint prefixes with concept contracts.
- Cover success and refusal paths through MongoDB-backed gateway tests.

## Previous status — concept contract alignment

## Files changed

- `src/concepts/Checkpointing.ts` and its registry: add a fixed NotStarted checkpoint, zero-based positions, a start-label refusal, and ordered row-based `_prefix` results. Existing sequences derive a stable start ID without rewriting stored checkpoints.
- `src/concepts/Documenting.ts`, its registry, and `src/db.ts`: require a trimmed, scope-unique title; create the first TITLE block; reject invalid input blocks; and enforce title uniqueness with a partial MongoDB index. Existing titleless records remain readable and are excluded from that index.
- `tests/concepts/Checkpointing.test.ts`, `tests/concepts/Documenting.test.ts`, and `tests/db/MongoPersistence.test.ts`: cover the contracted behavior, concurrent title creation, legacy sequence reads, and persistence.
- `design/compositions/{HubManagement,ContentManagement,Reading}.md` and `docs/decisions/ALPHA-TECHNICAL.md`: align future composition inputs and descriptions with the authoritative concept rules; remove the unaccepted `_tokens` proposal.

## Architectural behavior

Checkpointing now distinguishes a selected NotStarted checkpoint from absent reader progress. Selecting NotStarted completes no ordinary checkpoints; selecting an ordinary checkpoint returns its inclusive prefix as ordered rows. Documenting now owns title creation and uniqueness rather than accepting arbitrary TITLE blocks. These rules move concept-local invariants into the concepts and MongoDB index before milestone 4 composition work.

## Verification

- `bun run check:design`: passed for 10 design files.
- `OPENSSL_CONF=/dev/null bun run typecheck:backend` and `typecheck:frontend`: passed. The OpenSSL override is needed in this sandbox.
- `MONGODB_URL=.../wikiplotter_alpha_test?authSource=admin bun test`: 25 passed, 0 failed, using isolated disposable databases on local MongoDB. Local MongoDB access required sandbox escalation.
- `OPENSSL_CONF=/dev/null bun run check:framework`: still fails with 67 pre-existing scaffold issues, chiefly unresolved composition declarations and unselected concept instances. `src/concepts.ts` and assembly remain for a later increment.
- The sync-engine skill run bootstrap could not start because its analysis and catalog development packages are absent. No dependencies were added for this concept-only increment.

Existing MongoDB documents created before this change can remain titleless. New documents follow the title rule; a data migration would be needed before treating old documents as fully contract-compliant.

## Suggested commit message

`feat(alpha): align checkpoint and document concepts with contracts`

- Add fixed NotStarted checkpoint and ordered completed-prefix rows.
- Enforce required unique document titles and generated TITLE blocks.
- Cover MongoDB persistence, concurrency, and legacy sequence reads.
