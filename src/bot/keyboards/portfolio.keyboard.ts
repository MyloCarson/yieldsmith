import { Markup } from "telegraf";

export function portfolioKeyboard(): ReturnType<typeof Markup.inlineKeyboard> {
  return Markup.inlineKeyboard([[Markup.button.callback("➕ Add Holding", "add_holding_prompt")]]);
}

export function removeConfirmKeyboard(symbol: string): ReturnType<typeof Markup.inlineKeyboard> {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback("✅ Confirm", `remove_confirm:${symbol}`),
      Markup.button.callback("❌ Cancel", `remove_cancel:${symbol}`),
    ],
  ]);
}
