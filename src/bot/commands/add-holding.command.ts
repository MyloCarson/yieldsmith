import * as chrono from "chrono-node";
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
        "Usage: /add_holding <SYMBOL> <QUANTITY> <PRICE> [<DATE>]\n" +
          "Example: /add_holding MTNN 100 24.50 today\n" +
          "Example: /add_holding MTNN 100 24.50 last Thursday\n" +
          "Example: /add_holding MTNN 100 24.50 2025-01-15"
      );
      return;
    }

    const symbol = parts[1].toUpperCase() as StockSymbol;
    const quantity = parseFloat(parts[2]);
    const purchasePrice = parseFloat(parts[3]);

    // Everything after the price is treated as the date string
    const dateInput = parts.slice(4).join(" ") || "today";
    const parsedDate = chrono.parseDate(dateInput, new Date(), { forwardDate: false });

    if (isNaN(quantity) || quantity <= 0) {
      await ctx.reply("Quantity must be a positive number. Example: 100");
      return;
    }

    if (isNaN(purchasePrice) || purchasePrice <= 0) {
      await ctx.reply("Price must be a positive number. Example: 24.50");
      return;
    }

    if (!parsedDate) {
      await ctx.reply(
        `Couldn't understand the date "${dateInput}". Try: today, yesterday, last Monday, 3 weeks ago, or 2025-01-15`
      );
      return;
    }

    if (parsedDate > new Date()) {
      await ctx.reply("Purchase date can't be in the future.");
      return;
    }

    const purchaseDate = format(parsedDate, "yyyy-MM-dd");

    await ctx.replyWithHTML(`<b>➕ Adding ${symbol}...</b>`);

    await portfolioService.addHolding(userId, {
      symbol,
      market_id: "ngx" as MarketId,
      quantity,
      purchase_price: purchasePrice,
      purchase_date: purchaseDate,
    });

    const lots = await portfolioService.getLots(userId, symbol);
    await ctx.replyWithHTML(formatAddHolding(symbol, quantity, purchasePrice, lots.length));
  };
}
