<script setup lang="ts">
import { answerConfirmation, confirmationState } from "@/lib/confirm.ts";
const current = confirmationState();
</script>
<template>
  <div
    v-if="current"
    class="confirm-backdrop"
    role="presentation"
    @click.self="answerConfirmation(false)"
  >
    <section
      class="confirm-dialog panel"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
    >
      <h2 id="confirm-title">{{ current.title }}</h2>
      <p>{{ current.message }}</p>
      <div class="confirm-actions">
        <button class="button-outline" @click="answerConfirmation(false)">
          {{ current.cancelLabel }}
        </button>
        <button class="danger" @click="answerConfirmation(true)">
          {{ current.confirmLabel }}
        </button>
      </div>
    </section>
  </div>
</template>
