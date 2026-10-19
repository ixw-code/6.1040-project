# Wikiplotter — Alpha Technical Specification

Implementation target: Vue with TypeScript, Bun, MongoDB, and matching sync-engine core/HTTP packages pinned to 1.1.0. This document assigns implementation responsibilities; the composition specifications describe the user flows.

## Files and request flow

| File | Responsibility |
| --- | --- |
| `src/types.ts` | Identity types, BlockType, BlockInput, and token-array representations. |
| `src/concepts/<Name>.ts` | Concept actions, queries, local constraints, and MongoDB operations. |
| `src/concepts/<Name>.registry.ts` | Import the concept Markdown and register its class and refusal mappings. |
| `src/concepts.ts` | Export the five-instance concept set, typed references, and named pure computations. |
| `src/composition/HubManagement.ts` | Hub creation and checkpoint management declarations. |
| `src/composition/ContentManagement.ts` | Local document creation and tagging declarations. |
| `src/composition/ReaderProgress.ts` | Progress read/write declarations. |
| `src/composition/Reading.ts` | Eligibility relations and document response construction. |
| `src/composition/validation.ts` | Synchronous endpoint input validators; no database access. |
| `src/composition/computations.ts` | Pure transformations registered through the concept set. |
| `src/assembly.ts` | Assemble all five concepts and all four composition modules. |
| `src/application.ts` | Create the assembly and its standard gateway. |
| `src/db.ts` | MongoClient connection and shutdown; no application queries. |
| `src/edge.ts` | HTTP policy, public-path allowlist, and handler construction. |
| `src/main.ts` | Connect the database, initialize indexes, start Bun, and close resources on shutdown. |
| `scripts/fixtures.ts`, `scripts/seed.ts` | Curated fixture data and local gateway calls that install it. |
| `generated.config.ts`, `generated/` | One assembly configuration, generated read-back, and logical/HTTP contracts. |
| `frontend/src/` | Vue components, API client, reader identity, and request state. |
| `tests/` | Concept, composition, HTTP, persistence, and frontend state tests. |

A browser request passes through the typed HTTP client, the host's public-path guard, the sync-engine HTTP adapter, the gateway, and the selected endpoint. The endpoint uses concept actions and queries through framework declarations. Its formers construct the response; Vue renders it.

Views and formers stay in their owning composition modules. They do not have controllers, repositories, or database collections of their own. A concept never imports another concept instance.

## Concept contracts and persistence

Use named object arguments and named return fields. A `one` query returns a record; `optional` and `many` queries return row arrays. An absent optional answer is `[]`, not null; endpoint/former construction converts absence to the public null shape where specified.

The five selected instances use these bindings:

| External parameter | Application binding |
| --- | --- |
| Documenting.Scope, Checkpointing.Scope, ProgressRecording.Scope | HubCataloguing.Hub |
| ProgressRecording.Reader | Browser-retained Reader identity |
| ProgressRecording.Checkpoint | Checkpointing.Checkpoint |
| RequirementTagging.Item | ContentItem: a document or block identity |
| RequirementTagging.Token | Checkpointing.Checkpoint |

Use stable string IDs with distinct document/block prefixes so a tagging item is unambiguous. IDs identify records; display names and checkpoint labels do not. In TypeScript, specialize generic concept registrations consistently with these bindings.

`BlockInputs` is an ordered array of TEXT or IMAGE records with string body and alt fields. Documenting creates the required first TITLE block from a nonblank, scope-unique title. IMAGE blocks require nonblank alt text. Video is not yet a supported input kind.

A compact MongoDB layout is sufficient:

| Owner / collection | Stored record | Indexes and operations |
| --- | --- | --- |
| HubCataloguing / `hubs` | `{ _id, name }` | Unique trimmed name; insert and rename without changing ID. |
| Checkpointing / `sequences` | `{ _id, scope, label, start, checkpoints: [{ checkpoint, label }] }` | Unique scope; append atomically to the array and update labels in place. |
| Documenting / `documents` | `{ _id, scope, title, blocks: [{ block, kind, body, alt }] }` | Unique scope/title for new documents; create the complete document in one insert. |
| ProgressRecording / `progress` | `{ scope, reader, checkpoint }` | Unique compound index on scope and reader; upsert on record, delete on clear. |
| RequirementTagging / `requirements` | `{ item, required: string[] }` | Unique item; upsert a deduplicated requirement set or delete the rule. |

