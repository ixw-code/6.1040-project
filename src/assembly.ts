import { assemble } from "@mit-sdg/sync-engine/assembly";
import { applicationConceptSet } from "./concepts.ts";

export function assembleWikiplotter() {
  return assemble({
    conceptSet: applicationConceptSet,
    composition: {},
  });
}
