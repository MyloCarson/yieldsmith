import { BotContext } from "../types";
import { StockService } from "../services/stock-service";
import { formatExploreResults } from "../formatters/criterion-formatter";
import { MarketId } from "@/types/common";

export function createExploreHandler(stockService: StockService) {
  return async (ctx: BotContext): Promise<void> => {
    await ctx.replyWithHTML("<b>🔍 Screening NGX dividend stocks...</b>");

    const candidates = await stockService.exploreStocks("ngx" as MarketId, 10);
    await ctx.replyWithHTML(formatExploreResults(candidates));
  };
}
