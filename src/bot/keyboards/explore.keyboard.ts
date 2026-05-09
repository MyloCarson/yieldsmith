import { Markup } from "telegraf";

export function exploreStockKeyboard(
  symbol: string,
  hasNextPage: boolean,
  nextOffset: number
): ReturnType<typeof Markup.inlineKeyboard> {
  const rows = [
    [
      Markup.button.callback("📊 Health", `stock_health:${symbol}`),
      Markup.button.callback("🤖 Recommend", `recommend:${symbol}`),
    ],
  ];
  if (hasNextPage) {
    rows.push([Markup.button.callback("Next →", `explore_page:${nextOffset}`)]);
  }
  return Markup.inlineKeyboard(rows);
}
