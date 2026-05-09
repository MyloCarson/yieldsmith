import { BotContext } from "../types";

export async function sendTyping(ctx: BotContext): Promise<void> {
  await ctx.sendChatAction("typing");
}
