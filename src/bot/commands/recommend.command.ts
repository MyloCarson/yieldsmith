import { BotContext } from "../types";
import { RecommendationService } from "../services/recommendation-service";
import { formatRecommendation } from "../formatters/recommendation-formatter";
import { recommendKeyboard } from "../keyboards/stock.keyboard";
import { sendTyping } from "../utils/typing";
import { escapeHtml } from "@/utils/html";
import { StockSymbol, MarketId } from "@/types/common";

export function createRecommendHandler(recommendationService: RecommendationService) {
  return async (ctx: BotContext): Promise<void> => {
    const text = ctx.message && "text" in ctx.message ? ctx.message.text : "";
    const parts = text.trim().split(/\s+/);
    const symbolInput = parts[1];

    if (!symbolInput) {
      await ctx.reply("Usage: /recommend <SYMBOL>\nExample: /recommend MTNN");
      return;
    }

    const symbol = symbolInput.toUpperCase() as StockSymbol;
    const marketId = "ngx" as MarketId;

    const isValid = await recommendationService.validateSymbol(symbol);
    if (!isValid) {
      await ctx.reply(`Symbol "${symbol}" not found on NGX. Check the ticker and try again.`);
      return;
    }

    await sendTyping(ctx);
    await ctx.replyWithHTML(
      `<b>🤖 Generating AI recommendation for ${escapeHtml(String(symbol))}...</b>`
    );

    const result = await recommendationService.getRecommendation(symbol, marketId);
    await ctx.replyWithHTML(formatRecommendation(result), recommendKeyboard(String(symbol)));
  };
}
