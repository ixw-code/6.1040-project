<script setup lang="ts">
import { onMounted, onUnmounted, ref } from "vue";
import { HubsApi } from "@/api/Hubs.ts";
import { needsProgressSelection, ReaderProgressApi } from "@/api/ReaderProgress.ts";
import { articleUrl, newArticleUrl, welcomeUrl } from "@/lib/routes.ts";
import { ArticlesApi } from "@/api/Articles.ts";
import { MediaAssetsApi } from "@/api/MediaAssets.ts";
import { legacyMediaSource } from "@/lib/legacyMedia.ts";
const props = defineProps<{
  hub: string;
  hubName: string;
  signedIn: boolean;
}>();
const docs = ref<{ document: string; title: string }[]>([]),
  loading = ref(true),
  error = ref("");
const previews = ref<Record<string, string>>({});
const owned: string[] = [];
onUnmounted(() => owned.forEach((url) => URL.revokeObjectURL(url)));
async function loadPreview(document: string) {
  try {
    const article = await ArticlesApi.read(props.hub, document);
    const image = article.content?.blocks.find(
      (block) => block.kind === "IMAGE",
    );
    if (!image) return;
    const legacy = legacyMediaSource(image.body);
    if (legacy) {
      previews.value[document] = legacy;
      return;
    }
    const data = await MediaAssetsApi.read(
      props.hub,
      document,
      image.block,
      image.body,
    );
    const url = URL.createObjectURL(
      new Blob([data.bytes], { type: data.contentType }),
    );
    owned.push(url);
    previews.value[document] = url;
  } catch {
    /* Preview images are optional and must pass spoiler filtering. */
  }
}
onMounted(async () => {
  try {
    const progress = await ReaderProgressApi.get(props.hub);
    if (needsProgressSelection(progress.checkpoint)) {
      location.replace(welcomeUrl(props.hub));
      return;
    }
    const result = await HubsApi.browse(props.hub);
    docs.value = result.documents;
    await Promise.all(
      docs.value.slice(0, 9).map((doc) => loadPreview(doc.document)),
    );
  } catch (e) {
    error.value = e instanceof Error ? e.message : "Could not list articles";
  } finally {
    loading.value = false;
  }
});
</script>
<template>
  <section class="panel content-panel">
    <nav class="breadcrumbs" aria-label="Breadcrumb">{{ hubName }}</nav>
    <div class="section-heading">
      <h1>Articles</h1>
      <a v-if="signedIn" class="button-outline" :href="newArticleUrl(hub)"
        >+ Create article</a
      >
    </div>
    <p v-if="error" class="error-text">{{ error }}</p>
    <p v-if="loading" class="muted">Loading articles…</p>
    <p v-else-if="!docs.length && !error" class="muted">
      There are no articles available at your selected checkpoint.
    </p>
    <div class="tile-grid article-tiles">
      <a
        v-for="doc in docs"
        :key="doc.document"
        class="tile"
        :href="articleUrl(hub, doc.document, doc.title)"
      >
        <div class="tile-placeholder" aria-hidden="true">
          <img
            v-if="previews[doc.document]"
            :src="previews[doc.document]"
            alt=""
          />
        </div>
        <div class="tile-detail">
          <h3>{{ doc.title }}</h3>
          <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit.</p>
        </div></a
      >
    </div>
  </section>
</template>
