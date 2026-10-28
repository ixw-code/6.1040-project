<script setup lang="ts">
import { onMounted, onUnmounted, ref, computed } from "vue";
import { HubsApi } from "@/api/Hubs.ts";
import { AccountsApi, type Account } from "@/api/Accounts.ts";
import type { Hub } from "@/api.ts";
import { routeFromLocation, type Route } from "@/lib/routes.ts";
import GlobalHeader from "@/components/GlobalHeader.vue";
import HubChrome from "@/components/HubChrome.vue";
import HomePage from "@/features/Home/HomePage.vue";
import HubWelcome from "@/features/Hub/HubWelcome.vue";
import HubHome from "@/features/Hub/HubHome.vue";
import HubSettings from "@/features/Hub/HubSettings.vue";
import ArticleReader from "@/features/Article/ArticleReader.vue";
import ArticleEditor from "@/features/Article/ArticleEditor.vue";
import SignInPage from "@/features/Account/SignInPage.vue";
import RegisterPage from "@/features/Account/RegisterPage.vue";
import AccountPage from "@/features/Account/AccountPage.vue";
import MediaLibrary from "@/features/Media/MediaLibrary.vue";
import MediaPreview from "@/features/Media/MediaPreview.vue";
import ConfirmationDialog from "@/components/ConfirmationDialog.vue";
import {
  askConfirmation,
  confirmNavigation,
  hasUnsavedChanges,
} from "@/lib/confirm.ts";
import { navigate } from "@/lib/navigation.ts";
const route = ref<Route>(routeFromLocation());
const account = ref<Account | null>(null),
  pending = ref(false),
  hubs = ref<Hub[]>([]),
  loading = ref(true),
  error = ref("");
