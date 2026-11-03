<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { HubsApi, type CheckpointRow } from "@/api/Hubs.ts";
import { hubUrl, settingsUrl } from "@/lib/routes.ts";
import { askConfirmation } from "@/lib/confirm.ts";
import { navigate } from "@/lib/navigation.ts";
import { hubDeleteConfirmationMatches } from "./hub-settings.ts";

const props = defineProps<{ hub: string; slug: string; name: string }>();
const savedName = ref(props.name);
const savedSlug = ref(props.slug);
const name = ref(props.name);
const slug = ref(props.slug);
const editingName = ref(false);
const editingSlug = ref(false);
const checkpoints = ref<CheckpointRow[]>([]);
const sequence = ref("");
const label = ref("");
const labels = ref<Record<string, string>>({});
const editingCheckpoints = ref<Record<string, boolean>>({});
const busy = ref(false);
const pageError = ref("");
const nameError = ref("");
const slugError = ref("");
const success = ref("");
const deleteDialogOpen = ref(false);
const deleteConfirmation = ref("");
const deleteError = ref("");
const detailsChanged = computed(() =>
  name.value.trim() !== savedName.value || slug.value.trim() !== savedSlug.value,
);
const canDeleteHub = computed(() =>
  hubDeleteConfirmationMatches(deleteConfirmation.value, savedName.value),
);

async function loadCheckpoints() {
  const [sequenceData, list] = await Promise.all([
    HubsApi.sequences(props.hub),
    HubsApi.checkpoints(props.hub),
  ]);
  sequence.value = sequenceData.sequences[0]?.sequence ?? list.sequence;
  checkpoints.value = list.checkpoints;
  labels.value = Object.fromEntries(list.checkpoints.map((row) => [row.checkpoint, row.label]));
  editingCheckpoints.value = {};
}

onMounted(async () => {
  try {
    await loadCheckpoints();
  } catch (cause) {
    pageError.value = cause instanceof Error ? cause.message : "Could not load hub settings";
  }
});

function cancelNameEdit() {
  name.value = savedName.value;
  nameError.value = "";
  editingName.value = false;
}

function cancelSlugEdit() {
  slug.value = savedSlug.value;
  slugError.value = "";
  editingSlug.value = false;
}

async function saveDetails() {
  if (busy.value || !detailsChanged.value) return;
  busy.value = true;
  pageError.value = "";
  nameError.value = "";
  slugError.value = "";
  success.value = "";
  try {
    if (!name.value.trim()) {
      nameError.value = "Hub name is required.";
      return;
    }
    const nextSlug = slug.value.trim();
    if (nextSlug.length < 3 || nextSlug.length > 80 || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(nextSlug)) {
      slugError.value = "Use a valid lowercase URL slug.";
      return;
    }
    const confirmed = await askConfirmation({
      title: "Save hub details?",
      message: "Save these hub name and URL changes?",
      confirmLabel: "Save changes",
      cancelLabel: "Cancel",
    });
    if (!confirmed) return;

    const nextName = name.value.trim();
    if (nextName !== savedName.value) {
      try {
        await HubsApi.rename(props.hub, nextName);
        savedName.value = nextName;
        editingName.value = false;
      } catch (cause) {
        if (cause instanceof Error && cause.message === "CONFLICT") {
          nameError.value = "Name already taken. Please try again.";
        } else pageError.value = cause instanceof Error ? cause.message : "Could not rename hub";
        return;
      }
    }
    if (nextSlug !== savedSlug.value) {
      try {
        const result = await HubsApi.updateSlug(props.hub, nextSlug);
        savedSlug.value = result.slug;
        editingSlug.value = false;
      } catch (cause) {
        if (cause instanceof Error && cause.message === "CONFLICT") {
          slugError.value = "Name already taken. Please try again.";
        } else pageError.value = cause instanceof Error ? cause.message : "Could not update hub URL";
        return;
      }
    }
    editingName.value = false;
    editingSlug.value = false;
    history.replaceState(null, "", settingsUrl(props.hub));
    window.location.reload();
  } finally {
    busy.value = false;
  }
}

