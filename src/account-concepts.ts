import { conceptSet } from '@mit-sdg/sync-engine/assembly';
import { registration as Registering } from '@/concepts/Registering/registry.ts';
import { registration as Sessioning } from '@/concepts/Sessioning/registry.ts';

export const accountConceptSet = conceptSet({ Registering, Sessioning });
export const { concepts } = accountConceptSet;
