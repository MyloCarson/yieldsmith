import { Telegraf } from "telegraf";
import { BotContext } from "../types";
import { StockService } from "../services/stock-service";
import { PortfolioService } from "../services/portfolio-service";
import { RecommendationService } from "../services/recommendation-service";
import { registerExploreCallbacks } from "./explore.callback";
import { registerStockCallbacks } from "./stock.callback";
import { registerPortfolioCallbacks } from "./portfolio.callback";

export function registerCallbacks(
  bot: Telegraf<BotContext>,
  stockService: StockService,
  portfolioService: PortfolioService,
  recommendationService: RecommendationService
): void {
  registerExploreCallbacks(bot, stockService);
  registerStockCallbacks(bot, stockService, recommendationService, portfolioService);
  registerPortfolioCallbacks(bot, portfolioService);

  // Safe fallback: answer any callback query not already handled by bot.action()
  bot.use(async (ctx, next) => {
    await next();
    if ("callback_query" in ctx.update) {
      try {
        await ctx.answerCbQuery();
      } catch {
        // Already answered by a specific action handler — ignore
      }
    }
  });
}
