# Reading

Reading uses Checkpointing, ProgressRecording, Documenting, RequirementTagging, and MediaAssetManaging to list hubs and filter article content.

[ReaderSelection](view:Reading.ReaderSelection) derives the inclusive checkpoint prefix from authenticated progress or a verified guest cookie, never a request-body identity. Missing progress remains distinct from NotStarted.

[ListHubs](reaction:Reading.ListHubs) returns hub IDs, names, and slugs through [HubDirectory](former:Reading.HubDirectory). [ExistingHub](view:Reading.ExistingHub) validates hub identity.

```endpoints
Reading.ListHubs at /hubs/list
```

[BrowseHub](reaction:Reading.BrowseHub) lists only eligible articles. [ReadableArticle](view:Reading.ReadableArticle) checks hub membership and requirements; [ArticleDirectory](former:Reading.ArticleDirectory) returns eligible titles and IDs only.

```endpoints
Reading.BrowseHub at /hubs/browse
```

[ReadArticle](reaction:Reading.ReadArticle) accepts an exact title or stable ID. [ExistingArticle](view:Reading.ExistingArticle) checks IDs; [ArticleByTitle](view:Reading.ArticleByTitle) resolves titles. It returns eligible content, `{ content: null, hidden: true }` for an existing article hidden by its requirements, or `{ content: null, hidden: false }` for an unknown identifier. Hidden responses omit titles and protected content. [EligibleBlock](view:Reading.EligibleBlock) filters blocks; [ArticleContent](former:Reading.ArticleContent) preserves their order and returns eligible text and READY media references. MediaAssets rechecks eligibility when media is retrieved.

Missing requirements deny visibility; explicit empty requirements permit it at any valid checkpoint. The hidden signal exposes no title, content, media ID, or alt text. Block requirements remain independent, so readable articles may contain hidden blocks.

```endpoints
Reading.ReadArticle at /articles/read
```

The operation coordinator serializes reads with writes. Reads use ordinary MongoDB operations without snapshot transactions.
