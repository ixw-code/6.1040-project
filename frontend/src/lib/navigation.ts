import { askConfirmation, confirmNavigation } from '@/lib/confirm.ts';
import { routeFromPath, safeInternalPath } from '@/lib/routes.ts';

export async function navigate(path: string, replace = false): Promise<boolean> {
  if (!await confirmNavigation()) return false;
  return navigateAfterConfirmation(path, replace);
}

export async function navigateAfterConfirmation(path: string, replace = false): Promise<boolean> {
  const destination = safeInternalPath(path);
  const next = routeFromPath(destination);
  if (next.kind === 'article-edit') {
    const accepted = await askConfirmation({ title: 'Spoiler warning',
      message: 'The editor shows the complete article, including content beyond your reading progress.',
      confirmLabel: 'Continue editing', cancelLabel: 'Cancel' });
    if (!accepted) return false;
  }
  if (replace) history.replaceState(null, '', destination);
  else history.pushState(null, '', destination);
  window.dispatchEvent(new Event('wikiplotter:navigate'));
  return true;
}
