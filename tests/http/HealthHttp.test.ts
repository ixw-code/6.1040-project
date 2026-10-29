import { describe, expect, test } from 'bun:test';
import { withHealthCheck } from '@/http/health.ts';

describe('health HTTP endpoint', () => {
  test('responds publicly before application handling and preserves other routes', async () => {
    let applicationCalls = 0;
    const handler = withHealthCheck((request) => {
      applicationCalls += 1;
      return Response.json({ path: new URL(request.url).pathname });
    });

    const health = await handler(new Request('http://localhost/health'));
    expect(health.status).toBe(200);
    expect(await health.json()).toEqual({ status: 'ok' });
    expect(health.headers.get('cache-control')).toBe('no-store');
    expect(applicationCalls).toBe(0);

    const ordinary = await handler(new Request('http://localhost/api/probe'));
    expect(ordinary.status).toBe(200);
    expect(await ordinary.json()).toEqual({ path: '/api/probe' });
    expect(applicationCalls).toBe(1);

    const unsupportedMethod = await handler(new Request('http://localhost/health', { method: 'POST' }));
    expect(unsupportedMethod.status).toBe(405);
    expect(unsupportedMethod.headers.get('allow')).toBe('GET');
    expect(applicationCalls).toBe(1);
  });
});
