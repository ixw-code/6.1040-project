# Implementation status — through Milestone 4B

Milestone 4A HubManagement and Milestone 4B ContentManagement are implemented through MongoDB-backed sync-engine gateways. ContentManagement is selected only by the local setup assembly; the reader assembly has no `/setup/*` routes. Fixture seeding, reader progress and reading compositions, HTTP serving, and the Vue reader flow remain for later milestones.

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
