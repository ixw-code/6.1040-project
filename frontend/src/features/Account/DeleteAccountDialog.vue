<script setup lang="ts">
import { computed, ref } from 'vue';
import { AccountRequestError, AccountsApi } from '@/api/Accounts.ts';
import { confirmationMatches } from './delete-account.ts';

const emit = defineEmits<{ close: []; deleted: [] }>();
const confirmation = ref('');
const busy = ref(false);
const checking = ref(true);
const blocker = ref('');
const error = ref('');
const canDelete = computed(() => confirmationMatches(confirmation.value));

async function checkEligibility() {
  checking.value = true;
  error.value = '';
  try {
    const result = await AccountsApi.checkDeleteEligibility();
    if (!result.eligible) blocker.value = result.message;
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : 'Could not check account deletion eligibility.';
  } finally {
    checking.value = false;
  }
}

async function deleteAccount() {
  if (!canDelete.value || busy.value || blocker.value) return;
  busy.value = true;
  error.value = '';
  try {
    await AccountsApi.delete();
    emit('deleted');
  } catch (cause) {
    if (cause instanceof AccountRequestError && cause.code === 'HUBS_OWNED') {
      blocker.value = cause.message;
    } else {
      error.value = cause instanceof Error ? cause.message : 'Account deletion failed. Please try again.';
    }
  } finally {
    busy.value = false;
  }
}

void checkEligibility();
</script>

<template>
  <div class="confirm-backdrop" role="presentation" @click.self="!busy && emit('close')">
    <section class="confirm-dialog panel delete-account-dialog" role="alertdialog" aria-modal="true" aria-labelledby="delete-account-title">
      <h2 id="delete-account-title">Delete account</h2>
      <template v-if="checking">
        <p role="status">Checking account deletion eligibility…</p>
        <div class="confirm-actions">
          <button class="button-outline" @click="emit('close')">Cancel</button>
        </div>
      </template>
      <template v-else-if="blocker">
        <p role="alert">{{ blocker }}</p>
        <div class="confirm-actions">
          <button class="button-outline" @click="emit('close')">Close</button>
        </div>
      </template>
      <template v-else-if="error">
        <p class="error-text" role="alert">{{ error }}</p>
        <div class="confirm-actions">
          <button class="button-outline" @click="emit('close')">Cancel</button>
          <button class="primary" @click="checkEligibility">Try again</button>
        </div>
      </template>
      <template v-else>
        <p class="delete-consequences">Your account, saved progress, and uploaded media will be permanently deleted. Existing articles will remain, but their media links may no longer work. This cannot be undone.</p>
        <label class="delete-confirmation-label" for="delete-account-confirmation">Type DELETE to confirm.</label>
        <input id="delete-account-confirmation" v-model="confirmation" autocomplete="off" :disabled="busy" />
        <div class="confirm-actions">
          <button class="button-outline" :disabled="busy" @click="emit('close')">Cancel</button>
          <button class="danger" :disabled="!canDelete || busy" @click="deleteAccount">
            {{ busy ? 'Deleting…' : 'Delete account' }}
          </button>
        </div>
      </template>
    </section>
  </div>
</template>
