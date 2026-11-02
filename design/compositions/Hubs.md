# Hubs

Hubs handles hub creation, settings, checkpoints, and deletion. HubCataloguing owns hub metadata and creator identity; Checkpointing owns each hub's ordered checkpoint sequence.

Any registered user may create a hub, but only its creator may modify or delete it. [CreateHub](reaction:Hubs.CreateHub) creates the hub, its checkpoint sequence, and the initial checkpoint. [RenameHub](reaction:Hubs.RenameHub) changes the display name without changing its slug, while [UpdateSlug](reaction:Hubs.UpdateSlug) changes the URL slug independently. [GetHubAccess](reaction:Hubs.GetHubAccess) checks whether the current user is the creator through [IsCreator](view:Hubs.IsCreator).

```endpoints
Hubs.CreateHub at /hubs/create
Hubs.RenameHub at /hubs/rename
Hubs.UpdateSlug at /hubs/slug
Hubs.GetHubAccess at /hubs/access
```

[GetSequences](reaction:Hubs.GetSequences) and [ListCheckpoints](reaction:Hubs.ListCheckpoints) retrieve checkpoint information through the [existing hub](view:Hubs.ExistingHub) and [hub sequence](view:Hubs.HubSequence) views. The [sequence list](former:Hubs.SequenceList) and [checkpoint choices](former:Hubs.CheckpointChoices) preserve their order.

[AppendCheckpoint](reaction:Hubs.AppendCheckpoint) adds a checkpoint, and [RelabelCheckpoint](reaction:Hubs.RelabelCheckpoint) renames an existing one. Both require the hub creator. NotStarted cannot be renamed, and checkpoint deletion or reordering is not supported.

```endpoints
Hubs.GetSequences at /hubs/sequences
Hubs.ListCheckpoints at /checkpoints/list
Hubs.AppendCheckpoint at /checkpoints/append
Hubs.RelabelCheckpoint at /checkpoints/relabel
```

[DeleteHub](reaction:Hubs.DeleteHub) requires the creator and removes the hub's articles, requirements, reader progress, checkpoint sequence, and hub record. The hub record is deleted last. Uploaded assets remain owned by their uploaders.

```endpoints
Hubs.DeleteHub at /hubs/delete
```

Multi-step hub operations use the application coordinator and operation journal to recover interrupted creation or deletion. They do not rely on MongoDB transactions.
