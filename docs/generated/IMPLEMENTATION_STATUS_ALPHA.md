# Wikiplotter Alpha — implementation status

Alpha provides five MongoDB-backed concepts, four compositions, a reader-only HTTP API, local demonstration fixtures, and a minimal Vue site. Document setup and requirement tagging remain local-only. The milestones below summarize the important implementation and design decisions; `docs/decisions/ALPHA.md` and `design/` hold the detailed contracts.

## Milestone summary

| Milestone | Implementation and design decisions |
| --- | --- |
| **1 — Design** | Defined HubCataloguing, Documenting, Checkpointing, ProgressRecording, and RequirementTagging as independent state owners, connected by HubManagement, ContentManagement, ReaderProgress, and Reading. Hub IDs are stable scopes; documents have required titles in document state and ordered TEXT/IMAGE blocks. Missing requirements deny access, while explicit empty rules permit it. |
| **2 — Concepts** | Implemented and independently tested the five concepts. Checkpointing gives each sequence a stable NotStarted checkpoint and returns inclusive prefixes; progress remains distinct when no selection exists. |
| **3 — MongoDB** | Persisted concept state and added unique indexes and reconnection tests. Concept operations retain stable identities and scoped invariants across process reconstruction and concurrent writes. |
| **4A — HubManagement** | Composed hub creation with sequence initialization and the first labeled checkpoint. Added rename, sequence/checkpoint listing, append, and relabel workflows; checkpoint order and IDs remain stable. |
| **4B — ContentManagement** | Added local gateway workflows for scoped document creation and requirement replacement/removal. Validates hub, ownership, and checkpoint-token membership across concepts. TITLE blocks were removed from Alpha; required titles live on documents, including image-only documents. |
| **Environment isolation** | Split development, test, and production database profiles. `src/db.ts` rejects a database name outside its active profile before connecting; tests use disposable `wikiplotter_test_*` databases. Compose and Vite use configured ports. |
| **5 — Fixtures** | Seeded two hubs with ordered checkpoints, public and checkpoint-restricted documents, progressive block rules, and an image-only document through the local setup gateway. The script checks existing records and avoids destructive resets. |
| **6A — ReaderProgress** | Added get, record, and clear workflows. Composition validates hub and checkpoint membership; readers may move forward or backward without affecting another reader or hub. |
| **6B — Reading** | Derives inclusive checkpoint tokens from saved progress on the backend. Browse and read responses omit ineligible documents and blocks entirely, including their titles, bodies, image URLs, alt text, and IDs. |
| **7 — HTTP** | Served HubManagement, ReaderProgress, and Reading through the sync-engine HTTP adapter under `/api`, with a reader-only generated wire and mapped refusal categories. ContentManagement has no HTTP route. |
| **8 — Vue** | Added hub directory, hub and document pages, progress controls, and hub settings using the generated reader client. A browser-stored dummy reader ID survives reloads; navigation and mutations clear visible content and discard stale responses. |
| **9 — Acceptance** | Added an HTTP journey test that checks spoiler secrecy, scope isolation, refusals, and state after MongoDB/HTTP reconnection. Exercised the seeded reader journey and delayed-response navigation in headless Chrome. |

## Final Alpha progress report

**Local demonstration readiness: verified.** `bun run check` passed design, framework, artifact, backend/frontend type, frontend build, and **49 tests across 14 files** with no failures. The acceptance test covers public, restricted, and untagged content; NotStarted and missing progress; forward and backward visibility; image-only output; cross-reader and cross-hub isolation; and persistence after reconnection. HTTP tests also verify that ContentManagement routes return 404.

Headless Chrome rendered the seeded Vue site and verified reader identity across reload, progress changes, document reading, retreat revocation, hub switching, the settings view, and a visible duplicate-hub refusal. Delaying a document response by 600 ms did not restore content after a hub switch; no browser exceptions were observed. Hub/checkpoint mutations were verified through HTTP tests, while the browser run only inspected the settings controls.

**Remaining limits:**

- No `.env.production.local` is currently present. The development and test environments are currently live, but a live production startup or database connection was not tested.
- `docs/decisions/ALPHA.md` mentions refusing startup when stored data fails dataset validation. That workflow has no matching accepted composition contract or implementation and needs a separate design decision.
- Framework checks report 21 setup and 17 reader nonfatal advisories. Vite reports nonfatal Node built-in externalization warnings; its built client worked in headless Chrome.

## Potential Beta direction

Resolve the startup-validation contract and production configuration before deployment. Beta can then move in the direction for any of authenticated ownership and contribution controls, document editing/version history, navigation and search, media management, richer rendering, and UI polish. These are future design choices; none is part of the verified Alpha implementation.
