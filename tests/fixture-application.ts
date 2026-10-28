import type { Db } from 'mongodb';
import { createGateway } from '@mit-sdg/sync-engine/boundary';
import { assembleWikiplotter } from '@/assembly/assembly.ts';
import { HubCataloguingConcept } from '@/concepts/HubCataloguing/HubCataloguing.ts';
import { CheckpointingConcept } from '@/concepts/Checkpointing/Checkpointing.ts';
import { DocumentingConcept } from '@/concepts/Documenting/Documenting.ts';
import { RequirementTaggingConcept } from '@/concepts/RequirementTagging/RequirementTagging.ts';

/** Fixture operations intentionally bypass public authoring, then exercise the real reader gateway. */
export function createApplication(db: Db) {
  const application = assembleWikiplotter(db);
  const reader = createGateway({ application });
  const hubs = new HubCataloguingConcept(db);
  const checkpoints = new CheckpointingConcept(db);
  const documents = new DocumentingConcept(db);
  const rules = new RequirementTaggingConcept(db);
  const gateway = {
    async invoke(path: string, rawInput: object): Promise<any> {
      const input = rawInput as Record<string, unknown>;
      try {
        if (path === '/hubs/create') {
          const { hub } = await hubs.create({ name: input.name as string, creator: 'fixture-user' });
          const { sequence } = await checkpoints.create({ scope: hub, label: input.label as string });
          await checkpoints.append({ sequence, label: input.label as string });
          return { ok: true, value: { hub, sequence } };
        }
        if (path === '/checkpoints/list') {
          const sequence = (await checkpoints._sequences({ scope: input.hub as string }))[0]?.sequence;
          return { ok: true, value: { sequence, checkpoints: sequence ?
            await checkpoints._checkpoints({ scope: input.hub as string, sequence }) : [] } };
        }
        if (path === '/checkpoints/append') return { ok: true, value: await checkpoints.append({
          sequence: input.sequence as string, label: input.label as string }) };
        if (path === '/fixtures/articles/create') {
          const { document } = await documents.create({ scope: input.hub as string, author: 'fixture-user',
            title: input.title as string, blocks: input.blocks as Parameters<typeof documents.create>[0]['blocks'] });
          return { ok: true, value: { document, blocks: await documents._blocks({ scope: input.hub as string, document }) } };
        }
        if (path === '/fixtures/requirements/tag') return { ok: true, value: await rules.tag({
          item: input.item as string, required: input.required as string[] }) };
        return reader.invoke(path, input);
      } catch (error) { return { ok: false, error: { kind: 'domain', value: error instanceof Error ? error.name : 'ERROR' } }; }
    },
  };
  return { application, gateway };
}
