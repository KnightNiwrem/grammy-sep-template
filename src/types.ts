import type { StorageAdapter as GrammyStorageAdapter } from "grammy";

export type StorageAdapter<T> = GrammyStorageAdapter<T>;

export interface StorageKeyBuilder<C> {
  build(ctx: C): string | undefined;
}

export interface StorageAdapterFactory<T> {
  create(): StorageAdapter<T>;
}

export type MaybePromise<T> = T | Promise<T>;
