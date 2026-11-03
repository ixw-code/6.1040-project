export function hubDeleteConfirmationMatches(confirmation: string, hubName: string): boolean {
  return hubName.length > 0 && confirmation === hubName;
}
