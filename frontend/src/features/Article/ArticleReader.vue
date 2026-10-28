<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { ArticlesApi } from '@/api/Articles.ts'; import { ReaderProgressApi } from '@/api/ReaderProgress.ts';
import { MediaAssetsApi } from '@/api/MediaAssets.ts';
import { legacyMediaSource } from '@/lib/legacyMedia.ts';
import { editUrl, hubUrl, rememberArticleTitle, welcomeUrl } from '@/lib/routes.ts';
import { mayEditArticle } from '@/lib/permissions.ts';
const props = defineProps<{ hub: string; document: string; signedIn: boolean; canDelete: boolean }>();
type VisibleBlock = { block: string; kind: string; body: string; alt: string };
const title = ref(''), blocks = ref<VisibleBlock[]>([]), mediaUrls = ref<Record<string,string>>({});
const error = ref(''), loading = ref(true), busy = ref(false);
const images: string[] = [];
onUnmounted(() => images.forEach(url => URL.revokeObjectURL(url)));
onMounted(async () => {
 try {
  const progress = await ReaderProgressApi.get(props.hub);
  if (progress.checkpoint === null) { location.replace(welcomeUrl(props.hub)); return; }
  const result = await ArticlesApi.read(props.hub,props.document);
  if (!result.content) throw new Error('This article is not available at your current checkpoint.');
  title.value = result.content.title;
  rememberArticleTitle(props.hub, result.content.document, result.content.title);
  blocks.value = result.content.blocks;
  await Promise.all(blocks.value.filter(b => b.kind !== 'TEXT').map(async b => {
    try { const legacy = b.kind === 'IMAGE' ? legacyMediaSource(b.body) : undefined;
      if (legacy) { mediaUrls.value[b.block] = legacy; return; }
      const data = await MediaAssetsApi.read(props.hub,props.document,b.block,b.body);
      const url = URL.createObjectURL(new Blob([data.bytes], { type: data.contentType }));
      images.push(url); mediaUrls.value[b.block] = url;
    } catch { /* Do not fetch or expose ineligible media. */ }
  }));
 } catch(e) { error.value = e instanceof Error ? e.message : 'Article unavailable'; }
 finally { loading.value = false; }
});
async function remove() { if (!props.canDelete || busy.value) return;
 if (!confirm('Permanently delete this article?')) return; busy.value = true;
 try { await ArticlesApi.delete(props.hub,props.document); location.href = hubUrl(props.hub); }
 catch(e) { error.value = e instanceof Error ? e.message : 'Could not delete'; } finally { busy.value = false; }}
</script>
<template><div class="article-layout"><article class="panel article-surface"><div class="breadcrumbs"><a :href="hubUrl(hub)">Hub</a> / Article</div><div class="article-topline"><h1>{{ title || 'Article' }}</h1><div class="article-actions"><button class="text-button" disabled title="Comments are deferred">♧ Discuss</button><a v-if="!loading && !error && mayEditArticle(signedIn)" :href="editUrl(hub,document)">✎ Edit</a><button v-if="!loading && !error && canDelete" class="text-button danger-text" :disabled="busy" @click="remove">Delete</button></div></div>
<p v-if="error" class="error-text">{{ error }}</p><p v-if="loading" class="muted">Loading article…</p>
<div v-else-if="!error" class="article-body"><div class="spoiler-info">Content is filtered for your saved reading progress.</div>
<template v-for="block in blocks" :key="block.block"><p v-if="block.kind === 'TEXT'" class="article-paragraph">{{ block.body }}</p>
<figure v-else-if="block.kind === 'IMAGE'" class="article-media"><img v-if="mediaUrls[block.block]" :src="mediaUrls[block.block]" :alt="block.alt" /><p v-else class="muted">Image unavailable</p><figcaption>{{ block.alt }}</figcaption></figure>
<figure v-else-if="block.kind === 'VIDEO'" class="article-media"><video v-if="mediaUrls[block.block]" :src="mediaUrls[block.block]" controls /><p v-else class="muted">Video unavailable</p><figcaption>{{ block.alt }}</figcaption></figure></template></div></article>
<aside class="article-aside panel"><h3>In this article</h3><p class="muted">Sections are displayed in document order.</p><hr/><h3>Related articles</h3><p class="muted">Browse more articles from the hub.</p><a :href="hubUrl(hub)">View articles</a></aside></div></template>
