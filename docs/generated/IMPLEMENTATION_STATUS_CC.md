# Wikiplotter Code Complete — final validation

## Milestone summary

| Increment | Outcome |
| --- | --- |
| 1A–1B — Account deletion | Authenticated self-deletion blocks hub owners and recovers cleanup of sessions, registration, progress, and uploaded media. |
| 2A–2B — Hub flow and navigation | Name-only hub creation, welcome redirect for missing progress, safe login return paths, spoiler warnings, and staged hub settings. |
| 2C — Media uploads | Bounded upload and library views, authorized previews, and account media previews. |
| 2D — Final frontend additions | Loading spinner, 404 routing, Created Hubs account list, and bounded Reading Progress and Created Hubs lists. |

## Milestone 3 validation and fixes

**Release status: PASS WITH LIMITATIONS.** Automated checks pass, the live homepage and health route respond, and a local HTTP fix now returns a JSON 404 for unknown API paths. The live deployment still returns `400 INVALID_REQUEST` for an unknown API path; deployment was not changed.

| File | Change |
| --- | --- |
| `src/http/edge.ts` | Return `404 NOT_FOUND` for unknown `/api` paths instead of passing them to the sync-engine reader adapter. Known reader routes continue through their existing handlers. |
| `tests/http/ReaderHttp.test.ts` | Add a focused unknown-API-route regression check. |
| `README.md` | Link the production application and Code Complete summary, use the actual production origin example, clarify blocks are ordered rather than versioned, and correct the `bun run check` description. |
| `docs/decisions/CODE_COMPLETE.md` | Repair Alpha/Beta thumbnail paths and replace the nonexistent final-demo image and placeholder URL with the live application link. Design decisions were not rewritten. |

The concept and composition design checks pass. Hub, account, article, progress, and media endpoint tests cover the current authorization and eligibility paths. The account deletion HTTP flow is coordinated by `src/assembly/accounts.ts` around the local Accounts composition and application journal; its tested HTTP behavior matches the Accounts endpoint contract.

## Verification evidence

| Area | Result and evidence |
| --- | --- |
| Specifications, artifacts, and typechecks | Passed `bun run check:static`: 15 design files, both framework assemblies, generated artifacts, backend TypeScript, and Vue typecheck. Framework diagnostics report 10 existing advisories per assembly. |
| Backend and frontend suites | Passed `bun --env-file=.env.test.local test`: **112 tests, 717 expectations** across 34 files, including HTTP authorization, spoiler filtering, account deletion recovery, and routing. |
| Standalone persistence and recovery | Passed within the full suite: `tests/db/MongoStandalone.test.ts`, `tests/db/OperationCoordinator.test.ts`, and `tests/db/MongoPersistence.test.ts`. No transaction API or snapshot read concern remains in application source. |
| Production frontend build | Passed `bun run build:frontend:prod`. Vite reports existing sync-engine `node:util` and `node:crypto` browser externalization warnings. |
| Local HTTP routing | Unknown API route regression passes in `tests/http/ReaderHttp.test.ts`; frontend fallback tests preserve API/auth handling and reject traversal. |
| Live deployment | Read-only GET `/` and `/account/data` with `Accept: text/html` returned HTTP 200; a referenced JavaScript bundle and `/health` also returned HTTP 200. An unknown `/api` path returned JSON `400 INVALID_REQUEST`, not frontend HTML. No account, media, or production database mutations were made. |
| Working tree validation | `git diff --check` passed. |

## Remaining checks and limitations

- No browser-driven desktop or narrow-screen pass was performed; popup layering, scroll behavior, and visual loading states still need manual checking.
- Live Google and MIT SDG Commons OAuth were not exercised. Provider tests use verified-provider mocks.
- Production persistence and media storage were not inspected. The standalone MongoDB integration test passed locally, but the production database topology was not verified.
- The live deployment has not received the local unknown-API 404 fix because deployment was not requested. It returns a JSON API error rather than SPA HTML, so this does not block the demo.

## Suggested commit message

```text
chore(p4): validate and stabilize code-complete release

- Return JSON 404 responses for unknown API routes without changing SPA or OAuth routing.
- Correct README links and production URL, and repair the final design summary's demo references.
- Verify design contracts, generated artifacts, typechecks, standalone MongoDB recovery, HTTP authorization, and the production frontend build.
```
