# MediaAssets

MediaAssets owns the application workflow for uploads and retrieval. MediaAssetManaging owns only asset metadata; a storage adapter owns bytes. Assets are uploaded by a registered User and are not owned by a hub. A ready asset may be reused in articles in multiple hubs.

The [start-upload endpoint](reaction:MediaAssets.StartUpload) resolves the User through Sessioning.use, validates filename, supported media kind, size limit, and content type, allocates an unguessable storage key, and calls MediaAssetManaging.create. The adapter accepts the bytes under that key. The [finish-upload endpoint](reaction:MediaAssets.FinishUpload) verifies that the stored bytes exist and pass server-side type and size checks before MediaAssetManaging.finalize marks the asset READY. A PENDING asset is never returned as downloadable content or accepted by Articles. Repeated finalization is safe after validation.

```endpoints
MediaAssets.StartUpload at /assets/start
MediaAssets.FinishUpload at /assets/finish
```

The [library endpoint](reaction:MediaAssets.MyAssets) uses MediaAssetManaging._uploadedBy for the authenticated User. The [metadata endpoint](reaction:MediaAssets.GetAsset) and direct asset preview require the uploader's authenticated session; READY alone grants no reader access. The [retrieval endpoint](reaction:MediaAssets.ReadAsset) accepts hub, article, and block context rather than a bare asset ID. It applies Reading's current progress, article, and block eligibility checks and verifies the referenced READY asset before serving bytes or a bounded media reference. A guessed asset ID cannot bypass spoiler filtering. PENDING assets are visible only to their uploader as upload state. No response exposes a raw storage key.

```endpoints
MediaAssets.MyAssets at /assets/my
MediaAssets.GetAsset at /assets/get
MediaAssets.ReadAsset at /assets/read
```

The [delete endpoint](reaction:MediaAssets.DeleteAsset) resolves the session User, checks the asset uploader, and refuses while any article block references the asset. Article saves invoke MediaAssetManaging.confirmReadyReference for every media block in their transaction; it writes the same asset record that deletion removes. A concurrent save and deletion therefore conflict and one must retry. A snapshot read alone would permit write skew. Storage deletion is idempotent. If byte cleanup fails after metadata removal, a private orphan may be garbage-collected; no public reference to it remains. Hub deletion never deletes uploader-owned assets merely because a removed article referenced them. An uploader can cancel a failed PENDING upload through this same delete action, releasing its filename; periodic cleanup may remove abandoned PENDING uploads after a separately defined retention limit.

```endpoints
MediaAssets.DeleteAsset at /assets/delete
```
