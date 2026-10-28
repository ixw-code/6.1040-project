<script setup lang="ts">
import { ref } from 'vue';
import type { Hub } from '@/api.ts';
import { HubsApi } from '@/api/Hubs.ts';
import { hubUrl } from '@/lib/routes.ts';
const props = defineProps<{ hubs: Hub[]; signedIn: boolean; directoryLoading?: boolean }>();
const showCreate = ref(false), name = ref(''), first = ref(''), busy = ref(false), error = ref('');
async function create() {
  busy.value = true; error.value = '';
  try { const result = await HubsApi.create(name.value, first.value); await HubsApi.list(); location.href = hubUrl(result.hub); }
  catch (e) { error.value = e instanceof Error ? e.message : 'Could not create hub'; }
  finally { busy.value = false; }
}
</script>
<template><div>
 <div class="home-hero"><div class="home-hero-inner"><h1>Explore freely.<br />Spoilers no more.</h1>
  <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit.</p>
  <input placeholder="⌕  Search hubs… (coming later)" aria-label="Search hubs (coming later)" disabled /></div></div>
 <main class="center-container home-content"><div class="section-heading"><h2>Featured hubs</h2><button v-if="signedIn" class="subtle-button" @click="showCreate = !showCreate">+ Start a hub</button><a v-else href="/login">Start a hub</a></div>
 <p v-if="directoryLoading" class="muted">Loading hubs…</p>
 <p v-else-if="!props.hubs.length" class="muted">No hubs have been created yet.</p>
 <div class="tile-grid"><a v-for="hub in props.hubs" :key="hub.hub" class="tile" :href="hub.slug ? '/' + encodeURIComponent(hub.slug) : undefined" :aria-disabled="!hub.slug">
   <div class="tile-placeholder" aria-hidden="true"></div><div class="tile-detail"><h3>{{ hub.name }}</h3><p>Lorem ipsum dolor sit amet, consectetur adipiscing elit.</p></div>
 </a></div>
 <form v-if="showCreate" class="panel create-form" @submit.prevent="create"><h3>Create a hub</h3><label>Hub name<input v-model="name" required /></label><label>First checkpoint<input v-model="first" placeholder="Chapter 1" required /></label><p v-if="error" class="error-text">{{ error }}</p><button class="primary" :disabled="busy">Create hub</button></form>
 </main>
</div></template>