Embedding blocks and ordinary checkpoints is a storage implementation of their ordered relationships. Concept queries still expose the specified rows. The fixed NotStarted checkpoint has position zero and yields no completed checkpoints; ordinary positions start at one. Document listing projects IDs without loading block bodies.

Sequence initialization is idempotent by scope. Handle concurrent unique-index conflicts by retrieving the existing sequence. Indexes and local concept constraints prevent duplicate state; cross-concept membership checks belong in composition.

Concept methods await their database writes before returning success. Multi-action endpoint chains are not transactions. If hub creation succeeds but initialization fails, the hub remains; do not describe a retry of the entire create endpoint as automatically safe.

The Alpha and concept specifications define the intended behavior. Composition implementation must use their declared queries and preserve the fixed start checkpoint and required document title.

## Composition implementation

Export endpoints and helpers under the exact paths used by the design, such as `HubManagement.CreateHub`. Give named views and formers their explicit qualified names. A module can export a plain declaration record; it does not need a stateful management class.

Endpoint builders use `receive`, conditions, action chains, and `respond`. Capture action results with `.responds(...)`. Views use concept query lines and explicit cardinalities. Formers use `each` for multiple rows, `whether` for optional values, and nested record construction. Never put a many-row read directly into a record former and assume it becomes an array.

### HubManagement

| Endpoint / logical path | Backend execution | Vue use |
| --- | --- | --- |
| CreateHub — `/hubs/create` | Receive `{ name, label }`; chain HubCataloguing.create, Checkpointing.create with the returned hub as scope, and Checkpointing.append with the returned sequence. Respond `{ hub, sequence }` after completion. | Submit the creation form, reload the hub directory, and select the new hub. |
| RenameHub — `/hubs/rename` | Receive `{ hub, name }`; invoke HubCataloguing.rename; respond `{ hub }`. | Reload displayed hub names. |
| GetSequences — `/checkpoints/sequences` | Receive `{ hub }`; require ExistingHub; respond with SequenceList. | Supply sequence identities to management controls when needed. |
| ListCheckpoints — `/checkpoints/list` | Receive `{ hub }`; resolve HubSequence; respond with CheckpointChoices. | Supply the picker and checkpoint editor from the same response. |
| AppendCheckpoint — `/checkpoints/append` | Receive `{ hub, sequence, label }`; require HubSequence membership; append and return `{ checkpoint }`. | Reload checkpoint choices after success. |
| RelabelCheckpoint — `/checkpoints/relabel` | Receive `{ hub, checkpoint, label }`; require HubCheckpoint; relabel with `scope = hub` and return `{ checkpoint }`. | Reload labels while preserving the selected ID. |

`ExistingHub` is a predicate over HubCataloguing._hub. `HubSequence` exposes the sequence from Checkpointing._sequences for an existing hub; it is optional under the one-sequence-per-hub invariant. `HubCheckpoint` checks a supplied checkpoint against _checkpoints within that sequence.

`SequenceList` collects rows into `{ sequences: [{ sequence }] }`. `CheckpointChoices` produces `{ sequence, checkpoints: [{ checkpoint, label, position }] }` in sequence order. Use selection construction even though _sequences currently contains at most one row: its declared query cardinality is many.

The create endpoint already coordinates initialization. Do not install a second reaction that repeats it. A hub landing page is Vue's hub view with an initially empty document directory, not an automatically created document.

### ContentManagement

| Endpoint / local path | Backend execution |
| --- | --- |
| CreateDocument — `/setup/documents/create` | Validate `{ hub, title, blocks }`; require ExistingHub; invoke Documenting.create; then use CreatedDocument to return `{ document, blocks }`, where blocks is the ordered list of generated block IDs. |
| TagItem — `/setup/items/tag` | Receive `{ hub, item, required }`; require ScopedItem and AllowedRequirements; invoke RequirementTagging.tag; acknowledge `{ item }` after its empty action result. |
| UntagItem — `/setup/items/untag` | Receive `{ hub, item }`; require ScopedItem; invoke RequirementTagging.untag; acknowledge `{ item }`. |

`ExistingHub` checks HubCataloguing._hub. `ScopedItem` is a predicate with two alternatives: the supplied item matches a document returned by _documents, or a block returned by _blocks for a document in that hub. Disjoint document/block IDs keep the alternatives unambiguous.

`AllowedRequirements` reads the hub's sequence and its token array, then uses a registered pure `containsAll({ supplied, required })` computation to test set inclusion. The computation reads no state; the view supplies both arrays. Empty requirements pass when the hub's sequence exists. This computation validates token membership; actual reader eligibility remains owned by RequirementTagging.

