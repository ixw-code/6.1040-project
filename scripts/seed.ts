import type { Db } from 'mongodb';
import { createApplication } from '@/application.ts';
import { connectMongo } from '@/db.ts';

type Gateway = ReturnType<typeof createApplication>['gateway'];
type Block = { kind: 'TEXT' | 'IMAGE'; body: string; alt: string; required: number[] };
type Document = { title: string; required: number[]; blocks: Block[] };
type Hub = { name: string; checkpoints: string[]; documents: Document[] };
type Checkpoint = { checkpoint: string; label: string; position: number };
type StoredDocument = { _id: string; scope: string; title: string; blocks: (Omit<Block, 'required'> & { block: string })[] };

// Self-contained images keep the demo usable without uploads or an external image host.
function illustration(label: string, color: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360"><rect width="640" height="360" fill="${color}"/><circle cx="500" cy="95" r="52" fill="#f9e8b4"/><path d="M0 295 190 135 330 260 435 180 640 330v30H0" fill="#25364b"/><text x="32" y="326" fill="white" font-family="sans-serif" font-size="28">${label}</text></svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

const fixtures: Hub[] = [
  {
    name: 'The Lantern Archive', checkpoints: ['Chapter 1', 'Chapter 4', 'Chapter 8'],
    documents: [
      { title: 'Harbor Guide', required: [], blocks: [
        { kind: 'TEXT', body: 'The lantern harbor welcomes every traveler at dusk.', alt: '', required: [] },
        { kind: 'IMAGE', body: illustration('Lantern Harbor', '#517d83'), alt: 'Illustration of the lantern harbor', required: [] },
        { kind: 'TEXT', body: 'By Chapter 4, the old lighthouse opens to visitors.', alt: '', required: [2] },
        { kind: 'TEXT', body: 'By Chapter 8, its signal has a new meaning.', alt: '', required: [3] },
      ] },
      { title: 'Harbor Map', required: [], blocks: [
        { kind: 'IMAGE', body: illustration('Harbor Map', '#677f9b'), alt: 'Illustrated map of the harbor', required: [0] },
      ] },
      { title: "The Keeper's Key", required: [2], blocks: [
        { kind: 'TEXT', body: 'The key first appears in the lighthouse ledger.', alt: '', required: [2] },
        { kind: 'TEXT', body: 'Chapter 8 reveals what the key unlocks.', alt: '', required: [3] },
      ] },
    ],
  },
  {
    name: 'Red Planet Journal', checkpoints: ['Sol 1', 'Sol 3', 'Sol 7'],
    documents: [
      { title: 'Mission Brief', required: [], blocks: [
        { kind: 'TEXT', body: 'A small crew begins surveying the red planet.', alt: '', required: [] },
        { kind: 'IMAGE', body: illustration('Landing Site', '#ad7058'), alt: 'Illustration of the landing site', required: [] },
        { kind: 'TEXT', body: 'On Sol 3, the crew changes its survey route.', alt: '', required: [2] },
      ] },
      { title: 'Signal Beneath the Ice', required: [3], blocks: [
        { kind: 'TEXT', body: 'On Sol 7, the instruments detect a repeating signal.', alt: '', required: [3] },
        { kind: 'IMAGE', body: illustration('Ice Survey', '#637e9c'), alt: 'Illustration of the ice survey', required: [3] },
      ] },
    ],
  },
];

async function invoke<T>(gateway: Gateway, route: string, input: Record<string, unknown>): Promise<T> {
  const result = await gateway.invoke(route, input);
  if (!result.ok) throw new Error(`${route} failed: ${JSON.stringify(result.error)}`);
  return result.value as T;
}

async function ensureHub(db: Db, gateway: Gateway, fixture: Hub, counts: { hubs: number; checkpoints: number }) {
  const existing = await db.collection<{ _id: string; name: string }>('hubs').findOne({ name: fixture.name });
  const hub = existing?._id ?? (await invoke<{ hub: string }>(gateway, '/hubs/create', {
    name: fixture.name, label: fixture.checkpoints[0],
  })).hub;
  if (!existing) { counts.hubs++; counts.checkpoints++; }

  const listed = await invoke<{ sequence: string; checkpoints: Checkpoint[] }>(
    gateway, '/checkpoints/list', { hub },
  );
  const checkpoints = listed.checkpoints;
  if (checkpoints[0]?.label !== 'NotStarted' || checkpoints[0].position !== 0) {
    throw new Error(`${fixture.name}: missing ordered NotStarted checkpoint`);
  }
  for (const [offset, label] of fixture.checkpoints.entries()) {
    const position = offset + 1;
    const present = checkpoints[position];
    if (present && (present.label !== label || present.position !== position)) {
      throw new Error(`${fixture.name}: checkpoint ${position} differs from the fixture`);
    }
    if (!present) {
      const created = await invoke<{ checkpoint: string }>(gateway, '/checkpoints/append', {
        hub, sequence: listed.sequence, label,
      });
      checkpoints.push({ checkpoint: created.checkpoint, label, position });
      counts.checkpoints++;
    }
  }
  return { hub, checkpoints };
}

async function ensureRule(
  db: Db, gateway: Gateway, hub: string, item: string, required: string[], counts: { rules: number },
) {
  const existing = await db.collection<{ _id: string; required: string[] }>('requirements').findOne({ _id: item });
  if (existing) {
    const same = existing.required.length === required.length &&
      existing.required.every((token) => required.includes(token));
    if (!same) throw new Error(`Existing rule for ${item} differs from the fixture`);
    return;
  }
  await invoke(gateway, '/setup/items/tag', { hub, item, required });
  counts.rules++;
}

async function ensureDocument(
  db: Db, gateway: Gateway, hub: string, checkpoints: Checkpoint[], fixture: Document,
  counts: { documents: number; rules: number },
) {
  const existing = await db.collection<StoredDocument>('documents').findOne({ scope: hub, title: fixture.title });
  const inputs = fixture.blocks.map(({ kind, body, alt }) => ({ kind, body, alt }));
  let document: string;
  let blocks: { block: string }[];
  if (existing) {
    if (existing.blocks.length !== inputs.length || existing.blocks.some((block, index) =>
      block.kind !== inputs[index]?.kind || block.body !== inputs[index]?.body || block.alt !== inputs[index]?.alt
    )) throw new Error(`${fixture.title}: existing document differs from the fixture`);
    document = existing._id;
    blocks = existing.blocks;
  } else {
    const created = await invoke<{ document: string; blocks: { block: string }[] }>(
      gateway, '/setup/documents/create', { hub, title: fixture.title, blocks: inputs },
    );
    document = created.document;
    blocks = created.blocks;
    counts.documents++;
  }
  if (blocks.length !== fixture.blocks.length) throw new Error(`${fixture.title}: block count differs`);

  const tokens = (positions: number[]) => positions.map((position) => {
    const token = checkpoints[position]?.checkpoint;
    if (!token) throw new Error(`${fixture.title}: unknown checkpoint position ${position}`);
    return token;
  });
  await ensureRule(db, gateway, hub, document, tokens(fixture.required), counts);
  for (const [index, block] of fixture.blocks.entries()) {
    await ensureRule(db, gateway, hub, blocks[index]!.block, tokens(block.required), counts);
  }
}

async function main() {
  if (process.env.WIKIPLOTTER_ENV !== 'development') {
    throw new Error('Fixture seeding requires the development profile.');
  }
  const connection = await connectMongo();
  try {
    const { db } = connection;
    if (db.databaseName !== 'wikiplotter_dev') throw new Error('Fixture seeding requires wikiplotter_dev.');
    const { gateway } = createApplication(db);
    const counts = { hubs: 0, checkpoints: 0, documents: 0, rules: 0 };
    for (const fixture of fixtures) {
      const { hub, checkpoints } = await ensureHub(db, gateway, fixture, counts);
      for (const document of fixture.documents) {
        await ensureDocument(db, gateway, hub, checkpoints, document, counts);
      }
    }
    console.log(`Seeded wikiplotter_dev: ${counts.hubs} hubs, ${counts.checkpoints} ordinary checkpoints, ${counts.documents} documents, ${counts.rules} rules created.`);
  } finally {
    await connection.client.close();
  }
}

await main();
