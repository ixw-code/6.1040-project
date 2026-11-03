<script setup lang="ts">
import type { Hub } from "@/api.ts";
import { hubCreateUrl, loginUrl } from "@/lib/routes.ts";
import LoadingSpinner from "@/components/LoadingSpinner.vue";
const props = defineProps<{
  hubs: Hub[];
  signedIn: boolean;
  directoryLoading?: boolean;
  directoryError?: string;
  directoryLoadingKey?: number;
}>();
</script>
<template>
  <div>
    <div class="home-hero">
      <div class="home-hero-inner">
        <h1>Explore freely.<br />Spoilers no more.</h1>
        <p>Enjoy a stress-free wiki experience.</p>
        <input
          placeholder="⌕  Search hubs… (coming later)"
          aria-label="Search hubs (coming later)"
          disabled
        />
      </div>
    </div>
    <main class="center-container home-content">
      <div class="section-heading">
        <h2>Featured hubs</h2>
        <a v-if="signedIn" class="subtle-button" :href="hubCreateUrl()"
          >+ Start a hub</a
        ><a v-else :href="loginUrl(hubCreateUrl())">Start a hub</a>
      </div>
      <LoadingSpinner v-if="directoryLoading" :key="directoryLoadingKey" />
      <p v-else-if="directoryError" class="error-text" role="alert">
        {{ directoryError }}
      </p>
      <p v-else-if="!props.hubs.length" class="muted">
        No hubs have been created yet.
      </p>
      <div class="tile-grid">
        <a
          v-for="hub in props.hubs"
          :key="hub.hub"
          class="tile"
          :href="hub.slug ? '/' + encodeURIComponent(hub.slug) : undefined"
          :aria-disabled="!hub.slug"
        >
          <div class="tile-placeholder" aria-hidden="true"></div>
          <div class="tile-detail">
            <h3>{{ hub.name }}</h3>
          </div>
        </a>
      </div>
    </main>
  </div>
</template>
