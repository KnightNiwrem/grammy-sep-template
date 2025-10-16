import { beforeEach, describe, it } from "@std/testing/bdd";
import { expect } from "@std/expect";
import { Bot, Context } from "grammy";
import {
  plugin,
  type PluginData,
  type PluginFlavor,
  type StorageAdapter,
} from "../src/mod.ts";

// Custom storage adapter for testing that extends StorageAdapter
interface TestStorageAdapter extends StorageAdapter<PluginData> {
  data: Map<string, PluginData>;
}

// Type alias for bot with plugin flavor
type PluginContext = Context & PluginFlavor<PluginData>;

// Mock bot info for testing
const mockBotInfo = {
  id: 12345,
  is_bot: true as const,
  first_name: "TestBot",
  username: "test_bot",
  can_join_groups: true,
  can_read_all_group_messages: false,
  supports_inline_queries: false,
  can_connect_to_business: false,
  has_main_web_app: false,
};

describe("Plugin with StorageAdapter", () => {
  describe("Memory Storage", () => {
    let bot: Bot<PluginContext>;

    beforeEach(() => {
      bot = new Bot<PluginContext>("dummy-token", { botInfo: mockBotInfo });
    });

    it("should initialize with default data", async () => {
      bot.use(
        plugin({
          initial: () => ({ exampleCounter: 0 }),
        }),
      );

      let capturedData: PluginData | undefined;

      bot.on("message", (ctx) => {
        capturedData = ctx.pluginData;
      });

      // Simulate an update
      // @ts-ignore: simplified update for testing
      await bot.handleUpdate({
        update_id: 1,
        message: {
          message_id: 1,
          date: Date.now() / 1000,
          chat: { id: 123, type: "private", first_name: "Test" },
          from: { id: 456, is_bot: false, first_name: "Test" },
          text: "Hello",
        },
      });

      expect(capturedData).toBeDefined();
      expect(capturedData?.exampleCounter).toBe(0);
    });

    it("should persist data across updates", async () => {
      let callCount = 0;

      bot.use(
        plugin({
          initial: () => ({ exampleCounter: 0 }),
        }),
      );

      bot.on("message", (ctx) => {
        callCount++;
        ctx.pluginData.exampleCounter++;
      });

      const update = {
        update_id: 1,
        message: {
          message_id: 1,
          date: Date.now() / 1000,
          chat: { id: 123, type: "private" as const, first_name: "Test" },
          from: { id: 456, is_bot: false, first_name: "Test" },
          text: "Hello",
        },
      };

      // First update
      // @ts-ignore: simplified update for testing
      await bot.handleUpdate(update);
      expect(callCount).toBe(1);

      // Second update - counter should increment
      // @ts-ignore: simplified update for testing
      await bot.handleUpdate({ ...update, update_id: 2 });
      expect(callCount).toBe(2);

      // Third update - verify final count
      // @ts-ignore: simplified update for testing
      await bot.handleUpdate({ ...update, update_id: 3 });
      expect(callCount).toBe(3);
    });
  });

  describe("Custom Storage Adapter", () => {
    it("should work with custom storage adapter", async () => {
      // Create a custom storage adapter for testing
      const storage: TestStorageAdapter = {
        data: new Map<string, PluginData>(),
        read(key: string) {
          return this.data.get(key);
        },
        write(key: string, value: PluginData) {
          this.data.set(key, value);
        },
        delete(key: string) {
          this.data.delete(key);
        },
      };

      const bot = new Bot<PluginContext>("dummy-token", {
        botInfo: mockBotInfo,
      });

      bot.use(
        plugin({
          initial: () => ({ exampleCounter: 10 }),
          storage,
        }),
      );

      bot.on("message", (ctx) => {
        ctx.pluginData.exampleCounter += 5;
      });

      // @ts-ignore: simplified update for testing
      await bot.handleUpdate({
        update_id: 1,
        message: {
          message_id: 1,
          date: Date.now() / 1000,
          chat: { id: 789, type: "private", first_name: "Test" },
          from: { id: 456, is_bot: false, first_name: "Test" },
          text: "Test",
        },
      });

      // Verify storage was written to
      const stored = storage.data.get("789");
      expect(stored).toBeDefined();
      expect(stored?.exampleCounter).toBe(15);
    });
  });

  describe("Storage Key Options", () => {
    it("should use custom prefix", async () => {
      const storage: TestStorageAdapter = {
        data: new Map<string, PluginData>(),
        read(key: string) {
          return this.data.get(key);
        },
        write(key: string, value: PluginData) {
          this.data.set(key, value);
        },
        delete(key: string) {
          this.data.delete(key);
        },
      };

      const bot = new Bot<PluginContext>("dummy-token", {
        botInfo: mockBotInfo,
      });

      bot.use(
        plugin({
          initial: () => ({ exampleCounter: 0 }),
          storage,
          prefix: "mybot:",
        }),
      );

      bot.on("message", (ctx) => {
        ctx.pluginData.exampleCounter++;
      });

      // @ts-ignore: simplified update for testing
      await bot.handleUpdate({
        update_id: 1,
        message: {
          message_id: 1,
          date: Date.now() / 1000,
          chat: { id: 999, type: "private", first_name: "Test" },
          from: { id: 456, is_bot: false, first_name: "Test" },
          text: "Test",
        },
      });

      // Verify prefix was applied
      expect(storage.data.has("mybot:999")).toBe(true);
    });

    it("should use custom storage key function", async () => {
      const storage: TestStorageAdapter = {
        data: new Map<string, PluginData>(),
        read(key: string) {
          return this.data.get(key);
        },
        write(key: string, value: PluginData) {
          this.data.set(key, value);
        },
        delete(key: string) {
          this.data.delete(key);
        },
      };

      const bot = new Bot<PluginContext>("dummy-token", {
        botInfo: mockBotInfo,
      });

      bot.use(
        plugin({
          initial: () => ({ exampleCounter: 0 }),
          storage,
          getStorageKey: (ctx) => ctx.from?.id.toString(),
        }),
      );

      bot.on("message", (ctx) => {
        ctx.pluginData.exampleCounter++;
      });

      // @ts-ignore: simplified update for testing
      await bot.handleUpdate({
        update_id: 1,
        message: {
          message_id: 1,
          date: Date.now() / 1000,
          chat: { id: 111, type: "private", first_name: "Test" },
          from: { id: 222, is_bot: false, first_name: "Test" },
          text: "Test",
        },
      });

      // Verify user ID was used as key instead of chat ID
      expect(storage.data.has("222")).toBe(true);
      expect(storage.data.has("111")).toBe(false);
    });
  });
});
