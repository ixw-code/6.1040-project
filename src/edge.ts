import { createGateway } from '@mit-sdg/sync-engine/boundary';
import { createHttpHandler } from '@mit-sdg/sync-engine-http/handler';
import type { Db } from 'mongodb';
import type { ReaderWire } from '@generated/reader/wire.ts';
import { assembleWikiplotter } from '@/assembly.ts';
import { readerHttpPolicy } from '@/http-policy.ts';

export function createReaderHttpHandler(db: Db) {
  const application = assembleWikiplotter(db);
  const gateway = createGateway<ReaderWire>({ application });
  return createHttpHandler({ application, gateway, policy: readerHttpPolicy });
}
