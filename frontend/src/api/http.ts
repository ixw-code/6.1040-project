export async function postJson<T>(path: string, input: object = {}): Promise<T> {
  const response = await fetch(`/api${path}`, {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input),
  });
  const body = await response.json() as T & { error?: string };
  if (!response.ok || body.error) throw new Error(body.error ?? 'REQUEST_FAILED');
  return body;
}

export async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(path, { credentials: 'same-origin' });
  const body = await response.json() as T & { error?: string };
  if (!response.ok || body.error) throw new Error(body.error ?? 'REQUEST_FAILED');
  return body;
}

export async function postBytes(path: string, input: object): Promise<{
  bytes: ArrayBuffer;
  contentType: string;
}> {
  const response = await fetch(`/api${path}`, {
    method: 'POST', credentials: 'same-origin',
    headers: { 'content-type': 'application/json' }, body: JSON.stringify(input),
  });
  if (!response.ok) {
    let error = 'REQUEST_FAILED';
    try { error = (await response.json() as { error?: string }).error ?? error; } catch { /* Keep fallback. */ }
    throw new Error(error);
  }
  return { bytes: await response.arrayBuffer(), contentType: response.headers.get('content-type') ?? 'application/octet-stream' };
}
