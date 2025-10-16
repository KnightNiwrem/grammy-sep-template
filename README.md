# grammY Plugin Template with StorageAdapter

A starter template for building grammY plugins that use the `StorageAdapter` interface for persistent data storage.

## Features

- ✅ **StorageAdapter Interface**: Built-in support for the standard grammY `StorageAdapter` interface
- ✅ **In-Memory Storage**: Default memory storage for quick prototyping
- ✅ **Custom Storage**: Easy integration with any storage backend (Redis, PostgreSQL, MongoDB, etc.)
- ✅ **Type-Safe**: Full TypeScript support with proper type definitions
- ✅ **Tested**: Comprehensive test suite included
- ✅ **Well-Documented**: Clear examples and documentation

## Quick Start

```typescript
import { Bot } from "grammy";
import { plugin } from "./src/mod.ts";

const bot = new Bot("YOUR_BOT_TOKEN");

// Use with default in-memory storage
bot.use(plugin({
  initial: () => ({ exampleCounter: 0 }),
}));

bot.on("message", (ctx) => {
  ctx.pluginData.exampleCounter++;
  ctx.reply(`Message count: ${ctx.pluginData.exampleCounter}`);
});

bot.start();
```

## Usage with Custom Storage

```typescript
import { Bot } from "grammy";
import { plugin, type PluginData, type StorageAdapter } from "./src/mod.ts";

// Implement your custom storage adapter
const myStorage: StorageAdapter<PluginData> = {
  async read(key: string) {
    // Read from your database
    return await db.get(key);
  },
  async write(key: string, value: PluginData) {
    // Write to your database
    await db.set(key, value);
  },
  async delete(key: string) {
    // Delete from your database
    await db.delete(key);
  },
};

const bot = new Bot("YOUR_BOT_TOKEN");

bot.use(plugin({
  storage: myStorage,
  initial: () => ({ exampleCounter: 0 }),
  prefix: "mybot:", // Optional key prefix
}));
```

## Customizing the Plugin

### 1. Define Your Data Structure

Edit `src/plugin.ts` to define your plugin's data structure:

```typescript
export interface PluginData {
  // Add your plugin-specific fields
  customField: string;
  anotherField: number;
}
```

### 2. Configure Storage Keys

By default, data is stored per chat. Customize this behavior:

```typescript
bot.use(plugin({
  // Store per user instead of per chat
  getStorageKey: (ctx) => ctx.from?.id.toString(),
  initial: () => ({ exampleCounter: 0 }),
}));
```

### 3. Add Plugin Logic

Extend the plugin functionality in `src/plugin.ts` as needed for your use case.

## Running Tests

```bash
deno task test
```

## Development Tasks

- `deno task fmt` - Format code
- `deno task lint` - Lint code
- `deno task check` - Type check
- `deno task ok` - Run all checks (format, lint, test, type check)

## Project Structure

```
.
├── src/
│   ├── mod.ts          # Main export file
│   ├── plugin.ts       # Plugin implementation
│   └── storage.ts      # StorageAdapter interface
├── test/
│   └── plugin_test.ts  # Test suite
├── deno.json           # Deno configuration
└── README.md           # This file
```

## StorageAdapter Interface

The `StorageAdapter<T>` interface provides:

- `read(key: string): MaybePromise<T | undefined>` - Read data for a key
- `write(key: string, value: T): MaybePromise<void>` - Write data for a key
- `delete(key: string): MaybePromise<void>` - Delete data for a key
- `has?(key: string): MaybePromise<boolean>` - Check if key exists (optional)
- `readAllKeys?()` - List all keys (optional)
- `readAllValues?()` - List all values (optional)
- `readAllEntries?()` - List all key-value pairs (optional)

## Building Your Plugin

This template provides everything you need to start building a grammY plugin:

1. **Customize the data structure** in `src/plugin.ts`
2. **Add plugin-specific logic** to handle your use case
3. **Write tests** in `test/`
4. **Update documentation** as you add features
5. **Publish** when ready!

## License

MIT
