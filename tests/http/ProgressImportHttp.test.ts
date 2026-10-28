import { describe, expect, test } from 'bun:test';
import { createReaderHttpHandler } from '@/http/edge.ts';
import { createApplication } from '@tests/fixture-application.ts';
import { createCookieSealer } from '@/auth/sealed-cookie.ts';
import { RegisteringConcept } from '@/concepts/Registering/Registering.ts';
import { ProgressRecordingConcept } from '@/concepts/ProgressRecording/ProgressRecording.ts';
import { useMongoTestDb } from '@tests/mongo-test-db.ts';

describe('login progress synchronization', () => {
  const mongo = useMongoTestDb();
  const origin = 'http://localhost:3000';
  const key = Buffer.alloc(32, 8);

  test('imports only absent account hubs after verified login and clears guest cookie', async () => {
    const app = createApplication(mongo.db()).gateway;
    async function hub(name: string) {
      const created = await app.invoke('/hubs/create', { name, label: 'First' });
      if (!created.ok) throw Error('hub');
      const id = (created.value as { hub: string }).hub;
      const listed = await app.invoke('/checkpoints/list', { hub: id });
      if (!listed.ok) throw Error('checkpoints');
      const [start, first] = (listed.value as { checkpoints: { checkpoint: string }[] }).checkpoints;
      return { id, start: start!.checkpoint, first: first!.checkpoint };
    }
    const existing = await hub('Existing');
    const imported = await hub('Imported');
    const { user } = await new RegisteringConcept(mongo.db()).register({
      username: 'Reader', provider: 'GOOGLE', providerSubject: 'verified-subject',
    });
    const progress = new ProgressRecordingConcept(mongo.db());
    await progress.record({ scope: existing.id, reader: user, checkpoint: existing.start });
    const guest = createCookieSealer(key).seal({ progress: {
      [existing.id]: existing.first, [imported.id]: imported.first, missing: 'invalid',
    } }, 86400000);
    const server = Bun.serve({ hostname: '127.0.0.1', port: 0,
      fetch: createReaderHttpHandler(mongo.db(), { origin, cookieKey: key, providers: { GOOGLE: {
        kind: 'GOOGLE', authorize: ({ state }) => `https://id.example/?state=${state}`,
        redeem: async () => 'verified-subject',
      } } }),
    });
    try {
      const start = await fetch(`http://127.0.0.1:${server.port}/api/accounts/login?provider=GOOGLE`, { redirect: 'manual' });
      const flow = start.headers.getSetCookie().find((row) => row.startsWith('__Host-wikiplotter_flow='))!.split(';')[0]!;
      const state = new URL(start.headers.get('location')!).searchParams.get('state');
      const login = await fetch(`http://127.0.0.1:${server.port}/auth/google/callback?code=ok&state=${state}`, {
        redirect: 'manual', headers: { cookie: `${flow}; __Host-wikiplotter_progress=${guest}` },
      });
      expect(login.status).toBe(303);
      expect(login.headers.getSetCookie().some((row) => row.startsWith('__Host-wikiplotter_progress=;') &&
        row.includes('Max-Age=0'))).toBe(true);
      expect(await progress._checkpoint({ scope: existing.id, reader: user })).toEqual([{ checkpoint: existing.start }]);
      expect(await progress._checkpoint({ scope: imported.id, reader: user })).toEqual([{ checkpoint: imported.first }]);
      expect(await progress._checkpoint({ scope: 'missing', reader: user })).toEqual([]);
    } finally { server.stop(); }
  });
});
