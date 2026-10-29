<script setup lang="ts">
import { ref, onMounted } from "vue";
import { HubsApi, notStartedCheckpoint, type CheckpointRow } from "@/api/Hubs.ts";
import { ReaderProgressApi } from "@/api/ReaderProgress.ts";
import { hubUrl, settingsUrl, welcomeUrl } from "@/lib/routes.ts";
import { navigate } from "@/lib/navigation.ts";
const props = defineProps<{ hub: string; name: string; canManage: boolean }>();
const open = ref(false),
  busy = ref(false),
  error = ref(""),
  selected = ref<string | null>(null);
const checkpoints = ref<CheckpointRow[]>([]),
  draft = ref("");
const emit = defineEmits<{ changed: [] }>();
onMounted(async () => {
  try {
    const [choices, progress] = await Promise.all([
      HubsApi.checkpoints(props.hub),
      ReaderProgressApi.get(props.hub),
    ]);
    checkpoints.value = choices.checkpoints;
    selected.value = progress.checkpoint;
    draft.value = progress.checkpoint ?? notStartedCheckpoint(checkpoints.value) ?? "";
  } catch (e) {
    error.value = e instanceof Error ? e.message : "Could not load progress";
  }
});
async function save() {
  if (!draft.value || busy.value) return;
  busy.value = true;
  error.value = "";
  try {
    await ReaderProgressApi.record(props.hub, draft.value);
    selected.value = draft.value;
    open.value = false;
    emit("changed");
  } catch (e) {
    error.value = e instanceof Error ? e.message : "Could not save progress";
  } finally {
    busy.value = false;
  }
}
async function clear() {
  busy.value = true;
  error.value = "";
  try {
    await ReaderProgressApi.clear(props.hub);
    selected.value = null;
    draft.value = notStartedCheckpoint(checkpoints.value) ?? "";
    open.value = false;
    const moved = await navigate(welcomeUrl(props.hub), true);
    if (!moved) emit("changed");
  } catch (e) {
    error.value = e instanceof Error ? e.message : "Could not clear progress";
  } finally {
    busy.value = false;
  }
}
</script>
<template>
  <div class="hub-banner">
    <nav class="hub-nav" aria-label="Hub navigation">
      <a class="hub-title" :href="hubUrl(hub)">{{ name }}</a>
      <input
        class="hub-search"
        aria-label="Search this hub (coming later)"
        placeholder="⌕  Search in this hub…"
        disabled
        title="Hub search is not available yet"
      />
      <div class="hub-toolbar">
        <div class="progress-control">
          <button
            class="nav-icon"
            :aria-expanded="open"
            aria-label="Reading progress"
            title="Set reading progress"
            @click="open = !open"
          >
            ▤
          </button>
          <div v-if="open" class="progress-popover">
            <h3>Reading progress</h3>
            <p class="muted small">Choose your latest completed checkpoint.</p>
            <label class="small" for="hub-progress-checkpoint">Current progress</label>
            <select id="hub-progress-checkpoint" v-model="draft" class="checkpoint-select">
              <option v-for="row in checkpoints" :key="row.checkpoint" :value="row.checkpoint">{{ row.label }}</option>
            </select>
            <p v-if="error" class="error-text">{{ error }}</p>
            <div class="popover-actions">
              <button
                class="text-button"
                :disabled="busy || selected === null"
                @click="clear"
              >
                Clear</button
              ><button class="primary" :disabled="busy || !draft" @click="save">
                Set progress
              </button>
            </div>
          </div>
        </div>
        <a
          v-if="canManage"
          class="nav-icon"
          :href="settingsUrl(hub)"
          aria-label="Hub settings"
          title="Hub settings"
          >⚙</a
        >
      </div>
    </nav>
  </div>
</template>
