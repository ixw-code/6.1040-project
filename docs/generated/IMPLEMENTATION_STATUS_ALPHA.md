# Wikiplotter Alpha — implementation and acceptance status

Alpha implements five MongoDB-backed concepts, four compositions, a reader-only sync-engine HTTP API, a local fixture seeder, and a minimal Vue interface. ContentManagement is available only through the local setup gateway. This document replaces the incremental milestone log with the committed history and the final acceptance evidence.

## Commit history

| Commit | Change |
| --- | --- |
| `0e8ca7b` | Created the initial README. |
| `918303c` | Continued the initial README draft. |
| `0e06ab2` | Added the project problem statement. |
| `37d948c` | Added the project pitch. |
| `b09c608` | Added initial concept design prose. |
| `f66572d` | Added the user journey and website sketches. |
| `d15a4d6` | Corrected README formatting. |
| `bc3b241` | Bootstrapped Bun, sync-engine, initial concepts, design files, and tests. |
| `8afd1e1` | Wrote the Alpha scope and decision document. |
| `2ad9479` | Installed the project sync-engine skill. |
| `575dbaa` | Defined Alpha concepts, compositions, bindings, and repository guidance. |
| `0aa02f6` | Created backend/frontend scaffolds and initial test files. |
| `1f9c9bb` | Implemented and tested the five concepts. |
| `4e28c9a` | Moved concept state to MongoDB and added persistence tests. |
| `8a325cd` | Aligned document titles and NotStarted checkpoint semantics with accepted contracts. |
| `55d5da0` | Implemented HubManagement setup workflows and gateway tests. |
| `d24341e` | Implemented local-only ContentManagement workflows and tests. |
| `e31f08d` | Separated environment profiles, guarded MongoDB targets, and aligned Compose/Vite configuration. |
| `ce80474` | Added idempotent development fixture seeding through setup compositions. |
| `32c88e3` | Implemented ReaderProgress workflows and gateway tests. |
| `242cc63` | Implemented spoiler-filtered Reading workflows and gateway tests. |
| `84fcaa3` | Fixed framework action results and pinned complete setup artifacts. |
| `11ba113` | Exposed reader compositions under `/api` and kept ContentManagement off HTTP. |
| `99fa857` | Added the Vue directory, hub, document, progress, and management interface. |

## Milestone 9 changes

| File | Change |
| --- | --- |
| `tests/acceptance/AlphaJourney.test.ts` | Added a disposable-database HTTP journey covering hub management, reader and hub isolation, inclusive checkpoint behavior, public/restricted/untagged content, hidden metadata, image-only content, refusals, and state after MongoDB reconnection. |
| `docs/generated/IMPLEMENTATION_STATUS_ALPHA.md` | Replaced the accumulated milestone notes with commit summaries, acceptance evidence, and the readiness assessment. |

## Acceptance evidence

- `bun run check` passed: design form checks for 10 files, setup and reader framework checks, pinned artifact checks, backend and Vue type checks, frontend build, and **49 tests across 14 files, 0 failures, 350 assertions**. Plain `tsc -p frontend/tsconfig.json --noEmit` also passed.
- Concept, composition, HTTP, persistence, and profile-guard tests passed. The new HTTP acceptance test uses local setup composition calls to install documents, then verifies public responses contain no restricted title, body, image URL, alt text, block ID, or untagged content. It confirms image-only output, checkpoint advance and retreat, distinct missing progress and NotStarted, cross-reader/hub isolation, and preserved hub/progress/content after closing and reopening the MongoDB client and HTTP listener.
- A headless Chrome run against Vite and the seeded development database rendered the Vue directory and exercised a saved reader identity across reload, progress selection, document reading, retreat revocation, hub switching, settings rendering, and a visible duplicate-hub refusal. Chrome request interception delayed a document response by 600 ms; switching hubs before it completed did not restore the previous title or body. No browser exceptions were observed. Temporary reader progress was cleared after the run.
- The local environment selects `wikiplotter_dev` for development and `wikiplotter_test_local` for tests. Profile-guard tests reject cross-profile database names before connection. The production template selects `wikiplotter` with the production profile; no production database connection or write was attempted.

## Readiness and limitations

**Ready for a local Alpha reader demonstration on the current development data.** The critical reader flow and HTTP secrecy boundary passed automated and real-browser checks. Hub/checkpoint mutations and refusal categories passed HTTP integration tests; the headless browser verified the management view and a refusal, but did not submit a hub-management mutation through Vue.

The following limits prevent an unconditional production sign-off:

- `bun run seed` refused because the existing Red Planet Journal checkpoint at position 3 is now `Sol 8`, while the fixture expects `Sol 7`. The script correctly preserved existing data; the current seeded hubs still served the reader journey. The origin of this data change was not established.
- `.env.production.local` is absent. The production template and profile guard were checked, but production startup and production database isolation were not exercised against a live production database.
- `docs/decisions/ALPHA.md` describes dataset validation that refuses startup on invalid stored data. No such startup workflow appears in the accepted composition contract or implementation. Resolving that contract discrepancy would add cross-concept startup behavior and needs a separate design decision.
- Framework checks retain 21 setup and 17 reader nonfatal advisories. Vite emitted nonfatal Node built-in externalization warnings while bundling the framework client; the built client rendered and worked in headless Chrome.

Suggested commit message: `test(alpha): validate end-to-end reader journey`

- Assert HTTP spoiler secrecy, isolation, refusals, and persistence through reconnection.
- Verify the seeded Vue journey and stale-response protection in headless Chrome.
- Consolidate Alpha history, evidence, and remaining readiness limits.
