import { registerConcept } from "@mit-sdg/sync-engine/assembly";
import spec from "@design/concepts/Documenting.md" with { type: "text" };
import { DocumentingConcept } from "./Documenting.ts";

export const registration = registerConcept({
  class: DocumentingConcept,
  spec,
});