const activeHub = computed(() => {
  const current = route.value;
  return "hub" in current
    ? hubs.value.find((h) => h.slug === current.hub || h.hub === current.hub)
    : undefined;
});
const isHubPage = computed(() => "hub" in route.value);
const canManageHub = ref(false);
async function load() {
  canManageHub.value = false;
  try {
    const [accountResult, hubResult] = await Promise.allSettled([
      AccountsApi.current(),
      HubsApi.list(),
    ]);
    if (accountResult.status === "fulfilled") {
      account.value = accountResult.value.account;
      pending.value = accountResult.value.pending;
    }
    if (hubResult.status === "fulfilled") {
      hubs.value = hubResult.value.hubs;
      const currentRoute = route.value;
      if ("hub" in currentRoute) {
        const byId = hubResult.value.hubs.find(
          (h) => h.hub === currentRoute.hub,
        );
        if (byId && currentRoute.hub !== byId.slug) {
          const segments = window.location.pathname.split("/");
          const index = segments.findIndex(Boolean);
          if (index >= 0) segments[index] = encodeURIComponent(byId.slug);
          history.replaceState(
            null,
            "",
            segments.join("/") + window.location.search + window.location.hash,
          );
          lastPath = window.location.pathname;
          route.value = { ...currentRoute, hub: byId.slug };
        }
      }
    } else error.value = "Hub directory is temporarily unavailable.";
    const currentHub = activeHub.value;
    if (account.value && currentHub) {
      try {
        canManageHub.value = (await HubsApi.access(currentHub.hub)).canManage;
      } catch {
        error.value =
          "Could not verify hub permissions. Creator-only controls are hidden.";
      }
    }
    if (
      currentHub &&
      (route.value.kind === "article" || route.value.kind === "article-edit")
    ) {
      const articleRoute = route.value;
      try {
        const rows = (await HubsApi.browse(currentHub.hub)).documents;
        const found = rows.find(
          (row) =>
            row.document === articleRoute.document ||
            row.title === articleRoute.document,
        );
        if (found) {
          route.value = { ...articleRoute, document: found.document };
          if (articleRoute.document !== found.title) {
            const segments = window.location.pathname.split("/");
            const index = segments.findIndex(Boolean);
            if (index >= 0 && segments[index + 1] !== undefined)
              segments[index + 1] = encodeURIComponent(found.title);
            history.replaceState(
              null,
              "",
              segments.join("/") +
                window.location.search +
                window.location.hash,
            );
            lastPath = window.location.pathname;
          }
        }
      } catch {
        /* The reader/editor reports the progress or access refusal. */
      }
    }
  } finally {
    loading.value = false;
  }
}
function refreshPage() {
  void load();
}
async function logout() {
  if (!(await confirmNavigation())) return;
  try {
    await AccountsApi.logout();
    account.value = null;
    location.href = "/";
  } catch (e) {
    error.value = e instanceof Error ? e.message : "Logout failed";
  }
}
let lastPath = window.location.pathname;
let popGuard = false;
async function syncRoute() {
  loading.value = true;
  error.value = "";
  route.value = routeFromLocation();
  lastPath = window.location.pathname;
  await load();
}
function syncReplacedRoute() {
  route.value = routeFromLocation();
  lastPath = window.location.pathname;
}
async function initialRoute() {
  if (route.value.kind === "article-edit") {
    const accepted = await askConfirmation({
      title: "Spoiler warning",
      message:
        "The editor shows the complete article, including content beyond your reading progress.",
      confirmLabel: "Continue editing",
      cancelLabel: "Cancel",
    });
    if (!accepted) {
      history.replaceState(
        null,
        "",
        window.location.pathname.replace(/\/edit$/, ""),
      );
      route.value = routeFromLocation();
      lastPath = window.location.pathname;
    }
  }
  await load();
}
function onClick(event: MouseEvent) {
  const target = event.target;
  if (!(target instanceof Element)) return;
  const anchor = target.closest("a[href]") as HTMLAnchorElement | null;
  if (
    !anchor ||
    anchor.target ||
    event.defaultPrevented ||
    event.button !== 0 ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey
  )
    return;
  const url = new URL(anchor.href, location.href);
  if (url.origin !== location.origin || url.pathname.startsWith("/api/"))
    return;
  event.preventDefault();
  void navigate(url.pathname + url.search + url.hash);
}
async function onPopState() {
  if (popGuard) {
    popGuard = false;
    void syncRoute();
    return;
  }
  const target = window.location.pathname;
  const destination = routeFromLocation();
  if (hasUnsavedChanges()) {
    history.pushState(null, "", lastPath);
    const accepted = await confirmNavigation();
    if (accepted) {
      popGuard = true;
      history.go(-1);
    }
    return;
  }
  if (destination.kind === "article-edit") {
    const accepted = await askConfirmation({
      title: "Spoiler warning",
      message:
        "The editor shows the complete article, including content beyond your reading progress.",
      confirmLabel: "Continue editing",
      cancelLabel: "Cancel",
    });
    if (!accepted) {
      history.go(1);
      return;
    }
  }
  loading.value = true;
  error.value = "";
  lastPath = target;
  route.value = destination;
  await load();
}
onMounted(() => {
  document.addEventListener("click", onClick);
  window.addEventListener("wikiplotter:navigate", syncRoute);
  window.addEventListener("wikiplotter:replace-route", syncReplacedRoute);
  window.addEventListener("popstate", onPopState);
  void initialRoute();
});
onUnmounted(() => {
  document.removeEventListener("click", onClick);
  window.removeEventListener("wikiplotter:navigate", syncRoute);
  window.removeEventListener("wikiplotter:replace-route", syncReplacedRoute);
  window.removeEventListener("popstate", onPopState);
});
</script>
<template>
  <div class="site-shell">
    <GlobalHeader :account="account" @logout="logout" />
    <template v-if="!loading && isHubPage && activeHub"
      ><HubChrome
        :key="activeHub.hub"
        :hub="activeHub.hub"
        :name="activeHub.name"
        :can-manage="canManageHub"
        @changed="refreshPage"
    /></template>
    <p v-if="error" class="global-error" role="alert">{{ error }}</p>
    <div v-if="loading" class="loading-screen">Loading Wikiplotter…</div>
    <template v-else>
      <HomePage
        v-if="route.kind === 'home'"
        :hubs="hubs"
        :signed-in="!!account"
      />
      <SignInPage v-else-if="route.kind === 'login'" />
      <RegisterPage v-else-if="route.kind === 'register'" :pending="pending" />
      <AccountPage
        v-else-if="route.kind === 'account-settings' && account"
        :account="account"
        tab="settings"
      />
      <AccountPage
        v-else-if="route.kind === 'account-data' && account"
        :account="account"
        tab="data"
      />
      <MediaLibrary v-else-if="route.kind === 'media-library' && account" />
      <MediaPreview
        v-else-if="route.kind === 'media-preview' && account"
        :asset="route.asset"
      />
      <template v-else-if="activeHub"
        ><main class="hub-content center-container">
          <HubWelcome
            v-if="route.kind === 'welcome'"
            :hub="activeHub.hub"
            :name="activeHub.name"
          />
          <HubHome
            v-else-if="route.kind === 'hub'"
            :hub="activeHub.hub"
            :hub-name="activeHub.name"
            :signed-in="!!account"
          />
          <HubSettings
            v-else-if="route.kind === 'hub-settings' && canManageHub"
            :hub="activeHub.hub"
            :slug="activeHub.slug"
            :name="activeHub.name"
          />
          <ArticleReader
            v-else-if="route.kind === 'article'"
            :hub="activeHub.hub"
            :hub-name="activeHub.name"
            :document="route.document"
            :signed-in="!!account"
            :can-delete="canManageHub"
          />
          <ArticleEditor
            v-else-if="route.kind === 'article-new' && account"
            :hub="activeHub.hub"
            :hub-name="activeHub.name"
          />
          <ArticleEditor
            v-else-if="route.kind === 'article-edit' && account"
            :hub="activeHub.hub"
            :hub-name="activeHub.name"
            :document="route.document"
          />
          <section
            v-else-if="route.kind === 'hub-settings'"
            class="panel content-panel"
          >
            <h1>Hub settings unavailable</h1>
            <p v-if="!account">Sign in to manage a hub you created.</p>
            <p v-else>Only the original hub creator can manage this hub.</p>
            <a :href="account ? '/' : '/login'">{{
              account ? "Browse hubs" : "Log in"
            }}</a>
          </section>
          <section v-else class="panel content-panel">
            <h1>Sign in required</h1>
            <p>Sign in to manage this resource.</p>
            <a href="/login">Log in</a>
          </section>
        </main></template
      >
      <main v-else class="center-container">
        <section class="panel content-panel">
          <h1>{{ isHubPage ? "Hub not found" : "Sign in required" }}</h1>
          <a :href="isHubPage ? '/' : '/login'">{{
            isHubPage ? "Browse hubs" : "Log in"
          }}</a>
        </section>
      </main>
    </template>
  </div>
  <ConfirmationDialog />
</template>
