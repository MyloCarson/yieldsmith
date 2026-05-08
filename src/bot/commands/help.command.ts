import { BotContext } from "../types";

export async function handleHelp(ctx: BotContext): Promise<void> {
  await ctx.replyWithHTML(
    `<b>📖 Yieldsmith Commands</b>\n\n` +
      `<b>Portfolio</b>\n` +
      `/portfolio — View your current holdings\n` +
      `/add_holding — Add a stock to your portfolio\n` +
      `/remove_holding — Remove a stock from your portfolio\n` +
      `/performance — Portfolio returns and metrics\n\n` +
      `<b>Analysis</b>\n` +
      `/stock_health &lt;SYMBOL&gt; — Full stock analysis against all criteria\n` +
      `/explore — Discover dividend stocks meeting your strategy\n` +
      `/recommend — AI recommendations based on your strategy\n\n` +
      `<b>Dividends</b>\n` +
      `/dividend_calendar — Upcoming dividend payments\n` +
      `/dividend_history — Historical dividend records\n` +
      `/goal_roadmap — Progress toward your income goal\n\n` +
      `<b>Risk</b>\n` +
      `/portfolio_health — Concentration risk and sector analysis\n` +
      `/rebalance — Rebalancing suggestions\n` +
      `/alerts — Configure notification preferences\n\n` +
      `<b>Settings</b>\n` +
      `/settings — Update goals, strategy, and thresholds\n` +
      `/health — System status\n` +
      `/help — This message`
  );
}
