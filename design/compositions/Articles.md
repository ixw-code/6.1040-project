# Articles

Articles coordinates authoring across Documenting, RequirementTagging, and MediaAssetManaging.

Any registered user may create or edit articles in an existing hub; only its creator may delete them. Endpoints resolve the user through Sessioning. [ExistingHub](view:Articles.ExistingHub), [AllowedRequirements](view:Articles.AllowedRequirements), and [ReadyAssets](view:Articles.ReadyAssets) validate hub, checkpoint, and media references before writes.

[CreateArticle](reaction:Articles.CreateArticle) creates the document and explicitly tags the article and each block. Empty rules permit visibility at any selected checkpoint; missing rules deny it. The article rule is written last, and [CreatedArticle](former:Articles.CreatedArticle) returns assigned block IDs.

```endpoints
Articles.CreateArticle at /articles/create
```

[EditingView](reaction:Articles.EditingView) returns the full article and rules to registered users, including reader-hidden content. [SaveArticle](reaction:Articles.SaveArticle) replaces its title, ordered blocks, and rules; it preserves existing block IDs, assigns IDs to new blocks, and deletes omitted blocks. It removes the article rule before changing content or block rules, then restores it.

```endpoints
Articles.EditingView at /articles/editing
Articles.SaveArticle at /articles/save
```

[TagItem](reaction:Articles.TagItem) replaces an article or block rule; [UntagItem](reaction:Articles.UntagItem) removes it, making the item ineligible. [ScopedArticle](view:Articles.ScopedArticle) and [ScopedBlock](view:Articles.ScopedBlock) prevent cross-hub edits. Block-rule updates temporarily hide the article.

```endpoints
Articles.TagItem at /articles/tag
Articles.UntagItem at /articles/untag
```

[DeleteArticle](reaction:Articles.DeleteArticle) requires the hub creator, removes the article rule first, then deletes the article and its rules. Uploaded assets remain in the uploader's library.

```endpoints
Articles.DeleteArticle at /articles/delete
```

The application coordinator serializes article writes and journals multi-step operations. Recovery runs before further requests; MongoDB writes across documents are not atomic.
