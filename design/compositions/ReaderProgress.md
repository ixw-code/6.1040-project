# ReaderProgress

ReaderProgress handles one checkpoint selection per hub for both signed-in and anonymous readers. A registered reader is identified by Sessioning.use and stored in ProgressRecording under Registering.User. An anonymous reader has no ProgressRecording record; the HTTP boundary carries a signed, bounded progress cookie containing hub-to-checkpoint selections. The cookie is verified before composition uses it and is replaced or cleared after a guest change. Request bodies never supply a User or arbitrary reader identity.

The [existing-hub view](view:ReaderProgress.ExistingHub) and [valid-selection view](view:ReaderProgress.ValidSelection) check current hub and checkpoint membership. A forged, malformed, expired, or unknown guest cookie selection is treated as absent; it never creates a server record. The [progress-result former](former:ReaderProgress.ProgressResult) preserves the distinction between no selection and an explicit NotStarted checkpoint.

The [get endpoint](reaction:ReaderProgress.GetProgress) resolves the User from a valid authenticated cookie and reads ProgressRecording._checkpoint, or reads the verified anonymous map. It returns a nullable checkpoint. The [record endpoint](reaction:ReaderProgress.RecordProgress) validates the supplied hub and checkpoint, then either calls ProgressRecording.record for the session User or returns an updated signed guest cookie through the HTTP boundary. The [clear endpoint](reaction:ReaderProgress.ClearProgress) removes account progress or the one guest cookie entry and reports whether a selection was removed. Other hubs and other users remain unchanged.

```endpoints
ReaderProgress.GetProgress at /progress/get
ReaderProgress.RecordProgress at /progress/record
ReaderProgress.ClearProgress at /progress/clear
```

The [import endpoint](reaction:ReaderProgress.ImportAnonymousProgress) is local-only: it is selected by the Accounts setup assembly and never projected through reader HTTP. Accounts invokes it after provider verification and session creation. It checks each verified guest cookie entry against the current hub sequence. For each valid hub where the account has no record, it calls ProgressRecording.recordIfAbsent; this owner action makes the conflict rule atomic. Existing account choices always win, including an explicit NotStarted choice. Invalid or deleted hubs and checkpoints are skipped. A repeated import cannot overwrite a stored choice. The guest cookie is cleared only after the import succeeds, so a partial failure can be retried without losing unimported selections.

```endpoints
ReaderProgress.ImportAnonymousProgress at /internal/progress/import
```

The HTTP boundary handles cookie signing, size limits, expiry, and issuance. The composition owns checkpoint validation and import policy. Neither Registering nor Sessioning stores progress. A guest's cookie is never interpreted as an authenticated session.
