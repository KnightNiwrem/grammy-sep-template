# grammY Text Vault Plugin - StorageAdapter Template

A starter template for building grammY plugins that use the `StorageAdapter` interface. This example implements a text vault where users can save, list, and delete text entries.

## Features

- ✅ **Uses grammY's StorageAdapter**: Imports `StorageAdapter` and `MemorySessionStorage` from grammY
- ✅ **Meaningful Example**: Text vault for storing user notes/snippets
- ✅ **Per-User Storage**: Each user has their own isolated vault
- ✅ **Full CRUD Operations**: Add, list, and delete text entries
- ✅ **Type-Safe**: Full TypeScript support with proper type definitions
- ✅ **Tested**: Comprehensive test suite included
- ✅ **Production-Ready**: Proper error handling and edge case coverage

## Quick Start

```typescript
import { Bot, MemorySessionStorage } from "grammy";
import { vault, type VaultData } from "./src/mod.ts";

const bot = new Bot("YOUR_BOT_TOKEN");

// Install the vault plugin
bot.use(vault({
  storage: new MemorySessionStorage<VaultData>(),
}));

// Save text to vault
bot.command("save", (ctx) => {
  const text = ctx.match;
  if (!text) return ctx.reply("Provide text to save!");

  ctx.vault.entries.push({
    id: crypto.randomUUID(),
    text,
    createdAt: Date.now(),
  });
  ctx.reply("Saved to your vault!");
});

// List all entries
bot.command("list", (ctx) => {
  if (ctx.vault.entries.length === 0) {
    return ctx.reply("Your vault is empty!");
  }
  const list = ctx.vault.entries
    .map((e, i) => `${i + 1}. ${e.text}`)
    .join("\n");
  ctx.reply(`Your vault:\n\n${list}`);
});

// Delete an entry
bot.command("delete", (ctx) => {
  const id = ctx.match;
  const index = ctx.vault.entries.findIndex((e) => e.id.startsWith(id));
  if (index === -1) return ctx.reply("Entry not found!");
  ctx.vault.entries.splice(index, 1);
  ctx.reply("Deleted!");
});

bot.start();
```

## Running the Example

```bash
# Set your bot token
export BOT_TOKEN="your-token-here"

# Run the example bot
deno run --allow-net --allow-env example.ts
```

The example bot includes:

- `/start` - Show help
- `/save <text>` - Save text to vault
- `/list` - Show all saved entries
- `/delete <id>` - Delete an entry
- `/clear` - Clear entire vault
- `/count` - Show entry count

## Using with Persistent Storage

The template uses grammY's standard `StorageAdapter` interface, so you can easily swap storage backends:

### PostgreSQL (via @grammyjs/storages)

```typescript
import { PostgresAdapter } from "@grammyjs/storage-postgres";

bot.use(vault({
  storage: new PostgresAdapter({
    host: "localhost",
    database: "mybot",
  }),
}));
```

### Redis (via @grammyjs/storages)

```typescript
import { RedisAdapter } from "@grammyjs/storage-redis";

bot.use(vault({
  storage: new RedisAdapter({ url: "redis://localhost:6379" }),
}));
```

### File System (via @grammyjs/storages)

```typescript
import { FileAdapter } from "@grammyjs/storage-file";

bot.use(vault({
  storage: new FileAdapter({ dirName: "vault-data" }),
}));
```

## Customizing the Plugin

### 1. Modify the Data Structure

Edit `src/plugin.ts` to change what data is stored:

```typescript
export interface VaultData {
  entries: VaultEntry[];
  settings?: {
    maxEntries?: number;
    autoDelete?: boolean;
  };
}
```

### 2. Change Storage Key Strategy

By default, data is stored per user. You can customize this:

```typescript
// Store per chat instead of per user
bot.use(vault({
  storage: myStorage,
  getStorageKey: (ctx) => ctx.chat?.id.toString(),
}));

// Store per user-chat combination
bot.use(vault({
  storage: myStorage,
  getStorageKey: (ctx) => `${ctx.from?.id}-${ctx.chat?.id}`,
}));
```

### 3. Add Custom Logic

Extend the plugin with your own features:

```typescript
// Add entry validation
bot.command("save", (ctx) => {
  const text = ctx.match.trim();

  // Custom validation
  if (text.length > 500) {
    return ctx.reply("Text too long! Max 500 characters.");
  }

  if (ctx.vault.entries.length >= 100) {
    return ctx.reply("Vault full! Max 100 entries.");
  }

  ctx.vault.entries.push({
    id: crypto.randomUUID(),
    text,
    createdAt: Date.now(),
  });
  ctx.reply("Saved!");
});
```

## Development

```bash
# Format code
deno task fmt

# Lint code
deno task lint

# Run tests
deno task test

# Type check
deno task check

# Run all checks
deno task ok
```

## Project Structure

```
.
├── src/
│   ├── mod.ts          # Main exports
│   ├── plugin.ts       # Vault plugin implementation
│   └── storage.ts      # StorageAdapter re-export
├── test/
│   └── plugin_test.ts  # Test suite
├── example.ts          # Example bot
├── deno.json           # Deno configuration
└── README.md           # This file
```

## Building Your Own Plugin

This template demonstrates the key patterns for StorageAdapter-based plugins:

1. **Import from grammY**: Use `StorageAdapter` and `MemorySessionStorage` from `"grammy"`
2. **Define your data structure**: Create interfaces for your plugin's data
3. **Create a context flavor**: Add your data to the context with a flavor interface
4. **Implement middleware**: Handle read/write operations in your middleware
5. **Require storage**: Make users provide their own `StorageAdapter`

The vault example shows real-world usage with CRUD operations, making it easy to adapt for your own plugin ideas.

## Why This Template?

- **No session confusion**: Clearly demonstrates StorageAdapter without mixing in session concepts
- **Real example**: Text vault is a practical, understandable use case
- **Best practices**: Uses grammY's built-in types and patterns
- **Production-ready**: Includes error handling, tests, and documentation

## License

MIT
