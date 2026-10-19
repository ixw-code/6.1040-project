<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { api, type Checkpoint, type DocumentContent, type DocumentSummary, type Hub } from '@/api.ts';
import { readerIdentity } from '@/reader.ts';

type Page = { kind: 'home' } | { kind: 'hub'; hub: string } | { kind: 'manage'; hub: string } |
  { kind: 'document'; hub: string; document: string };

function readPage(): Page {
  try {
    const parts = location.hash.slice(1).split('/').filter(Boolean).map(decodeURIComponent);
    if (parts[0] === 'hub' && parts[1] && parts.length === 2) return { kind: 'hub', hub: parts[1] };
    if (parts[0] === 'hub' && parts[1] && parts[2] === 'manage' && parts.length === 3) {
      return { kind: 'manage', hub: parts[1] };
    }
    if (parts[0] === 'hub' && parts[1] && parts[2] === 'document' && parts[3] && parts.length === 4) {
      return { kind: 'document', hub: parts[1], document: parts[3] };
    }
  } catch { /* An invalid URL opens the directory. */ }
  return { kind: 'home' };
}

const reader = readerIdentity();
const page = ref<Page>(readPage());
const hubs = ref<Hub[]>([]);
const checkpoints = ref<Checkpoint[]>([]);
const sequence = ref('');
const savedCheckpoint = ref<string | null>(null);
const chosenCheckpoint = ref('');
const documents = ref<DocumentSummary[]>([]);
const content = ref<DocumentContent | null>(null);
const loading = ref(false);
const busy = ref(false);
const error = ref('');
const actionError = ref('');
const newHubName = ref('');
const firstLabel = ref('');
const renameName = ref('');
const appendLabel = ref('');
const relabelDraft = ref<Record<string, string>>({});
let generation = 0;

const currentHub = computed(() => {
  const destination = page.value;
  return destination.kind === 'home' ? undefined :
    hubs.value.find((entry) => entry.hub === destination.hub);
});
const selectedLabel = computed(() => checkpoints.value.find((entry) =>
  entry.checkpoint === savedCheckpoint.value)?.label);
const hubLink = (hub: string) => `#/hub/${encodeURIComponent(hub)}`;
const manageLink = (hub: string) => `${hubLink(hub)}/manage`;
const documentLink = (hub: string, document: string) =>
  `${hubLink(hub)}/document/${encodeURIComponent(document)}`;
const message = (cause: unknown) => cause instanceof Error ? cause.message : 'Request failed';

async function loadPage() {
  const ticket = ++generation;
  loading.value = true;
  error.value = '';
  checkpoints.value = [];
  sequence.value = '';
  savedCheckpoint.value = null;
  chosenCheckpoint.value = '';
  documents.value = [];
  content.value = null;
  try {
    const directory = await api.hubs();
    if (ticket !== generation) return;
    hubs.value = directory.hubs;
    const destination = page.value;
    if (destination.kind === 'home') return;
    const found = directory.hubs.find((entry) => entry.hub === destination.hub);
    if (!found) throw new Error('Hub not found');
    renameName.value = found.name;
    const [choices, progress] = await Promise.all([
      api.checkpoints(destination.hub), api.progress(destination.hub, reader),
    ]);
    if (ticket !== generation) return;
    sequence.value = choices.sequence;
    checkpoints.value = choices.checkpoints;
    relabelDraft.value = Object.fromEntries(choices.checkpoints.map((entry) => [entry.checkpoint, entry.label]));
    savedCheckpoint.value = progress.checkpoint;
    chosenCheckpoint.value = progress.checkpoint ?? '';
    if (progress.checkpoint === null || destination.kind === 'manage') return;
    if (destination.kind === 'hub') {
      const result = await api.browse(destination.hub, reader);
      if (ticket === generation) documents.value = result.documents;
    } else {
      const result = await api.read(destination.hub, reader, destination.document);
      if (ticket === generation) content.value = result.content;
    }
  } catch (cause) {
    if (ticket === generation) error.value = message(cause);
  } finally {
    if (ticket === generation) loading.value = false;
  }
}

function routeChanged() {
  page.value = readPage();
  actionError.value = '';
  void loadPage();
}

