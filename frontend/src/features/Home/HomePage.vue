<script setup lang="ts">
import type { Hub } from '@/api.ts';
import { hubCreateUrl } from '@/lib/routes.ts';
const props = defineProps<{ hubs: Hub[]; signedIn: boolean; directoryLoading?: boolean }>();
</script>
<template><div>
 <div class="home-hero"><div class="home-hero-inner"><h1>Explore freely.<br />Spoilers no more.</h1>
  <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit.</p>
  <input placeholder="⌕  Search hubs… (coming later)" aria-label="Search hubs (coming later)" disabled /></div></div>
 <main class="center-container home-content"><div class="section-heading"><h2>Featured hubs</h2><a v-if="signedIn" class="subtle-button" :href="hubCreateUrl()">+ Start a hub</a><a v-else href="/login">Start a hub</a></div>
 <p v-if="directoryLoading" class="muted">Loading hubs…</p>
 <p v-else-if="!props.hubs.length" class="muted">No hubs have been created yet.</p>
 <div class="tile-grid"><a v-for="hub in props.hubs" :key="hub.hub" class="tile" :href="hub.slug ? '/' + encodeURIComponent(hub.slug) : undefined" :aria-disabled="!hub.slug">
   <div class="tile-placeholder" aria-hidden="true"></div><div class="tile-detail"><h3>{{ hub.name }}</h3><p>Lorem ipsum dolor sit amet, consectetur adipiscing elit.</p></div>
 </a></div>
 </main>
</div></template>
