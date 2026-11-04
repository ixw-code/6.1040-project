<script setup lang="ts">
import { onMounted, onUnmounted, onErrorCaptured, ref, computed } from "vue";
import { HubsApi } from "@/api/Hubs.ts";
import { ArticlesApi } from "@/api/Articles.ts";
import { AccountsApi, type Account } from "@/api/Accounts.ts";
import { ReaderProgressApi } from "@/api/ReaderProgress.ts";
import type { Hub } from "@/api.ts";
import {
  currentReturnPath,
  articleUrl,
  findArticleForRoute,
  findHubForRoute,
  hubCreateUrl,
  hubRouteForProgress,
  loginUrl,
  routeFromLocation,
  settingsUrl,
  welcomeUrl,
  type Route,
} from "@/lib/routes.ts";
import GlobalHeader from "@/components/GlobalHeader.vue";
import HubChrome from "@/components/HubChrome.vue";
import LoadingSpinner from "@/components/LoadingSpinner.vue";
import PageNotFound from "@/pages/NotFound/PageNotFound.vue";
import HomePage from "@/pages/Home/HomePage.vue";
import HubWelcome from "@/pages/Hub/HubWelcome.vue";
import HubHome from "@/pages/Hub/HubHome.vue";
import HubSettings from "@/pages/Hub/HubSettings.vue";
import HubCreatePage from "@/pages/Hub/HubCreatePage.vue";
import ArticleReader from "@/pages/Article/ArticleReader.vue";
import ArticleHiddenPage from "@/pages/Article/ArticleHiddenPage.vue";
import ArticleEditor from "@/pages/Article/ArticleEditor.vue";
import SignInPage from "@/pages/Account/SignInPage.vue";
import RegisterPage from "@/pages/Account/RegisterPage.vue";
import AccountPage from "@/pages/Account/AccountPage.vue";
import MediaLibrary from "@/pages/Media/MediaLibrary.vue";
import MediaPreview from "@/pages/Media/MediaPreview.vue";
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
const accountRequestError = ref(""),
  routeLoadError = ref(""),
  directoryError = ref("");
const initialLoadComplete = ref(false),
  hubDirectoryLoaded = ref(false);
