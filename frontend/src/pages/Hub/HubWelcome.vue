<script setup lang="ts">
import { onMounted, ref } from "vue";
import { HubsApi, notStartedCheckpoint, type CheckpointRow } from "@/api/Hubs.ts";
import { ReaderProgressApi } from "@/api/ReaderProgress.ts";
import { hubUrl } from "@/lib/routes.ts";
import { askConfirmation } from "@/lib/confirm.ts";
import { isProgressAdvance } from "@/lib/readerProgress.ts";
const props = defineProps<{ hub: string; name: string }>();
const choices = ref<CheckpointRow[]>([]),
  selected = ref(""),
  error = ref(""),
  busy = ref(false);
onMounted(async () => {
  try {
    const data = await HubsApi.checkpoints(props.hub);
    choices.value = data.checkpoints;
    selected.value = notStartedCheckpoint(choices.value) ?? "";
  } catch (e) {
    error.value = e instanceof Error ? e.message : "Could not load checkpoints";
  }
});
async function save() {
  if (isProgressAdvance(choices.value, null, selected.value)) {
    const accepted = await askConfirmation({
      title: "Spoiler warning",
      message: "Starting at a later checkpoint may reveal more article content. Continue only if you have already read through this checkpoint.",
      confirmLabel: "Set progress",
      cancelLabel: "Cancel",
    });
    if (!accepted) return;
  }
  busy.value = true;
  error.value = "";
  try {
    await ReaderProgressApi.record(props.hub, selected.value);
    location.href = hubUrl(props.hub);
  } catch (e) {
    error.value = e instanceof Error ? e.message : "Could not save progress";
  } finally {
    busy.value = false;
  }
}
</script>
<template>
  <section class="welcome-panel panel">
    <div class="welcome-symbol">▤</div>
    <h1>Welcome to {{ name }}</h1>
    <p class="muted">
      To start reading, choose your current progress in this hub.
    </p>
    <form @submit.prevent="save">
      <label for="welcome-choice">Select your current checkpoint</label
      ><select id="welcome-choice" v-model="selected">
        <option
          v-for="row in choices"
          :key="row.checkpoint"
          :value="row.checkpoint"
        >
          {{ row.label }}
        </option>
      </select>
      <p v-if="error" class="error-text">{{ error }}</p>
      <button class="primary" :disabled="!selected || busy">
        Set Progress
      </button>
    </form>
  </section>
</template>
