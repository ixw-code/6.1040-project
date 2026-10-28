<script setup lang="ts">
import { onMounted, onUnmounted, ref, computed } from 'vue';
import { ArticlesApi, type ArticleBlock } from '@/api/Articles.ts';
import { HubsApi, type CheckpointRow } from '@/api/Hubs.ts';
import { articleUrl, editUrl, hubUrl, rememberArticleTitle } from '@/lib/routes.ts';
import { confirmAndRun, hasChanged, registerUnsavedChanges } from '@/lib/confirm.ts';
import { navigate } from '@/lib/navigation.ts';
import MediaPicker from '@/features/Media/MediaPicker.vue';
import type { Asset } from '@/api/MediaAssets.ts';
const props = defineProps<{ hub: string; hubName: string; document?: string }>();
type Draft = ArticleBlock & { key: string; unclassified?: boolean };
const title = ref(''), blocks = ref<Draft[]>([]), documentRules = ref<string[]>([]), checkpoints = ref<CheckpointRow[]>([]);
const loading = ref(true), busy = ref(false), error = ref(''), editorUnavailable = ref(false), showPicker = ref(false), dragged = ref(-1), documentUnclassified = ref(false);
const isEditing = computed(() => !!props.document);
const documentId = ref(props.document ?? '');
let original = '';
function serialize() { return JSON.stringify({ title: title.value, blocks: blocks.value, documentRules: documentRules.value, documentUnclassified: documentUnclassified.value }); }
function isDirty() { return original !== '' && hasChanged(original, serialize()); }
let unregisterDirty = () => {};
function beforeUnload(event: BeforeUnloadEvent) { if (!isDirty()) return; event.preventDefault(); event.returnValue = ''; }
function add(kind: ArticleBlock['kind'] = 'TEXT') {
 blocks.value.push({ key: crypto.randomUUID(), kind, body: '', alt: '', required: [] });
}
onMounted(async () => {
 try { const c = await HubsApi.checkpoints(props.hub); checkpoints.value = c.checkpoints;
 if (props.document) {
  const data = await ArticlesApi.editing(props.hub, props.document);
  documentId.value = data.document;
  rememberArticleTitle(props.hub, data.document, data.title);
  const canonicalEditPath = editUrl(props.hub, data.document, data.title);
  if (window.location.pathname !== canonicalEditPath) {
   history.replaceState(null, '', canonicalEditPath);
   window.dispatchEvent(new Event('wikiplotter:replace-route'));
  }
  title.value = data.title; documentRules.value = data.required ?? []; documentUnclassified.value = data.required === null;
  blocks.value = data.blocks.map(b => ({ ...b, required: b.required ?? [], unclassified: b.required === null, key: crypto.randomUUID() }));
 } else { add(); }
 original = serialize();
 unregisterDirty = registerUnsavedChanges(isDirty);
 window.addEventListener('beforeunload', beforeUnload);
 } catch(e) { editorUnavailable.value = true; error.value = e instanceof Error ? e.message : 'Unable to load the article editor'; }
 finally { loading.value = false; }
});
function move(index: number, to: number) { if (to < 0 || to >= blocks.value.length || index === to) return;
 const block = blocks.value.splice(index,1)[0]; if (block) blocks.value.splice(to,0,block);
}
function insert(asset: Asset) { showPicker.value = false; blocks.value.push({ key: crypto.randomUUID(), kind: asset.kind,
 body: asset.asset, alt: asset.kind === 'IMAGE' ? asset.filename : '', required: [] }); }
