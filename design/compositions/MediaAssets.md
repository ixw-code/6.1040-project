# MediaAssets

MediaAssets handles uploading, retrieving, and deleting media. MediaAssetManaging stores asset metadata, while the storage adapter manages file bytes. Assets belong to their uploaders rather than individual hubs and can be reused across articles.

[StartUpload](reaction:MediaAssets.StartUpload) requires a registered user, validates the file metadata, and creates a PENDING asset. [FinishUpload](reaction:MediaAssets.FinishUpload) verifies the uploaded file before marking it READY. Only READY assets can be inserted into articles or returned to readers.

```endpoints
MediaAssets.StartUpload at /assets/start
MediaAssets.FinishUpload at /assets/finish
```

[MyAssets](reaction:MediaAssets.MyAssets) lists the current user's uploads. [GetAsset](reaction:MediaAssets.GetAsset) and direct previews are restricted to the uploader. [ReadAsset](reaction:MediaAssets.ReadAsset) retrieves media referenced by an article block, checking the reader's progress and the eligibility of both the article and block through Reading. Asset IDs alone do not grant access to protected content.

```endpoints
MediaAssets.MyAssets at /assets/my
MediaAssets.GetAsset at /assets/get
MediaAssets.ReadAsset at /assets/read
```

[DeleteAsset](reaction:MediaAssets.DeleteAsset) requires the uploader and refuses deletion while an article references the asset. It removes metadata and stored bytes. Failed or abandoned PENDING uploads can also be deleted.

```endpoints
MediaAssets.DeleteAsset at /assets/delete
```

Article updates and asset deletion are serialized to prevent an asset from being deleted while it is being referenced. Failed byte cleanup may leave an inaccessible file for later removal.
