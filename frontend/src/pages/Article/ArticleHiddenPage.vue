<script setup lang="ts">
import { hubUrl } from "@/lib/routes.ts";

defineProps<{ hub: string }>();
</script>

<template>
  <main class="auth-layout not-found-page">
    <section class="auth-box not-found-panel">
      <h1>Article hidden</h1>
      <p class="muted">This article is hidden for your current progress checkpoint.</p>
      <a class="primary" :href="hubUrl(hub)">Back to hub</a>
    </section>
  </main>
</template>
