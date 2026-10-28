import { askConfirmation, confirmNavigation } from '@/lib/confirm.ts';
import { routeFromPath } from '@/lib/routes.ts';

export async function navigate(path: string, replace = false): Promise<boolean> {
  const next = routeFromPath(path);
  if (!await confirmNavigation()) return false;
  if (next.kind === 'article-edit') {
    const accepted = await askConfirmation({ title: 'Spoiler warning',
      message: 'The editor shows the complete article, including content beyond your reading progress.',
      confirmLabel: 'Continue editing', cancelLabel: 'Cancel' });
    if (!accepted) return false;
  }
  if (replace) history.replaceState(null, '', path);
  else history.pushState(null, '', path);
  window.dispatchEvent(new Event('wikiplotter:navigate'));
  return true;
}
