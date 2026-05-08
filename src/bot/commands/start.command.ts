import { BotContext } from "../types";
import { escapeHtml } from "../utils/html";

export async function handleStart(ctx: BotContext): Promise<void> {
  const firstName = escapeHtml(ctx.from?.first_name ?? "there");
  await ctx.replyWithHTML(
    `👋 <b>Welcome to Yieldsmith, ${firstName}!</b>\n\n` +
      `I help you monitor NGX dividend stocks and build a passive income portfolio.\n\n` +
      `<b>What I can do:</b>\n` +
      `• Analyse dividend stocks against proven criteria\n` +
      `• Track your portfolio performance\n` +
      `• Send alerts for dividends, price moves, and rebalancing\n` +
      `• Provide AI-powered investment recommendations\n\n` +
      `Type /help to see all available commands.`
  );
}
