# Wikiplotter — Alpha Technical Specification

Companion to [ALPHA.md](./ALPHA.md)

## Concept Files and Contracts

Each concept has a specification in `design/concepts/<Name>.md`, an implementation in `src/concepts/<Name>.ts`, and registration in `src/concepts/<Name>.registry.ts`.

Concept implementations own their state, MongoDB operations and local validation. They do not call other concepts. Registries use `registerConcept` to associate implementations with specifications and declared refusals. `src/concepts.ts` exports the shared `conceptSet` and typed concept references.

### Shared Contracts

`design/types.md` defines these bindings:

| Parameter | Binding |
| --- | --- |
| Documenting.Scope, Checkpointing.Scope, ProgressRecording.Scope | HubCataloguing.Hub |
| ProgressRecording.Reader | Application-defined dummy reader ID |
| ProgressRecording.Checkpoint | Checkpointing.Checkpoint |
| RequirementTagging.Item | Documenting.Document or Documenting.Block |
| RequirementTagging.Token | Checkpointing.Checkpoint |

Use object arguments and named result fields in TypeScript. Queries return the row shapes and cardinalities declared in their specifications; ordered block/checkpoint results preserve their order. Define shared block input and response types in `src/types.ts`.

## Composition Files

Use matching `design/compositions/<Name>.md` and `src/compositions/<Name>.ts` files. Each TypeScript module exports its composition declarations.

| Module | Endpoints and coordination | Views and formers |
| --- | --- | --- |
| HubSetup | Create/rename hubs; initialize their sequence; append/relabel checkpoints. | Resolve existing hubs and scoped sequences. |
| ContentSetup | Create complete documents; tag/untag document or block items; validate installed content. | Resolve scoped items, validate requirement checkpoints and check document/title rules. |
| ReaderProgress | Retrieve, record and clear a reader's progress. | Resolve the hub and validate a selected checkpoint through Checkpointing._prefix. |
| Reading | List hubs/checkpoints, browse article titles and read articles. | Resolve recorded progress, derive completed tokens, check eligibility and form reader responses. |

Endpoints use `endpoint`, `receive` and `respond`. Views use `view` and `where`; response construction uses `former` and `each`. Cross-concept actions belong in endpoint chains or reactions, not in concept methods.

Hub creation chains HubCataloguing.create into Checkpointing.create. Return after initialization succeeds; recovery must reuse an existing sequence rather than create a duplicate.

ContentSetup verifies the target document/block and all requirement checkpoints belong to the requested hub. Installed documents and blocks must have explicit rules. The TITLE requirement must not be later than the document requirement.

Reading applies these rules:

- Resolve the saved checkpoint once and derive its completed prefix on the server.
- Require both document and TITLE eligibility for browsing and reading.
- Return eligible blocks in original order; omit all fields of hidden blocks.
- Return a progress-required outcome when no selection exists.
- Return an unavailable article when its identity, scope or eligibility does not match.

`src/compositions/validation.ts` contains request validation and pure transformations needed by these declarations. Register computations used by the DSL through the concept set. Helpers do not access concept instances or MongoDB directly.

## Assembly, Database and HTTP Files

| File | Responsibility |
| --- | --- |
| `src/assembly.ts` | Export reader and setup assembly constructors using `assemble`; inject concept instances and select the appropriate composition modules. |
| `src/application.ts` | Construct the application and `createGateway` for local endpoint invocation. |
| `src/db.ts` | Connect and close MongoClient; supply the database to concept constructors. |
| `src/edge.ts` | Define `httpPolicy`, the `/api` prefix and public error mappings. |
| `src/main.ts` | Connect MongoDB, construct the reader application, create the HTTP handler with `createHttpHandler`, and start Bun. |
| `src/client.ts` | Export a `createHttpClient` wrapper typed by the generated reader wire contract. |
| `scripts/seed.ts` | Create premade content through a local setup gateway, retrieve generated IDs, apply requirements and validate the dataset. |

Reader assembly selects ReaderProgress and Reading. Setup assembly selects HubSetup and ContentSetup. Both use the same five concept implementations; setup endpoints are not mounted on reader HTTP.

Seed from an empty database before starting the reader server. Keep fixture content in `scripts/fixtures.ts`. Catalog checks belong to ContentSetup and run after seeding and before admitting reader requests. Content and requirements remain fixed while Alpha is serving.

`generated.config.ts` and `generated.setup.config.ts` select the corresponding assembly, design documents and artifact destinations. Generated read-back and wire types live in `generated/reader/` and `generated/setup/`; regenerate them after contract changes.

## API Endpoints

Reader endpoints use POST with JSON. Declare logical paths in composition; `httpPolicy` adds `/api`.

| HTTP path | Input | Output |
| --- | --- | --- |
| `/api/hubs/list` | Empty object | Hub IDs and names |
| `/api/checkpoints/list` | hub | Sequence and ordered checkpoint IDs/labels |
| `/api/progress/get` | hub, reader | Saved checkpoint or null |
| `/api/progress/record` | hub, reader, checkpoint | Saved checkpoint acknowledgement |
| `/api/progress/clear` | hub, reader | cleared |
| `/api/hubs/browse` | hub, reader | Eligible document IDs and titles |
| `/api/articles/read` | hub, reader, document | Filtered article or unavailable result |

