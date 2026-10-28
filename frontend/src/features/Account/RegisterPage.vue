<script setup lang="ts">
import { ref } from "vue";
import { AccountsApi } from "@/api/Accounts.ts";
defineProps<{ pending: boolean }>();
const username = ref(""),
  busy = ref(false),
  error = ref("");
async function create() {
  busy.value = true;
  error.value = "";
  try {
    const result = await AccountsApi.register(username.value);
    location.href = result.redirectTo || "/";
  } catch (e) {
    error.value = e instanceof Error ? e.message : "Could not create account";
  } finally {
    busy.value = false;
  }
}
</script>
<template>
  <main class="auth-layout">
    <section class="auth-box">
      <h1>Wikiplotter</h1>
      <h2>Choose a username</h2>
      <p class="muted">Your public username on Wikiplotter.</p>
      <form v-if="pending" @submit.prevent="create">
        <label class="sr-only" for="signup-name">Username</label
        ><input
          id="signup-name"
          v-model="username"
          placeholder="Username"
          autocomplete="username"
          minlength="3"
          maxlength="20"
          pattern="[A-Za-z0-9]+"
          required
        />
        <p v-if="error" class="error-text">{{ error }}</p>
        <button :disabled="busy" class="primary full">Create account</button>
      </form>
      <p v-else>
        Your sign-in has expired. <a href="/login">Sign in again.</a>
      </p>
    </section>
  </main>
</template>
