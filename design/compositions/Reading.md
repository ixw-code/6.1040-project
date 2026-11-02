# Reading

Reading handles hub discovery, article browsing, and spoiler-filtered content. It uses Checkpointing, ProgressRecording, Documenting, RequirementTagging, and MediaAssetManaging to determine what a reader can see.

The reader's checkpoint is obtained from authenticated progress or a verified anonymous cookie, not from an arbitrary request body. [ReaderSelection](view:Reading.ReaderSelection) checks that the checkpoint belongs to the hub and obtains its inclusive prefix. Missing progress is distinct from NotStarted.

[ListHubs](reaction:Reading.ListHubs) returns available hubs through [HubDirectory](former:Reading.HubDirectory), including their IDs, names, and slugs. [ExistingHub](view:Reading.ExistingHub) validates the requested hub.

```endpoints
Reading.ListHubs at /hubs/list
```

[BrowseHub](reaction:Reading.BrowseHub) lists articles eligible at the reader's checkpoint. [ReadableArticle](view:Reading.ReadableArticle) verifies hub membership and article requirements. [ArticleDirectory](former:Reading.ArticleDirectory) returns only eligible titles and identifiers.

```endpoints
Reading.BrowseHub at /hubs/browse
```

[ReadArticle](reaction:Reading.ReadArticle) verifies the article requirement before returning content. [EligibleBlock](view:Reading.EligibleBlock) filters individual blocks by their requirements. [ArticleContent](former:Reading.ArticleContent) returns eligible text and READY media references in their original order. Media retrieval rechecks eligibility through MediaAssets.

Missing requirements deny visibility, while an explicit empty requirement permits visibility at any valid selected checkpoint. Hidden articles and blocks do not expose titles, content, media identifiers, or alt text.

```endpoints
Reading.ReadArticle at /articles/read
```

Reads use ordinary MongoDB operations and are serialized with application writes through the operation coordinator. No snapshot transactions are required.
