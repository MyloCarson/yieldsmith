import { SupabaseClient } from "@supabase/supabase-js";
import { TelegramUserId, StockSymbol, MarketId } from "@/types/common";
import { PortfolioHolding, PortfolioLot, CreateHoldingInput } from "@/types/portfolios";
import { IStockDataProvider } from "@core/data-provider";
import { safeDiv } from "@/utils/math";

export interface HoldingWithPrice extends PortfolioHolding {
  currentPrice: number;
  currentValue: number;
  unrealizedGain: number;
  unrealizedGainPercent: number;
}

interface LotRow {
  quantity: number;
  purchase_price: number;
  purchase_date: string;
}

function toHolding(row: unknown): PortfolioHolding {
  return row as PortfolioHolding;
}

function toLot(row: unknown): PortfolioLot {
  return row as PortfolioLot;
}

function toLotRow(row: unknown): LotRow {
  return row as LotRow;
}

export class PortfolioService {
  constructor(
    private readonly db: SupabaseClient,
    private readonly provider: IStockDataProvider
  ) {}

  async getHoldings(userId: TelegramUserId): Promise<HoldingWithPrice[]> {
    const result = await this.db
      .from("portfolios")
      .select("*")
      .eq("user_id", userId)
      .eq("is_active", true)
      .order("symbol");

    if (result.error) throw new Error(`Failed to fetch holdings: ${result.error.message}`);
    if (!result.data || result.data.length === 0) return [];

    const rows = (result.data as unknown[]).map(toHolding);

    const holdings = await Promise.all(
      rows.map(async (holding) => {
        let currentPrice = holding.purchase_price;
        try {
          const snapshot = await this.provider.getCurrentPrice(holding.symbol, holding.market_id);
          currentPrice = snapshot.currentPrice;
        } catch {
          // fall back to purchase price if provider fails
        }

        const totalInvested = holding.quantity * holding.purchase_price;
        const currentValue = holding.quantity * currentPrice;
        const unrealizedGain = currentValue - totalInvested;
        const unrealizedGainPercent = safeDiv(unrealizedGain, totalInvested) * 100;

        return {
          ...holding,
          currentPrice,
          currentValue,
          unrealizedGain,
          unrealizedGainPercent,
        } satisfies HoldingWithPrice;
      })
    );

    return holdings;
  }

  async getLots(
    userId: TelegramUserId,
    symbol: StockSymbol,
    marketId: MarketId
  ): Promise<PortfolioLot[]> {
    const result = await this.db
      .from("portfolio_lots")
      .select("*")
      .eq("user_id", userId)
      .eq("symbol", symbol)
      .eq("market_id", marketId)
      .order("purchase_date", { ascending: true });

    if (result.error) throw new Error(`Failed to fetch lots: ${result.error.message}`);
    return ((result.data as unknown[]) ?? []).map(toLot);
  }

  async addHolding(userId: TelegramUserId, input: CreateHoldingInput): Promise<PortfolioHolding> {
    const valid = await this.provider.validateSymbol(input.symbol);
    if (!valid) throw new Error(`Symbol "${input.symbol}" not found on NGX`);

    // 1. Insert the new lot
    const lotResult = await this.db.from("portfolio_lots").insert({
      user_id: userId,
      symbol: input.symbol,
      market_id: input.market_id,
      quantity: input.quantity,
      purchase_price: input.purchase_price,
      purchase_date: input.purchase_date,
      notes: input.notes ?? null,
    });

    if (lotResult.error) throw new Error(`Failed to add lot: ${lotResult.error.message}`);

    // 2. Re-aggregate all lots for this symbol + market → upsert into portfolios
    const lotsResult = await this.db
      .from("portfolio_lots")
      .select("quantity, purchase_price, purchase_date")
      .eq("user_id", userId)
      .eq("symbol", input.symbol)
      .eq("market_id", input.market_id);

    if (lotsResult.error) throw new Error(`Failed to aggregate lots: ${lotsResult.error.message}`);

    const lots = (lotsResult.data as unknown[]).map(toLotRow);
    const totalQuantity = lots.reduce((sum, l) => sum + l.quantity, 0);
    const weightedPrice = safeDiv(
      lots.reduce((sum, l) => sum + l.quantity * l.purchase_price, 0),
      totalQuantity
    );
    const earliestDate = lots.map((l) => l.purchase_date).sort()[0];

    const upsertResult = await this.db
      .from("portfolios")
      .upsert(
        {
          user_id: userId,
          symbol: input.symbol,
          market_id: input.market_id,
          quantity: totalQuantity,
          purchase_price: weightedPrice,
          purchase_date: earliestDate,
          is_active: true,
        },
        { onConflict: "user_id,symbol,market_id" }
      )
      .select()
      .single();

    if (upsertResult.error)
      throw new Error(`Failed to upsert portfolio: ${upsertResult.error.message}`);
    return toHolding(upsertResult.data);
  }

  async removeHolding(
    userId: TelegramUserId,
    symbol: StockSymbol,
    marketId: MarketId
  ): Promise<void> {
    const lotResult = await this.db
      .from("portfolio_lots")
      .delete()
      .eq("user_id", userId)
      .eq("symbol", symbol)
      .eq("market_id", marketId);

    if (lotResult.error) throw new Error(`Failed to remove lots: ${lotResult.error.message}`);

    const portfolioResult = await this.db
      .from("portfolios")
      .delete()
      .eq("user_id", userId)
      .eq("symbol", symbol)
      .eq("market_id", marketId);

    if (portfolioResult.error)
      throw new Error(`Failed to remove holding: ${portfolioResult.error.message}`);
  }

  async getHoldingBySymbol(
    userId: TelegramUserId,
    symbol: StockSymbol,
    marketId: MarketId
  ): Promise<PortfolioHolding | null> {
    const result = await this.db
      .from("portfolios")
      .select("*")
      .eq("user_id", userId)
      .eq("symbol", symbol)
      .eq("market_id", marketId)
      .eq("is_active", true)
      .maybeSingle();

    if (result.error) throw new Error(`Failed to fetch holding: ${result.error.message}`);
    return result.data ? toHolding(result.data) : null;
  }
}
