import { registerConcept } from "@mit-sdg/sync-engine/assembly";
import spec from "@design/alpha/concepts/ProgressRecording.md" with { type: "text" };
import { ProgressRecordingConcept } from "./ProgressRecording.ts";

export const registration = registerConcept({
  class: ProgressRecordingConcept,
  spec,
});
