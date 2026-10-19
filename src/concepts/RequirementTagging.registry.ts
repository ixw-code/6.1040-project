import { registerConcept } from "@mit-sdg/sync-engine/assembly";
import spec from "@design/concepts/RequirementTagging.md" with { type: "text" };
import {
  RequirementTaggingConcept,
  RequirementRuleNotFound,
} from "./RequirementTagging.ts";

export const registration = registerConcept({
  class: RequirementTaggingConcept,
  spec,
  refusals: { REQUIREMENT_RULE_NOT_FOUND: RequirementRuleNotFound },
});
