import type { BaseStorageAdapter } from "../storage/base.ts";
import type { MaybePromise, StorageAdapter } from "../types.ts";

type ChatIdentifiable = { chatId?: number | string };

export interface SessionBridge<C, T> {
  storage: StorageAdapter<T>;
  getSessionKey: (ctx: C) => MaybePromise<string | undefined>;
}

export interface StorageBridgeOptions<C, T> {
  adapter: BaseStorageAdapter<T>;
  buildKey?: (ctx: C) => MaybePromise<string | undefined>;
  prefix?: string;
}
const defaultKeyBuilder = (ctx: ChatIdentifiable) => ctx.chatId?.toString();

export function createSessionBridge<C extends ChatIdentifiable, T>(
  options: StorageBridgeOptions<C, T>,
): SessionBridge<C, T> {
  const { adapter, buildKey = defaultKeyBuilder, prefix = "" } = options;
  const storage: StorageAdapter<T> = {
    read: (key: string) => adapter.read(key),
    write: (key: string, value: T) => adapter.write(key, value),
    delete: (key: string) => adapter.delete(key),
    has: adapter.has?.bind(adapter),
    readAllKeys: adapter.readAllKeys?.bind(adapter),
    readAllValues: adapter.readAllValues?.bind(adapter),
    readAllEntries: adapter.readAllEntries?.bind(adapter),
  };

  const getSessionKey = async (ctx: C) => {
    const key = await buildKey(ctx);
    return key ? prefix + key : undefined;
  };

  return { storage, getSessionKey };
}
