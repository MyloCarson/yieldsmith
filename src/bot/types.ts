import { Context } from "telegraf";
import { TelegramUserId } from "@/types/common";

export interface BotContext extends Context {}

export interface BotConfig {
  token: string;
  allowedUserIds?: TelegramUserId[];
}
