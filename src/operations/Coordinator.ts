import { AsyncLocalStorage } from 'node:async_hooks';
import type { Db } from 'mongodb';

export type PendingOperation = {
  _id: string;
  kind: string;
  actor: string;
  payload: Record<string, unknown>;
  createdAt: Date;
  status?: 'RUNNING' | 'COMPLETE';
};

type Recovery = (operation: PendingOperation) => Promise<unknown>;
type Context = { db: Db; recovering?: boolean };

class Mutex {
  private tail: Promise<void> = Promise.resolve();
  async run<T>(work: () => Promise<T>): Promise<T> {
    let release!: () => void;
    const previous = this.tail;
    this.tail = new Promise<void>((resolve) => { release = resolve; });
    await previous;
    try { return await work(); } finally { release(); }
  }
}

const context = new AsyncLocalStorage<Context>();
const mutexes = new WeakMap<Db, Mutex>();
const recoveries = new WeakMap<Db, Map<string, Recovery>>();
const operations = (db: Db) => db.collection<PendingOperation>('wikiplotter_operations');
const applicationLockId = '__application_lock__';

function mutex(db: Db) {
  let found = mutexes.get(db);
  if (!found) { found = new Mutex(); mutexes.set(db, found); }
  return found;
}

export function registerOperationRecovery(db: Db, kind: string, recover: Recovery): void {
  let handlers = recoveries.get(db);
  if (!handlers) { handlers = new Map(); recoveries.set(db, handlers); }
  handlers.set(kind, recover);
}

export async function withApplicationLock<T>(db: Db, work: () => Promise<T>): Promise<T> {
  const current = context.getStore();
  if (current?.db === db) return work();
  return mutex(db).run(async () => {
    const owner = crypto.randomUUID();
    await operations(db).insertOne({ _id: applicationLockId, kind: 'lock', actor: owner,
      payload: {}, createdAt: new Date(), status: 'RUNNING' }).catch((error) => {
      if (error && typeof error === 'object' && 'code' in error && error.code === 11000) {
        throw new Error('Another Wikiplotter backend process owns the application lock.');
      }
      throw error;
    });
    try {
      return await context.run({ db }, async () => {
        await recoverPendingUnderLock(db);
        return work();
      });
    } finally {
      await operations(db).deleteOne({ _id: applicationLockId, actor: owner }).catch(() => {});
    }
  });
}

/**
 * Serialize application operations and persist their recovery intent before the
 * first cross-document mutation. The journal is coordinator state, not concept state.
 */
export async function runOperation<T, P = void>(args: {
  db: Db;
  kind: string;
  actor: string;
  payload: Record<string, unknown>;
  prepare?: () => Promise<P>;
  work: (prepared: P) => Promise<T>;
  onFailure?: (error: unknown) => Promise<void>;
}): Promise<T> {
  const current = context.getStore();
  if (current?.db === args.db && current.recovering) {
    const prepared = args.prepare ? await args.prepare() : undefined as P;
    return args.work(prepared);
  }
  return withApplicationLock(args.db, async () => {
    const prepared = args.prepare ? await args.prepare() : undefined as P;
    const operation: PendingOperation = {
      _id: crypto.randomUUID(), kind: args.kind, actor: args.actor,
      payload: args.payload, createdAt: new Date(), status: 'RUNNING',
    };
    await operations(args.db).insertOne(operation);
    try {
      const result = await args.work(prepared);
      await operations(args.db).updateOne({ _id: operation._id }, { $set: { status: 'COMPLETE' } }).catch(() => {});
      await operations(args.db).deleteOne({ _id: operation._id }).catch(() => {});
      return result;
    } catch (error) {
      if (args.onFailure) {
        await args.onFailure(error);
        await operations(args.db).updateOne({ _id: operation._id }, { $set: { status: 'COMPLETE' } }).catch(() => {});
        await operations(args.db).deleteOne({ _id: operation._id }).catch(() => {});
        throw error;
      }
      const recover = recoveries.get(args.db)?.get(args.kind);
      if (!recover) throw error;
      try {
        const result = await context.run({ db: args.db, recovering: true }, () => recover(operation));
        await operations(args.db).updateOne({ _id: operation._id }, { $set: { status: 'COMPLETE' } }).catch(() => {});
        await operations(args.db).deleteOne({ _id: operation._id }).catch(() => {});
        return result as T;
      } catch {
        throw error;
      }
    }
  });
}

/** Run before opening the HTTP listener. Unknown or failed recovery keeps the app unavailable. */
export async function recoverPendingOperations(db: Db): Promise<void> {
  // Deployment runs one backend writer. A previous process may have died while
  // holding this marker; recovery happens before the listener becomes ready.
  await operations(db).deleteOne({ _id: applicationLockId });
  await withApplicationLock(db, () => recoverPendingUnderLock(db));
}

async function recoverPendingUnderLock(db: Db): Promise<void> {
  const pending = await operations(db).find({ _id: { $ne: applicationLockId } })
    .sort({ createdAt: 1, _id: 1 }).toArray();
  for (const operation of pending) {
    if (operation.status === 'COMPLETE') {
      await operations(db).deleteOne({ _id: operation._id });
      continue;
    }
    const recover = recoveries.get(db)?.get(operation.kind);
    if (!recover) throw new Error(`No recovery handler registered for ${operation.kind}.`);
    await context.run({ db, recovering: true }, () => recover(operation));
    await operations(db).deleteOne({ _id: operation._id });
  }
}