onMounted(() => {
  addEventListener('hashchange', routeChanged);
  void loadPage();
});
onUnmounted(() => {
  removeEventListener('hashchange', routeChanged);
  generation++;
});

async function createHub() {
  if (busy.value) return;
  busy.value = true;
  actionError.value = '';
  try {
    const created = await api.createHub(newHubName.value, firstLabel.value);
    newHubName.value = '';
    firstLabel.value = '';
    location.hash = hubLink(created.hub);
  } catch (cause) {
    actionError.value = message(cause);
  } finally {
    busy.value = false;
  }
}

async function change(action: () => Promise<unknown>) {
  if (busy.value) return;
  busy.value = true;
  actionError.value = '';
  ++generation;
  documents.value = [];
  content.value = null;
  loading.value = true;
  try {
    await action();
  } catch (cause) {
    actionError.value = message(cause);
  } finally {
    await loadPage();
    busy.value = false;
  }
}

function saveProgress() {
  if (page.value.kind === 'home' || !chosenCheckpoint.value) return;
  const hub = page.value.hub;
  const checkpoint = chosenCheckpoint.value;
  void change(() => api.record(hub, reader, checkpoint));
}

function clearProgress() {
  if (page.value.kind === 'home') return;
  const hub = page.value.hub;
  void change(() => api.clear(hub, reader));
}

function renameHub() {
  if (page.value.kind !== 'manage') return;
  const hub = page.value.hub;
  const name = renameName.value;
  void change(() => api.renameHub(hub, name));
}

function appendCheckpoint() {
  if (page.value.kind !== 'manage') return;
  const hub = page.value.hub;
  const label = appendLabel.value;
  void change(async () => {
    await api.appendCheckpoint(hub, sequence.value, label);
    appendLabel.value = '';
  });
}

function relabelCheckpoint(checkpoint: string) {
  if (page.value.kind !== 'manage') return;
  const hub = page.value.hub;
  const label = relabelDraft.value[checkpoint] ?? '';
  void change(() => api.relabelCheckpoint(hub, checkpoint, label));
}
</script>