`CreatedDocument` collects _blocks IDs after creation, preserving input order. It does not return raw content to the fixture script unnecessarily.

Input validators check the title, supported kinds, and string body/alt fields before mutation. They do not query MongoDB. The fixture script invokes these operations locally and verifies its expected results before serving the demo.

### ReaderProgress

| Endpoint / logical path | Backend execution | Vue use |
| --- | --- | --- |
| GetProgress — `/progress/get` | Receive `{ hub, reader }`; require ExistingHub; return ProgressResult. | Restore the saved selection on hub entry. |
| RecordProgress — `/progress/record` | Receive `{ hub, reader, checkpoint }`; require ValidSelection; invoke ProgressRecording.record; acknowledge the accepted checkpoint after success. | Save the selection, then request fresh directory/document data. |
| ClearProgress — `/progress/clear` | Receive `{ hub, reader }`; require ExistingHub; invoke clear and return `{ cleared }`. | Remove displayed content and return to checkpoint selection. |

`ExistingHub` checks hub existence. `ValidSelection` resolves the hub's single sequence and tests the submitted checkpoint against _checkpoints. It does not validate progress using a client-supplied token set.

`ProgressResult` uses an optional _checkpoint read under `whether` to return either `{ checkpoint }` or `{ checkpoint: null }`. Without that optional handling, an absent record could drop the result instead of returning the required null.

No server refresh reaction is needed. Progress mutation and the next Reading request are separate operations coordinated by Vue.

### Reading

| Endpoint / logical path | Backend execution |
| --- | --- |
| ListHubs — `/hubs/list` | Receive `{}`; respond with HubDirectory: `{ hubs: [{ hub, name }] }`. |
| BrowseHub — `/hubs/browse` | Receive `{ hub, reader }`; resolve ReaderSelection and ProgressTokens; respond with DocumentDirectory: `{ documents: [{ document, title }] }`. |
| ReadDocument — `/content/documents/read` | Receive `{ hub, reader, document }`; resolve the same reader/token context; return `{ content: { document, blocks } }` or `{ content: null }`. |

Implement the helpers as follows:

| Declaration | Inputs and implementation |
| --- | --- |
| ReaderSelection — view | Inputs hub/reader; check hub existence, resolve its sequence, read saved progress once, and verify checkpoint membership. Expose sequence and checkpoint as an optional result. |
| ProgressTokens — former | Inputs hub/sequence/checkpoint; collect completed checkpoint IDs from `_prefix`. Never accept this set from the browser. |
| ReadableDocument — view | Inputs hub/document/tokens; check document membership through _documents and test _eligible's `eligible: true` result. |
| EligibleBlock — view | Inputs hub/document/tokens; select _blocks rows and retain those whose _eligible result is true. Expose block, kind, body, and alt as many rows. |
| HubDirectory — former | Collect _hubs rows in deterministic ID order. Empty selection becomes an empty array. |
| DocumentDirectory — former | Iterate _documents, filter with ReadableDocument, and form one entry per document. Select the first eligible TITLE body using an ordered selection and `.first(body)`; absence produces null without removing the document. |
| DocumentContent — former | Require ReadableDocument, then collect EligibleBlock rows into the blocks array. Preserve source order and all supported kinds, including TITLE. Declare the record optional so absence can be represented as null by the endpoint. |

Capture the saved checkpoint once within each read request and use it throughout. This avoids mixing progress positions within one response; it does not create a database-wide snapshot.

A plain eligibility condition can drop a case. ReadDocument must explicitly preserve an unavailable optional content result as `content: null`. Missing progress instead returns a progress-required error; it must not become an empty token set.

## Assembly, HTTP, and generated contracts

`assembleApplication(...)` selects all five concept instances and all four composition records. `createApplication(...)` returns that assembly and `createGateway({ application })`. Both the server and seed script use these constructors. There is no separate setup assembly or generated setup config.

`generated.config.ts` registers `design/types.md` and all four `design/composition/*.md` documents. Concept Markdown enters through registries. Configure one generated directory and an HTTP wire projection using the same policy as the handler.

Keep assembly construction synchronous and free of listener startup or database connection work. The runtime entry point opens MongoDB before building the application. The tooling factory may construct MongoClient/Db handles without connecting or issuing reads during inspection; close its owned client through the config cleanup hook.

`src/edge.ts` uses `httpPolicy({ basePath: "/api", ... })` and `createHttpHandler`. Thus `/hubs/list` is served as JSON POST at `/api/hubs/list`. Declare public domain-error mappings in this policy; otherwise the adapter may hide unmapped domain failures as internal errors.

