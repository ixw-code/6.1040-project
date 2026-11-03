# ReaderProgress

ReaderProgress uses ProgressRecording for registered users and a signed HTTP-boundary cookie for guests. Sessioning supplies registered identity; request bodies cannot choose the reader.

[ExistingHub](view:ReaderProgress.ExistingHub) and [ValidSelection](view:ReaderProgress.ValidSelection) verify hub and checkpoint membership. [ProgressResult](former:ReaderProgress.ProgressResult) distinguishes missing progress from NotStarted.

[GetProgress](reaction:ReaderProgress.GetProgress) retrieves the registered or guest selection. [RecordProgress](reaction:ReaderProgress.RecordProgress) validates and stores it; [ClearProgress](reaction:ReaderProgress.ClearProgress) clears one hub without affecting other progress.

```endpoints
ReaderProgress.GetProgress at /progress/get
ReaderProgress.RecordProgress at /progress/record
ReaderProgress.ClearProgress at /progress/clear
```

[Accounts invokes ImportAnonymousProgress](reaction:ReaderProgress.ImportAnonymousProgress) after login or registration. It validates guest hubs and checkpoints, then calls ProgressRecording.recordIfAbsent. Existing account progress, including NotStarted, wins; invalid selections are skipped and retries cannot overwrite progress.

```endpoints
ReaderProgress.ImportAnonymousProgress at /internal/progress/import
```

The HTTP boundary validates, expires, and updates the cookie. It clears anonymous progress only after a successful import, so failures can be retried.
