# Wikiplotter

Wikiplotter is a spoiler-aware wiki for narrative fiction. Each series has a hub with an ordered set of reading checkpoints. Readers record their progress, while contributors organize articles into versioned content blocks and assign checkpoint requirements to articles, titles, text, and images. The intended experience is a wiki that reveals information as the reader advances, based on contributors' spoiler classifications.

**A reader's journey:** Bob finishes chapter 50 and visits the series hub to look up an artifact mentioned earlier. He can select his latest completed chapter, then can browse the articles and content available up to that point in the story. Later revelations remain hidden, including revealing titles and images. When Bob reaches chapter 70, he updates his progress and sees newly available information without having to navigate spoiler warnings.

The project is being built incrementally with TypeScript, Bun, sync-engine **1.1.0**, and MongoDB. The features above describe the target application. The instructions below start with the bare sync-engine scaffold; an untouched scaffold has no wiki endpoints or browser UI.

## Getting started

Install **Bun 1.3.4 or newer within 1.x**. Use podman Compose or Podman Compose when working with MongoDB. Run the following commands from the repository root.

If the sync-engine scaffold has not been initialized yet:

```sh
bunx --package @mit-sdg/sync-engine@1.1.0 sync-engine setup
```

Setup writes missing scaffold files and preserves existing source and scripts. For an initialized project, start with dependency installation:

```sh
bun install
bun run generate
bun run check
bun run start
```

The default `start` script runs `src/main.ts`. An untouched, concept-free scaffold prints `[]` and exits successfully. It does not start a website or require MongoDB. Once `src/main.ts` hosts the HTTP application, the same command starts that server instead.

If existing scripts differ from the framework defaults, `package.json` is authoritative. The frontend and a combined `dev` command can be added when those components exist.

## Local MongoDB

Set up the database before running concept implementations that persist state. If the repository already has a Compose configuration, use its service name and credentials. Otherwise, this minimal `compose.yaml` runs MongoDB locally:

```yaml
services:
  mongo:
    image: mongo:8.0
    ports:
      - "127.0.0.1:27017:27017"
    environment:
      MONGO_INITDB_ROOT_USERNAME: dev
      MONGO_INITDB_ROOT_PASSWORD: dev
    volumes:
      - mongo-data:/data/db

volumes:
  mongo-data:
```

Create `.env` from `.env.example` when the template exists:

```sh
cp .env.example .env
```

For the example Compose configuration, use these local-development values:

```dotenv
MONGODB_URL=mongodb://dev:dev@127.0.0.1:27017/wikiplotter?authSource=admin
PORT=3000
```

If no template exists, create `.env.example` and `.env` with these disposable local values. Keep `.env` out of Git and commit the template. These credentials are for local development only.

```sh
podman compose up -d mongo
bun run start
```

Replace `podman compose` with `podman compose` if using Podman. The database lives in the `mongo-data` volume on your computer; stopping the container preserves it. A backend running on the host uses `127.0.0.1`. A backend later added to the same Compose network uses `mongo` as the database hostname.

When implementing persistence and HTTP hosting, install their dependencies if they are not already in `package.json`:

```sh
bun add mongodb
bun add --exact @mit-sdg/sync-engine-http@1.1.0
```

Keep the HTTP adapter and core sync-engine versions identical. Installing the packages does not implement the database connection or HTTP server; those belong in the backend source.

## Commands

The first three application scripts below are provided by sync-engine setup. The remaining commands invoke the tools directly.

| Command | Purpose |
| --- | --- |
| `bun run start` | Run the backend entry point. |
| `bun run generate` | Regenerate the configured design read-back and wire types. |
| `bun run check` | Check design/source agreement, generated artifacts, and TypeScript using the default scaffold script. |
| `bunx sync-engine check-design design/concepts/*.md design/types.md` | Check concept and type-document form before implementations are complete. |
| `bunx sync-engine check` | Check the assembly and authored design using `generated.config.ts`. |
| `bun test` | Run tests written for Bun's test runner, once added. |
| `podman compose ps` | Inspect local service status. |
| `podman compose logs -f mongo` | Follow MongoDB logs. |
| `podman compose stop mongo` | Stop MongoDB while keeping its container and data. |
| `podman compose down` | Remove Compose containers and networking while preserving named volumes. |

Include `design/compositions/*.md` in `check-design` once composition documents exist. Avoid `podman compose down -v` unless you intend to delete the local database volume.

## Development workflow

1. **Describe the change.** Update the relevant concept contract or application composition design. Record significant architectural choices and their rationale in `docs/decisions/`; keep unresolved choices marked as proposed.
2. **Check the design.** Run `check-design` on the authored files. This checks their form, not whether the described behavior is correct.
3. **Implement the owner.** Concept classes own their state and local rules. Compositions connect concepts through endpoints, reactions, views, and formers. Concepts must not call peer concepts or read their storage.
4. **Test the behavior.** Test concept actions and queries independently, then test application scenarios through the assembly. Cover refusals, absent data, cross-hub references, and hidden content as well as success cases.
5. **Check the implementation and regenerate.** Run `bunx sync-engine check`, then `bun run generate` and `bun run check`. Review generated changes and run the tests.
6. **Commit a complete increment.** Keep the design, implementation, tests, and generated artifacts aligned in the same change.

For spoiler protection, inspect the response payload as well as the rendered page. Hidden information must not leak through titles, image references, snippets, or other metadata. Database constraints and tests must enforce the invariants described in the design; sync-engine does not provide cross-concept transactions or persistence automatically.

## Where things belong

The following layout describes the project as its components are added; setup does not create every directory.

| Location | Responsibility |
| --- | --- |
| [docs/decisions/INITIAL.md](design/INITIAL.md) | Original problem statement, full pitch, detailed journey, UI sketches, and initial concept proposal. Historical context; current contracts take precedence. |
| `design/concepts/*.md` | Independent concept contracts: purpose, principle, types, state, actions, and queries. |
| `design/types.md` | Selected concept instances and application-specific type bindings. |
| `design/compositions/*.md` | Application behavior, linked to its executable declarations. |
| `docs/decisions/*.md` | Architectural rationale, alternatives, consequences, and decision status. |
| `src/concepts/` | Concept implementations and their registrations. |
| `src/concepts.ts` | The named application concept set. |
| `src/compositions/` | Executable endpoints, reactions, views, and formers. |
| `src/assembly.ts` | Concept instances and compositions assembled into the application. |
| `src/main.ts` | Backend entry point and, when implemented, HTTP server lifecycle. |
| `generated.config.ts` | Assembly and authored-document configuration for checking and generation. |
| `generated/` | Tool-generated artifacts; regenerate rather than editing manually. |

Import concept specifications through their registrations. List application types and composition documents in `generated.config.ts`. Keep `design/INITIAL.md` and decision history outside that registered corpus. Composition documents can link to decision records with ordinary Markdown links and to executable declarations with sync-engine's typed links.

## References

- [sync-engine 1.1.0 documentation](https://github.com/mit-sdg/sync-engine/tree/v1.1.0/docs/user)
- [Getting started](https://github.com/mit-sdg/sync-engine/blob/v1.1.0/docs/user/guide/getting-started.md)
- [Design authoring](https://github.com/mit-sdg/sync-engine/blob/v1.1.0/docs/user/guide/authoring.md)
