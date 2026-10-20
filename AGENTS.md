# Wikiplotter

## Context

- Stack: Bun, TypeScript, MIT sync-engine, MongoDB, Vue.js with TypeScript.
- Read the current ALPHA.md, BETA.md and relevant files under design/ before changing behavior. Follow the repository's existing paths.
- Use the installed sync-engine skill and its linked workflow for framework work. If unavailable, report that and consult the public documentation matching the installed version. Do not guess framework APIs.

## Alpha scope

- Five concepts: HubCataloguing, Documenting, Checkpointing, ProgressRecording and RequirementTagging.
- Support hub discovery, checkpoint setup, premade documents, requirement tagging, reader progress and filtered reading.
- Use dummy reader identities. Authentication, public contribution, editing, uploads, history, search and theme customization are outside Alpha unless explicitly requested.

## Design boundaries

- Concepts own their state, MongoDB operations and local invariants. Do not import or call peer concepts.
- Composition owns cross-concept coordination, scope checks and reader-response construction.
- Keep concept specifications focused on purpose, principle, types, state, actions and queries. Keep application bindings in design/types.md and implementation details in ALPHA-TECHNICAL.md.
- Expose HubManagement, ReaderProgress, and Reading through reader HTTP; keep ContentManagement local-only. Derive completed checkpoints on the backend and omit ineligible content from responses.
- Preserve the distinction between missing progress and NotStarted, and between a missing requirement rule and an explicit empty rule.
- Use the framework's HTTP adapter and generated typed client. Do not hand-edit generated artifacts.

## Working process

- Complete one requested increment at a time; avoid unrelated refactoring or new abstractions.
- Keep specifications and implementation consistent. Surface conflicting requirements before choosing behavior that changes the accepted design.
- Inspect package.json for actual scripts and dependency versions. Preserve unrelated changes and existing data.
- Run relevant design checks, type checks and tests. Test concepts independently, compositions through the gateway, and persistence against MongoDB when storage changes.
- After frontend changes, verify the affected Vue reader flow.
- Report what changed, which checks actually ran, and any remaining failure or blocker. Keep explanations concise.
- Generate detailed commits with a concise summary and bullets with specific, important changes.
