<script setup lang="ts">
import { onMounted, onUnmounted, ref } from "vue";

const props = withDefaults(defineProps<{ small?: boolean; delay?: number }>(), {
  small: false,
  delay: 140,
});
const visible = ref(false);
let timer: ReturnType<typeof setTimeout> | undefined;

onMounted(() => {
  timer = setTimeout(() => { visible.value = true; }, props.delay);
});
onUnmounted(() => { if (timer) clearTimeout(timer); });
</script>

<template>
  <div v-if="visible" class="loading-spinner-region" role="status" aria-label="Loading">
    <span class="loading-spinner" :class="{ 'loading-spinner-small': small }" aria-hidden="true"></span>
    <span class="sr-only">Loading</span>
  </div>
</template>
