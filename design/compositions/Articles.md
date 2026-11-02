# Articles

Articles handles article creation, editing, tagging, and deletion. Documenting stores articles and ordered blocks, RequirementTagging stores spoiler rules, and MediaAssetManaging verifies uploaded assets.

Any registered user may create or edit articles in an existing hub. Only the hub creator may delete articles. All endpoints resolve the current user through Sessioning. The [existing hub](view:Articles.ExistingHub), [allowed requirements](view:Articles.AllowedRequirements), and [ready assets](view:Articles.ReadyAssets) views validate hub membership, checkpoint tokens, and referenced media before changes are made.

[CreateArticle](reaction:Articles.CreateArticle) creates the document and assigns explicit requirements to the article and each block. An empty rule permits visibility at any selected checkpoint; a missing rule denies visibility. The article rule is written last so incomplete creation cannot expose content. The [created article](former:Articles.CreatedArticle) returns assigned block IDs.

```endpoints
Articles.CreateArticle at /articles/create
```

[EditingView](reaction:Articles.EditingView) returns the full article and its requirements to registered users, including content hidden from readers. [SaveArticle](reaction:Articles.SaveArticle) replaces the article's title, ordered blocks, and requirements. Existing block IDs are preserved, new blocks receive IDs, and omitted blocks are deleted. During updates, the article rule is removed before content or block rules change and restored afterward.

```endpoints
Articles.EditingView at /articles/editing
Articles.SaveArticle at /articles/save
```

[TagItem](reaction:Articles.TagItem) replaces an article or block requirement. [UntagItem](reaction:Articles.UntagItem) removes the rule, making the item ineligible. The [scoped article](view:Articles.ScopedArticle) and [scoped block](view:Articles.ScopedBlock) views ensure items belong to the requested hub. Block rule updates temporarily hide the containing article.

```endpoints
Articles.TagItem at /articles/tag
Articles.UntagItem at /articles/untag
```

[DeleteArticle](reaction:Articles.DeleteArticle) requires the hub creator and removes the article and its requirements. The article rule is removed first. Uploaded assets remain available in the uploader's library.

```endpoints
Articles.DeleteArticle at /articles/delete
```

Article writes are serialized through the application coordinator and recorded in a durable operation journal. Failed multi-step changes are recovered before further requests are served. MongoDB operations across documents are not atomic.
