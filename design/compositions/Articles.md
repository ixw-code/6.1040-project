# Articles

Articles coordinates authoring. Documenting owns article title, original author, hub membership, and ordered blocks. RequirementTagging owns article and block rules. MediaAssetManaging owns asset readiness and metadata. A registered User may create an article in any existing hub; only its original author may rename, edit, retag, or delete it. Hub creators do not gain article authorship merely by owning the hub.

The [existing-hub view](view:Articles.ExistingHub) rejects unknown hubs. The [author view](view:Articles.IsAuthor) resolves the authenticated User through Sessioning.use and compares it with Documenting's author. The [allowed-requirements view](view:Articles.AllowedRequirements) checks every supplied checkpoint token against the hub's sequence, including NotStarted. The [ready-assets view](view:Articles.ReadyAssets) requires every IMAGE or VIDEO block body to identify a READY asset of the matching media kind. Saving also calls MediaAssetManaging.confirmReadyReference for each media block within the transaction, forcing a write conflict with concurrent asset deletion. Text bodies remain literal text. The server rejects malformed block records, duplicate or foreign block IDs, missing explicit rules, and invalid asset or checkpoint references before writing.

The [create endpoint](reaction:Articles.CreateArticle) creates the Documenting article with its original author and ordered blocks, then tags the article and every block. Each rule is explicitly present; an empty set makes an item available at any selected checkpoint, whereas a missing rule remains ineligible. The article and all rules commit in one application-coordinated MongoDB transaction. A failed save leaves no visible partial article. The [created-block former](former:Articles.CreatedArticle) returns assigned block identities in stored order.

```endpoints
Articles.CreateArticle at /articles/create
```

The [editing endpoint](reaction:Articles.EditingView) returns the complete article and its rules only to the original author. This authoring view may contain spoilers and is never served through Reading. The [save endpoint](reaction:Articles.SaveArticle) replaces the full ordered block array and optionally changes the title and rules in one transaction. Existing block IDs supplied from this article survive, including when their contents change or their position moves; new blocks receive new IDs, and omitted blocks and their rules are removed. The result of Documenting.update supplies new IDs before the composition writes rules. The transaction also protects requirement-only edits. A failure rolls back the title, blocks, and rules together; retrying sees the previous valid version. Reader responses use a consistent database snapshot, preventing a mixed old/new content and rule response across a commit. No DRAFT, UPDATING, or publish action is required.

```endpoints
Articles.EditingView at /articles/editing
Articles.SaveArticle at /articles/save
```

The [tag endpoint](reaction:Articles.TagItem) and [untag endpoint](reaction:Articles.UntagItem) are author-only edits for an article or a block in its hub. Tagging replaces the full rule; untagging removes it and makes the item ineligible. A rule change participates in the same transactional consistency policy as other saves. An article with no rule hides its title and all blocks, regardless of block rules. The [scoped-article view](view:Articles.ScopedArticle) and [scoped-block view](view:Articles.ScopedBlock) prevent cross-hub or foreign-item changes.

```endpoints
Articles.TagItem at /articles/tag
Articles.UntagItem at /articles/untag
```

The [delete endpoint](reaction:Articles.DeleteArticle) verifies the original author and removes the article plus every article/block requirement rule in one transaction. It reads block identities before deletion. A failed transaction leaves the old article and rules intact. Assets stay in the uploader's library and can be reused; MediaAssets may delete one only after confirming no surviving article references it. Article deletion does not need a persistent DELETING state.

```endpoints
Articles.DeleteArticle at /articles/delete
```

The proposed public names use Article because readers and authors interact with articles, while Documenting remains the internal state owner. EditingView names the unfiltered author view explicitly; Reading.ReadArticle is the filtered reader view. SaveArticle names the full ordered blocks-and-rules replacement rather than suggesting a partial block edit. TagItem and UntagItem retain Item because the same rule operation targets either an article or one block.

Application storage coordination must provide one MongoDB transaction for each multi-concept write and serialize conflicting asset-reference decisions. Sync-engine itself supplies neither a cross-concept transaction nor rollback. Concepts remain independent and never import peers; the transaction context is supplied by the application storage boundary. The detailed transaction mechanism belongs to the later implementation milestone.
