import { registerConcept } from "@mit-sdg/sync-engine/assembly";
import spec from "@design/alpha/concepts/Checkpointing.md" with { type: "text" };
import {
  CheckpointingConcept,
  SequenceNotFound,
  CheckpointLabelRequired,
  CheckpointNotFound,
  StartLabelFixed,
  CheckpointRenameLabelRequired,
} from "./Checkpointing.ts";

export const registration = registerConcept({
  class: CheckpointingConcept,
  spec,
  refusals: {
    SEQUENCE_NOT_FOUND: SequenceNotFound,
    CHECKPOINT_LABEL_REQUIRED: CheckpointLabelRequired,
    CHECKPOINT_NOT_FOUND: CheckpointNotFound,
    START_LABEL_FIXED: StartLabelFixed,
    CHECKPOINT_RENAME_LABEL_REQUIRED: CheckpointRenameLabelRequired,
  },
});
