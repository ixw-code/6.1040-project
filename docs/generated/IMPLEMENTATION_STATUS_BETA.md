# Wikiplotter Beta — implementation status

Milestone 1 defines Beta contracts. The running application remains Alpha; no Beta feature has been implemented.

## Milestone 1 file summary

### Beta contracts

| File | Change and purpose |
| --- | --- |
| design/types.md | Binds progress to registered users and separates anonymous cookie selections, sessions, article items, and assets. |
| design/concepts/Registering.md | Defines provider-backed identity, username rules, lookup, update, and unregister. |
| design/concepts/Sessioning.md | Defines seven-day sessions, hashed bearer verifiers, expiration, and revocation. |
| design/concepts/HubCataloguing.md | Adds creator and stable URL slug with direct deletion; no deletion lifecycle field. |
| design/concepts/Documenting.md | Adds original author, video references, direct edits/deletion, and stable surviving block IDs. |
| design/concepts/Checkpointing.md | Adds sequence deletion for coordinated hub removal. |
| design/concepts/ProgressRecording.md | Adds atomic record-if-absent import and scoped cleanup. |
| design/concepts/RequirementTagging.md | Adds queries for rule inspection and checkpoint cleanup; missing rules still deny access. |
| design/concepts/MediaAssetManaging.md | Defines uploader-owned PENDING/READY metadata and a reference write guard against concurrent deletion. |
| design/compositions/Accounts.md | Specifies verified provider login, explicit first-time registration, cookies, logout, and account deletion. |
| design/compositions/Articles.md | Specifies author-only article creation, editing, tagging, and deletion with content and rules committed together. |
| design/compositions/Hubs.md | Specifies creator checks, slug management, checkpoints, and atomic hub cleanup; assets remain uploader-owned. |
| design/compositions/MediaAssets.md | Specifies uploads, uploader previews, reader-eligible media retrieval, and reference-safe deletion. |
| design/compositions/ReaderProgress.md | Separates account records from signed anonymous cookies and keeps login import local-only. |
| design/compositions/Reading.md | Names reader-visible articles, filters titles and blocks, and requires a consistent snapshot. |

### Alpha compatibility and checks

The Alpha snapshots remain necessary until the runtime implements the Beta contracts. Each concept registry and generated config needs a specification matching the code it currently assembles.

| File | Change and purpose |
| --- | --- |
| design/alpha/types.md | Preserves dummy-reader bindings for the running Alpha assembly. |
| design/alpha/concepts/HubCataloguing.md | Preserves the implemented hub concept contract. |
| design/alpha/concepts/Documenting.md | Preserves the implemented article-storage concept contract. |
| design/alpha/concepts/Checkpointing.md | Preserves the implemented checkpoint contract. |
| design/alpha/concepts/ProgressRecording.md | Preserves the implemented progress contract. |
| design/alpha/concepts/RequirementTagging.md | Preserves the implemented rule contract. |
| design/alpha/compositions/HubManagement.md | Preserves Alpha hub endpoints under their implemented identity. |
| design/alpha/compositions/ContentManagement.md | Preserves local-only Alpha content setup endpoints. |
| design/alpha/compositions/ReaderProgress.md | Preserves Alpha server-stored dummy-reader progress endpoints. |
| design/alpha/compositions/Reading.md | Preserves Alpha spoiler-filtered reading endpoints. |
| src/concepts/HubCataloguing.registry.ts | Points the implemented hub class to its Alpha specification. |
| src/concepts/Documenting.registry.ts | Points the implemented article-storage class to its Alpha specification. |
| src/concepts/Checkpointing.registry.ts | Points the implemented checkpoint class to its Alpha specification. |
| src/concepts/ProgressRecording.registry.ts | Points the implemented progress class to its Alpha specification. |
| src/concepts/RequirementTagging.registry.ts | Points the implemented rule class to its Alpha specification. |
| generated.config.ts | Checks the full setup assembly against Alpha composition and type documents. |
| generated.reader.config.ts | Checks the reader assembly against Alpha composition and type documents. |
| generated/setup/wikiplotter.md | Regenerated read-back links and current refusal names. |
| generated/reader/wikiplotter-reader.md | Regenerated reader read-back links and current refusal names. |
| generated/setup/wire.ts | Regenerated the setup wire's existing DOCUMENT_TITLE refusal types. |
| tests/concepts/Documenting.test.ts | Updates stale exception imports to DocumentTitle names. |
| tests/db/MongoPersistence.test.ts | Updates the stale concurrent-title exception expectation. |
| tests/compositions/ContentManagement.test.ts | Updates the stale duplicate-title refusal expectation. |
| docs/generated/IMPLEMENTATION_STATUS_BETA.md | Records this file-level summary, API rationale, checks, and next obligations. |

## Proposed API names

These are proposed Beta names; Alpha HTTP paths remain unchanged until implementation. Article is the public noun, while Documenting remains the internal state owner.

| API family | Naming reason |
| --- | --- |
| Accounts.Login and Accounts.Register | Separate a returning provider identity from explicit first-time registration under /accounts. |
| Hubs.CreateHub, RenameHub, UpdateSlug, DeleteHub | Name creator-controlled hub changes directly under /hubs; checkpoint routes stay grouped under /checkpoints. |
| Articles.CreateArticle, GetArticleForEditing, SaveArticle, DeleteArticle | Use the user-facing noun; /articles/editing is author-only, while save replaces the full blocks-and-rules set. |
| Articles.TagItem and UntagItem | Item accurately covers an article or one block under /articles/tag and /articles/untag. |
| Reading.BrowseHub and ReadArticle | Browse selects eligible articles in a hub; /articles/read returns only filtered content, separate from /articles/editing. |
| MediaAssets.StartUpload, FinishUpload, MyAssets, ReadAsset | Start and finish bracket byte validation; MyAssets is the uploader library; /assets/read rechecks article context. |
| ReaderProgress.GetProgress, RecordProgress, ClearProgress, ImportAnonymousProgress | Name selection operations; import is internal-only and never published through reader HTTP. |

## Verification and remaining work

Design, framework, artifact, and backend/frontend type checks passed. Framework checks retain 21 setup and 17 reader advisories from Alpha. The full regression suite passed **49 tests across 14 files**, including HTTP acceptance and MongoDB persistence. No new tests were added because this milestone changes contracts and references, not runtime behavior. An independent design review verified seven contract concerns were resolved.

Later milestones must implement and test the shared transaction and read-snapshot mechanisms, provider and cookie security, and the new Beta workflows. The stored session record key must not be a bearer secret.

## Proposed commit message

```text
docs(beta): finalize milestone 1 contracts and preserve Alpha checks

- Define Beta concept, composition, and identity contracts with article-facing API names
- Specify transactional writes and spoiler-safe snapshot reads without hub or article lifecycle states
- Keep Alpha runtime contracts in design/alpha and regenerate framework artifacts
- Correct stale title-refusal test references and record verification
```
