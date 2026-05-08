import { format } from "date-fns";
import { StockSymbol, MarketId } from "@/types/common";
import { IStockDataProvider } from "@core/data-provider";
import { CriterionContext, CriterionEvaluation, CriterionStockData } from "@core/criterion";
import { CriterionFactory } from "@/implementations/criteria/criterion-factory";
import { safeDiv } from "@/utils/math";

export interface StockEvaluation {
  symbol: StockSymbol;
  marketId: MarketId;
  currentPrice: number;
  evaluations: CriterionEvaluation[];
  passCount: number;
  totalCount: number;
  overallScore: number;
}

export interface ExploreCandidate {
  symbol: StockSymbol;
  name: string;
  sector: string;
  currentPrice: number;
  overallScore: number;
  passCount: number;
  totalCount: number;
}

const EXPLORE_CRITERIA = [
  "dividend_yield",
  "dividend_coverage",
  "payout_ratio",
  "dividend_growth",
  "earnings_growth",
];

const NGX_WITHHOLDING_TAX = 0.1;

export class StockService {
  constructor(
    private readonly provider: IStockDataProvider,
    private readonly criterionFactory: CriterionFactory
  ) {}

  async validateSymbol(symbol: StockSymbol): Promise<boolean> {
    return this.provider.validateSymbol(symbol);
  }

  async evaluateStock(symbol: StockSymbol, marketId: MarketId): Promise<StockEvaluation> {
    const [priceSnapshot, financials, dividendHistory, historicalPrices] = await Promise.all([
      this.provider.getCurrentPrice(symbol, marketId),
      this.provider.getFinancials(symbol, marketId),
      this.provider.getDividendHistory(symbol, marketId),
      this.provider.getHistoricalPrices(symbol, marketId, 252),
    ]);

    const context = buildCriterionContext(
      symbol,
      marketId,
      priceSnapshot.currentPrice,
      financials,
      dividendHistory,
      historicalPrices
    );

    const criterionNames = await this.criterionFactory.getAllAvailable();
    const evaluations = await this.runCriteria(criterionNames, context);

    const passCount = evaluations.filter((e) => e.passed).length;
    const overallScore =
      evaluations.length > 0
        ? evaluations.reduce((sum, e) => sum + e.score, 0) / evaluations.length
        : 0;

    return {
      symbol,
      marketId,
      currentPrice: priceSnapshot.currentPrice,
      evaluations,
      passCount,
      totalCount: evaluations.length,
      overallScore,
    };
  }

  async exploreStocks(marketId: MarketId, limit = 10): Promise<ExploreCandidate[]> {
    const searchResults = await this.provider.searchStocks("", 50);
    const candidates: ExploreCandidate[] = [];

    const batchSize = 5;
    for (let i = 0; i < searchResults.length; i += batchSize) {
      const batch = searchResults.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map(async (result) => {
          try {
            const [priceSnapshot, financials, dividendHistory, historicalPrices] =
              await Promise.all([
                this.provider.getCurrentPrice(result.symbol, marketId),
                this.provider.getFinancials(result.symbol, marketId),
                this.provider.getDividendHistory(result.symbol, marketId),
                this.provider.getHistoricalPrices(result.symbol, marketId, 252),
              ]);

            const context = buildCriterionContext(
              result.symbol,
              marketId,
              priceSnapshot.currentPrice,
              financials,
              dividendHistory,
              historicalPrices
            );

            const evaluations = await this.runCriteria(EXPLORE_CRITERIA, context);
            const passCount = evaluations.filter((e) => e.passed).length;
            const overallScore =
              evaluations.length > 0
                ? evaluations.reduce((sum, e) => sum + e.score, 0) / evaluations.length
                : 0;

            return {
              symbol: result.symbol,
              name: result.name,
              sector: result.sector,
              currentPrice: priceSnapshot.currentPrice,
              overallScore,
              passCount,
              totalCount: evaluations.length,
            } satisfies ExploreCandidate;
          } catch (err) {
            process.stderr.write(`[WARN] explore: skipping ${result.symbol}: ${String(err)}\n`);
            return null;
          }
        })
      );
      for (const r of batchResults) {
        if (r !== null) candidates.push(r);
      }
    }

