<script setup lang="ts">
import googleLogo from "/images/logos/google.svg";
import commonsLogo from "/images/logos/commons.svg";
import { AccountsApi } from "@/api/Accounts.ts";
const destination = new URLSearchParams(location.search).get("returnTo") ?? "/";
</script>
<template>
  <main class="auth-layout">
    <section class="auth-box">
      <h1>Wikiplotter</h1>
      <p class="muted">Sign in to save your progress and contribute.</p>
      <a
        class="provider-button"
        :href="AccountsApi.loginUrl('GOOGLE', destination)"
      >
        <img :src="googleLogo" class="provider-logo" alt="" />
        <span>Continue with Google</span>
      </a>
      <a
        class="provider-button"
        :href="AccountsApi.loginUrl('COMMONS', destination)"
      >
        <img :src="commonsLogo" class="provider-logo" alt="" />
        <span>Continue with Commons </span>
      </a>
      <div class="or-divider">or</div>
      <a class="guest-link" href="/">Continue as guest</a>
    </section>
  </main>
</template>
