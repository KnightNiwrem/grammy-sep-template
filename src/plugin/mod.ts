import type { Context, MiddlewareFn } from "grammy";
import { session, type SessionFlavor } from "grammy";
import { createSessionBridge } from "./storage_bridge.ts";
import type { BaseStorageAdapter } from "../storage/base.ts";
import type { MaybePromise } from "../types.ts";

export interface SessionPluginOptions<C extends Context, T> {
  adapter: BaseStorageAdapter<T>;
  initial: () => T;
  prefix?: string;
  buildKey?: (ctx: C) => MaybePromise<string | undefined>;
}

export function sessionPlugin<C extends Context, T>(
  options: SessionPluginOptions<C, T>,
): MiddlewareFn<C & SessionFlavor<T>> {
  const { adapter, initial, prefix, buildKey } = options;
  const bridge = createSessionBridge<C, T>({ adapter, prefix, buildKey });

  return session<T, C>({
    initial,
    storage: bridge.storage,
    getSessionKey: (ctx) => bridge.getSessionKey(ctx as C),
  });
}

export interface VersionedStorageOptions<T> {
  version: string | number;
  read: () => MaybePromise<T | undefined>;
  write: (value: T) => MaybePromise<void>;
  delete: () => MaybePromise<void>;
}

export function versionedStorage<T>(options: VersionedStorageOptions<T>) {
  const { version, read, write, delete: remove } = options;
  return {
    async readVersioned() {
      const value = await read();
      if (!value) return undefined;
      return { version, value } as const;
    },
    async writeVersioned(value: T) {
      await write(value);
    },
    deleteVersioned: remove,
  };
}
