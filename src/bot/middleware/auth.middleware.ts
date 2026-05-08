import { MiddlewareFn } from "telegraf";
import { TelegramUserId } from "@/types/common";
import { BotContext } from "../types";

export function createAuthMiddleware(allowedUserIds: TelegramUserId[]): MiddlewareFn<BotContext> {
  return async (ctx, next) => {
    const userId = ctx.from?.id;
    if (!userId || !allowedUserIds.includes(userId as TelegramUserId)) {
      await ctx.reply(
        "⛔ Access restricted.\n\nYieldsmith is currently in private beta. Contact the admin to request access."
      );
      return;
    }
    return next();
  };
}

export function parseAllowedUserIds(envValue: string | undefined): TelegramUserId[] {
  if (!envValue) return [];
  return envValue
    .split(",")
    .map((id) => parseInt(id.trim(), 10))
    .filter((id) => !isNaN(id)) as TelegramUserId[];
}

export function warnIfOpenAccess(allowedUserIds: TelegramUserId[]): void {
  if (allowedUserIds.length === 0) {
    process.stderr.write(
      "[WARN] TELEGRAM_ALLOWED_USERS is not set — bot is open to ALL Telegram users.\n" +
        "[WARN] Set TELEGRAM_ALLOWED_USERS=id1,id2,... to restrict access.\n"
    );
  }
}
