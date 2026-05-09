import { Telegraf } from "telegraf";
import { BotContext } from "../types";
import { StockService } from "../services/stock-service";
import { RecommendationService } from "../services/recommendation-service";
import { PortfolioService } from "../services/portfolio-service";
import { formatStockEvaluation } from "../formatters/criterion-formatter";
import { formatRecommendation } from "../formatters/recommendation-formatter";
import { formatPortfolio } from "../formatters/portfolio-formatter";
import { stockHealthKeyboard, recommendKeyboard } from "../keyboards/stock.keyboard";
import { portfolioKeyboard } from "../keyboards/portfolio.keyboard";
import { sendTyping } from "../utils/typing";
import { escapeHtml } from "@/utils/html";
import { StockSymbol, MarketId, TelegramUserId } from "@/types/common";

export function registerStockCallbacks(
  bot: Telegraf<BotContext>,
  stockService: StockService,
  recommendationService: RecommendationService,
  portfolioService: PortfolioService
): void {
  bot.action(/^stock_health:(.+)$/, async (ctx) => {
    const symbol = ctx.match[1] as StockSymbol;
    await ctx.answerCbQuery();
    await sendTyping(ctx);
    const result = await stockService.evaluateStock(symbol, "ngx" as MarketId);
    await ctx.replyWithHTML(formatStockEvaluation(result), stockHealthKeyboard(String(symbol)));
  });

  bot.action(/^recommend:(.+)$/, async (ctx) => {
    const symbol = ctx.match[1] as StockSymbol;
    await ctx.answerCbQuery();
    await ctx.replyWithHTML(
      `<b>🤖 Generating AI recommendation for ${escapeHtml(String(symbol))}...</b>`
    );
    await sendTyping(ctx);
    const result = await recommendationService.getRecommendation(symbol, "ngx" as MarketId);
    await ctx.replyWithHTML(formatRecommendation(result), recommendKeyboard(String(symbol)));
  });

  bot.action(/^add_to_portfolio:(.+)$/, async (ctx) => {
    const symbol = ctx.match[1];
    await ctx.answerCbQuery();
    await ctx.reply(
      `Use the command below to add ${symbol} to your portfolio:\n\n` +
        `/add_holding ${symbol} <quantity> <price> [date]\n\n` +
        `Example: /add_holding ${symbol} 100 24.50 today`
    );
  });

  bot.action("view_portfolio", async (ctx) => {
    const userId = ctx.from?.id as TelegramUserId | undefined;
    if (!userId) {
      await ctx.answerCbQuery();
      return;
    }
    await ctx.answerCbQuery();
    await sendTyping(ctx);
    const holdings = await portfolioService.getHoldings(userId);
    await ctx.replyWithHTML(formatPortfolio(holdings), portfolioKeyboard());
  });

  bot.action("recommend_prompt", async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.reply("Send me a stock symbol to get a recommendation, e.g. /recommend MTNN");
  });

  bot.action("add_holding_prompt", async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.reply(
      "Use /add_holding to add a stock:\n\n" +
        "/add_holding <SYMBOL> <QUANTITY> <PRICE> [DATE]\n\n" +
        "Example: /add_holding MTNN 100 24.50 today"
    );
  });
}
