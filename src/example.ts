import { Bot, type Context } from "grammy";
import {
  createInMemoryAdapter,
  createStoragePlugin,
  type StorageFlavor,
} from "./mod.ts";

interface CounterState {
  count: number;
}

type CounterContext = Context & StorageFlavor<CounterState>;

const bot = new Bot<CounterContext>(Deno.env.get("BOT_TOKEN") ?? "");

const storage = createInMemoryAdapter<CounterState>();

bot.use(createStoragePlugin({
  adapter: storage,
  initial: () => ({ count: 0 }),
}));

bot.command("increment", async (ctx) => {
  ctx.storageItem.update((prev) => ({ count: (prev?.count ?? 0) + 1 }));
  await ctx.reply(`Count is now ${ctx.storageItem.getOr({ count: 0 }).count}`);
});

bot.command("reset", async (ctx) => {
  ctx.storageItem.clear();
  await ctx.reply("Counter cleared");
});

bot.command(
  "start",
  (ctx) => ctx.reply("Send /increment to increase the counter."),
);

if (import.meta.main) {
  await bot.start();
}
