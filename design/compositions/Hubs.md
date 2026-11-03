# Hubs

Hubs coordinates HubCataloguing metadata and creator identity with Checkpointing sequences.

Any registered user may create a hub; only its creator may manage or delete it. [CreateHub](reaction:Hubs.CreateHub) takes a name and initializes only NotStarted; the creator adds ordinary checkpoints later. [RenameHub](reaction:Hubs.RenameHub) preserves the slug, [UpdateSlug](reaction:Hubs.UpdateSlug) changes it independently, and [GetHubAccess](reaction:Hubs.GetHubAccess) uses [IsCreator](view:Hubs.IsCreator).

Authenticated users can list their created hubs and current names and slugs through [ListCreatedHubs](reaction:Hubs.ListCreatedHubs), which derives the creator from the trusted session.

```endpoints
Hubs.CreateHub at /hubs/create
Hubs.RenameHub at /hubs/rename
Hubs.UpdateSlug at /hubs/slug
Hubs.GetHubAccess at /hubs/access
Hubs.ListCreatedHubs at /hubs/created
```

[GetSequences](reaction:Hubs.GetSequences) and [ListCheckpoints](reaction:Hubs.ListCheckpoints) use [ExistingHub](view:Hubs.ExistingHub) and [HubSequence](view:Hubs.HubSequence); [SequenceList](former:Hubs.SequenceList) and [CheckpointChoices](former:Hubs.CheckpointChoices) preserve order.

[AppendCheckpoint](reaction:Hubs.AppendCheckpoint) and [RelabelCheckpoint](reaction:Hubs.RelabelCheckpoint) require the creator. NotStarted cannot be renamed; checkpoint deletion and reordering are unsupported.

```endpoints
Hubs.GetSequences at /hubs/sequences
Hubs.ListCheckpoints at /checkpoints/list
Hubs.AppendCheckpoint at /checkpoints/append
Hubs.RelabelCheckpoint at /checkpoints/relabel
```

[DeleteHub](reaction:Hubs.DeleteHub) requires the creator and removes articles, requirements, progress, and checkpoints before deleting the hub record. Uploaded assets remain with their uploaders.

```endpoints
Hubs.DeleteHub at /hubs/delete
```

The application coordinator journals and recovers interrupted hub creation or deletion; operations do not rely on MongoDB transactions.