const activeHub = computed(() => {
  const current = route.value;
  return "hub" in current
    ? hubs.value.find((h) => h.slug === current.hub || h.hub === current.hub)
    : undefined;
});
const isHubPage = computed(() => "hub" in route.value && route.value.kind !== "article-hidden");
const requiresAccount = computed(() =>
  [
    "account-settings",
    "account-data",
    "media-library",
    "media-preview",
    "hub-create",
    "hub-settings",
    "article-new",
    "article-edit",
  ].includes(route.value.kind),
);
const canManageHub = ref(false);
const renderFailure = ref("");
const hubProgressError = ref("");
const loadingGeneration = ref(0);
onErrorCaptured((cause) => {
  renderFailure.value = cause instanceof Error ? cause.message : String(cause);
  return false; // Show a visible error instead of losing the route subtree.
});
let loadGeneration = 0;
// A stalled API request must not leave the entire application in its initial state.
function withinDeadline<T>(operation: Promise<T>, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  return Promise.race([
    operation,
    new Promise<T>((_, reject) => {
      timer = setTimeout(
        () =>
          reject(
            new Error(
              `${label} timed out; check the backend and MongoDB connection.`,
            ),
          ),
        10000,
      );
    }),
  ]).finally(() => clearTimeout(timer!));
}
async function load() {
  const generation = ++loadGeneration;
  loadingGeneration.value = generation;
  const shouldLoadHubDirectory = route.value.kind !== "not-found";
  canManageHub.value = false;
  hubProgressError.value = "";
  routeLoadError.value = "";
  try {
    if (route.value.kind == 'home') hubDirectoryLoaded.value = false;
    const [accountResult, hubResult] = await Promise.allSettled([
      withinDeadline(AccountsApi.current(), "Account request"),
      route.value.kind === "not-found"
        ? Promise.resolve({ hubs: hubs.value })
        : withinDeadline(HubsApi.list(), "Hub directory request"),
    ]);
    if (generation !== loadGeneration) return;
    if (accountResult.status === "fulfilled") {
      account.value = accountResult.value.account;
      pending.value = accountResult.value.pending;
      accountRequestError.value = "";
    } else {
      account.value = null;
      accountRequestError.value =
        accountResult.reason instanceof Error
          ? accountResult.reason.message
          : "Account status is unavailable.";
    }
    if (hubResult.status === "fulfilled") {
      hubs.value = hubResult.value.hubs;
      directoryError.value = "";
      if (shouldLoadHubDirectory) hubDirectoryLoaded.value = true;
      const currentRoute = route.value;
      if ("hub" in currentRoute) {
        const byId = findHubForRoute(hubResult.value.hubs, currentRoute.hub);
        if (!byId) {
          route.value = { kind: "not-found" };
        } else if (currentRoute.hub !== byId.slug) {
          const segments = window.location.pathname.split("/");
          const index = segments.findIndex(Boolean);
          if (index >= 0) segments[index] = encodeURIComponent(byId.slug);
          history.replaceState(
            null,
            "",
            segments.join("/") + window.location.search + window.location.hash,
          );
          lastPath = `${window.location.pathname}${window.location.search}${window.location.hash}`;
          route.value = { ...currentRoute, hub: byId.slug };
        }
      }
    } else {
      hubs.value = [];
      const reason =
        hubResult.reason instanceof Error
          ? hubResult.reason.message
          : "Hub directory is temporarily unavailable.";
      error.value = `Hub directory unavailable: ${reason}`;
      directoryError.value = error.value;
      if ("hub" in route.value) routeLoadError.value = error.value;
    }
    if (requiresAccount.value && accountRequestError.value) {
      routeLoadError.value = `Account status unavailable: ${accountRequestError.value}`;
    }
    const currentHub = activeHub.value;
    const currentRoute = route.value;
    if (currentHub && currentRoute.kind === "hub") {
      try {
        const progress = await withinDeadline(
          ReaderProgressApi.get(currentHub.hub),
          "Reading progress request",
        );
        if (generation !== loadGeneration) return;
        const destinationRoute = hubRouteForProgress(
          currentRoute.hub,
          progress.checkpoint,
        );
        if (destinationRoute.kind === "welcome") {
          const destination = welcomeUrl(currentHub.hub);
          history.replaceState(
            null,
            "",
            destination + window.location.search + window.location.hash,
          );
          lastPath = `${window.location.pathname}${window.location.search}${window.location.hash}`;
        }
        route.value = destinationRoute;
      } catch (cause) {
        if (generation !== loadGeneration) return;
        hubProgressError.value =
          cause instanceof Error
            ? cause.message
            : "Could not verify reading progress.";
      }
    }
    if (account.value && currentHub) {
      try {
        const access = await withinDeadline(
          HubsApi.access(currentHub.hub),
          "Hub access request",
        );
        if (generation !== loadGeneration) return;
        canManageHub.value = access.canManage;
      } catch {
        if (generation !== loadGeneration) return;
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
        const rows = (
          await withinDeadline(
            HubsApi.browse(currentHub.hub),
            "Article directory request",
          )
        ).documents;
        if (generation !== loadGeneration) return;
        const found = findArticleForRoute(rows, articleRoute.document);
        if (found) {
          route.value = { ...articleRoute, document: found.document };
          if (articleRoute.document !== found.title) {
            const segments = window.location.pathname.split("/");
            const index = segments.findIndex(Boolean);
            if (index >= 0 && segments[index + 1] !== undefined)
              segments[index + 1] = articleUrl(currentHub.hub, found.document, found.title).split("/").at(-1)!;
            history.replaceState(
              null,
              "",
              segments.join("/") +
                window.location.search +
                window.location.hash,
            );
            lastPath = `${window.location.pathname}${window.location.search}${window.location.hash}`;
          }
        } else if (articleRoute.kind === "article") {
          const result = await ArticlesApi.read(currentHub.hub, articleRoute.document);
          if (generation !== loadGeneration) return;
          if (result.hidden) {
            route.value = { kind: "article-hidden", hub: articleRoute.hub, document: articleRoute.document };
          } else if (result.content) {
            route.value = { ...articleRoute, document: result.content.document };
          } else {
            route.value = { kind: "not-found" };
          }
        }
      } catch (cause) {
        if (generation !== loadGeneration) return;
        const message =
          cause instanceof Error ? cause.message.toUpperCase() : "";
        if (
          message.includes("HUB_NOT_FOUND") ||
          message.includes("HUB NOT FOUND")
        )
          route.value = { kind: "not-found" };
        // Progress redirects and ordinary API failures stay with the route's existing UI.
      }
    }
  } catch (cause) {
    if (generation === loadGeneration)
      error.value = cause instanceof Error ? cause.message : String(cause);
  } finally {
    if (generation === loadGeneration) {
      loading.value = false;
      initialLoadComplete.value = true;
    }
  }
}
function refreshPage() {
  window.location.reload();
}
function showNotFound() {
  route.value = { kind: "not-found" };
  hubProgressError.value = "";
  routeLoadError.value = "";
}
function showArticleHidden(document: string) {
  const current = route.value;
  if (current.kind !== "article" || current.document !== document) return;
  route.value = { ...current, kind: "article-hidden" };
}
function signInHref(returnTo = currentReturnPath()) {
  return loginUrl(returnTo);
}
function retryCurrentRoute() {
  loading.value = true;
  error.value = "";
  routeLoadError.value = "";
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
let lastPath = `${window.location.pathname}${window.location.search}${window.location.hash}`;
let popGuard = false;
async function syncRoute() {
  loading.value = true;
  error.value = "";
  renderFailure.value = "";
  route.value = routeFromLocation();
  lastPath = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  await load();
}
function syncReplacedRoute() {
  renderFailure.value = "";
  route.value = routeFromLocation();
  lastPath = `${window.location.pathname}${window.location.search}${window.location.hash}`;
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
        `${window.location.pathname.replace(/\/edit$/, "")}${window.location.search}${window.location.hash}`,
      );
      route.value = routeFromLocation();
      lastPath = `${window.location.pathname}${window.location.search}${window.location.hash}`;
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
  const target = `${window.location.pathname}${window.location.search}${window.location.hash}`;
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
  renderFailure.value = "";
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
    <template v-if="!loading && !hubProgressError && isHubPage && activeHub"
      ><HubChrome
        :key="activeHub.hub"
        :hub="activeHub.hub"
        :name="activeHub.name"
        :can-manage="canManageHub"
        @changed="refreshPage"
    /></template>
    <p v-if="error && route.kind !== 'home'" class="global-error" role="alert">
      {{ error }}
    </p>
    <main v-if="renderFailure" class="center-container">
      <section class="panel content-panel" role="alert">
        <h1>Page failed to render</h1>
        <p>{{ renderFailure }}</p>
        <p><a href="/">Return to Wikiplotter</a></p>
      </section>
    </main>
    <div
      v-else-if="
        loading &&
        !initialLoadComplete &&
        route.kind !== 'not-found' &&
        route.kind !== 'login'
      "
      class="loading-screen"
    >
      <LoadingSpinner :key="loadingGeneration" :delay="140" />
    </div>
    <HomePage
      v-else-if="route.kind === 'home'"
      :hubs="hubs"
      :signed-in="!!account"
      :directory-loading="loading && !hubDirectoryLoaded"
      :directory-error="directoryError"
      :directory-loading-key="loadingGeneration"
    />
    <PageNotFound v-else-if="route.kind === 'not-found'" />
    <SignInPage v-else-if="route.kind === 'login'" />
    <div v-else-if="loading" class="loading-screen">
      <LoadingSpinner :key="loadingGeneration" :delay="140" />
    </div>
    <main v-else-if="routeLoadError" class="center-container">
      <section class="panel content-panel" role="alert">
        <h1>Could not load this page</h1>
        <p>{{ routeLoadError }}</p>
        <button class="button-outline" @click="retryCurrentRoute">
          Try again
        </button>
      </section>
    </main>
    <main v-else-if="hubProgressError" class="center-container">
      <section class="panel content-panel" role="alert">
        <h1>Could not verify reading progress</h1>
        <p>{{ hubProgressError }}</p>
        <button class="button-outline" @click="retryCurrentRoute">
          Try again
        </button>
      </section>
    </main>
    <template v-else>
      <RegisterPage v-if="route.kind === 'register'" :pending="pending" />
      <main
        v-else-if="
          [
            'account-settings',
            'account-data',
            'media-library',
            'media-preview',
          ].includes(route.kind) && !account
        "
        class="center-container"
      >
        <section class="panel content-panel">
          <h1>Sign in required</h1>
          <p>Sign in to view your account settings and data.</p>
          <a class="primary" :href="signInHref()">Log in</a>
        </section>
      </main>
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
      <HubCreatePage v-else-if="route.kind === 'hub-create' && account" />
      <section
        v-else-if="route.kind === 'hub-create'"
        class="panel content-panel center-container"
      >
        <h1>Sign in to start a hub</h1>
        <p>Hub creation is available to registered users.</p>
        <a class="button-outline" :href="signInHref(hubCreateUrl())">Log in</a>
      </section>
      <ArticleHiddenPage
        v-else-if="route.kind === 'article-hidden' && activeHub"
        :hub="activeHub.hub"
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
            @not-found="showNotFound"
            @hidden="showArticleHidden"
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
            @not-found="showNotFound"
          />
          <section
            v-else-if="route.kind === 'hub-settings'"
            class="panel content-panel"
          >
            <h1>Hub settings unavailable</h1>
            <p v-if="!account">Sign in to manage a hub you created.</p>
            <p v-else>Only the original hub creator can manage this hub.</p>
            <a :href="account ? '/' : signInHref(settingsUrl(activeHub.hub))">{{
              account ? "Browse hubs" : "Log in"
            }}</a>
          </section>
          <section v-else class="panel content-panel">
            <h1>Sign in required</h1>
            <p>Sign in to manage this resource.</p>
            <a :href="signInHref()">Log in</a>
          </section>
        </main></template
      >
      <PageNotFound v-else />
    </template>
  </div>
  <ConfirmationDialog />
</template>
