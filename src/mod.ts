import { type Context, type MiddlewareFn, type StorageAdapter } from "grammy";

type MaybePromise<T> = T | Promise<T>;

/**
 * Shape of the storage handle exposed on the context.
 */
export interface StorageItem<T> {
  readonly key: string;
  readonly exists: () => boolean;
  get(): T | undefined;
  getOr(fallback: T): T;
  set(value: T): void;
  update(updater: (current: T | undefined) => T): void;
  clear(): void;
}

/**
 * Context flavor that exposes storage access helpers.
 */
export interface StorageFlavor<T> {
  readonly storageItem: StorageItem<T>;
}

export interface StoragePluginOptions<T, C extends Context = Context> {
  /**
   * Adapter implementation that persists the stored values.
   */
  adapter: StorageAdapter<T>;
  /**
   * Optional key factory. Defaults to using `ctx.chat?.id`.
   */
  key?: (ctx: C) => MaybePromise<string | undefined>;
  /**
   * Optional initial value factory. Invoked when the adapter has no entry.
   */
  initial?: () => T;
  /**
   * Whether the initial value should be persisted automatically. Defaults to true.
   */
  persistInitial?: boolean;
}

function defaultKey(ctx: Context): string | undefined {
  const id = ctx.chat?.id ?? ctx.from?.id;
  return id === undefined ? undefined : String(id);
}

/**
 * Creates middleware that wires a storage adapter into the context via a helper handle.
 */
export function createStoragePlugin<T, C extends Context = Context>(
  options: StoragePluginOptions<T, C>,
): MiddlewareFn<C & StorageFlavor<T>> {
  const {
    adapter,
    key = defaultKey as (ctx: C) => MaybePromise<string | undefined>,
    initial,
    persistInitial = true,
  } = options;

  return async (ctx, next) => {
    const storageKey = await key(ctx as C);
    if (storageKey === undefined) {
      await next();
      return;
    }

    const initialRead = await adapter.read(storageKey);
    let loaded: T | undefined = initialRead;
    let exists = loaded !== undefined;
    let dirty = false;
    let cleared = false;

    if (!exists && initial !== undefined) {
      loaded = initial();
      exists = true;
      dirty = persistInitial;
    }

    const item: StorageItem<T> = {
      key: storageKey,
      exists: () => exists && !cleared,
      get: () => (exists && !cleared ? loaded : undefined),
      getOr: (fallback: T) => {
        const value = item.get();
        return value === undefined ? fallback : value;
      },
      set: (value: T) => {
        loaded = value;
        exists = true;
        cleared = false;
        dirty = true;
      },
      update: (updater) => {
        loaded = updater(item.get());
        exists = true;
        cleared = false;
        dirty = true;
      },
      clear: () => {
        loaded = undefined;
        exists = false;
        cleared = true;
        dirty = true;
      },
    };

    Object.defineProperty(ctx, "storageItem", {
      value: item,
      configurable: true,
      enumerable: false,
    });

    try {
      await next();
    } finally {
      if (dirty) {
        if (!item.exists()) {
          await adapter.delete(storageKey);
        } else {
          await adapter.write(storageKey, loaded as T);
        }
      }
    }
  };
}

/**
 * Creates a simple in-memory adapter backed by a Map. Useful for testing and prototyping.
 */
export function createInMemoryAdapter<T>(): StorageAdapter<T> {
  const store = new Map<string, T>();
  return {
    read: (key) => store.get(key),
    write: (key, value) => {
      store.set(key, value);
    },
    delete: (key) => {
      store.delete(key);
    },
    has: (key) => store.has(key),
    readAllKeys: () => store.keys(),
    readAllValues: () => store.values(),
    readAllEntries: () => store.entries(),
  };
}
