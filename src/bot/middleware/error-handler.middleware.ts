import { MiddlewareFn } from "telegraf";
import { BotContext } from "../types";

export function createErrorHandlerMiddleware(): MiddlewareFn<BotContext> {
  return async (ctx, next) => {
    try {
      await next();
    } catch (error) {
      console.error("Bot command error:", error);
      try {
        await ctx.reply("Something went wrong. Please try again in a moment.");
      } catch {
        // Ignore reply failure — original context may be stale
      }
    }
  };
}
