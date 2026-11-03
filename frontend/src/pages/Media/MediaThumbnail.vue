<script setup lang="ts">
import { onMounted, onUnmounted, ref } from "vue";
import { MediaAssetsApi, type Asset } from "@/api/MediaAssets.ts";

const props = defineProps<{ asset: Asset; size?: "small" | "large" }>();
const host = ref<HTMLElement | null>(null);
const url = ref("");
const failed = ref(false);
let observer: IntersectionObserver | undefined;
let requested = false;

async function loadPreview() {
  if (requested || props.asset.kind !== "IMAGE" || props.asset.status !== "READY") return;
  requested = true;
  try {
    const data = await MediaAssetsApi.preview(props.asset.asset);
    url.value = URL.createObjectURL(new Blob([data.bytes], { type: data.contentType }));
  } catch {
    failed.value = true;
  }
}

onMounted(() => {
  if (props.asset.kind !== "IMAGE" || props.asset.status !== "READY") return;
  if (typeof IntersectionObserver === "undefined") {
    void loadPreview();
    return;
  }
  observer = new IntersectionObserver((entries) => {
    if (entries.some((entry) => entry.isIntersecting)) {
      observer?.disconnect();
      void loadPreview();
    }
  }, { rootMargin: "80px" });
  if (host.value) observer.observe(host.value);
});

onUnmounted(() => {
  observer?.disconnect();
  if (url.value) URL.revokeObjectURL(url.value);
});
</script>

<template>
  <span
    ref="host"
    class="media-thumbnail"
    :class="[`media-thumbnail-${size ?? 'large'}`, { 'media-thumbnail-failed': failed }]"
    :aria-label="asset.status === 'PENDING' ? `${asset.kind === 'IMAGE' ? 'Image' : 'Video'} upload pending` : asset.kind === 'VIDEO' ? 'Video preview unavailable' : failed ? 'Image preview unavailable' : `Preview of ${asset.filename}`"
    role="img"
  >
    <img v-if="url" :src="url" alt="" />
    <span v-else-if="asset.kind === 'VIDEO' && asset.status === 'PENDING'" class="media-thumbnail-placeholder">Pending</span>
    <span v-else-if="asset.kind === 'VIDEO'" class="media-thumbnail-placeholder">▶</span>
    <span v-else-if="asset.status === 'PENDING'" class="media-thumbnail-placeholder">Pending</span>
    <span v-else-if="failed" class="media-thumbnail-placeholder">Unavailable</span>
    <span v-else class="media-thumbnail-placeholder" aria-label="Loading image preview">…</span>
  </span>
</template>
