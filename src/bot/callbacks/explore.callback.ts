import { Telegraf } from "telegraf";
import { BotContext } from "../types";
import { StockService, ExploreCandidate } from "../services/stock-service";
import { MarketId } from "@/types/common";
import { formatExploreCard } from "../formatters/criterion-formatter";
import { exploreStockKeyboard } from "../keyboards/explore.keyboard";
import { sendTyping } from "../utils/typing";

const PAGE_SIZE = 3;
const CACHE_TTL_MS = 10 * 60 * 1000;

const exploreCache = new Map<
  number,
  { candidates: ExploreCandidate[]; timer: ReturnType<typeof setTimeout> }
>();

export function setExploreCache(userId: number, candidates: ExploreCandidate[]): void {
  const existing = exploreCache.get(userId);
  if (existing) clearTimeout(existing.timer);
  const timer = setTimeout(() => exploreCache.delete(userId), CACHE_TTL_MS);
  exploreCache.set(userId, { candidates, timer });
}

export function getExploreCache(userId: number): ExploreCandidate[] | undefined {
  return exploreCache.get(userId)?.candidates;
}

export async function sendExplorePage(
  ctx: BotContext,
  candidates: ExploreCandidate[],
  offset: number
): Promise<void> {
  const page = candidates.slice(offset, offset + PAGE_SIZE);
  for (let i = 0; i < page.length; i++) {
    const candidate = page[i];
    const isLast = i === page.length - 1;
    const nextOffset = offset + PAGE_SIZE;
    const hasNext = isLast && nextOffset < candidates.length;
    await ctx.replyWithHTML(
      formatExploreCard(candidate, offset + i + 1),
      exploreStockKeyboard(String(candidate.symbol), hasNext, nextOffset)
    );
  }
}

export function registerExploreCallbacks(
  bot: Telegraf<BotContext>,
  stockService: StockService
): void {
  bot.action("explore", async (ctx) => {
    const userId = ctx.from?.id;
    if (!userId) {
      await ctx.answerCbQuery();
      return;
    }
    await ctx.answerCbQuery();
    await sendTyping(ctx);
    await ctx.replyWithHTML("<b>🔍 Screening NGX dividend stocks...</b>");
    const candidates = await stockService.exploreStocks("ngx" as MarketId, 10);
    if (candidates.length === 0) {
      await ctx.replyWithHTML("No dividend stocks found matching your criteria right now.");
      return;
    }
    setExploreCache(userId, candidates);
    await sendExplorePage(ctx, candidates, 0);
  });

  bot.action(/^explore_page:(\d+)$/, async (ctx) => {
    const userId = ctx.from?.id;
    if (!userId) {
      await ctx.answerCbQuery();
      return;
    }
    const offset = parseInt(ctx.match[1], 10);
    const candidates = getExploreCache(userId);
    if (!candidates) {
      await ctx.answerCbQuery("Session expired. Run /explore again.");
      return;
    }
    if (offset >= candidates.length) {
      await ctx.answerCbQuery("No more results.");
      return;
    }
    await ctx.answerCbQuery();
    await sendExplorePage(ctx, candidates, offset);
  });
}
