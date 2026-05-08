import { BotContext } from "../types";
import { StockService } from "../services/stock-service";
import { formatStockEvaluation } from "../formatters/criterion-formatter";
import { StockSymbol, MarketId } from "@/types/common";

export function createStockHealthHandler(stockService: StockService) {
  return async (ctx: BotContext): Promise<void> => {
    const text = ctx.message && "text" in ctx.message ? ctx.message.text : "";
    const parts = text.trim().split(/\s+/);
    const symbolInput = parts[1];

    if (!symbolInput) {
      await ctx.reply("Usage: /stock_health <SYMBOL>\nExample: /stock_health MTNN");
      return;
    }

    const symbol = symbolInput.toUpperCase() as StockSymbol;
    const marketId = "ngx" as MarketId;

    const valid = await stockService.validateSymbol(symbol);
    if (!valid) {
      await ctx.reply(`Symbol "${symbol}" not found on NGX. Check the ticker and try again.`);
      return;
    }

    await ctx.replyWithHTML(`<b>🔍 Analysing ${symbol}...</b>`);

    const result = await stockService.evaluateStock(symbol, marketId);
    await ctx.replyWithHTML(formatStockEvaluation(result));
  };
}
