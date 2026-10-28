<script setup lang="ts">
import { onMounted, ref } from "vue";
import { AccountsApi, type Account } from "@/api/Accounts.ts";
import { HubsApi, type CheckpointRow } from "@/api/Hubs.ts";
import { ReaderProgressApi } from "@/api/ReaderProgress.ts";
import { MediaAssetsApi, type Asset } from "@/api/MediaAssets.ts";
import { hubUrl, assetUrl } from "@/lib/routes.ts";
const props = defineProps<{ account: Account; tab: "settings" | "data" }>();
const username = ref(props.account.username),
  editing = ref(false),
  busy = ref(false),
  error = ref(""),
  success = ref("");
const reading = ref<{ hub: string; name: string; checkpoint: string | null }[]>(
    [],
  ),
  uploads = ref<Asset[]>([]);
const activeProgressHub = ref(""),
  progressChoices = ref<CheckpointRow[]>([]),
  progressDraft = ref("");
onMounted(async () => {
  if (props.tab === "data") {
    try {
      const hubs = await HubsApi.list();
      reading.value = (
        await Promise.all(
          hubs.hubs.map(async (hub) => ({
            hub: hub.hub,
            name: hub.name,
            checkpoint: (await ReaderProgressApi.get(hub.hub)).checkpoint,
          })),
        )
      ).filter((row) => row.checkpoint !== null);
      uploads.value = await MediaAssetsApi.list();
    } catch (e) {
      error.value =
        e instanceof Error ? e.message : "Could not load account data";
    }
  }
});
async function manageProgress(hub: string) {
  try {
    activeProgressHub.value = hub;
    progressChoices.value = (await HubsApi.checkpoints(hub)).checkpoints;
    progressDraft.value =
      reading.value.find((row) => row.hub === hub)?.checkpoint ??
      progressChoices.value[0]?.checkpoint ??
      "";
  } catch (e) {
    error.value = e instanceof Error ? e.message : "Cannot load checkpoints";
  }
}
async function changeProgress(clear: boolean) {
  busy.value = true;
  error.value = "";
  try {
    if (clear) await ReaderProgressApi.clear(activeProgressHub.value);
    else
      await ReaderProgressApi.record(
        activeProgressHub.value,
        progressDraft.value,
      );
    const entry = reading.value.find(
      (row) => row.hub === activeProgressHub.value,
    );
    if (entry) entry.checkpoint = clear ? null : progressDraft.value;
    activeProgressHub.value = "";
  } catch (e) {
    error.value = e instanceof Error ? e.message : "Could not update progress";
  } finally {
    busy.value = false;
  }
}
async function updateName() {
  busy.value = true;
  error.value = "";
  try {
    await AccountsApi.setUsername(username.value);
    editing.value = false;
    success.value = "Username updated";
  } catch (e) {
    error.value = e instanceof Error ? e.message : "Username update refused";
  } finally {
    busy.value = false;
  }
}
async function logout() {
  try {
    await AccountsApi.logout();
    location.href = "/";
  } catch (e) {
    error.value = e instanceof Error ? e.message : "Logout failed";
  }
}
</script>
<template>
  <main class="center-container">
    <section class="panel content-panel account-panel">
      <h1>User settings</h1>
      <nav class="tabbar" aria-label="Account settings">
        <a :class="{ chosen: tab === 'settings' }" href="/account/settings"
          >Account</a
        ><a :class="{ chosen: tab === 'data' }" href="/account/data"
          >Manage Data</a
        >
      </nav>
      <p v-if="error" class="error-text">{{ error }}</p>
      <p v-if="success" class="success-text">{{ success }}</p>
      <template v-if="tab === 'settings'"
        ><h2>Basic information</h2>
        <div class="setting-row">
          <span>Username</span
          ><template v-if="editing"
            ><form class="inline-actions" @submit.prevent="updateName">
              <input
                v-model="username"
                minlength="3"
                maxlength="20"
                required
                pattern="[A-Za-z0-9]+"
              /><button class="primary" :disabled="busy">Save</button
              ><button
                class="button-outline"
                type="button"
                @click="editing = false"
              >
                Cancel
              </button>
            </form></template
          ><template v-else
            ><strong>{{ username }}</strong
            ><button class="text-button" @click="editing = true">
              Change
            </button></template
          >
        </div>
        <div class="setting-row">
          <span>Provider</span
          ><input
            :value="account.provider === 'COMMONS' ? 'Commons' : 'Google'"
            disabled
            aria-label="Provider (read only)"
          />
        </div>
        <div class="settings-section">
          <h2>Session</h2>
          <button class="button-outline" @click="logout">Log out</button>
        </div> </template
      ><template v-else
        ><h2>Reading progress</h2>
        <p v-if="!reading.length" class="muted">No saved hub progress yet.</p>
        <div v-for="hub in reading" :key="hub.hub" class="data-row">
          <a :href="hubUrl(hub.hub)">{{ hub.name }}</a
          ><span class="muted">{{
            hub.checkpoint ? "Progress saved" : "Not selected"
          }}</span
          ><button class="text-button" @click="manageProgress(hub.hub)">
            Manage
          </button>
        </div>
        <div v-if="activeProgressHub" class="panel manage-progress">
          <h3>Set reading progress</h3>
          <select v-model="progressDraft">
            <option
              v-for="row in progressChoices"
              :key="row.checkpoint"
              :value="row.checkpoint"
            >
              {{ row.label }}
            </option>
          </select>
          <div class="inline-actions">
            <button
              class="primary"
              :disabled="busy || !progressDraft"
              @click="changeProgress(false)"
            >
              Save</button
            ><button
              class="button-outline"
              :disabled="busy"
              @click="changeProgress(true)"
            >
              Clear</button
            ><button class="text-button" @click="activeProgressHub = ''">
              Cancel
            </button>
          </div>
        </div>
        <h2>Authored articles</h2>
        <p class="muted">
          An authored-article index is not exposed by the current backend. You
          can manage your articles from their hub pages.
        </p>
        <h2>Uploaded media</h2>
        <p v-if="!uploads.length" class="muted">No media uploaded yet.</p>
        <div v-for="asset in uploads" :key="asset.asset" class="data-row">
          <span>{{ asset.filename }}</span
          ><a :href="assetUrl(asset.asset)">Preview</a>
        </div>
        <p><a href="/assets">Manage uploads</a></p>
      </template>
    </section>
  </main>
</template>
