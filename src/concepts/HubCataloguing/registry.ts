import { registerConcept } from "@mit-sdg/sync-engine/assembly";
import spec from "@design/concepts/HubCataloguing.md" with { type: "text" };
import {
  HubCataloguingConcept,
  HubNameRequired,
  HubNameTaken,
  HubNotFound,
  HubRenameNameRequired,
  HubRenameNameTaken,
  InvalidHubSlug,
  HubSlugTaken,
} from "./HubCataloguing.ts";

export const registration = registerConcept({
  class: HubCataloguingConcept,
  spec,
  refusals: {
    HUB_NAME_REQUIRED: HubNameRequired,
    HUB_NAME_TAKEN: HubNameTaken,
    HUB_NOT_FOUND: HubNotFound,
    HUB_RENAME_NAME_REQUIRED: HubRenameNameRequired,
    HUB_RENAME_NAME_TAKEN: HubRenameNameTaken,
    INVALID_HUB_SLUG: InvalidHubSlug,
    HUB_SLUG_TAKEN: HubSlugTaken,
  },
});
