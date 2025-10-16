import { Bot, type Context } from "grammy";
import {
  type Conversation,
  conversations,
  createConversation,
} from "grammy/conversations";
import { SessionFlavor } from "grammy/convenience";
import { MemoryStorageAdapter, sessionPlugin } from "../src/mod.ts";

interface SessionState {
  name?: string;
}

type MyContext = Context & SessionFlavor<SessionState>;

const adapter = new MemoryStorageAdapter<SessionState>();
const bot = new Bot<MyContext>("TOKEN");

bot.use(sessionPlugin<MyContext, SessionState>({
  adapter,
  initial: () => ({}) satisfies SessionState,
}));

bot.use(conversations<MyContext, MyContext>());

async function onboarding(
  conversation: Conversation<MyContext, MyContext>,
  ctx: MyContext,
) {
  await ctx.reply("Hi! What is your name?");
  const { message } = await conversation.wait();
  ctx.session.name = message?.text;
  await ctx.reply(`Nice to meet you, ${ctx.session.name ?? "friend"}!`);
}

bot.use(createConversation(onboarding));

bot.command("start", (ctx) => ctx.reply("Plugin template ready."));

await bot.start();
