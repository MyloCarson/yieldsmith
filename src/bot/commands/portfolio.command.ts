import { BotContext } from "../types";
import { PortfolioService } from "../services/portfolio-service";
import { formatPortfolio } from "../formatters/portfolio-formatter";
import { portfolioKeyboard } from "../keyboards/portfolio.keyboard";
import { sendTyping } from "../utils/typing";
import { TelegramUserId } from "@/types/common";

export function createPortfolioHandler(portfolioService: PortfolioService) {
  return async (ctx: BotContext): Promise<void> => {
    const userId = ctx.from?.id as TelegramUserId | undefined;
    if (!userId) {
      await ctx.reply("Could not identify your Telegram user. Please try again.");
      return;
    }

    await sendTyping(ctx);
    await ctx.replyWithHTML("<b>📂 Loading your portfolio...</b>");

    const holdings = await portfolioService.getHoldings(userId);
    await ctx.replyWithHTML(formatPortfolio(holdings), portfolioKeyboard());
  };
}
