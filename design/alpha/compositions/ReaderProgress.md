# ReaderProgress

Handle the recording of progress per reader and hub. Without UserAuthentication, ProgressRecording accepts reader identities from browser local storage and stores progress on the backend. 

**Retrieve progress.** The [get-progress endpoint](reaction:ReaderProgress.GetProgress) accepts `{ hub, reader }`. The [existing-hub view](view:ReaderProgress.ExistingHub) checks hub ID membership through HubCataloguing._hubs. The [stored-progress view](view:ReaderProgress.StoredProgress) reads ProgressRecording._checkpoint with `scope = hub`; the [progress-result former](former:ReaderProgress.ProgressResult) supplies the nullable checkpoint for the response `{ checkpoint }`, preserving an absent selection as `{ checkpoint: null }`.

```endpoints
ReaderProgress.GetProgress at /progress/get
```

**Record progress.** The [record-progress endpoint](reaction:ReaderProgress.RecordProgress) accepts `{ hub, reader, checkpoint }`. The [valid-selection view](view:ReaderProgress.ValidSelection) uses the [existing hub](view:ReaderProgress.ExistingHub), resolves its single sequence, and checks membership through Checkpointing._checkpoints. The endpoint invokes ProgressRecording.record with `scope = hub` and returns `{ checkpoint }` after success. Readers can move forward or backward, including to the first checkpoint. Vue then requests the current hub or document again through Reading; Reading's existing eligibility views and response formers produce the refreshed content.

```endpoints
ReaderProgress.RecordProgress at /progress/record
```

**Clear progress.** The [clear-progress endpoint](reaction:ReaderProgress.ClearProgress) accepts `{ hub, reader }`, checks the [existing hub](view:ReaderProgress.ExistingHub), and invokes ProgressRecording.clear with `scope = hub`. Return `{ cleared }`, true when a record was removed and false when none existed. Vue removes the displayed content and returns to checkpoint selection. It discards stale reading responses after a progress change so they cannot restore previously visible content.

```endpoints
ReaderProgress.ClearProgress at /progress/clear
```