Local setup paths:

| Path | Input | Output |
| --- | --- | --- |
| `/setup/hubs/create` | name | hub, sequence |
| `/setup/hubs/rename` | hub, name | hub |
| `/setup/checkpoints/append` | hub, sequence, label | checkpoint |
| `/setup/checkpoints/relabel` | hub, checkpoint, label | checkpoint |
| `/setup/documents/create` | hub, name, blocks | document and generated block IDs |
| `/setup/items/tag` | hub, item, required | item acknowledgement |
| `/setup/items/untag` | hub, item | item acknowledgement |
| `/setup/catalog/check` | Empty object | Validation result |

ContentSetup retrieves generated blocks after Documenting.create; the concept's action still returns only the document identity. Setup paths are invoked by the seed script, not the browser.

Declare validation failures and result shapes in the composition specifications. Reader responses must distinguish missing progress from an unavailable article.

## Vue Frontend

| File | Responsibility |
| --- | --- |
| `frontend/src/main.ts` | Mount the Vue application. |
| `frontend/src/App.vue` | Coordinate hub selection, progress, article browsing and reading. |
| `frontend/src/components/HubSelector.vue` | Display and select hubs. |
| `frontend/src/components/ProgressPicker.vue` | Display checkpoints, save a selection and clear progress. |
| `frontend/src/components/ArticleList.vue` | Display eligible article links. |
| `frontend/src/components/ArticleView.vue` | Render returned title, text and image blocks. |
| `frontend/src/api.ts` | Instantiate and use the typed reader client. |
| `frontend/src/composables/useReader.ts` | Retain a dummy reader ID in browser storage and manage reactive reader state. |

Use Vue single-file components with `<script setup lang="ts">`. Progress is stored in MongoDB through ProgressRecording. After a hub or progress change, clear previous content and reload eligible results; discard responses from superseded requests.

Vite serves the frontend locally and proxies `/api` to Bun. The interface updates without a page reload and shows validation/loading/error states needed by the reader journey.

## Test Suite Files

| File | Coverage |
| --- | --- |
| `tests/concepts/HubCataloguing.test.ts` | Creation, unique names, listing and rename |
| `tests/concepts/Documenting.test.ts` | Scoped documents, block order, title structure and item lookup |
| `tests/concepts/Checkpointing.test.ts` | NotStarted, inclusive prefixes, sequence isolation, append and relabel |
| `tests/concepts/ProgressRecording.test.ts` | Reader/scope isolation, missing progress, replacement and clear |
| `tests/concepts/RequirementTagging.test.ts` | Missing/empty rules, token inclusion and rule removal |
| `tests/compositions/Setup.test.ts` | Hub/content setup, scoped tagging and catalog validation |
| `tests/compositions/Reading.test.ts` | Progress flows, eligible titles, filtered blocks and backward progress |
| `tests/http.test.ts` | Actual HTTP handler, request validation, result shapes and setup-route exclusion |
| `tests/persistence.test.ts` | Saved content/progress after reconnecting and MongoDB uniqueness constraints |
| `tests/helpers.ts` | Test data and isolated test-database lifecycle |

Start concept tests with in-memory state. After adding MongoDB, run the concept and persistence checks against a separate test database. Composition tests call the local gateway.

Check the complete Vue journey manually: seed an empty database, select a hub, record progress, browse/read, change progress, refresh and clear progress.

## Project Structure

| Location | Contents |
| --- | --- |
| `design/concepts/`, `design/types.md` | Concept specifications and application bindings |
| `design/compositions/` | Four composition specifications |
| `src/concepts/`, `src/concepts.ts`, `src/types.ts` | Concept implementations, registrations and shared types |
| `src/compositions/` | Application declarations and validation |
| `src/assembly.ts`, `src/application.ts` | Assemblies and gateways |
| `src/db.ts`, `src/edge.ts`, `src/main.ts`, `src/client.ts` | Database connection and HTTP integration |
| `scripts/seed.ts`, `scripts/fixtures.ts` | Demo setup |
| `generated.config.ts`, `generated.setup.config.ts`, `generated/` | Framework configuration and generated artifacts |
| `frontend/` | Vue source, index.html, Vite configuration and frontend TypeScript configuration |
| `tests/` | Concept, composition, HTTP and persistence tests |
| `compose.yaml`, `.env.example`, `.env` | Local MongoDB and environment settings |
| `package.json`, `bun.lock`, `tsconfig.json`, `text.d.ts`, `.gitignore` | Dependencies, scripts, compiler configuration and exclusions |
| `docs/decisions/`, `README.md` | Alpha decisions, this specification, incremental design notes, user journey and local run instructions |

Project scripts cover development, seeding, tests, type checking, design checking and artifact generation/checking. Keep sync-engine core and HTTP packages on matching versions.
