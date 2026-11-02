# ReaderProgress

ReaderProgress manages checkpoint selections for registered and anonymous readers. ProgressRecording stores registered users' progress, while anonymous progress is stored in a signed cookie managed by the HTTP boundary. Sessioning identifies registered users; request bodies cannot specify a reader identity.

The [existing hub](view:ReaderProgress.ExistingHub) and [valid selection](view:ReaderProgress.ValidSelection) views verify hub and checkpoint membership. [ProgressResult](former:ReaderProgress.ProgressResult) distinguishes missing progress from an explicit NotStarted selection.

[GetProgress](reaction:ReaderProgress.GetProgress) retrieves the current selection from ProgressRecording or the verified guest cookie. [RecordProgress](reaction:ReaderProgress.RecordProgress) validates and stores a checkpoint for the current reader. [ClearProgress](reaction:ReaderProgress.ClearProgress) removes that reader's selection for one hub without affecting other progress.

```endpoints
ReaderProgress.GetProgress at /progress/get
ReaderProgress.RecordProgress at /progress/record
ReaderProgress.ClearProgress at /progress/clear
```

[ImportAnonymousProgress](reaction:ReaderProgress.ImportAnonymousProgress) is invoked internally by Accounts after login or registration. It validates guest selections against existing hubs and checkpoints, then calls ProgressRecording.recordIfAbsent for each valid selection. Existing account progress takes precedence, including NotStarted. Invalid selections are skipped, and repeated imports cannot overwrite stored progress.

```endpoints
ReaderProgress.ImportAnonymousProgress at /internal/progress/import
```

The HTTP boundary handles cookie validation, expiration, and updates. The anonymous cookie is cleared only after a successful import, allowing failed imports to be retried.
