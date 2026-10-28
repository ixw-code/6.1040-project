<script setup lang="ts">
import { onMounted, ref } from "vue";
import { MediaAssetsApi, type Asset } from "@/api/MediaAssets.ts";
import { assetUrl } from "@/lib/routes.ts";
import MediaPicker from "./MediaPicker.vue";
import { confirmAndRun } from "@/lib/confirm.ts";
const assets = ref<Asset[]>([]),
  error = ref(""),
  busy = ref(""),
  loading = ref(true),
  picker = ref(false);
async function refresh() {
  try {
    assets.value = await MediaAssetsApi.list();
  } catch (e) {
    error.value = e instanceof Error ? e.message : "Unable to load uploads";
  } finally {
    loading.value = false;
  }
}
onMounted(() => {
  void refresh();
});
async function remove(asset: string) {
  const selected = assets.value.find((row) => row.asset === asset);
  await confirmAndRun(
    {
      title: "Delete uploaded asset?",
      message: `${selected?.filename ?? "This asset"} will be permanently deleted. Deletion is refused while an article references it.`,
      confirmLabel: "Delete",
      cancelLabel: "Cancel",
    },
    async () => {
      busy.value = asset;
      error.value = "";
      try {
        await MediaAssetsApi.delete(asset);
        await refresh();
      } catch (e) {
        error.value = e instanceof Error ? e.message : "Delete refused";
      } finally {
        busy.value = "";
      }
    },
  );
}
</script>
<template>
  <section class="panel content-panel">
    <div class="section-heading">
      <h1>Your uploads</h1>
      <button class="primary" @click="picker = true">+ Upload</button>
    </div>
    <p class="muted">
      Uploaded media may be reused across articles. Referenced assets cannot be
      deleted.
    </p>
    <p v-if="error" class="error-text">{{ error }}</p>
    <p v-if="loading">Loading…</p>
    <p v-else-if="!assets.length">
      You have not uploaded media yet. Upload media from the article editor.
    </p>
    <div v-for="asset in assets" :key="asset.asset" class="data-row">
      <span class="block-icon">{{ asset.kind === "IMAGE" ? "▧" : "▶" }}</span>
      <div class="grow">
        <strong>{{ asset.filename }}</strong>
        <p class="muted small">{{ asset.kind }} · {{ asset.status }}</p>
      </div>
      <a :href="assetUrl(asset.asset)">Preview</a
      ><button
        :disabled="busy === asset.asset"
        class="text-button danger-text"
        @click="remove(asset.asset)"
      >
        Delete
      </button>
    </div>
    <MediaPicker
      v-if="picker"
      @close="picker = false"
      @selected="
        picker = false;
        refresh();
      "
    />
  </section>
</template>
