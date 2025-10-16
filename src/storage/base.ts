import type { MaybePromise, StorageAdapter } from "../types.ts";

export abstract class BaseStorageAdapter<T> implements StorageAdapter<T> {
  abstract read(key: string): MaybePromise<T | undefined>;

  abstract write(key: string, value: T): MaybePromise<void>;

  abstract delete(key: string): MaybePromise<void>;

  has?(key: string): MaybePromise<boolean>;

  readAllKeys?(): Iterable<string> | AsyncIterable<string>;

  readAllValues?(): Iterable<T> | AsyncIterable<T>;

  readAllEntries?(): Iterable<[string, T]> | AsyncIterable<[string, T]>;
}
