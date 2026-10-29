<script setup lang="ts">
import { onMounted, onUnmounted, ref } from "vue";
import type { Account } from "@/api/Accounts.ts";
const props = defineProps<{ account: Account | null }>();
const emit = defineEmits<{ logout: [] }>();
const menu = ref(false);
const profileWrap = ref<HTMLElement | null>(null);
const loginHref = `/login?${new URLSearchParams({ returnTo: `${location.pathname}${location.search}` })}`;
function closeMenu() { menu.value = false; }
function closeOnOutsideClick(event: PointerEvent) {
  if (!profileWrap.value?.contains(event.target as Node)) closeMenu();
}
function logout() {
  closeMenu();
  emit("logout");
}
onMounted(() => {
  document.addEventListener("pointerdown", closeOnOutsideClick);
  window.addEventListener("popstate", closeMenu);
  window.addEventListener("wikiplotter:navigate", closeMenu);
});
onUnmounted(() => {
  document.removeEventListener("pointerdown", closeOnOutsideClick);
  window.removeEventListener("popstate", closeMenu);
  window.removeEventListener("wikiplotter:navigate", closeMenu);
});
</script>
<template>
  <header class="global-header">
    <div class="global-inner">
      <a href="/" class="wordmark">Wikiplotter</a>
      <div ref="profileWrap" class="profile-wrap">
        <button
          v-if="props.account"
          class="profile-icon"
          :aria-expanded="menu"
          aria-label="Open profile menu"
          @click="menu = !menu"
        >
          <svg
            viewBox="0 0 24 24"
            width="21"
            height="21"
            aria-hidden="true"
            fill="none"
            stroke="currentColor"
            stroke-width="1.8"
          >
            <circle cx="12" cy="8" r="4" />
            <path d="M4 21c0-5 3-8 8-8s8 3 8 8" />
          </svg>
        </button>
        <a v-else class="login-link" :href="loginHref">Log in</a>
        <div v-if="menu && props.account" class="profile-menu">
          <div class="profile-name">{{ props.account.username }}</div>
          <a href="/account/settings" @click="closeMenu">Account</a>
          <a href="/account/data" @click="closeMenu">Manage Data</a>
          <div class="profile-menu-separator" role="separator"></div>
          <button @click="logout">Log out</button>
        </div>
      </div>
    </div>
  </header>
</template>
