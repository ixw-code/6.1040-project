import { registerConcept } from "@mit-sdg/sync-engine/assembly";
import spec from "@design/alpha/concepts/Documenting.md" with { type: "text" };
import { DocumentingConcept, DocumentTitleRequired, DocumentTitleTaken, InvalidDocumentBlocks } from "./Documenting.ts";

export const registration = registerConcept({
  class: DocumentingConcept,
  spec,
  refusals: {
    DOCUMENT_TITLE_REQUIRED: DocumentTitleRequired,
    DOCUMENT_TITLE_TAKEN: DocumentTitleTaken,
    INVALID_DOCUMENT_BLOCKS: InvalidDocumentBlocks,
  },
});
