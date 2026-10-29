import { describe, expect, test } from 'bun:test';
import { notStartedCheckpoint, requirementCheckpointValue, selectedCheckpointLabel, type CheckpointRow } from '../src/api/Hubs.ts';
import { needsProgressSelection } from '../src/api/ReaderProgress.ts';

const sequence: CheckpointRow[] = [
  { checkpoint: 'chapter-1', label: 'Chapter 1', position: 1 },
  { checkpoint: 'not-started', label: 'NotStarted', position: 0 },
  { checkpoint: 'chapter-2', label: 'Chapter 2', position: 2 },
];

describe('checkpoint UI values', () => {
  test('uses position zero NotStarted as the baseline, independent of array order', () => {
    expect(notStartedCheckpoint(sequence)).toBe('not-started');
    expect(notStartedCheckpoint([])).toBeUndefined();
  });

  test('maps empty article rules to the NotStarted baseline without changing stored rules', () => {
    expect(requirementCheckpointValue([], sequence)).toBe('not-started');
    expect(requirementCheckpointValue(['chapter-2'], sequence)).toBe('chapter-2');
  });

  test('distinguishes missing progress from a real NotStarted selection', () => {
    expect(needsProgressSelection(null)).toBe(true);
    expect(needsProgressSelection('not-started')).toBe(false);
  });

  test('shows the label belonging to the saved checkpoint selection', () => {
    expect(selectedCheckpointLabel('chapter-1', sequence)).toBe('Chapter 1');
    expect(selectedCheckpointLabel(null, sequence)).toBeNull();
    expect(selectedCheckpointLabel('unknown', sequence)).toBeNull();
  });
});
