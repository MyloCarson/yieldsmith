import { BotContext } from "../types";
import { PortfolioService } from "../services/portfolio-service";
import { formatRemoveHolding } from "../formatters/portfolio-formatter";
import { escapeHtml } from "@/utils/html";
import { TelegramUserId, StockSymbol } from "@/types/common";

export function createRemoveHoldingHandler(portfolioService: PortfolioService) {
  return async (ctx: BotContext): Promise<void> => {
    const userId = ctx.from?.id as TelegramUserId | undefined;
    if (!userId) {
      await ctx.reply("Could not identify your Telegram user. Please try again.");
      return;
    }

    const text = ctx.message && "text" in ctx.message ? ctx.message.text : "";
    const parts = text.trim().split(/\s+/);
    const symbolInput = parts[1];

    if (!symbolInput) {
      await ctx.reply("Usage: /remove_holding <SYMBOL>\nExample: /remove_holding MTNN");
      return;
    }

    const symbol = symbolInput.toUpperCase() as StockSymbol;

    const existing = await portfolioService.getHoldingBySymbol(userId, symbol);
    if (!existing) {
      await ctx.replyWithHTML(`<b>${escapeHtml(String(symbol))}</b> is not in your portfolio.`);
      return;
    }

    await portfolioService.removeHolding(userId, symbol);
    await ctx.replyWithHTML(formatRemoveHolding(String(symbol)));
  };
}
