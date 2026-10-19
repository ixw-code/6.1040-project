import { registerConcept } from "@mit-sdg/sync-engine/assembly";
import spec from "@design/concepts/Documenting.md" with { type: "text" };
import { DocumentingConcept, DocumentNameRequired, DocumentNameTaken, InvalidDocumentBlocks } from "./Documenting.ts";

export const registration = registerConcept({
  class: DocumentingConcept,
  spec,
  refusals: {
    DOCUMENT_NAME_REQUIRED: DocumentNameRequired,
    DOCUMENT_NAME_TAKEN: DocumentNameTaken,
    INVALID_DOCUMENT_BLOCKS: InvalidDocumentBlocks,
  },
});
