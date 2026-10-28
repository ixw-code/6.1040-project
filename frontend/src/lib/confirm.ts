import { readonly, ref } from 'vue';

export type Confirmation = { title: string; message: string; confirmLabel: string; cancelLabel: string };
const active = ref<Confirmation | null>(null);
let finish: ((answer: boolean) => void) | undefined;
let dirty: (() => boolean) | undefined;

export function askConfirmation(options: Confirmation): Promise<boolean> {
  if (finish) finish(false);
  active.value = options;
  return new Promise((resolve) => { finish = resolve; });
}

export function answerConfirmation(answer: boolean) {
  const resolve = finish;
  finish = undefined;
  active.value = null;
  resolve?.(answer);
}

export function registerUnsavedChanges(check: () => boolean): () => void {
  dirty = check;
  return () => { if (dirty === check) dirty = undefined; };
}

export function hasUnsavedChanges(): boolean { return dirty?.() ?? false; }
export function hasChanged(before: string, after: string): boolean { return before !== after; }
export function confirmationState() { return readonly(active); }

export async function confirmNavigation(): Promise<boolean> {
  return !hasUnsavedChanges() || askConfirmation({ title: 'Discard unsaved changes?',
    message: 'Your edits have not been saved. Leaving now will discard them.',
    confirmLabel: 'Discard changes', cancelLabel: 'Stay editing' });
}

export async function confirmAndRun(options: Confirmation, action: () => void | Promise<void>): Promise<boolean> {
  if (!await askConfirmation(options)) return false;
  await action();
  return true;
}
