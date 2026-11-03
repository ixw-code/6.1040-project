# MediaAssets

MediaAssets coordinates metadata in MediaAssetManaging with file bytes in the storage adapter. Assets belong to uploaders, not hubs, and can be reused across articles.

[StartUpload](reaction:MediaAssets.StartUpload) validates file metadata and creates a PENDING asset for a registered user. [FinishUpload](reaction:MediaAssets.FinishUpload) verifies the bytes before marking it READY. Only READY assets can be used in articles or returned to readers.

```endpoints
MediaAssets.StartUpload at /assets/start
MediaAssets.FinishUpload at /assets/finish
```

[MyAssets](reaction:MediaAssets.MyAssets) lists the current user's uploads. [GetAsset](reaction:MediaAssets.GetAsset) and direct previews require the uploader. [ReadAsset](reaction:MediaAssets.ReadAsset) checks progress and article/block eligibility through Reading; an asset ID alone does not grant access.

```endpoints
MediaAssets.MyAssets at /assets/my
MediaAssets.GetAsset at /assets/get
MediaAssets.ReadAsset at /assets/read
```

[DeleteAsset](reaction:MediaAssets.DeleteAsset) requires the uploader, refuses assets still referenced by articles, and removes metadata and bytes. Failed or abandoned PENDING uploads can also be removed.

```endpoints
MediaAssets.DeleteAsset at /assets/delete
```

Article updates and asset deletion are serialized to prevent races. Failed byte cleanup may leave an inaccessible file for later removal.
