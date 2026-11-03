<script setup lang="ts">
import ReaderProgressControl from "@/components/ReaderProgressControl.vue";
import { hubUrl, settingsUrl } from "@/lib/routes.ts";
const props = defineProps<{ hub: string; name: string; canManage: boolean }>();
const emit = defineEmits<{ changed: [] }>();
function onProgressChanged() { emit("changed"); }
</script>
<template>
  <div class="hub-banner">
    <nav class="hub-nav" aria-label="Hub navigation">
      <a class="hub-title" :href="hubUrl(hub)">{{ name }}</a>
      <input
        class="hub-search"
        aria-label="Search this hub (coming later)"
        placeholder="⌕  Search in this hub…"
        disabled
        title="Hub search is not available yet"
      />
      <div class="hub-toolbar">
        <ReaderProgressControl :hub="props.hub" :name="props.name" @changed="onProgressChanged" />
        <a
          v-if="canManage"
          class="nav-icon"
          :href="settingsUrl(hub)"
          aria-label="Hub settings"
          title="Hub settings"
          >⚙</a
        >
      </div>
    </nav>
  </div>
</template>
