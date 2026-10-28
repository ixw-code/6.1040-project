<script setup lang="ts">
import { AccountsApi } from '@/api/Accounts.ts';
const destination = new URLSearchParams(location.search).get('returnTo') ?? '/';
</script>
<template><main class="auth-layout"><section class="auth-box"><h1>Wikiplotter</h1><h2>Welcome back</h2><p class="muted">Sign in to save your progress and contribute.</p>
 <a class="provider-button" :href="AccountsApi.loginUrl('GOOGLE', destination)"><span class="google-g">G</span>Continue with Google</a>
 <a class="provider-button" :href="AccountsApi.loginUrl('COMMONS', destination)">Continue with Commons</a>
 <div class="or-divider">or</div><a class="guest-link" href="/">Continue as guest</a></section></main></template>
