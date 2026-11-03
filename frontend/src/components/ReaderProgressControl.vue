<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, useId } from "vue";
import { HubsApi, notStartedCheckpoint, selectedCheckpointLabel, type CheckpointRow } from "@/api/Hubs.ts";
import { ReaderProgressApi } from "@/api/ReaderProgress.ts";
import { askConfirmation, confirmationState, confirmNavigation } from "@/lib/confirm.ts";
import { isProgressAdvance } from "@/lib/readerProgress.ts";
import { navigateAfterConfirmation } from "@/lib/navigation.ts";
import { welcomeUrl } from "@/lib/routes.ts";
import LoadingSpinner from "@/components/LoadingSpinner.vue";

const props = defineProps<{ hub: string; name?: string; checkpoint?: string | null; reloadPageAfterClear?: boolean }>();
const emit = defineEmits<{ changed: [progress: { checkpoint: string; label: string | null }] }>();
const checkpointId = useId();
const root = ref<HTMLElement | null>(null);
const trigger = ref<HTMLButtonElement | null>(null);
const popover = ref<HTMLElement | null>(null);
const popoverStyle = ref<Record<string, string>>({});
const open = ref(false);
const loaded = ref(false);
const loading = ref(false);
const busy = ref(false);
const checkpointSelectorExpanded = ref(false);
const error = ref("");
const current = ref<string | null>(props.checkpoint ?? null);
const checkpoints = ref<CheckpointRow[]>([]);
const draft = ref("");

function collapseCheckpointSelector(event: Event) {
  checkpointSelectorExpanded.value = false;
  (event.currentTarget as HTMLSelectElement).blur();
}

function closeOnOutsideClick(event: MouseEvent) {
  const target = event.target as Node;
  if (open.value && !confirmationState().value &&
    !root.value?.contains(target) && !popover.value?.contains(target)) open.value = false;
}

function positionPopover() {
  const anchor = trigger.value?.getBoundingClientRect();
  const panel = popover.value;
  if (!anchor || !panel) return;
  const panelWidth = panel.getBoundingClientRect().width;
  const panelHeight = panel.getBoundingClientRect().height;
  const left = Math.max(10, Math.min(anchor.right - panelWidth, window.innerWidth - panelWidth - 10));
  let top = anchor.bottom + 9;
  if (top + panelHeight > window.innerHeight - 10) top = Math.max(10, anchor.top - panelHeight - 9);
  popoverStyle.value = { position: "fixed", left: `${left}px`, right: "auto", top: `${top}px` };
}

async function loadProgress() {
  if (loaded.value || loading.value) return;
  loading.value = true;
  error.value = "";
  try {
    const [choiceData, progress] = await Promise.all([
      HubsApi.checkpoints(props.hub),
      props.checkpoint === undefined ? ReaderProgressApi.get(props.hub) : Promise.resolve({ checkpoint: props.checkpoint }),
    ]);
    checkpoints.value = choiceData.checkpoints;
    current.value = progress.checkpoint;
    draft.value = current.value ?? notStartedCheckpoint(checkpoints.value) ?? "";
    loaded.value = true;
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : "Could not load progress";
  } finally {
    loading.value = false;
  }
}

async function toggle() {
  open.value = !open.value;
  if (open.value) {
    await nextTick();
    positionPopover();
    await loadProgress();
    await nextTick();
    positionPopover();
  }
}

async function save() {
  if (!draft.value || busy.value || !loaded.value) return;
  if (isProgressAdvance(checkpoints.value, current.value, draft.value)) {
    const accepted = await askConfirmation({
      title: "Spoiler warning",
      message: "Setting progress to a later checkpoint may reveal more article content. Continue only if you have already read through this checkpoint.",
      confirmLabel: "Update progress",
      cancelLabel: "Cancel",
    });
    if (!accepted) return;
  }
  busy.value = true;
  error.value = "";
  try {
    await ReaderProgressApi.record(props.hub, draft.value);
    current.value = draft.value;
    open.value = false;
    emit("changed", {
      checkpoint: draft.value,
      label: selectedCheckpointLabel(draft.value, checkpoints.value),
    });
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : "Could not save progress";
  } finally {
    busy.value = false;
  }
}

async function clear() {
  if (busy.value || current.value === null || !await confirmNavigation()) return;
  busy.value = true;
  error.value = "";
  try {
    await ReaderProgressApi.clear(props.hub);
    current.value = null;
    draft.value = notStartedCheckpoint(checkpoints.value) ?? "";
    open.value = false;
    if (props.reloadPageAfterClear) {
      window.location.reload();
      return;
    }
    await navigateAfterConfirmation(welcomeUrl(props.hub), true);
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : "Could not clear progress";
  } finally {
    busy.value = false;
  }
}

onMounted(() => {
  document.addEventListener("click", closeOnOutsideClick);
  window.addEventListener("scroll", positionPopover, true);
  window.addEventListener("resize", positionPopover);
});
onBeforeUnmount(() => {
  document.removeEventListener("click", closeOnOutsideClick);
  window.removeEventListener("scroll", positionPopover, true);
  window.removeEventListener("resize", positionPopover);
});
</script>

<template>
  <div ref="root" class="progress-control">
    <button
      ref="trigger"
      class="nav-icon"
      :aria-expanded="open"
      :aria-label="name ? `Set reading progress for ${name}` : 'Reading progress'"
      title="Set reading progress"
      @click="toggle"
    >▤</button>
    <Teleport to="body">
    <div v-if="open" ref="popover" class="progress-popover" :style="popoverStyle">
      <h3>Reading progress</h3>
      <p class="muted small spoiler-info">Choose your latest completed checkpoint.<br/>Spoilers are filtered automtically to your current progress.</p>
      <template v-if="loading"><LoadingSpinner small /></template>
      <template v-else-if="loaded">
        <label class="progress-current-label" :for="checkpointId">Current progress</label>
        <select
          :id="checkpointId"
          v-model="draft"
          class="checkpoint-select"
          :size="checkpointSelectorExpanded ? 3 : 1"
          @focus="checkpointSelectorExpanded = true"
          @blur="checkpointSelectorExpanded = false"
          @change="collapseCheckpointSelector"
        >
          <option v-for="row in checkpoints" :key="row.checkpoint" :value="row.checkpoint">{{ row.label }}</option>
        </select>
        <div class="popover-actions">
          <button class="text-button" :disabled="busy || current === null" @click="clear">Clear</button>
          <button class="primary" :disabled="busy || !draft" @click="save">{{ busy ? "Saving…" : "Set progress" }}</button>
        </div>
      </template>
      <p v-if="error" class="error-text" role="alert">{{ error }}</p>
    </div>
    </Teleport>
  </div>
</template>
