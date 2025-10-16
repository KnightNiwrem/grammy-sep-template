import { expect } from "@std/expect";
import { describe, it } from "@std/testing/bdd";
import { Api, Composer, Context, type StorageAdapter } from "grammy";
import {
  createTextVaultPlugin,
  type TextVaultFlavor,
  type TextVaultState,
} from "../src/mod.ts";

type TestContext = Context & TextVaultFlavor;

function createHarness() {
  const adapterCalls: { write: number; delete: number } = {
    write: 0,
    delete: 0,
  };
  const backing = new Map<string, TextVaultState>();
  const adapter: StorageAdapter<TextVaultState> = {
    read: (key) => backing.get(key),
    write: (key, value) => {
      adapterCalls.write += 1;
      backing.set(key, value);
    },
    delete: (key) => {
      adapterCalls.delete += 1;
      backing.delete(key);
    },
    has: (key) => backing.has(key),
  };
  const composer = new Composer<TestContext>();
  composer.use(createTextVaultPlugin({ adapter }));

  const run = async (modify?: (ctx: TestContext) => void) => {
    const middleware = composer.middleware();
    const api = new Api("test-token");
    const me = {
      id: 0,
      is_bot: true,
      first_name: "Test",
      username: "test_bot",
      can_join_groups: false,
      can_read_all_group_messages: false,
      supports_inline_queries: false,
      can_connect_to_business: false,
      has_main_web_app: false,
    } satisfies ConstructorParameters<typeof Context>[2];
    const ctx = new Context(
      {
        update_id: 0,
        message: {
          message_id: 0,
          date: 0,
          chat: {
            id: 1,
            type: "private",
            first_name: "Tester",
            username: "tester",
          },
          from: { id: 1, is_bot: false, first_name: "Tester" },
        },
      },
      api,
      me,
    ) as TestContext;
    await middleware(ctx, () => {
      if (modify) modify(ctx);
      return Promise.resolve();
    });
    return { handle: ctx.textVault, stored: backing.get("1") };
  };

  return {
    run,
    adapterCalls,
  };
}

describe("createTextVaultPlugin", () => {
  it("installs context helper", async () => {
    const harness = createHarness();
    const { handle } = await harness.run();
    expect(handle.enabled).toBe(true);
    expect(handle.list()).toEqual([]);
  });

  it("saves texts", async () => {
    const harness = createHarness();
    const { handle, stored } = await harness.run((ctx) => {
      const saved = ctx.textVault.add("foo");
      expect(saved).toBeTruthy();
    });
    expect(handle.list()).toEqual(["foo"]);
    expect(stored?.entries).toEqual(["foo"]);
    expect(harness.adapterCalls.write).toBe(1);
  });

  it("removes texts", async () => {
    const harness = createHarness();
    const { handle, stored } = await harness.run((ctx) => {
      ctx.textVault.add("foo");
      ctx.textVault.add("bar");
      const removed = ctx.textVault.remove(0);
      expect(removed).toBe("bar");
      ctx.textVault.clear();
    });
    expect(handle.isEmpty()).toBe(true);
    expect(stored).toBeUndefined();
    expect(harness.adapterCalls.delete).toBe(1);
  });
});
