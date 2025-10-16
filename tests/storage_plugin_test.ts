import { expect } from "@std/expect";
import { describe, it } from "@std/testing/bdd";
import {
  createInMemoryAdapter,
  createStoragePlugin,
  type StorageFlavor,
} from "../src/mod.ts";
import { Api, Composer, Context } from "grammy";

interface State {
  value: number;
}

type TestContext = Context & StorageFlavor<State>;

function createHarness() {
  const adapter = createInMemoryAdapter<State>();
  const composer = new Composer<TestContext>();
  composer.use(createStoragePlugin({
    adapter,
    initial: () => ({ value: 1 }),
  }));

  let seen: State | undefined;
  composer.use(async (ctx, next) => {
    seen = ctx.storageItem.get();
    await next();
  });

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
    return ctx.storageItem;
  };

  return {
    run,
    adapter,
    get seen() {
      return seen;
    },
  };
}

describe("createStoragePlugin", () => {
  it("initializes state when missing", async () => {
    const harness = createHarness();
    await harness.run();
    expect(harness.seen).toEqual({ value: 1 });
  });

  it("persists changes", async () => {
    const harness = createHarness();
    await harness.run((ctx) => {
      ctx.storageItem.update((prev) => ({ value: (prev?.value ?? 0) + 1 }));
    });
    const record = await harness.adapter.read("1");
    expect(record).toEqual({ value: 2 });
  });

  it("clears storage", async () => {
    const harness = createHarness();
    await harness.run((ctx) => ctx.storageItem.clear());
    const record = await harness.adapter.read("1");
    expect(record).toBeUndefined();
  });
});
