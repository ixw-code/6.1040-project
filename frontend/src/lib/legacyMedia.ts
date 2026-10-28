/** Alpha stored IMAGE block bodies as URLs or self-contained data URLs, not asset IDs.
 * Only use this for blocks already returned by spoiler-filtered Reading endpoints. */
export function legacyMediaSource(body: string): string | undefined {
  if (/^data:image\/(?:png|jpeg|webp|gif|svg\+xml)[;,]/i.test(body)) return body;
  if (/^https?:\/\//i.test(body) || body.startsWith('/')) return body;
  return undefined;
}