async function changeCheckpoint(work: () => Promise<unknown>, message: string) {
  if (busy.value) return;
  busy.value = true;
  pageError.value = "";
  success.value = "";
  try {
    await work();
    await loadCheckpoints();
    success.value = message;
  } catch (cause) {
    pageError.value = cause instanceof Error ? cause.message : "Action denied";
  } finally {
    busy.value = false;
  }
}

function relabel(checkpoint: string) {
  return changeCheckpoint(
    async () => {
      await HubsApi.relabelCheckpoint(props.hub, checkpoint, labels.value[checkpoint] ?? "");
      editingCheckpoints.value[checkpoint] = false;
    },
    "Checkpoint updated",
  );
}

function cancelCheckpointEdit(row: CheckpointRow) {
  labels.value[row.checkpoint] = row.label;
  editingCheckpoints.value[row.checkpoint] = false;
}

async function append() {
  if (busy.value) return;
  const checkpointLabel = label.value.trim();
  if (!checkpointLabel) {
    pageError.value = "A checkpoint label is required.";
    return;
  }
  const confirmed = await askConfirmation({
    title: "Add checkpoint?",
    message: `Add "${checkpointLabel}" as a checkpoint? Readers will be able to select it as their current progress.`,
    confirmLabel: "Add checkpoint",
    cancelLabel: "Cancel",
  });
  if (!confirmed) return;

  return changeCheckpoint(async () => {
    await HubsApi.appendCheckpoint(props.hub, sequence.value, checkpointLabel);
    label.value = "";
  }, "Checkpoint added");
}

function openDeleteDialog() {
  deleteConfirmation.value = "";
  deleteError.value = "";
  deleteDialogOpen.value = true;
}

function closeDeleteDialog() {
  if (busy.value) return;
  deleteDialogOpen.value = false;
  deleteConfirmation.value = "";
  deleteError.value = "";
}