async function save() { if (busy.value || editorUnavailable.value) return; error.value = '';
 if (!title.value.trim()) { error.value = 'Enter an article title.'; return; }
 if (documentUnclassified.value || blocks.value.some(b => b.unclassified)) { error.value = 'Choose requirements explicitly for unclassified article or blocks before saving to avoid exposing hidden content.'; return; }
 if (blocks.value.some(b => b.kind === 'IMAGE' && !b.alt.trim())) { error.value = 'Image blocks require alternative text.'; return; }
 busy.value = true;
 const values: ArticleBlock[] = blocks.value.map(({ block, kind, body, alt, required }) => ({ ...(block ? { block } : {}), kind, body, alt, required }));
 try { const response = props.document
 ? await ArticlesApi.save({ hub: props.hub, document: documentId.value, title: title.value, blocks: values, required: documentRules.value })
 : await ArticlesApi.create({ hub: props.hub, title: title.value, blocks: values, required: documentRules.value });
 rememberArticleTitle(props.hub, response.document, title.value);
 documentId.value = response.document;
 original = serialize();
 await navigate(articleUrl(props.hub, response.document, title.value), true);
 } catch(e) { error.value = e instanceof Error ? e.message : 'Article save failed'; }
 finally { busy.value = false; }
}
async function cancel() { const path = props.document
 ? articleUrl(props.hub, documentId.value, title.value) : hubUrl(props.hub);
 await navigate(path);
}
async function removeBlock(index: number) {
 await confirmAndRun({ title: 'Delete this block?', message: 'This removes the block from the draft. Saving permanently deletes it and its checkpoint requirement; canceling before save keeps the stored article unchanged.', confirmLabel: 'Delete block', cancelLabel: 'Cancel' }, () => { blocks.value.splice(index, 1); });
}
onUnmounted(() => { unregisterDirty(); window.removeEventListener('beforeunload', beforeUnload); });
function onDrop(event: DragEvent, target: number) { event.preventDefault(); move(dragged.value,target); dragged.value = -1; }
function setRequirement(row: Draft, value: string) { row.required = value ? [value] : []; row.unclassified = false; }
</script>
<template><section class="panel editor-panel"><nav class="breadcrumbs" aria-label="Breadcrumb"><a :href="hubUrl(hub)">{{ hubName }}</a><template v-if="isEditing"><template v-if="title"> <span>→</span> <a :href="articleUrl(hub, documentId, title)">{{ title }}</a> <span>→</span> Editing</template></template><template v-else> <span>→</span> {{ title || 'New article' }}</template></nav><h1>{{ isEditing ? 'Edit article' : 'Create article' }}</h1>
<p v-if="loading">Loading editor…</p><p v-if="error" role="alert" class="error-text">{{ error }}</p>
<template v-if="!loading && !editorUnavailable"><label class="sr-only" for="article-title">Article title</label><input id="article-title" v-model="title" class="article-title-field" placeholder="Article title" />
<div class="editor-tabs"><button class="chosen">Source</button><button disabled title="Preview is not implemented yet">Preview</button></div>
<div class="format-toolbar" aria-label="Article toolbar">
 <button disabled title="Formatting is not supported by this block model">Normal text ▾</button><span class="toolbar-separator"></span>
 <button disabled aria-label="Bold">B</button><button disabled aria-label="Italic"><em>I</em></button><button disabled aria-label="Underline"><u>U</u></button>
 <span class="toolbar-separator"></span><button disabled title="Not yet supported">☷</button><button disabled title="Not yet supported">☰</button>
 <span class="toolbar-separator"></span><button type="button" @click="showPicker = true" title="Insert image or video">▧ Insert media</button>
</div>
<div class="doc-requirements"><strong>Article requirements</strong><label class="small">Required checkpoint<select :value="documentUnclassified ? '__unset' : (documentRules[0] ?? '')" @change="documentUnclassified = false; documentRules = ($event.target as HTMLSelectElement).value ? [($event.target as HTMLSelectElement).value] : []"><option v-if="documentUnclassified" value="__unset" disabled>Unclassified (hidden)</option><option value="">Public (no checkpoint)</option><option v-for="row in checkpoints" :key="row.checkpoint" :value="row.checkpoint">{{ row.label }}</option></select></label></div>
<div class="block-list"><div v-for="(row, index) in blocks" :key="row.key" class="editor-block" draggable="true" @dragstart="dragged = index" @dragover.prevent @drop="onDrop($event, index)">
 <div class="drag-tools"><span title="Drag to reorder">⠿</span><span class="small">{{ index+1 }}</span><button class="mini-button" :disabled="index===0" :aria-label="`Move block ${index+1} up`" @click="move(index,index-1)">↑</button><button class="mini-button" :disabled="index===blocks.length-1" :aria-label="`Move block ${index+1} down`" @click="move(index,index+1)">↓</button></div>
 <span class="block-icon" :title="row.kind">{{ row.kind === 'TEXT' ? '▤' : row.kind === 'IMAGE' ? '▧' : '▶' }}</span>
 <div class="block-main"><textarea v-if="row.kind==='TEXT'" v-model="row.body" rows="3" placeholder="Write text…" />
 <template v-else><div class="block-media-label">{{ row.kind === 'IMAGE' ? '▧ Image' : '▶ Video' }} · {{ row.body }}</div><label class="small" >{{ row.kind === 'IMAGE' ? 'Alt text' : 'Caption' }}<input v-model="row.alt" :placeholder="row.kind === 'IMAGE' ? 'Describe the image' : 'Video caption'" /></label></template></div>
 <label class="block-rule small">Requires checkpoint<select :value="row.unclassified ? '__unset' : (row.required[0] ?? '')" @change="setRequirement(row, ($event.target as HTMLSelectElement).value)"><option v-if="row.unclassified" value="__unset" disabled>Unclassified (hidden)</option><option value="">Public</option><option v-for="checkpoint in checkpoints" :key="checkpoint.checkpoint" :value="checkpoint.checkpoint">{{ checkpoint.label }}</option></select></label>
 <button class="icon-action" :aria-label="`Delete block ${index+1}`" title="Delete block" @click="removeBlock(index)">✕</button>
 </div></div>
<div class="add-menu"><button class="button-outline" @click="add('TEXT')">+ Add text block</button><button class="button-outline" @click="showPicker = true">+ Insert media</button></div>
<div class="editor-actions"><button class="button-outline" @click="cancel">Cancel</button><button class="primary" :disabled="busy" @click="save">Save</button></div>
</template>
<MediaPicker v-if="showPicker" @close="showPicker = false" @selected="insert" />
</section></template>
