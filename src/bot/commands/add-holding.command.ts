import { format } from "date-fns";
import { BotContext } from "../types";
import { PortfolioService } from "../services/portfolio-service";
import { formatAddHolding } from "../formatters/portfolio-formatter";
import { TelegramUserId, StockSymbol, MarketId } from "@/types/common";

export function createAddHoldingHandler(portfolioService: PortfolioService) {
  return async (ctx: BotContext): Promise<void> => {
    const userId = ctx.from?.id as TelegramUserId | undefined;
    if (!userId) {
      await ctx.reply("Could not identify your Telegram user. Please try again.");
      return;
    }

    const text = ctx.message && "text" in ctx.message ? ctx.message.text : "";
    const parts = text.trim().split(/\s+/);

    if (parts.length < 4) {
      await ctx.reply(
        "Usage: /add_holding <SYMBOL> <QUANTITY> <PRICE> [<YYYY-MM-DD>]\n" +
          "Example: /add_holding MTNN 100 24.50 2025-01-15"
      );
      return;
    }

    const symbol = parts[1].toUpperCase() as StockSymbol;
    const quantity = parseFloat(parts[2]);
    const purchasePrice = parseFloat(parts[3]);
    const purchaseDateRaw = parts[4] ?? format(new Date(), "yyyy-MM-dd");

    if (isNaN(quantity) || quantity <= 0) {
      await ctx.reply("Quantity must be a positive number. Example: 100");
      return;
    }

    if (isNaN(purchasePrice) || purchasePrice <= 0) {
      await ctx.reply("Price must be a positive number. Example: 24.50");
      return;
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(purchaseDateRaw)) {
      await ctx.reply("Date must be in YYYY-MM-DD format. Example: 2025-01-15");
      return;
    }

    await ctx.replyWithHTML(`<b>➕ Adding ${symbol}...</b>`);

    await portfolioService.addHolding(userId, {
      symbol,
      market_id: "ngx" as MarketId,
      quantity,
      purchase_price: purchasePrice,
      purchase_date: purchaseDateRaw,
    });

    const lots = await portfolioService.getLots(userId, symbol);
    await ctx.replyWithHTML(formatAddHolding(symbol, quantity, purchasePrice, lots.length));
  };
}
