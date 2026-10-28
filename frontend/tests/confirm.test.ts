import { describe, expect, test } from 'bun:test';
import { answerConfirmation, askConfirmation, confirmationState, confirmAndRun, hasChanged } from '../src/lib/confirm.ts';

describe('confirmation state', () => {
  test('distinguishes saved and unsaved editor snapshots', () => {
    expect(hasChanged('saved', 'saved')).toBe(false);
    expect(hasChanged('saved', 'edited')).toBe(true);
  });

  test('resolves Cancel and Continue/Delete outcomes explicitly', async () => {
    const canceled = askConfirmation({ title: 'Delete?', message: 'Irreversible', confirmLabel: 'Delete', cancelLabel: 'Cancel' });
    expect(confirmationState().value?.cancelLabel).toBe('Cancel');
    answerConfirmation(false);
    expect(await canceled).toBe(false);

    const continued = askConfirmation({ title: 'Spoiler warning', message: 'Full article', confirmLabel: 'Continue editing', cancelLabel: 'Cancel' });
    answerConfirmation(true);
    expect(await continued).toBe(true);
  });

  test('cancelling a destructive confirmation never runs the deletion action', async () => {
    let deleted = false;
    const attempt = confirmAndRun({ title: 'Delete?', message: 'Irreversible', confirmLabel: 'Delete', cancelLabel: 'Cancel' }, () => { deleted = true; });
    answerConfirmation(false);
    expect(await attempt).toBe(false);
    expect(deleted).toBe(false);
  });
});
