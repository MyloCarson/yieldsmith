import { BotContext } from "../types";

export async function handleHelp(ctx: BotContext): Promise<void> {
  await ctx.replyWithHTML(
    `<b>📖 Yieldsmith Commands</b>\n\n` +
      `<b>Available now</b>\n` +
      `/start — Welcome and introduction\n` +
      `/help — This message\n` +
      `/health — System status\n` +
      `/stock_health &lt;SYMBOL&gt; — Full stock analysis against all criteria\n` +
      `/explore — Discover top NGX dividend stocks\n` +
      `/portfolio — View your current holdings\n` +
      `/add_holding &lt;SYMBOL&gt; &lt;QTY&gt; &lt;PRICE&gt; [&lt;DATE&gt;] — Add a stock to your portfolio\n` +
      `/remove_holding &lt;SYMBOL&gt; — Remove a stock from your portfolio\n\n` +
      `<b>Coming soon — Portfolio</b>\n` +
      `/performance — Portfolio returns and metrics\n\n` +
      `<b>Coming soon — Analysis</b>\n` +
      `/recommend — AI-powered recommendations\n\n` +
      `<b>Coming soon — Dividends</b>\n` +
      `/dividend_calendar — Upcoming dividend payments\n` +
      `/dividend_history — Historical dividend records\n` +
      `/goal_roadmap — Progress toward your income goal\n\n` +
      `<b>Coming soon — Risk</b>\n` +
      `/portfolio_health — Concentration risk and sector analysis\n` +
      `/rebalance — Rebalancing suggestions\n` +
      `/alerts — Configure notification preferences\n\n` +
      `<b>Coming soon — Settings</b>\n` +
      `/settings — Update goals, strategy, and thresholds`
  );
}
