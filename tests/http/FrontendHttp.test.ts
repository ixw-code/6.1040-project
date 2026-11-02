import { afterEach, describe, expect, test } from 'bun:test';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { createFrontendHandler } from '@/http/frontend.ts';

describe('built frontend HTTP handler', () => {
  const roots: string[] = [];

  afterEach(async () => {
    await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
  });

  async function frontend(files: Record<string, string> = {}) {
    const root = await mkdtemp(join(tmpdir(), 'wikiplotter-frontend-'));
    roots.push(root);
    for (const [path, contents] of Object.entries(files)) {
      const target = resolve(root, path);
      await mkdir(dirname(target), { recursive: true });
      await writeFile(target, contents);
    }
    return { root, handler: createFrontendHandler(root) };
  }

  test('serves built files and falls back to index.html for browser routes', async () => {
    const { handler } = await frontend({
      'index.html': '<main>Wikiplotter</main>',
      'assets/app.js': 'console.log("built")',
    });

    const home = await handler(new Request('http://localhost/', {
      headers: { accept: 'text/html' },
    }));
    expect(home?.status).toBe(200);
    expect(await home?.text()).toBe('<main>Wikiplotter</main>');

    const route = await handler(new Request('http://localhost/hub/article', {
      headers: { accept: 'text/html' },
    }));
    expect(await route?.text()).toBe('<main>Wikiplotter</main>');

    const asset = await handler(new Request('http://localhost/assets/app.js'));
    expect(await asset?.text()).toBe('console.log("built")');
  });

  test('leaves API, auth, and non-GET requests for their existing handlers', async () => {
    const { handler } = await frontend({ 'index.html': '<main>Wikiplotter</main>' });
    for (const path of ['/api/hubs/list', '/auth/google/callback']) {
      expect(await handler(new Request(`http://localhost${path}`, {
        headers: { accept: 'text/html' },
      }))).toBeUndefined();
    }
    expect(await handler(new Request('http://localhost/', { method: 'POST' }))).toBeUndefined();
  });

  test('rejects traversal and malformed paths, and does not serve an absent build', async () => {
    const { handler } = await frontend({ 'index.html': '<main>Wikiplotter</main>' });
    expect((await handler(new Request('http://localhost/%2e%2e%2fsecret')))!.status).toBe(404);
    expect((await handler(new Request('http://localhost/%zz')))!.status).toBe(400);
    expect(await handler(new Request('http://localhost/missing.js'))).toBeUndefined();

    const empty = await frontend();
    expect(await empty.handler(new Request('http://localhost/', {
      headers: { accept: 'text/html' },
    }))).toBeUndefined();
  });
});