<template>
  <div class="site">
    <header class="topbar">
      <a class="brand" href="#/">Wikiplotter</a>
      <nav aria-label="Main navigation">
        <a href="#/">Hub directory</a>
        <a v-if="currentHub" :href="hubLink(currentHub.hub)">{{ currentHub.name }}</a>
        <a v-if="currentHub" :href="manageLink(currentHub.hub)">Hub settings</a>
      </nav>
    </header>

    <div class="shell">
      <aside class="rail" aria-label="Hubs">
        <strong>Hubs</strong>
        <a v-for="entry in hubs" :key="entry.hub" :href="hubLink(entry.hub)">{{ entry.name }}</a>
        <a href="#/">All hubs</a>
      </aside>

      <main>
        <p v-if="error" class="notice error" role="alert">{{ error }}</p>
        <p v-if="actionError" class="notice error" role="alert">{{ actionError }}</p>
        <p v-if="loading" class="notice" role="status">Loading…</p>

        <template v-if="page.kind === 'home'">
          <div class="intro">
            <h1>Wikiplotter</h1>
            <p>Explore a story wiki at your own reading checkpoint.</p>
          </div>
          <div class="directory-layout">
            <section>
              <h2>Hub directory</h2>
              <p v-if="!loading && hubs.length === 0">No hubs yet. Create the first one.</p>
              <ul v-else class="hub-list">
                <li v-for="entry in hubs" :key="entry.hub">
                  <a :href="hubLink(entry.hub)">{{ entry.name }}</a>
                </li>
              </ul>
            </section>
            <section class="panel">
              <h2>Start a hub</h2>
              <form @submit.prevent="createHub">
                <label>Hub name <input v-model="newHubName" required /></label>
                <label>First checkpoint <input v-model="firstLabel" required placeholder="Chapter 1" /></label>
                <button :disabled="busy">Create hub</button>
              </form>
            </section>
          </div>
        </template>

        <template v-else-if="currentHub">
          <p class="crumb"><a href="#/">Hubs</a> / <a :href="hubLink(currentHub.hub)">{{ currentHub.name }}</a>
            <template v-if="page.kind === 'manage'"> / Settings</template>
            <template v-else-if="page.kind === 'document'"> / Document</template>
          </p>

          <div v-if="page.kind === 'manage'" class="page-column">
            <h1>{{ currentHub.name }} settings</h1>
            <p>Hub names and checkpoints are shared by all readers.</p>
            <section class="panel">
              <h2>Rename hub</h2>
              <form class="inline-form" @submit.prevent="renameHub">
                <label>New name <input v-model="renameName" required /></label>
                <button :disabled="busy || loading">Rename</button>
              </form>
            </section>
            <section class="panel">
              <h2>Checkpoints</h2>
              <p>Checkpoint order determines which spoilers become available.</p>
              <form class="inline-form" @submit.prevent="appendCheckpoint">
                <label>New checkpoint <input v-model="appendLabel" required /></label>
                <button :disabled="busy || loading">Append</button>
              </form>
              <table v-if="checkpoints.length">
                <thead><tr><th>Order</th><th>Label</th><th>Rename</th></tr></thead>
                <tbody>
                  <tr v-for="entry in checkpoints" :key="entry.checkpoint">
                    <td>{{ entry.position }}</td>
                    <td>{{ entry.label }}</td>
                    <td v-if="entry.position === 0">Fixed starting point</td>
                    <td v-else>
                      <form class="inline-form" @submit.prevent="relabelCheckpoint(entry.checkpoint)">
                        <input v-model="relabelDraft[entry.checkpoint]" :aria-label="`New label for ${entry.label}`" required />
                        <button :disabled="busy || loading">Save</button>
                      </form>
                    </td>
                  </tr>
                </tbody>
              </table>
            </section>
          </div>

          <div v-else class="hub-layout">
            <div class="page-column">
              <template v-if="page.kind === 'hub'">
                <div class="hub-heading">
                  <h1>{{ currentHub.name }}</h1>
                  <p>A story hub, shown at your selected checkpoint.</p>
                </div>
                <h2>Documents</h2>
                <p v-if="!loading && savedCheckpoint === null">Select and save a checkpoint to browse documents.</p>
                <p v-else-if="!loading && documents.length === 0">No documents are available at this checkpoint.</p>
                <ul v-else class="document-list">
                  <li v-for="entry in documents" :key="entry.document">
                    <a :href="documentLink(currentHub.hub, entry.document)">{{ entry.title }}</a>
                  </li>
                </ul>
              </template>
              <template v-else>
                <p v-if="!loading && savedCheckpoint === null">Select a checkpoint on the hub page before reading.</p>
                <p v-else-if="!loading && !content">This document is unavailable at your current checkpoint.</p>
                <article v-if="content && !loading" class="article">
                  <h1>{{ content.title }}</h1>
                  <template v-for="block in content.blocks" :key="block.block">
                    <p v-if="block.kind === 'TEXT'" class="text-block">{{ block.body }}</p>
                    <figure v-else-if="block.kind === 'IMAGE'">
                      <img :src="block.body" :alt="block.alt" />
                      <figcaption v-if="block.alt">{{ block.alt }}</figcaption>
                    </figure>
                  </template>
                </article>
              </template>
            </div>
            <aside class="panel progress-panel">
              <h2>Reading progress</h2>
              <p v-if="savedCheckpoint === null">No checkpoint selected.</p>
              <p v-else>Saved: <strong>{{ selectedLabel ?? 'Unknown checkpoint' }}</strong></p>
              <form @submit.prevent="saveProgress">
                <label for="checkpoint-choice">Latest completed checkpoint</label>
                <select id="checkpoint-choice" v-model="chosenCheckpoint" :disabled="loading || busy">
                  <option value="" disabled>Choose a checkpoint</option>
                  <option v-for="entry in checkpoints" :key="entry.checkpoint" :value="entry.checkpoint">
                    {{ entry.label }}
                  </option>
                </select>
                <button :disabled="loading || busy || !chosenCheckpoint">Save progress</button>
              </form>
              <button class="secondary" :disabled="loading || busy || savedCheckpoint === null" @click="clearProgress">
                Clear progress
              </button>
              <p class="small"><a :href="manageLink(currentHub.hub)">Manage this hub’s checkpoints</a></p>
            </aside>
          </div>
        </template>
      </main>
    </div>
  </div>
</template>
