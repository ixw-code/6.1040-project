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
| ContentManagement | Create fixture documents and tag or untag documents and blocks. |
| ReaderProgress | Retrieve, validate and record, or clear a reader's checkpoint selection. |
| Reading | List hubs, browse eligible article titles, and return eligible content blocks. |

Each composition module groups endpoint declarations and any supporting reactions, views, or formers. An endpoint may invoke one concept operation or coordinate several. Cross-concept checks, such as requiring tagged checkpoints to belong to the document's hub, live here.

For reading, the backend retrieves saved progress and collects the inclusive checkpoint prefix into tokens. RequirementTagging checks those tokens against document and block requirements. Missing rules make items ineligible; empty rules impose no checkpoint requirement. Hidden content is omitted from the response, not merely concealed by Vue.

## Assembly and serving

`src/assembly.ts` selects the concept implementations and composition modules that form the application.

The reader assembly includes ReaderProgress and Reading. The local setup assembly also provides HubManagement and ContentManagement so the fixture script and local gateway can install hubs, checkpoints, documents, and requirement tags. Both use the same persistent application data. `generated/setup/` is pinned from the setup assembly for complete design and source checks; a reader-only client should be generated when the HTTP reader host is implemented.

A gateway invokes the assembled endpoints. The HTTP reader host and Vue client remain future work; the host should use the reader assembly through the sync-engine HTTP adapter. Calling an API endpoint will not navigate the browser to that endpoint.

## Getting Started

### Installation

Install [Bun 1.x](https://bun.sh) and ensure MongoDB is available locally.

```sh
bun install
bun run db:up
```

### Environment Setup

Create the environment files from their templates:

```sh
cp .env.example .env
cp .env.test.example .env.test.local
cp .env.production.example .env.production.local
```

Configure matching MongoDB credentials and ports across all three files. Each environment uses a separate database:

| Environment | Database | Configuration |
|---|---|---|
| Development | `wikiplotter_dev` | `.env` |
| Testing | `wikiplotter_test_*` | `.env.test.local` |
| Production | `wikiplotter` | `.env.production.local` |

Database names are validated against `WIKIPLOTTER_ENV` to prevent cross-environment access.

### Running the Application

**Development** (backend and frontend):

```sh
bun run dev
```

**Production:**

```sh
bun run generate
bun run check
bun run start
```

Populate demonstration content using the local fixture workflow before serving reader content.

### Testing & Notes

- Run tests with `bun run test` and project checks with `bun run check`.
- Tests use isolated, disposable MongoDB databases.
- Concept, composition, and persistence tests verify individual operations, workflows, and database durability.
- MongoDB credentials are initialized when the database volume is first created; changing environment files does not update existing credentials.
- See `package.json` for additional commands and configuration.

## Project layout

| Location | Purpose |
| --- | --- |
| `docs/decisions/` | Architectural decisions and rationale between iterations. |
| `design/concepts/` | Independent concept specifications. |
| `design/compositions/` | Application workflows and endpoint contracts. |
| `design/types.md` | Concept instances and application type bindings. |
| `src/concepts/`, `src/concepts.ts` | Concept implementations, registrations, and the application concept set. |
| `src/compositions/` | Executable composition declarations. |
| `src/assembly.ts` | Reader and local setup assembly construction. |
| `src/main.ts`, `src/db.ts` | Backend startup and MongoDB connection. |
| `frontend/` | Vue application. |
| `scripts/` | Local fixture creation through the gateway. |
| `tests/` | Concept, composition, and persistence tests. |
| `generated.config.ts`, `generated/` | Design-check configuration and generated contracts. |

---

**AI assistance:** This README and portions of the project design were generated or revised with AI assistance. Generated material requires review and testing; this documentation is not evidence that the application has been fully implemented or verified.
