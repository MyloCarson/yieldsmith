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

  bot.on("callback_query", async (ctx) => {
    await ctx.answerCbQuery();
  });
}
