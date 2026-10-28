export type Route =
  | { kind: 'home' | 'login' | 'register' | 'account-settings' | 'account-data' | 'media-library' | 'not-found' }
  | { kind: 'media-preview'; asset: string }
  | { kind: 'hub' | 'welcome' | 'hub-settings' | 'article-new'; hub: string }
  | { kind: 'article' | 'article-edit'; hub: string; document: string };

const part = (id: string) => encodeURIComponent(id);
const slugByHub = new Map<string, string>();
const articleTitleById = new Map<string, string>();
const articleMapKey = (hub: string, document: string) => `${hub}\u0000${document}`;
export function rememberHubDirectory(hubs: { hub: string; slug: string }[]) {
  slugByHub.clear();
  for (const hub of hubs) slugByHub.set(hub.hub, hub.slug);
}
export function rememberHubSlug(hub: string, slug: string) { slugByHub.set(hub, slug); }
export function rememberArticleDirectory(hub: string, documents: { document: string; title: string }[]) {
  for (const row of documents) articleTitleById.set(articleMapKey(hub, row.document), row.title);
}
export function rememberArticleTitle(hub: string, document: string, title: string) {
  articleTitleById.set(articleMapKey(hub, document), title);
}
export const hubUrl = (hub: string) => {
  const slug = slugByHub.get(hub);
  if (!slug) throw new Error(`No backend-resolved slug is available for hub ${hub}`);
  return `/${part(slug)}`;
};
export const welcomeUrl = (hub: string) => `${hubUrl(hub)}/welcome`;
export const settingsUrl = (hub: string) => `${hubUrl(hub)}/settings`;
export const articleUrl = (hub: string, document: string, knownTitle?: string) => {
  const title = knownTitle ?? articleTitleById.get(articleMapKey(hub, document));
  if (!title) throw new Error(`No readable title is available for article ${document}`);
  return `${hubUrl(hub)}/${part(title)}`;
};
export const editUrl = (hub: string, document: string, knownTitle?: string) => `${articleUrl(hub, document, knownTitle)}/edit`;
export const newArticleUrl = (hub: string) => `${hubUrl(hub)}/articles/new`;
export const assetUrl = (asset: string) => `/assets/${part(asset)}`;
export function routeFromPath(path: string): Route {
  try {
    // `navigate()` receives pathname + search + hash. These are not route segments.
    const pathname = new URL(path, 'http://wikiplotter.local').pathname;
    const segments = pathname.split('/').filter(Boolean).map(decodeURIComponent);
    if (!segments.length) return { kind: 'home' };
    if (segments.length === 1 && segments[0] === 'login') return { kind: 'login' };
    if (segments.length === 1 && segments[0] === 'register') return { kind: 'register' };
    if (segments[0] === 'account' && segments[1] === 'settings') return { kind: 'account-settings' };
    if (segments[0] === 'account' && segments[1] === 'data') return { kind: 'account-data' };
    if (segments.length === 1 && segments[0] === 'assets') return { kind: 'media-library' };
    if (segments.length === 2 && segments[0] === 'assets') return { kind: 'media-preview', asset: segments[1]! };
    const [hub, rest, third, fourth] = segments;
    if (hub && segments.length === 1) return { kind: 'hub', hub };
    if (hub && rest === 'welcome' && segments.length === 2) return { kind: 'welcome', hub };
    if (hub && rest === 'settings' && segments.length === 2) return { kind: 'hub-settings', hub };
    if (hub && rest === 'articles' && third === 'new' && segments.length === 3) return { kind: 'article-new', hub };
    if (hub && rest && segments.length === 2) return { kind: 'article', hub, document: rest };
    if (hub && rest && third === 'edit' && segments.length === 3) return { kind: 'article-edit', hub, document: rest };
  } catch { /* Invalid encoding is not a valid route. */ }
  return { kind: 'not-found' };
}
export function routeFromLocation(): Route {
  const legacy = window.location.hash.slice(1).split('/').filter(Boolean).map((part) => {
    try { return decodeURIComponent(part); } catch { return ''; }
  });
  if (legacy[0] === 'hub' && legacy[1]) {
    const suffix = legacy[2] === 'document' && legacy[3] ? `/${part(legacy[3])}` :
      legacy[2] === 'manage' ? '/settings' : '';
    const path = `/${part(legacy[1])}${suffix}`;
    history.replaceState(null, '', path);
    return routeFromPath(path);
  }
  return routeFromPath(window.location.pathname);
}
export function articleBreadcrumbs(hubName: string, articleName?: string, editing = false): string[] {
  return [hubName, ...(articleName ? [articleName] : []), ...(editing ? ['Editing'] : [])];
}
