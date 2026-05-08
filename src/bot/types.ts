import { Context } from "telegraf";
import { TelegramUserId } from "@/types/common";

export interface BotSessionData {
  userId: TelegramUserId;
  username?: string;
  firstName: string;
}

export interface BotContext extends Context {
  session?: BotSessionData;
}

export interface BotConfig {
  token: string;
  allowedUserIds?: TelegramUserId[];
  pollingTimeoutSeconds?: number;
}
