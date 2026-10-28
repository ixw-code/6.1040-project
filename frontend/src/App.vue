<script setup lang="ts">
import { onMounted, ref, computed } from 'vue';
import { HubsApi } from '@/api/Hubs.ts'; import { AccountsApi, type Account } from '@/api/Accounts.ts';
import type { Hub } from '@/api.ts'; import { routeFromLocation, type Route } from '@/lib/routes.ts';
import GlobalHeader from '@/components/GlobalHeader.vue'; import HubChrome from '@/components/HubChrome.vue';
import HomePage from '@/features/Home/HomePage.vue';
import HubWelcome from '@/features/Hub/HubWelcome.vue'; import HubHome from '@/features/Hub/HubHome.vue'; import HubSettings from '@/features/Hub/HubSettings.vue';
import ArticleReader from '@/features/Article/ArticleReader.vue'; import ArticleEditor from '@/features/Article/ArticleEditor.vue';
import SignInPage from '@/features/Account/SignInPage.vue'; import RegisterPage from '@/features/Account/RegisterPage.vue'; import AccountPage from '@/features/Account/AccountPage.vue';
import MediaLibrary from '@/features/Media/MediaLibrary.vue'; import MediaPreview from '@/features/Media/MediaPreview.vue';
const route = ref<Route>(routeFromLocation());
const account = ref<Account|null>(null), pending = ref(false), hubs = ref<Hub[]>([]), loading = ref(true), error = ref('');
const activeHub = computed(() => { const current = route.value; return 'hub' in current ? hubs.value.find(h => h.slug === current.hub || h.hub === current.hub) : undefined; });
const isHubPage = computed(() => 'hub' in route.value);
const canManageHub = ref(false);
async function load() {
 try { const [accountResult, hubResult] = await Promise.allSettled([AccountsApi.current(), HubsApi.list()]);
  if (accountResult.status==='fulfilled') { account.value=accountResult.value.account; pending.value=accountResult.value.pending; }
  if (hubResult.status==='fulfilled') hubs.value=hubResult.value.hubs;
  else error.value='Hub directory is temporarily unavailable.';
  const currentHub = activeHub.value;
  if (account.value && currentHub) {
   try { canManageHub.value = (await HubsApi.access(currentHub.hub)).canManage; }
   catch { error.value = 'Could not verify hub permissions. Creator-only controls are hidden.'; }
  }
  if (currentHub && (route.value.kind === 'article' || route.value.kind === 'article-edit')) {
   const articleRoute = route.value;
   try {
    const rows = (await HubsApi.browse(currentHub.hub)).documents;
    const found = rows.find(row => row.document === articleRoute.document || row.title === articleRoute.document);
    if (found) route.value = { ...articleRoute, document: found.document };
   } catch { /* The reader/editor reports the progress or access refusal. */ }
  }
 } finally { loading.value=false; }
}
function refreshPage() { window.location.reload(); }
async function logout() { try { await AccountsApi.logout(); account.value=null; location.href='/'; }
catch(e) { error.value=e instanceof Error ? e.message : 'Logout failed'; } }
onMounted(() => { void load(); });
</script>
<template><div class="site-shell"><GlobalHeader :account="account" @logout="logout" />
 <template v-if="!loading && isHubPage && activeHub"><HubChrome :key="activeHub.hub" :hub="activeHub.hub" :name="activeHub.name" :can-manage="canManageHub" @changed="refreshPage" /></template>
 <p v-if="error" class="global-error" role="alert">{{ error }}</p>
 <div v-if="loading" class="loading-screen">Loading Wikiplotter…</div>
 <template v-else>
  <HomePage v-if="route.kind==='home'" :hubs="hubs" :signed-in="!!account" />
  <SignInPage v-else-if="route.kind==='login'" />
  <RegisterPage v-else-if="route.kind==='register'" :pending="pending" />
  <AccountPage v-else-if="route.kind==='account-settings' && account" :account="account" tab="settings" />
  <AccountPage v-else-if="route.kind==='account-data' && account" :account="account" tab="data" />
  <MediaLibrary v-else-if="route.kind==='media-library' && account" />
  <MediaPreview v-else-if="route.kind==='media-preview' && account" :asset="route.asset" />
  <template v-else-if="activeHub"><main class="hub-content center-container">
   <HubWelcome v-if="route.kind==='welcome'" :hub="activeHub.hub" :name="activeHub.name" />
   <HubHome v-else-if="route.kind==='hub'" :hub="activeHub.hub" :signed-in="!!account" />
   <HubSettings v-else-if="route.kind==='hub-settings' && canManageHub" :hub="activeHub.hub" :slug="activeHub.slug" :name="activeHub.name" />
   <ArticleReader v-else-if="route.kind==='article'" :hub="activeHub.hub" :document="route.document" :signed-in="!!account" :can-delete="canManageHub" />
   <ArticleEditor v-else-if="route.kind==='article-new' && account" :hub="activeHub.hub" />
   <ArticleEditor v-else-if="route.kind==='article-edit' && account" :hub="activeHub.hub" :document="route.document" />
   <section v-else-if="route.kind==='hub-settings'" class="panel content-panel">
    <h1>Hub settings unavailable</h1><p v-if="!account">Sign in to manage a hub you created.</p>
    <p v-else>Only the original hub creator can manage this hub.</p>
    <a :href="account ? '/' : '/login'">{{ account ? 'Browse hubs' : 'Log in' }}</a>
   </section>
   <section v-else class="panel content-panel"><h1>Sign in required</h1><p>Sign in to manage this resource.</p><a href="/login">Log in</a></section>
  </main></template>
  <main v-else class="center-container"><section class="panel content-panel"><h1>{{ isHubPage ? 'Hub not found' : 'Sign in required' }}</h1><a :href="isHubPage ? '/' : '/login'">{{ isHubPage ? 'Browse hubs' : 'Log in' }}</a></section></main>
 </template>
</div></template>
