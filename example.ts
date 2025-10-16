/**
 * Example bot demonstrating the plugin usage.
 *
 * To run this example:
 * 1. Set your bot token: export BOT_TOKEN="your-token-here"
 * 2. Run: deno run --allow-net --allow-env example.ts
 */

import { Bot } from "grammy";
import { plugin } from "./src/mod.ts";

const token = Deno.env.get("BOT_TOKEN");
if (!token) {
  console.error("BOT_TOKEN environment variable is required!");
  Deno.exit(1);
}

const bot = new Bot(token);

// Install the plugin with in-memory storage
bot.use(plugin({
  initial: () => ({ exampleCounter: 0 }),
  prefix: "example:",
}));

// Example handler that increments a counter
bot.on("message:text", (ctx) => {
  ctx.pluginData.exampleCounter++;
  ctx.reply(
    `You've sent ${ctx.pluginData.exampleCounter} message(s) in this chat!`,
  );
});

// Start command
bot.command("start", (ctx) => {
  ctx.reply(
    "Welcome! Send any message to see the counter increment.\n\n" +
      "The counter is stored persistently per chat using the StorageAdapter pattern.",
  );
});

// Reset command
bot.command("reset", (ctx) => {
  ctx.pluginData.exampleCounter = 0;
  ctx.reply("Counter has been reset!");
});

// Status command
bot.command("status", (ctx) => {
  ctx.reply(`Current counter value: ${ctx.pluginData.exampleCounter}`);
});

console.log("Bot is running...");
bot.start();
