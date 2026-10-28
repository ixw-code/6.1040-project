/** Frontend visibility only. Backend authorization remains authoritative. */
export type HubOwnership = { creator?: string | null };

export function mayEditArticle(signedIn: boolean): boolean {
  return signedIn;
}

export function isHubCreator(user: string | undefined, hub: HubOwnership | undefined): boolean {
  return !!user && !!hub?.creator && hub.creator === user;
}

/** Deleting an article and managing its hub are creator-only in the current Beta design. */
export const mayDeleteArticle = isHubCreator;
