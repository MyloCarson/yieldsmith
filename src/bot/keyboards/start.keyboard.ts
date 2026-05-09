import { Markup } from "telegraf";

export function startKeyboard(): ReturnType<typeof Markup.inlineKeyboard> {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback("🔍 Explore Stocks", "explore"),
      Markup.button.callback("📂 My Portfolio", "view_portfolio"),
    ],
    [Markup.button.callback("💡 Recommend a Stock", "recommend_prompt")],
  ]);
}
