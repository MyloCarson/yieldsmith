import { Markup } from "telegraf";

export function stockHealthKeyboard(symbol: string): ReturnType<typeof Markup.inlineKeyboard> {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback("🤖 Get AI Rec", `recommend:${symbol}`),
      Markup.button.callback("➕ Add to Portfolio", `add_to_portfolio:${symbol}`),
    ],
  ]);
}

export function recommendKeyboard(symbol: string): ReturnType<typeof Markup.inlineKeyboard> {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback("➕ Add to Portfolio", `add_to_portfolio:${symbol}`),
      Markup.button.callback("📂 My Portfolio", "view_portfolio"),
    ],
  ]);
}
