<script setup lang="ts">
import { ref } from 'vue';
import { HubsApi } from '@/api/Hubs.ts';
import { hubUrl } from '@/lib/routes.ts';

const name = ref('');
const nameError = ref('');
const busy = ref(false);

async function create() {
  busy.value = true;
  nameError.value = '';
  try {
    const result = await HubsApi.create(name.value);
    await HubsApi.list();
    window.location.assign(hubUrl(result.hub));
  } catch (cause) {
    nameError.value = cause instanceof Error && cause.message === 'CONFLICT'
      ? 'Name already taken. Please try again.'
      : cause instanceof Error ? cause.message : 'Could not create hub.';
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <main class="auth-layout">
    <section class="auth-box hub-create-box">
      <h1>Start a Hub</h1>
      <p class="muted">Give your hub a name. You can add checkpoints from hub settings.</p>
      <form @submit.prevent="create">
        <label class="sr-only" for="new-hub-name">Hub name</label>
        <input id="new-hub-name" v-model="name" placeholder="Hub name" maxlength="100" required />
        <p v-if="nameError" class="error-text" role="alert">{{ nameError }}</p>
        <button class="primary full" :disabled="busy">{{ busy ? 'Creating…' : 'Create hub' }}</button>
      </form>
    </section>
  </main>
</template>
