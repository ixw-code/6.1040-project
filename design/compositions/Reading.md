# Reading

Reading serves hub discovery, eligible article titles, and eligible article blocks. It never accepts a registered User or completed checkpoint tokens from a request body. The trusted HTTP boundary supplies an authenticated session cookie or a verified anonymous progress cookie. Sessioning.use identifies a registered User; ProgressRecording supplies that User's selection. A guest selection comes solely from the verified cookie map. The [reader-selection view](view:Reading.ReaderSelection) verifies the selected checkpoint against the hub's sequence and derives the inclusive prefix through Checkpointing._prefixTokens. Missing progress is distinct from an explicit NotStarted selection.

The [hub directory endpoint](reaction:Reading.ListHubs) uses the [hub-directory former](former:Reading.HubDirectory) to list hubs with stable IDs, names, and readable slugs. A slug is resolved through HubCataloguing._bySlug; a direct URL is not an authorization bypass. The [existing-hub view](view:Reading.ExistingHub) rejects unknown hubs.

```endpoints
Reading.ListHubs at /hubs/list
```

The [browse endpoint](reaction:Reading.BrowseHub) uses the [readable-article view](view:Reading.ReadableArticle): the article belongs to the hub and RequirementTagging._eligible returns true for the server-derived prefix. The [article-directory former](former:Reading.ArticleDirectory) reads a title only after eligibility holds, so a hidden title or article ID is never sent. A missing article rule denies access; an explicit empty rule permits an article after any valid selection. Unknown hub and missing/invalid selection have distinct refusals.

```endpoints
Reading.BrowseHub at /hubs/browse
```

The [read endpoint](reaction:Reading.ReadArticle) applies the same article check. The [eligible-block view](view:Reading.EligibleBlock) includes only blocks whose own rule is satisfied. The [article-content former](former:Reading.ArticleContent) preserves their stored order and returns literal TEXT content or a bounded media reference for a READY IMAGE/VIDEO asset, including alt text where applicable. The media reference carries hub, article, and block context; MediaAssets rechecks this reader's eligibility when bytes are requested. Missing block rules deny access. An ineligible or absent article yields null after valid hub and progress checks; no hidden title, body, asset ID, storage key, or alt text is returned.

```endpoints
Reading.ReadArticle at /articles/read
```

Each browse or read response must use one consistent database snapshot across hub, progress, article, requirement, and asset reads. Article saves and deletions commit their related concept changes together. Without the snapshot, a read spanning such a commit could pair new content with old rules. This is an application storage requirement, not a sync-engine transaction guarantee. Navigation and progress changes also discard stale frontend responses, as Alpha already does.

The proposed /articles/read route names the reader-visible resource and remains separate from /articles/editing, whose author-only response may contain spoilers. This is a Beta route proposal; the running Alpha route remains unchanged until the reader implementation changes.