Before forwarding to the HTTP handler, an explicit allowlist admits only the 12 logical routes in HubManagement, ReaderProgress, and Reading. Reject every other API path, including all /setup paths. The local gateway still accepts ContentManagement calls. The generated full-assembly contract can contain local routes; its presence in a type is not access permission. The frontend API module exports only public operations.

Validators handle input shape. Concept refusals handle local rules. Composition endpoints supply explicit outcomes for missing hubs, invalid cross-hub references, and absent progress so failed conditions do not leave requests unanswered. Detailed rejection declarations can be added during implementation, but every exported declaration must then be linked in its composition specification.

## Vue implementation

| File | Implementation responsibility |
| --- | --- |
| `frontend/src/api.ts` | Instantiate createHttpClient with the generated HTTP contract and /api base URL; export public operations. |
| `frontend/src/composables/useReader.ts` | Create a random reader ID once and retain it under a stable localStorage key. |
| `frontend/src/composables/useReading.ts` | Hub selection, checkpoint choices, saved progress, document results, loading/error state, and request generation counters. |
| `frontend/src/components/HubManager.vue` | List/select/create/rename hubs. |
| `frontend/src/components/CheckpointManager.vue` | List, append, and relabel checkpoints. |
| `frontend/src/components/ProgressPicker.vue` | Record or clear the selected checkpoint. |
| `frontend/src/components/DocumentList.vue` | Render directory entries; use a neutral label for null titles. |
| `frontend/src/components/DocumentView.vue` | Render returned blocks according to kind in stored order. |
| `frontend/src/App.vue`, `main.ts` | Coordinate the current screen and mount Vue. |
| `frontend/vite.config.ts` | Proxy /api requests to the Bun backend during development. |

On hub selection, fetch checkpoints and saved progress. If progress is absent, show the picker; otherwise fetch the document directory. Opening a document invokes ReadDocument.

On a progress change, immediately clear previously rendered content and increment a request-generation counter. Await the write before refetching directory/content. Apply a response only if its counter, hub, and selected document still match current state. Abort obsolete requests when convenient, but do not rely on cancellation alone. Serialize progress writes or disable the picker while saving so rapid selections cannot finish in the wrong order. Clearing progress returns to selection without a read request.

For Alpha, TITLE and TEXT bodies render as escaped text; IMAGE bodies are curated image URLs and alt is alternative text. Do not render arbitrary body strings with v-html. Rich text needs an explicit format and safe renderer later; video needs a new supported block kind and renderer. Reading need not change its generic filtering for either extension.

## Fixtures and verification

`scripts/seed.ts` connects to the same database and invokes the local gateway to create a hub, checkpoints, documents, and their rules. Use the returned IDs when tagging; do not hardcode database identities or write directly to concept collections. Support a fresh-database seed and stop if the fixture hub already exists rather than silently duplicating or overwriting content.

The minimum suite is:

| Test files | Essential checks |
| --- | --- |
| `tests/concepts/*.test.ts` | Each concept's actions/queries, refusal behavior, ordered rows, missing records, and independent scope/reader state. |
| `tests/composition/HubManagement.test.ts` | Hub initialization runs once; append/relabel preserve identity and order; cross-hub references are rejected. |
| `tests/composition/ContentManagement.test.ts` | Creation returns ordered IDs with a generated TITLE block, foreign items/tokens are rejected, and tag/untag change eligibility. |
| `tests/composition/ReaderProgress.test.ts` | Missing selection, forward/backward replacement, clear twice, and reader isolation. |
| `tests/composition/Reading.test.ts` | Prefix tokens, missing/empty rules, nullable titles, hidden document/block data absent from payloads, and correct block order. |
| `tests/http.test.ts` | Real HTTP handler, invalid JSON/input, domain-error projection, public management routes, and blocked setup routes. |
| `tests/persistence.test.ts` | New application instances over a reconnected test database retrieve the same data and enforce unique indexes. |
| `frontend/src/composables/useReading.test.ts` | Stale responses cannot restore content after changing hub/progress or clearing progress. |

Use a separate test database. Begin concept development with in-memory implementations if helpful, then run the same behavioral expectations against MongoDB. This does not require a production repository abstraction.

Check Markdown form before implementation. Once the selected TypeScript assembly exists, run config-based check, generate artifacts, type-check the backend and Vue, and run the relevant tests. Generation verifies declarations and contracts, not spoiler-filtering behavior. Finish with the browser journey: create/select a hub, choose progress, browse and read, move backward, reload, and clear progress.
