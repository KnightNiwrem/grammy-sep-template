import type { Context, MiddlewareFn } from "grammy";
import type { MaybePromise, StorageAdapter } from "./storage.ts";

/**
 * Data stored by this plugin for each chat/user.
 */
export interface PluginData {
  // Add your plugin-specific data fields here
  exampleCounter: number;
}

/**
 * Context flavor that adds plugin data to the context object.
 */
export interface PluginFlavor<D = PluginData> {
  /**
   * Plugin data on the context object.
   *
   * This property holds the persistent data for the current chat/user.
   */
  pluginData: D;
}

/**
 * Options for configuring the plugin.
 */
export interface PluginOptions<D = PluginData, C extends Context = Context> {
  /**
   * A function that produces an initial value for plugin data.
   * This function will be called every time the storage returns undefined
   * for a given key.
   */
  initial?: () => D;

  /**
   * An optional prefix to prepend to the storage key.
   */
  prefix?: string;

  /**
   * This option lets you generate your own storage keys per context object.
   * The default implementation stores data per chat, as determined by `ctx.chatId`.
   */
  getStorageKey?: (
    ctx: Omit<C, "pluginData">,
  ) => MaybePromise<string | undefined>;

  /**
   * A storage adapter to your storage solution. Provides read, write, and
   * delete access to the plugin middleware.
   *
   * The default implementation will store data in memory. The data will be
   * lost whenever your bot restarts.
   */
  storage?: StorageAdapter<D>;
}

/**
 * Default storage key function - stores data per chat.
 */
function defaultGetStorageKey(ctx: Context): string | undefined {
  return ctx.chatId?.toString();
}

/**
 * In-memory storage adapter implementation.
 * This is used as the default when no storage is provided.
 * Data will be lost when the bot restarts.
 */
class MemoryStorage<T> implements StorageAdapter<T> {
  private storage = new Map<string, T>();

  read(key: string): T | undefined {
    return this.storage.get(key);
  }

  write(key: string, value: T): void {
    this.storage.set(key, value);
  }

  delete(key: string): void {
    this.storage.delete(key);
  }

  has(key: string): boolean {
    return this.storage.has(key);
  }

  readAllKeys(): string[] {
    return Array.from(this.storage.keys());
  }

  readAllValues(): T[] {
    return Array.from(this.storage.values());
  }

  readAllEntries(): [string, T][] {
    return Array.from(this.storage.entries());
  }
}

/**
 * Creates middleware that adds persistent data storage to your bot.
 *
 * This middleware provides a way to store data per chat/user that persists
 * across updates. The data is accessed via `ctx.pluginData`.
 *
 * Example usage:
 * ```ts
 * import { Bot } from "grammy";
 * import { plugin } from "./mod.ts";
 *
 * const bot = new Bot("YOUR_BOT_TOKEN");
 *
 * // Use the plugin with default in-memory storage
 * bot.use(plugin({
 *   initial: () => ({ exampleCounter: 0 })
 * }));
 *
 * bot.on("message", (ctx) => {
 *   // Access and modify plugin data
 *   ctx.pluginData.exampleCounter++;
 *   console.log(`Message count: ${ctx.pluginData.exampleCounter}`);
 * });
 * ```
 *
 * @param options Configuration options for the plugin
 * @returns Middleware function
 */
export function plugin<D = PluginData, C extends Context = Context>(
  options: PluginOptions<D, C> = {},
): MiddlewareFn<C & PluginFlavor<D>> {
  const {
    initial,
    storage = new MemoryStorage<D>(),
    getStorageKey = defaultGetStorageKey,
    prefix = "",
  } = options;

  return async (ctx, next) => {
    // Get the storage key for this context
    const rawKey = await getStorageKey(ctx);

    if (rawKey === undefined) {
      throw new Error(
        "Cannot access plugin data because the storage key is undefined! " +
          "This update does not belong to a chat, or you provided a custom " +
          "getStorageKey function that returned undefined.",
      );
    }

    const key = prefix + rawKey;

    // Read existing data from storage
    let data: D | undefined = await storage.read(key);

    // Initialize with default value if data doesn't exist
    if (data === undefined && initial !== undefined) {
      data = initial();
      await storage.write(key, data);
    }

    // Ensure data is defined (if initial is not provided, data might still be undefined)
    if (data === undefined) {
      throw new Error(
        "Plugin data is undefined! Please provide an 'initial' option to the plugin " +
          "to set default values for new chats.",
      );
    }

    // Make data available on context
    // @ts-ignore: Adding property to context
    ctx.pluginData = data;

    // Call downstream middleware
    await next();

    // Write back to storage after middleware completes
    // @ts-ignore: Property was added above
    const updatedData: D | null | undefined = ctx.pluginData;

    if (updatedData === null || updatedData === undefined) {
      // Delete data if set to null/undefined
      await storage.delete(key);
    } else {
      // Write updated data back to storage
      await storage.write(key, updatedData);
    }
  };
}
