<script setup lang="ts">
import { onMounted, ref } from "vue";
import { MediaAssetsApi, type Asset } from "@/api/MediaAssets.ts";
import { assetUrl } from "@/lib/routes.ts";
import MediaPicker from "./MediaPicker.vue";
import MediaThumbnail from "./MediaThumbnail.vue";
import { confirmAndRun } from "@/lib/confirm.ts";
const assets = ref<Asset[]>([]),
  error = ref(""),
  success = ref(""),
  busy = ref(""),
  loading = ref(true),
  picker = ref(false);
async function refresh() {
  error.value = "";
  loading.value = true;
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
      success.value = "";
      try {
        await MediaAssetsApi.delete(asset);
        await refresh();
        success.value = "Media deleted.";
      } catch (e) {
        error.value = e instanceof Error ? e.message : "Delete refused";
      } finally {
        busy.value = "";
      }
    },
  );
}
async function uploadsChanged() {
  picker.value = false;
  success.value = "Upload complete.";
  await refresh();
}
</script>
<template>
  <main class="media-library-page">
    <section class="panel content-panel media-library-panel" :aria-busy="loading">
      <a class="media-library-back" href="/account/settings">← Back to settings</a>
      <header class="media-library-header">
        <div>
          <h1>Media uploads</h1>
          <p class="muted">Manage your uploaded images and videos.</p>
        </div>
      </header>
      <section class="media-upload-controls" aria-labelledby="upload-heading">
        <div>
          <h2 id="upload-heading">Upload media</h2>
          <p class="muted">Uploaded media can be reused across articles. Referenced assets cannot be deleted.</p>
        </div>
        <button class="primary" :disabled="loading || !!busy" @click="picker = true">+ Upload</button>
      </section>
      <p v-if="error" role="alert" class="error-text media-library-message">{{ error }}</p>
      <p v-if="success" role="status" class="success-text media-library-message">{{ success }}</p>
      <section class="media-library-assets" aria-labelledby="uploads-heading">
        <h2 id="uploads-heading">Your uploads</h2>
        <p v-if="loading" role="status" class="muted">Loading uploads…</p>
        <div v-else-if="error" class="media-library-empty">
          <div>
            <p class="muted">Your uploads could not be loaded.</p>
            <button class="button-outline" @click="refresh">Try again</button>
          </div>
        </div>
        <div v-else-if="!assets.length" class="media-library-empty">
          <p class="muted">You have not uploaded any media yet.</p>
        </div>
        <div v-else class="media-library-scroll" aria-label="Uploaded media list" tabindex="0">
          <div v-for="asset in assets" :key="asset.asset" class="media-library-row">
            <MediaThumbnail :asset="asset" />
            <div class="media-library-details">
              <strong :title="asset.filename">{{ asset.filename }}</strong>
              <p class="muted small">{{ asset.kind }} · {{ asset.status }}</p>
            </div>
            <div class="media-library-actions">
              <a v-if="asset.status === 'READY'" :href="assetUrl(asset.asset)">Preview</a>
              <span v-else class="muted small">Preview unavailable</span>
              <button
                :disabled="!!busy"
                class="text-button danger-text"
                @click="remove(asset.asset)"
              >{{ busy === asset.asset ? "Deleting…" : "Delete" }}</button>
            </div>
          </div>
        </div>
      </section>
      <MediaPicker v-if="picker" @close="picker = false" @selected="uploadsChanged" />
    </section>
  </main>
</template>
