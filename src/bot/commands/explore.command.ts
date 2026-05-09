import { BotContext } from "../types";
import { StockService } from "../services/stock-service";
import { MarketId, TelegramUserId } from "@/types/common";
import { sendTyping } from "../utils/typing";
import { setExploreCache, sendExplorePage } from "../callbacks/explore.callback";

export function createExploreHandler(stockService: StockService) {
  return async (ctx: BotContext): Promise<void> => {
    const userId = ctx.from?.id as TelegramUserId | undefined;
    if (!userId) {
      await ctx.reply("Could not identify your Telegram user. Please try again.");
      return;
    }

    await sendTyping(ctx);
    await ctx.replyWithHTML("<b>🔍 Screening NGX dividend stocks...</b>");

    const candidates = await stockService.exploreStocks("ngx" as MarketId, 10);

    if (candidates.length === 0) {
      await ctx.replyWithHTML("No dividend stocks found matching your criteria right now.");
      return;
    }

    setExploreCache(Number(userId), candidates);
    await sendExplorePage(ctx, candidates, 0);
  };
}
