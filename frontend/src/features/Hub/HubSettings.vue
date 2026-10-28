<script setup lang="ts">
import { onMounted, ref } from "vue";
import { HubsApi, type CheckpointRow } from "@/api/Hubs.ts";
import { hubUrl, settingsUrl } from "@/lib/routes.ts";
import { confirmAndRun } from "@/lib/confirm.ts";
import { navigate } from "@/lib/navigation.ts";
const props = defineProps<{ hub: string; slug: string; name: string }>();
const name = ref(props.name),
  slug = ref(props.slug),
  checkpoints = ref<CheckpointRow[]>([]),
  sequence = ref("");
const label = ref(""),
  labels = ref<Record<string, string>>({}),
  busy = ref(false),
  error = ref(""),
  success = ref("");
onMounted(async () => {
  try {
    const [s, list] = await Promise.all([
      HubsApi.sequences(props.hub),
      HubsApi.checkpoints(props.hub),
    ]);
    sequence.value = s.sequences[0]?.sequence ?? list.sequence;
    checkpoints.value = list.checkpoints;
    labels.value = Object.fromEntries(
      checkpoints.value.map((c) => [c.checkpoint, c.label]),
    );
  } catch (e) {
    error.value =
      e instanceof Error ? e.message : "Could not load hub settings";
  }
});
async function change(work: () => Promise<unknown>, message: string) {
  if (busy.value) return;
  busy.value = true;
  error.value = "";
  success.value = "";
  try {
    await work();
    success.value = message;
    const c = await HubsApi.checkpoints(props.hub);
    checkpoints.value = c.checkpoints;
    labels.value = Object.fromEntries(
      c.checkpoints.map((x) => [x.checkpoint, x.label]),
    );
  } catch (e) {
    error.value = e instanceof Error ? e.message : "Action denied";
  } finally {
    busy.value = false;
  }
}
function rename() {
  return change(() => HubsApi.rename(props.hub, name.value), "Hub renamed");
}
function updateSlug() {
  return change(async () => {
    const result = await HubsApi.updateSlug(props.hub, slug.value);
    slug.value = result.slug;
    history.replaceState(null, "", settingsUrl(props.hub));
  }, "Slug updated");
}
function relabel(checkpoint: string) {
  return change(
    () =>
      HubsApi.relabelCheckpoint(
        props.hub,
        checkpoint,
        labels.value[checkpoint] ?? "",
      ),
    "Checkpoint updated",
  );
}
function append() {
  return change(async () => {
    await HubsApi.appendCheckpoint(props.hub, sequence.value, label.value);
    label.value = "";
  }, "Checkpoint added");
}
async function remove() {
  await confirmAndRun(
    {
      title: "Delete hub?",
      message:
        "This permanently deletes the hub, its articles, checkpoints, and reader progress. This action cannot be undone.",
      confirmLabel: "Delete",
      cancelLabel: "Cancel",
    },
    async () => {
      await change(async () => {
        await HubsApi.delete(props.hub);
        await navigate("/");
      }, "Hub deleted");
    },
  );
}
</script>
<template>
  <section class="panel content-panel settings-panel">
    <h1>{{ props.name }} settings</h1>
    <p class="muted">Only the original hub creator can make changes.</p>
    <p v-if="error" role="alert" class="error-text">{{ error }}</p>
    <p v-if="success" role="status" class="success-text">{{ success }}</p>
    <section class="settings-section">
      <h2>Hub details</h2>
      <form @submit.prevent="rename">
        <label>Display name<input v-model="name" required /></label
        ><button :disabled="busy" class="button-outline">Rename hub</button>
      </form>
      <form @submit.prevent="updateSlug">
        <label
          >New URL slug<input
            v-model="slug"
            placeholder="lowercase-hub-slug"
            required
            pattern="[a-z0-9-]+"
        /></label>
        <p class="muted small">
          Changing the slug does not change the internal hub identity.
        </p>
        <button :disabled="busy" class="button-outline">Update slug</button>
      </form>
    </section>
    <section class="settings-section">
      <h2>Checkpoints</h2>
      <div v-for="row in checkpoints" :key="row.checkpoint" class="setting-row">
        <span>{{ row.position + 1 }}.</span
        ><span v-if="row.position === 0"
          >{{ row.label }} <small>(fixed)</small></span
        ><template v-else
          ><input
            v-model="labels[row.checkpoint]"
            :aria-label="`Rename ${row.label}`"
          /><button
            class="button-outline"
            :disabled="busy"
            @click="relabel(row.checkpoint)"
          >
            Save
          </button></template
        >
      </div>
      <form class="inline-actions" @submit.prevent="append">
        <input v-model="label" placeholder="New checkpoint" required /><button
          class="primary"
          :disabled="busy"
        >
          Add checkpoint
        </button>
      </form>
    </section>
    <section class="settings-section danger-zone">
      <h2>Delete hub</h2>
      <p class="muted">
        This permanently removes the hub and its associated articles.
      </p>
      <button class="danger" :disabled="busy" @click="remove">
        Delete hub
      </button>
    </section>
    <p><a :href="hubUrl(hub)">Back to hub</a></p>
  </section>
</template>
