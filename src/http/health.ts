export type HttpHandler = (request: Request) => Response | Promise<Response>;

/** Process liveness is independent of MongoDB and authentication state. */
export function healthResponse(request: Request): Response | undefined {
  if (new URL(request.url).pathname !== '/health') return undefined;
  if (request.method !== 'GET') {
    return Response.json({ error: 'METHOD_NOT_ALLOWED' }, {
      status: 405,
      headers: { allow: 'GET', 'cache-control': 'no-store' },
    });
  }
  return Response.json({ status: 'ok' }, { headers: { 'cache-control': 'no-store' } });
}

/** Apply the public health route before any application or fallback handler. */
export function withHealthCheck(next: HttpHandler): HttpHandler {
  return (request) => healthResponse(request) ?? next(request);
}