async function removeHub() {
  if (!canDeleteHub.value || busy.value) return;
  busy.value = true;
  deleteError.value = "";
  try {
    await HubsApi.delete(props.hub);
    await navigate("/");
  } catch (cause) {
    deleteError.value = cause instanceof Error ? cause.message : "Could not delete hub";
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <section class="panel content-panel settings-panel hub-settings-panel">
    <a class="hub-back-link" :href="hubUrl(hub)">← Back to hub</a>
    <header class="hub-settings-header">
      <h1>{{ savedName }} Settings</h1>
    </header>
    <p class="muted">Only the original hub creator can make changes.</p>
    <p v-if="pageError" role="alert" class="error-text">{{ pageError }}</p>
    <p v-if="success" role="status" class="success-text">{{ success }}</p>

    <section class="settings-section">
      <h2>Hub details</h2>
      <div class="hub-detail-field">
        <div class="hub-detail-label">Hub name</div>
        <div class="hub-detail-control">
          <input
            v-if="editingName"
            id="hub-name-field"
            v-model="name"
            maxlength="100"
            required
            :disabled="busy"
            aria-label="Hub name"
          />
          <div v-else class="hub-readonly-field" role="textbox" aria-readonly="true" aria-label="Hub name">{{ savedName }}</div>
          <button
            class="text-button hub-change-button"
            type="button"
            :disabled="busy"
            @click="editingName ? cancelNameEdit() : (editingName = true)"
          >{{ editingName ? "Cancel" : "Change" }}</button>
        </div>
      </div>

      <div class="hub-slug-description">
        <span class="muted">Hub homepage lives at /{{ savedSlug }}</span>
        <button
          class="text-button hub-change-button"
          type="button"
          :disabled="busy"
          @click="editingSlug ? cancelSlugEdit() : (editingSlug = true)"
        >{{ editingSlug ? "Cancel" : "Change" }}</button>
        <input
          v-if="editingSlug"
          id="hub-slug-field"
          v-model="slug"
          class="hub-slug-inline-input"
          placeholder="lowercase-hub-slug"
          pattern="[a-z0-9\-]+"
          required
          :disabled="busy"
          aria-label="Hub URL slug"
        />
      </div>
      <p class="hub-field-error" :class="{ visible: nameError || slugError }" role="alert">
        {{ nameError || slugError || " " }}
      </p>

      <div class="hub-save-actions">
        <button class="primary" :disabled="busy || !detailsChanged" @click="saveDetails">
          {{ busy ? "Saving…" : "Save changes" }}
        </button>
      </div>
    </section>

    <section class="settings-section">
      <h2>Checkpoints</h2>
      <div class="hub-checkpoint-list">
        <div v-for="row in checkpoints" :key="row.checkpoint" class="setting-row hub-checkpoint-row">
          <span>{{ row.position + 1 }}.</span>
          <span v-if="row.position === 0">{{ row.label }} <small>(fixed)</small></span>
          <template v-else>
            <input
              v-if="editingCheckpoints[row.checkpoint]"
              v-model="labels[row.checkpoint]"
              :aria-label="`Rename ${row.label}`"
              :disabled="busy"
            />
            <div v-else class="hub-checkpoint-readonly" role="textbox" aria-readonly="true">
              {{ row.label }}
            </div>
            <div v-if="editingCheckpoints[row.checkpoint]" class="hub-checkpoint-actions">
              <button class="button-outline" :disabled="busy" @click="relabel(row.checkpoint)">Save</button>
              <button class="text-button hub-change-button" :disabled="busy" @click="cancelCheckpointEdit(row)">Cancel</button>
            </div>
            <button
              v-else
              class="text-button hub-change-button"
              :disabled="busy"
              @click="editingCheckpoints[row.checkpoint] = true"
            >Change</button>
          </template>
        </div>
      </div>
      <form class="setting-row hub-checkpoint-row hub-checkpoint-add-row" @submit.prevent="append">
        <span>{{ checkpoints.length + 1 }}.</span>
        <input v-model="label" placeholder="New checkpoint" aria-label="New checkpoint" required :disabled="busy" />
        <button class="text-button hub-change-button" :disabled="busy">Add Checkpoint</button>
      </form>
    </section>

    <section class="settings-section danger-zone">
      <p class="muted hub-delete-description">Deleting this hub permanently removes its articles, checkpoints, and reader progress. Uploaded media stays with its uploader. This cannot be undone.</p>
      <div class="hub-delete-actions">
        <button class="danger" :disabled="busy" @click="openDeleteDialog">Delete hub</button>
      </div>
    </section>
  </section>

  <div v-if="deleteDialogOpen" class="confirm-backdrop" role="presentation" @click.self="closeDeleteDialog">
    <section class="confirm-dialog panel hub-delete-dialog" role="alertdialog" aria-modal="true" aria-labelledby="delete-hub-title">
      <h2 id="delete-hub-title">Delete hub?</h2>
      <p>Deleting this hub permanently removes its articles, checkpoints, and reader progress. Uploaded media stays with its uploader. This cannot be undone.</p>
      <label for="delete-hub-confirmation">Type <strong>{{ savedName }}</strong> to confirm.</label>
      <input id="delete-hub-confirmation" v-model="deleteConfirmation" autocomplete="off" :disabled="busy" @keydown.enter.prevent="removeHub" />
      <p v-if="deleteError" class="error-text" role="alert">{{ deleteError }}</p>
      <div class="confirm-actions">
        <button class="button-outline" :disabled="busy" @click="closeDeleteDialog">Cancel</button>
        <button class="danger" :disabled="!canDeleteHub || busy" @click="removeHub">
          {{ busy ? "Deleting…" : "Delete hub" }}
        </button>
      </div>
    </section>
  </div>
</template>
