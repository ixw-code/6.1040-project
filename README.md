# Wikiplotter

Wikiplotter is a spoiler-aware wiki for narrative fiction. Each series has a hub with an ordered set of reading checkpoints. Readers record their progress, while contributors organize articles into versioned content blocks and assign checkpoint requirements to articles, titles, text, and images. The intended experience is a wiki that reveals information as the reader advances, based on contributors' spoiler classifications.

**A reader's journey:** Bob finishes chapter 50 and visits the series hub to look up an artifact mentioned earlier in the series. As this is his first time visiting, before he is allowed to view any pages, he is prompted to select his latest completed chapter. The site refreshes and he can now browse all the articles and content available up to that point in the story. Whether browsing or reading an article, any later revelations remain hidden, including any revealing article titles or passages. When Bob reaches chapter 70, he can update his progress at the click of a button and the site will refresh with newly available information up until that point. There's no stress involved with navigating vague spoiler warnings.

The project is being built incrementally with TypeScript, Bun, sync-engine **1.1.0**, and MongoDB. The features above describe the target application. The instructions below start with the bare sync-engine scaffold; an untouched scaffold has no wiki endpoints or browser UI.

## Alpha scope

Readers can create and rename hubs, view checkpoint sequences, and append or relabel checkpoints without authentication. These changes affect shared hub data.

Document content and its requirement tags are preloaded through a local fixture workflow. Alpha does not include document uploading, public editing, version history, accounts, or contributor permissions.

The browser retains a dummy reader ID. MongoDB stores that reader's progress for each hub. No saved progress is distinct from selecting the first checkpoint.

## Concepts and composition

Five independent concepts own the application state:

| Concept | Responsibility |
| --- | --- |
| HubCataloguing | Named hubs with stable identities. |
| Checkpointing | Scoped checkpoint sequences, labels, ordering, and inclusive prefixes. |
| Documenting | Scoped documents and ordered blocks containing kind, body, and alt text. |
| ProgressRecording | One selected checkpoint per reader and hub. |
| RequirementTagging | Required tokens for each item and eligibility by token inclusion. |

The concepts do not call one another. Composition connects them into application workflows:

| Composition | Workflow |
| --- | --- |
| HubManagement | Create a hub and its initial checkpoint sequence; rename hubs, list sequences, append checkpoints, and relabel them. |
| ContentManagement | Create fixture documents, tag or untag documents and blocks, and check the installed catalog. |
| ReaderProgress | Retrieve, validate and record, or clear a reader's checkpoint selection. |
| Reading | List hubs and checkpoints, browse eligible article titles, and return eligible content blocks. |

Each composition module groups endpoint declarations and any supporting reactions, views, or formers. An endpoint may invoke one concept operation or coordinate several. Cross-concept checks, such as requiring tagged checkpoints to belong to the document's hub, live here.

For reading, the backend retrieves saved progress and collects the inclusive checkpoint prefix into tokens. RequirementTagging checks those tokens against document and block requirements. Missing rules make items ineligible; empty rules impose no checkpoint requirement. Hidden content is omitted from the response, not merely concealed by Vue.

## Assembly and serving

`src/assembly.ts` selects the concept implementations and composition modules that form the application.

The reader assembly includes HubManagement, ReaderProgress, and Reading. The local setup assembly also provides ContentManagement so the fixture script can install documents and requirement tags. Both use the same persistent application data.

A gateway invokes the assembled endpoints. The backend host exposes reader endpoints through the sync-engine HTTP adapter; Vue calls them in the background and renders the results. Calling an API endpoint does not navigate the browser to that endpoint.

## Setup and checks

Install Bun 1.x and start a local MongoDB instance.

```sh
bun install
```

Copy `.env.example` to `.env`, `.env.test.example` to `.env.test.local`, and `.env.production.example` to `.env.production.local`. Set the same MongoDB username, password, and port in all three ignored files and their `MONGODB_URL` values. The database names are fixed by profile: `wikiplotter_dev` for development, `wikiplotter_test_*` for tests, and `wikiplotter` for production. `src/db.ts` rejects a database name that does not match `WIKIPLOTTER_ENV` before connecting or creating indexes.

Run `bun run db:up` to initialize the shared local MongoDB server from `.env`; `bun run dev` uses `.env`, `bun run test` uses `.env.test.local`, and `bun run start` uses `.env.production.local`. Each test creates and drops a disposable `wikiplotter_test_<id>` database. Compose's host bind and port come from `MONGO_BIND_HOST` and `MONGO_PORT`; backend and Vite ports come from each profile's `HOST`/`PORT` and `FRONTEND_HOST`/`FRONTEND_PORT`. MongoDB applies credentials when its volume is first initialized, so changing env files alone does not rotate an existing user. Populate the demo through the local fixture workflow before serving reader content.

The backend scaffold commands are:

```sh
bun run generate
bun run check
bun run start
```

`package.json` defines the available startup scripts; the fixture and Vue startup commands are added with their implementations.

Run behavior tests with `bun run test`. Concept tests cover individual actions and queries. Composition tests cover complete workflows and rejected cross-hub references. Persistence tests verify that MongoDB data survives reconnecting.

## Project layout

| Location | Purpose |
| --- | --- |
| `docs/decisions/` | Architectural decisions and rationale between iterations. |
| `design/concepts/` | Independent concept specifications. |
| `design/composition/` | Application workflows and endpoint contracts. |
| `design/types.md` | Concept instances and application type bindings. |
| `src/concepts/`, `src/concepts.ts` | Concept implementations, registrations, and the application concept set. |
| `src/composition/` | Executable composition declarations. |
| `src/assembly.ts` | Reader and local setup assembly construction. |
| `src/main.ts`, `src/db.ts` | Backend startup and MongoDB connection. |
| `frontend/` | Vue application. |
| `scripts/` | Local fixture creation through the gateway. |
| `tests/` | Concept, composition, and persistence tests. |
| `generated.config.ts`, `generated/` | Design-check configuration and generated contracts. |

---

**AI assistance:** This README and portions of the project design were generated or revised with AI assistance. Generated material requires review and testing; this documentation is not evidence that the application has been fully implemented or verified.
