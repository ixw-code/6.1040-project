<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'; import { MediaAssetsApi, type Asset } from '@/api/MediaAssets.ts';
const props = defineProps<{ asset: string }>(); const row = ref<Asset|null>(null), url = ref(''), error = ref('');
onMounted(async () => { try { const [metadata, data] = await Promise.all([MediaAssetsApi.get(props.asset), MediaAssetsApi.preview(props.asset)]);
row.value = metadata; url.value = URL.createObjectURL(new Blob([data.bytes], { type: data.contentType }));
} catch(e) { error.value = e instanceof Error ? e.message : 'Preview unavailable'; } });
onUnmounted(() => { if(url.value) URL.revokeObjectURL(url.value); });
</script>
<template><main class="center-container"><section class="panel content-panel"><p><a href="/assets">← Your uploads</a></p><h1>{{ row?.filename ?? 'Asset preview' }}</h1><p v-if="error" class="error-text">{{ error }}</p>
<figure v-if="row && url" class="asset-preview"><img v-if="row.kind === 'IMAGE'" :src="url" :alt="row.filename"/><video v-else :src="url" controls /></figure><p v-if="row" class="muted">{{ row.kind }} · {{ row.status }}</p>
</section></main></template>
