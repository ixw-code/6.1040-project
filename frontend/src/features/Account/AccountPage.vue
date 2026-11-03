<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { AccountsApi, type Account } from "@/api/Accounts.ts";
import {
  HubsApi,
  selectedCheckpointLabel,
} from "@/api/Hubs.ts";
import { ReaderProgressApi } from "@/api/ReaderProgress.ts";
import { MediaAssetsApi, type Asset } from "@/api/MediaAssets.ts";
import { hubUrl } from "@/lib/routes.ts";
import DeleteAccountDialog from "./DeleteAccountDialog.vue";
import ReaderProgressControl from "@/components/ReaderProgressControl.vue";
import MediaThumbnail from "@/features/Media/MediaThumbnail.vue";
const props = defineProps<{ account: Account; tab: "settings" | "data" }>();
const username = ref(props.account.username),
  editing = ref(false),
  busy = ref(false),
  error = ref(""),
  success = ref("");
const reading = ref<{
    hub: string;
    name: string;
    checkpoint: string | null;
    checkpointLabel: string | null;
  }[]>(
    [],
  ),
  uploads = ref<Asset[]>([]);
const accountMediaPreview = computed(() => uploads.value.slice(0, 4));
const deleteDialogOpen = ref(false);
onMounted(async () => {
  if (props.tab === "data") {
    try {
      const hubs = await HubsApi.list();
      reading.value = (
        await Promise.all(
          hubs.hubs.map(async (hub) => {
            const [progress, sequence] = await Promise.all([
              ReaderProgressApi.get(hub.hub),
              HubsApi.checkpoints(hub.hub),
            ]);
            const checkpoint = progress.checkpoint;
            return {
              hub: hub.hub,
              name: hub.name,
              checkpoint,
              checkpointLabel: selectedCheckpointLabel(
                checkpoint,
                sequence.checkpoints,
              ),
            };
          }),
        )
      ).filter((row) => row.checkpoint !== null);
      uploads.value = await MediaAssetsApi.list();
    } catch (e) {
      error.value =
        e instanceof Error ? e.message : "Could not load account data";
    }
  }
});
function updateProgress(hub: string, progress: { checkpoint: string; label: string | null }) {
  const entry = reading.value.find((row) => row.hub === hub);
  if (!entry) return;
  entry.checkpoint = progress.checkpoint;
  entry.checkpointLabel = progress.label;
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
function accountDeleted() {
  window.location.assign("/");
}
</script>
<template>
  <main class="center-container">
    <section class="panel content-panel account-panel">
      <h1>Settings</h1>
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
        <section class="account-settings-section">
          <h2>Security</h2>
          <div class="setting-row account-delete-row">
            <div>
              <p class="muted">Permanently remove your account and its associated data and media.</p>
            </div>
            <button class="danger" @click="deleteDialogOpen = true">Delete Account</button>
          </div>
        </section>
        <div class="account-settings-actions">
          <button class="button-outline" @click="logout">Log out</button>
        </div>
      </template
      ><template v-else
        ><h2>Reading progress</h2>
        <p v-if="!reading.length" class="muted">No saved hub progress yet.</p>
        <div class="reading-progress-list" aria-label="Saved reading progress">
          <div v-for="hub in reading" :key="hub.hub" class="data-row">
            <a :href="hubUrl(hub.hub)">{{ hub.name }}</a>
            <span class="muted">{{ hub.checkpointLabel ?? "Checkpoint unavailable" }}</span>
            <ReaderProgressControl
              :hub="hub.hub"
              :name="hub.name"
              :checkpoint="hub.checkpoint"
              reload-page-after-clear
              @changed="updateProgress(hub.hub, $event)"
            />
          </div>
        </div>
        <h2>Authored articles</h2>
        <p class="muted">
          An authored-article index is not exposed by the current backend. You
          can manage your articles from their hub pages.
        </p>
        <h2>Uploaded media</h2>
        <p v-if="!uploads.length" class="muted">No media uploaded yet.</p>
        <div v-else class="account-media-list" aria-label="Uploaded media preview">
          <div v-for="asset in accountMediaPreview" :key="asset.asset" class="account-media-row">
            <MediaThumbnail :asset="asset" size="small" />
            <span class="account-media-filename" :title="asset.filename">{{ asset.filename }}</span>
            <span class="muted small">{{ asset.kind }}</span>
          </div>
        </div>
        <p class="account-media-view-all"><a class="account-media-view-all-link" href="/assets">View All</a></p>
      </template>
    </section>
  </main>
  <DeleteAccountDialog v-if="deleteDialogOpen" @close="deleteDialogOpen = false" @deleted="accountDeleted" />
</template>