    return candidates.sort((a, b) => b.overallScore - a.overallScore).slice(0, limit);
  }

  private async runCriteria(
    names: string[],
    context: CriterionContext
  ): Promise<CriterionEvaluation[]> {
    const results: CriterionEvaluation[] = [];
    for (const name of names) {
      try {
        const criterion = await this.criterionFactory.createCriterion(name);
        const evaluation = await criterion.evaluate(context);
        results.push(evaluation);
      } catch (err) {
        process.stderr.write(`[WARN] Criterion "${name}" failed: ${String(err)}\n`);
      }
    }
    return results;
  }
}

function calcAnnualizedVolatility(prices: Array<{ close: number }>): number | undefined {
  if (prices.length < 2) return undefined;
  const returns: number[] = [];
  for (let i = 1; i < prices.length; i++) {
    const prev = prices[i - 1].close;
    const curr = prices[i].close;
    if (prev > 0) returns.push(Math.log(curr / prev));
  }
  if (returns.length < 2) return undefined;
  const mean = returns.reduce((s, r) => s + r, 0) / returns.length;
  const variance = returns.reduce((s, r) => s + (r - mean) ** 2, 0) / (returns.length - 1);
  return Math.sqrt(variance * 252);
}

function calcAvgDailyVolume(prices: Array<{ volume?: number }>): number | undefined {
  const volumes = prices.map((p) => p.volume).filter((v): v is number => v != null);
  if (volumes.length === 0) return undefined;
  return volumes.reduce((s, v) => s + v, 0) / volumes.length;
}

function buildCriterionContext(
  symbol: StockSymbol,
  marketId: MarketId,
  currentPrice: number,
  financials: Awaited<ReturnType<IStockDataProvider["getFinancials"]>>,
  dividendHistory: Awaited<ReturnType<IStockDataProvider["getDividendHistory"]>>,
  historicalPrices: Awaited<ReturnType<IStockDataProvider["getHistoricalPrices"]>>
): CriterionContext {
  const latestDividend = dividendHistory.at(-1);
  const dividendYield = latestDividend
    ? safeDiv(latestDividend.dividend_per_share, currentPrice)
    : undefined;

  const annualizedVolatility = calcAnnualizedVolatility(historicalPrices);
  const averageDailyVolume = calcAvgDailyVolume(historicalPrices);

  // Extra fields accessed via `as unknown` casts in specific criteria that extend CriterionStockData
  const extraStockFields: Record<string, number> = {};
  if (annualizedVolatility != null) extraStockFields["volatility"] = annualizedVolatility;
  if (averageDailyVolume != null) extraStockFields["averageDailyVolume"] = averageDailyVolume;
  if (financials?.debt != null) extraStockFields["debt"] = financials.debt;
  if (financials?.equity != null) extraStockFields["equity"] = financials.equity;

  return {
    symbol,
    marketId,
    asOfDate: format(new Date(), "yyyy-MM-dd"),
    stockData: {
      price: currentPrice,
      dividendYield,
      eps: financials?.eps,
      roe: financials ? safeDiv(financials.net_income, financials.equity) : undefined,
      debtToEquity: financials ? safeDiv(financials.debt, financials.equity) : undefined,
      bookValue: financials?.book_value,
      revenue: financials?.revenue,
      netIncome: financials?.net_income,
      ...extraStockFields,
    } as CriterionStockData,
    financials: financials
      ? {
          eps: financials.eps,
          revenue: financials.revenue,
          netIncome: financials.net_income,
          roe: safeDiv(financials.net_income, financials.equity),
          debtToEquity: safeDiv(financials.debt, financials.equity),
          bookValue: financials.book_value,
          freeCashFlow: financials.cash_flow,
        }
      : undefined,
    dividends: dividendHistory.map((d) => ({
      dividend_per_share: d.dividend_per_share,
      payment_date: d.payment_date,
      ex_dividend_date: d.ex_dividend_date,
      dividend_type: d.dividend_type,
    })),
    historical: {
      priceHistory: historicalPrices.map((p) => ({
        date: p.date,
        close: p.close,
        volume: p.volume,
      })),
    },
    withholdingTaxRate: NGX_WITHHOLDING_TAX,
  };
}
