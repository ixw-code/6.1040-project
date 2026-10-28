<script setup lang="ts">
import { onMounted, onUnmounted, ref, computed } from "vue";
import {
  MediaAssetsApi,
  type Asset,
  type AssetKind,
} from "@/api/MediaAssets.ts";
const emit = defineEmits<{ selected: [asset: Asset]; close: [] }>();
const tab = ref<"search" | "upload">("search"),
  list = ref<Asset[]>([]),
  filter = ref(""),
  busy = ref(false),
  error = ref("");
const urls = ref<Record<string, string>>({});
const owned: string[] = [];
const ready = computed(() =>
  list.value.filter(
    (a) =>
      a.status === "READY" &&
      a.filename.toLowerCase().includes(filter.value.toLowerCase()),
  ),
);
onUnmounted(() => owned.forEach(URL.revokeObjectURL));
async function load() {
  try {
    list.value = await MediaAssetsApi.list();
    await Promise.all(
      list.value
        .filter((a) => a.status === "READY")
        .map(async (asset) => {
          try {
            const data = await MediaAssetsApi.preview(asset.asset);
            const url = URL.createObjectURL(
              new Blob([data.bytes], { type: data.contentType }),
            );
            owned.push(url);
            urls.value[asset.asset] = url;
          } catch {
            /* A private preview may not be available. */
          }
        }),
    );
  } catch (e) {
    error.value = e instanceof Error ? e.message : "Could not load uploads";
  }
}
onMounted(() => {
  void load();
});
async function upload(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (!file) return;
  if (file.size > 19 * 1024 * 1024) {
    error.value = "The maximum file size is 19 MB.";
    return;
  }
  const kind: AssetKind = file.type.startsWith("image/") ? "IMAGE" : "VIDEO";
  busy.value = true;
  error.value = "";
  try {
    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error("Could not read the file"));
      reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
      reader.readAsDataURL(file);
    });
    const upload = await MediaAssetsApi.startUpload({
      filename: file.name,
      kind,
      contentType: file.type,
      data: base64,
    });
    const finalized = await MediaAssetsApi.finishUpload(upload.asset);
    const asset = await MediaAssetsApi.get(finalized.asset);
    emit("selected", asset);
  } catch (e) {
    error.value = e instanceof Error ? e.message : "Upload refused";
  } finally {
    busy.value = false;
  }
}
</script>
<template>
  <div class="modal-backdrop" @click.self="emit('close')">
    <section
      class="media-modal"
      role="dialog"
      aria-modal="true"
      aria-label="Insert media"
    >
      <header class="modal-head">
        <h2>Insert media</h2>
        <button
          class="text-button"
          aria-label="Close media picker"
          @click="emit('close')"
        >
          ✕
        </button>
      </header>
      <div class="tabbar">
        <button :class="{ chosen: tab === 'search' }" @click="tab = 'search'">
          Search</button
        ><button :class="{ chosen: tab === 'upload' }" @click="tab = 'upload'">
          Upload
        </button>
      </div>
      <div class="media-content">
        <template v-if="tab === 'search'"
          ><label for="asset-search" class="sr-only">Search your uploads</label
          ><input
            id="asset-search"
            v-model="filter"
            placeholder="Search your uploads…"
          />
          <div class="asset-list">
            <button
              v-for="asset in ready"
              :key="asset.asset"
              class="asset-choice"
              @click="emit('selected', asset)"
            >
              <img
                v-if="asset.kind === 'IMAGE' && urls[asset.asset]"
                :src="urls[asset.asset]"
                alt=""
              /><span v-else class="asset-kind">{{
                asset.kind === "IMAGE" ? "▧" : "▶"
              }}</span
              ><span>{{ asset.filename }}</span>
            </button>
          </div>
          <p v-if="!ready.length" class="muted">
            No matching uploads yet.
          </p> </template
        ><template v-else
          ><label class="upload-target"
            ><span class="upload-icon">⇧</span
            ><strong>Upload from computer</strong
            ><span class="muted small">Choose a file (max 19 MB)</span
            ><input
              type="file"
              accept="image/png,image/jpeg,image/webp,video/mp4,video/webm"
              :disabled="busy"
              @change="upload" /></label
          ><button class="text-button" @click="tab = 'search'">
            Choose from your uploads
          </button></template
        >
        <p v-if="error" class="error-text">{{ error }}</p>
        <p v-if="busy" role="status">Uploading…</p>
      </div>
      <footer class="modal-footer">
        <button class="button-outline" @click="emit('close')">Cancel</button>
      </footer>
    </section>
  </div>
</template>
