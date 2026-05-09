import { Telegraf } from "telegraf";
import { BotContext } from "../types";
import { PortfolioService } from "../services/portfolio-service";
import { formatRemoveHolding } from "../formatters/portfolio-formatter";
import { escapeHtml } from "@/utils/html";
import { StockSymbol, MarketId, TelegramUserId } from "@/types/common";

export function registerPortfolioCallbacks(
  bot: Telegraf<BotContext>,
  portfolioService: PortfolioService
): void {
  bot.action(/^remove_confirm:(.+)$/, async (ctx) => {
    const symbol = ctx.match[1] as StockSymbol;
    const userId = ctx.from?.id as TelegramUserId | undefined;
    await ctx.answerCbQuery();
    if (!userId) return;
    const existing = await portfolioService.getHoldingBySymbol(userId, symbol, "ngx" as MarketId);
    if (!existing) {
      await ctx.editMessageText(
        `<b>${escapeHtml(String(symbol))}</b> is no longer in your portfolio.`,
        { parse_mode: "HTML" }
      );
      return;
    }
    await portfolioService.removeHolding(userId, symbol, "ngx" as MarketId);
    await ctx.editMessageText(formatRemoveHolding(String(symbol)), { parse_mode: "HTML" });
  });

  bot.action(/^remove_cancel:(.+)$/, async (ctx) => {
    await ctx.answerCbQuery("Cancelled.");
    await ctx.editMessageText("Removal cancelled.", { parse_mode: "HTML" });
  });
}
