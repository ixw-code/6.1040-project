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
export const hubUrl = (hub: string) => `/${part(slugByHub.get(hub) ?? hub)}`;
export const welcomeUrl = (hub: string) => `${hubUrl(hub)}/welcome`;
export const settingsUrl = (hub: string) => `${hubUrl(hub)}/settings`;
export const articleUrl = (hub: string, document: string) =>
  `${hubUrl(hub)}/${part(articleTitleById.get(articleMapKey(hub, document)) ?? document)}`;
export const editUrl = (hub: string, document: string) => `${articleUrl(hub, document)}/edit`;
export const newArticleUrl = (hub: string) => `${hubUrl(hub)}/articles/new`;
export const assetUrl = (asset: string) => `/assets/${part(asset)}`;
export function routeFromLocation(): Route {
  let path = window.location.pathname;
  try {
    const legacy = window.location.hash.slice(1).split('/').filter(Boolean).map(decodeURIComponent);
    if (legacy[0] === 'hub' && legacy[1]) {
      path = legacy[2] === 'document' && legacy[3] ? articleUrl(legacy[1], legacy[3]) :
        legacy[2] === 'manage' ? settingsUrl(legacy[1]) : hubUrl(legacy[1]);
      history.replaceState(null, '', path);
    }
    const segments = path.split('/').filter(Boolean).map(decodeURIComponent);
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
