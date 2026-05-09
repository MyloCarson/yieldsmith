import { CriterionContext, CriterionEvaluation, CriterionThresholds } from "@core/criterion";
import { Score } from "@/types/common";
import { CriterionValidationError } from "@core/errors";
import { ValuationCriterion } from "./base-criterion";

// NGX sector P/E benchmarks based on market norms
// Banking sectors trade cheaply; consumer goods trade at a premium
const SECTOR_PE: Record<string, { min: number; target: number; max: number; label: string }> = {
  "Financial Services": { min: 3, target: 7, max: 12, label: "banks" },
  Banking: { min: 3, target: 7, max: 12, label: "banks" },
  Insurance: { min: 5, target: 9, max: 15, label: "insurance" },
  "Industrial Goods": { min: 6, target: 12, max: 18, label: "industrial companies" },
  Industrials: { min: 6, target: 12, max: 18, label: "industrial companies" },
  "Construction/Real Estate": { min: 8, target: 14, max: 22, label: "real estate" },
  "Consumer Goods": { min: 10, target: 18, max: 28, label: "consumer goods companies" },
  "Food/Beverages/Tobacco": { min: 12, target: 20, max: 30, label: "food & beverage companies" },
  "Oil And Gas": { min: 5, target: 10, max: 16, label: "oil & gas companies" },
  Agriculture: { min: 6, target: 11, max: 18, label: "agricultural companies" },
  "Natural Resources": { min: 6, target: 11, max: 18, label: "resource companies" },
  Telecommunications: { min: 8, target: 14, max: 22, label: "telecom companies" },
  ICT: { min: 10, target: 15, max: 25, label: "tech companies" },
  Conglomerates: { min: 6, target: 12, max: 20, label: "conglomerates" },
  "Healthcare/Pharmaceuticals": { min: 10, target: 16, max: 25, label: "healthcare companies" },
  Pharmaceuticals: { min: 10, target: 16, max: 25, label: "healthcare companies" },
};

const DEFAULT_PE = { min: 5, target: 12, max: 20, label: "companies in this sector" };

export class PERatioCriterion extends ValuationCriterion {
  readonly name = "pe_ratio";
  readonly displayName = "P/E Ratio";
  readonly description = "Stock price is reasonable relative to earnings for its sector";
  readonly weight: Score = 0.15 as Score;

  protected validateRequiredFields(context: CriterionContext): void {
    const hasPERatio = (context.stockData as unknown as Record<string, unknown>)?.["peRatio"] != null;
    const hasEPS = context.stockData?.eps != null && context.stockData.eps > 0;
    const hasPrice = context.stockData?.price != null;

    if (!hasPrice) {
      throw new CriterionValidationError(this.name, ["stockData.price"]);
    }
    if (!hasPERatio && !hasEPS) {
      throw new CriterionValidationError(this.name, ["stockData.peRatio or stockData.eps"]);
    }
  }

  evaluate(context: CriterionContext): Promise<CriterionEvaluation> {
    this.validateContext(context);

    const stockData = context.stockData!;
    const rawData = stockData as unknown as Record<string, unknown>;

    // Use direct peRatio from API first (more accurate), fall back to price/eps
    let peRatio: number;
    if (rawData["peRatio"] != null && Number(rawData["peRatio"]) > 0) {
      peRatio = Number(rawData["peRatio"]);
    } else {
      const eps = stockData.eps!;
      if (eps <= 0) {
        return Promise.resolve(
          this.createEvaluation(
            context,
            false,
            0 as Score,
            0,
            "Cannot check price — company has no earnings or is losing money",
            this.getThresholds(context)
          )
        );
      }
      peRatio = stockData.price / eps;
    }

    const sector = String(rawData["sector"] ?? "");
    const benchmark = SECTOR_PE[sector] ?? DEFAULT_PE;

    const passed = peRatio >= benchmark.min && peRatio <= benchmark.max;
    const score = this.calcScore(peRatio, benchmark);
    const explanation = this.buildExplanation(peRatio, benchmark, passed);

    return Promise.resolve(
      this.createEvaluation(context, passed, score, peRatio, explanation, this.getThresholds(context))
    );
  }

  getThresholds(context?: CriterionContext): CriterionThresholds {
    const sector = String((context?.stockData as unknown as Record<string, unknown>)?.["sector"] ?? "");
    const b = SECTOR_PE[sector] ?? DEFAULT_PE;
    return {
      name: this.name,
      description: "Price-to-Earnings ratio for sector",
      min: b.min,
      max: b.max,
      target: b.target,
      unit: "x",
    };
  }

  getLogicExplanation(): string {
    return "Checks if the stock price is reasonable compared to company earnings, using sector-specific benchmarks. Overpaying for a stock reduces your returns.";
  }

  initialize(): Promise<void> {
    return Promise.resolve();
  }

  isHealthy(): Promise<boolean> {
    return Promise.resolve(true);
  }

  private calcScore(
    pe: number,
    b: { min: number; target: number; max: number }
  ): Score {
    if (pe < b.min) {
      // Too cheap — penalise but not harshly (might be a real bargain)
      const depth = b.min - pe;
      return this.boundScore(Math.max(0, 1 - depth / (b.min * 0.6)) * 0.4);
    }
    if (pe <= b.target) {
      // Between min and target: 0.6 → 0.9
      const pos = (pe - b.min) / (b.target - b.min);
      return this.boundScore(0.6 + pos * 0.3);
    }
    if (pe <= b.max) {
      // Between target and max: 0.9 → 0.7
      const pos = (pe - b.target) / (b.max - b.target);
      return this.boundScore(0.9 - pos * 0.2);
    }
    // Above max — overpriced, penalise steeply
    const excess = pe - b.max;
    return this.boundScore(Math.max(0, 1 - excess / b.max) * 0.35);
  }

  private buildExplanation(
    pe: number,
    b: { min: number; target: number; max: number; label: string },
    passed: boolean
  ): string {
    const range = `${b.min}–${b.max}x`;
    if (!passed) {
      if (pe > b.max) {
        return `P/E ${pe.toFixed(1)}x — overpriced for ${b.label} (fair range: ${range})`;
      }
      return `P/E ${pe.toFixed(1)}x — suspiciously cheap for ${b.label}, investigate why (fair range: ${range})`;
    }
    return `P/E ${pe.toFixed(1)}x — fairly priced for ${b.label} (fair range: ${range})`;
  }
}

export function createPERatioCriterion(): PERatioCriterion {
  return new PERatioCriterion();
}
