import {
  Composer,
  type Context,
  MemorySessionStorage,
  type MiddlewareFn,
  type StorageAdapter,
} from "grammy";

type MaybePromise<T> = T | Promise<T>;

/**
 * Shape of the stored data. Keeping the structure explicit helps downstream
 * projects evolve the schema intentionally and version migrations when needed.
 */
export interface TextVaultState {
  entries: string[];
  lastSavedAt: number | null;
}

/**
 * Public surface area exported on the context by the plugin. Exposing a
 * minimal API keeps storage mutations encapsulated behind well-defined
 * operations that can evolve without breaking dependent bots.
 */
export interface TextVaultHandle {
  readonly enabled: boolean;
  list(): readonly string[];
  add(text: string): boolean;
  remove(index: number): string | undefined;
  clear(): boolean;
  isEmpty(): boolean;
}

/**
 * Context flavor installed by {@link createTextVaultPlugin}. Downstream bots
 * can extend their custom context types with this flavor to access the vault
 * helper in TypeScript-safe fashion.
 */
export interface TextVaultFlavor {
  readonly textVault: TextVaultHandle;
}

interface CommandMap {
  save: string;
  list: string;
  remove: string;
  clear: string;
}

/**
 * Configuration for the text vault plugin. Every option is optional so the
 * template stays lightweight but remains easy to extend when integrating with
 * real storage backends or customizing command names.
 */
export interface TextVaultOptions<C extends Context = Context> {
  adapter?: StorageAdapter<TextVaultState>;
  key?: (ctx: C) => MaybePromise<string | undefined>;
  initial?: () => TextVaultState;
  commands?: Partial<CommandMap>;
  extractText?: (ctx: C) => string | undefined;
  formatList?: (entries: readonly string[]) => string;
}

const DEFAULT_COMMANDS: CommandMap = {
  save: "save_text",
  list: "saved_texts",
  remove: "forget_text",
  clear: "clear_texts",
};

const defaultState = (): TextVaultState => ({ entries: [], lastSavedAt: null });

function defaultKey(ctx: Context): string | undefined {
  const id = ctx.chat?.id ?? ctx.from?.id;
  return id === undefined ? undefined : String(id);
}

const defaultExtractText = (ctx: Context): string | undefined => {
  const match = ctx.match;
  const raw = Array.isArray(match) ? match.join(" ") : match;
  return raw?.trim() || ctx.message?.text?.replace(/^\S+/, "").trim();
};

const defaultFormatList = (entries: readonly string[]): string =>
  entries
    .map((entry, index) => `${index + 1}. ${entry}`)
    .join("\n");

function disabledChatResponse(ctx: Context): string {
  const chat = ctx.chat;
  if (chat?.type === "channel") return "Text saving is disabled for channels.";
  return "Unable to determine where to store texts for this update.";
}

/**
 * Creates middleware that lets users save, list, and delete arbitrary texts.
 *
 * The implementation demonstrates how to:
 * - Resolve and use a {@link StorageAdapter} (defaulting to
 *   {@link MemorySessionStorage})
 * - Expose helper methods on the context for programmatic use
 * - Implement user-facing bot commands that operate on the stored data
 */
export function createTextVaultPlugin<C extends Context = Context>(
  options: TextVaultOptions<C> = {},
): MiddlewareFn<C & TextVaultFlavor> {
  const {
    adapter = new MemorySessionStorage<TextVaultState>(),
    key = defaultKey as (ctx: C) => MaybePromise<string | undefined>,
    initial = defaultState,
    extractText = defaultExtractText,
    formatList = defaultFormatList,
  } = options;
  const commands: CommandMap = { ...DEFAULT_COMMANDS, ...options.commands };

  const composer = new Composer<C & TextVaultFlavor>();

  composer.use(async (ctx, next) => {
    const storageKey = await key(ctx as C);
    const enabled = storageKey !== undefined;
    const state: TextVaultState = enabled
      ? (await adapter.read(storageKey!)) ?? initial()
      : initial();
    let dirty = false;

    const handle: TextVaultHandle = {
      enabled,
      list: () => state.entries.slice(),
      add: (text) => {
        if (!enabled) return false;
        const trimmed = text.trim();
        if (trimmed.length === 0) return false;
        state.entries.unshift(trimmed);
        dirty = true;
        return true;
      },
      remove: (index) => {
        if (!enabled) return undefined;
        if (
          !Number.isInteger(index) || index < 0 || index >= state.entries.length
        ) {
          return undefined;
        }
        dirty = true;
        const [removed] = state.entries.splice(index, 1);
        return removed;
      },
      clear: () => {
        if (!enabled || state.entries.length === 0) return false;
        state.entries.splice(0, state.entries.length);
        dirty = true;
        return true;
      },
      isEmpty: () => state.entries.length === 0,
    };

    Object.defineProperty(ctx, "textVault", {
      value: handle,
      configurable: true,
      enumerable: false,
    });

    await next();

    if (!enabled || !dirty) return;
    if (state.entries.length === 0) {
      await adapter.delete(storageKey!);
      return;
    }
    state.lastSavedAt = Date.now();
    await adapter.write(storageKey!, state);
  });

  composer.command(commands.save, async (ctx) => {
    if (!ctx.textVault.enabled) {
      await ctx.reply(disabledChatResponse(ctx));
      return;
    }
    const payload = extractText(ctx as C);
    if (!payload) {
      await ctx.reply("Send some text after the command to save it.");
      return;
    }
    const accepted = ctx.textVault.add(payload);
    await ctx.reply(accepted ? "Saved the text." : "Nothing was saved.");
  });

  composer.command(commands.list, async (ctx) => {
    if (!ctx.textVault.enabled) {
      await ctx.reply(disabledChatResponse(ctx));
      return;
    }
    if (ctx.textVault.isEmpty()) {
      await ctx.reply("There are no saved texts yet.");
      return;
    }
    await ctx.reply(formatList(ctx.textVault.list()));
  });

  composer.command(commands.remove, async (ctx) => {
    if (!ctx.textVault.enabled) {
      await ctx.reply(disabledChatResponse(ctx));
      return;
    }
    const match = ctx.match;
    const rawIndex = Array.isArray(match) ? match[0] : match;
    const parsed = rawIndex?.trim();
    const index = parsed ? Number.parseInt(parsed, 10) : NaN;
    if (!Number.isInteger(index) || index < 1) {
      await ctx.reply(
        "Specify the entry number to forget. Example: /forget_text 2",
      );
      return;
    }
    const removed = ctx.textVault.remove(index - 1);
    await ctx.reply(
      removed ? `Removed: ${removed}` : "No saved text matches that number.",
    );
  });

  composer.command(commands.clear, async (ctx) => {
    if (!ctx.textVault.enabled) {
      await ctx.reply(disabledChatResponse(ctx));
      return;
    }
    if (ctx.textVault.clear()) {
      await ctx.reply("Cleared all saved texts.");
    } else {
      await ctx.reply("There were no saved texts to clear.");
    }
  });

  return composer.middleware();
}
