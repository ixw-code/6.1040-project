export type ProgressCheckpoint = { checkpoint: string; position: number };

export function isProgressAdvance(
  checkpoints: ProgressCheckpoint[],
  current: string | null,
  next: string,
): boolean {
  const nextPosition = checkpoints.find((row) => row.checkpoint === next)?.position;
  if (nextPosition === undefined) return false;
  const baselinePosition = current === null
    ? checkpoints.find((row) => row.position === 0)?.position ?? -1
    : checkpoints.find((row) => row.checkpoint === current)?.position ?? -1;
  return nextPosition > baselinePosition;
}
