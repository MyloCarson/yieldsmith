import { CriterionContext, CriterionEvaluation, CriterionThresholds } from "@core/criterion";
import { Score } from "@/types/common";
import { CriterionValidationError } from "@core/errors";
import { RiskCriterion } from "./base-criterion";

// User's target sector allocations (max before it's considered overweight)
const SECTOR_TARGETS: Record<string, { target: number; max: number; label: string }> = {
  Banking: { target: 0.375, max: 0.45, label: "Banking" },
  Industrials: { target: 0.225, max: 0.30, label: "Industrials" },
  Consumer: { target: 0.175, max: 0.25, label: "Consumer Goods" },
  "Oil & Gas": { target: 0.125, max: 0.20, label: "Oil & Gas" },
  Telecoms: { target: 0.125, max: 0.20, label: "Telecoms" },
};

// Maps NGX Pulse sector strings → user's category names
const SECTOR_MAP: Record<string, string> = {
  "Financial Services": "Banking",
  Banking: "Banking",
  Insurance: "Banking",
  "Industrial Goods": "Industrials",
  Industrials: "Industrials",
  "Construction/Real Estate": "Industrials",
  "Consumer Goods": "Consumer",
  "Food/Beverages/Tobacco": "Consumer",
  Conglomerates: "Consumer",
  "Oil And Gas": "Oil & Gas",
  Agriculture: "Oil & Gas",
  "Natural Resources": "Oil & Gas",
  Telecommunications: "Telecoms",
  ICT: "Telecoms",
};

export class SectorConcentrationCriterion extends RiskCriterion {
  readonly name = "sector_concentration";
  readonly displayName = "Sector Balance";
  readonly description = "Adding this stock keeps your portfolio sectors balanced";
  readonly weight: Score = 0.05 as Score;

  protected validateRequiredFields(context: CriterionContext): void {
    if (!context.stockData?.sector && !(context.stockData as unknown as Record<string, unknown>)?.["sector"]) {
      throw new CriterionValidationError(this.name, ["stockData.sector"]);
    }
  }

  evaluate(context: CriterionContext): Promise<CriterionEvaluation> {
    this.validateContext(context);

    const rawSector = String(
      (context.stockData as unknown as Record<string, unknown>)?.["sector"] ??
        context.stockData?.sector ??
        "Unknown"
    );
    const userSector = SECTOR_MAP[rawSector] ?? "Other";
    const portfolioCtx = context.portfolioContext;

    // No portfolio context — informational only
    if (!portfolioCtx || portfolioCtx.totalValue === 0) {
      return Promise.resolve(
        this.createEvaluation(
          context,
          true,
          0.7 as Score,
          0,
          `Sector: ${rawSector}. Add holdings to your portfolio to get sector concentration warnings.`,
          this.getThresholds()
        )
      );
    }

    const currentAlloc = portfolioCtx.sectorAllocations[userSector] ?? 0;
    const target = SECTOR_TARGETS[userSector];

    if (!target) {
      // Unknown sector — pass with neutral score
      return Promise.resolve(
        this.createEvaluation(
          context,
          true,
          0.65 as Score,
          currentAlloc,
          `${rawSector} sector — ${(currentAlloc * 100).toFixed(1)}% of your portfolio`,
          this.getThresholds()
        )
      );
    }

    const currentPct = currentAlloc * 100;
    const maxPct = target.max * 100;
    const targetPct = target.target * 100;

    const isOverweight = currentAlloc >= target.max;
    const isNearMax = currentAlloc >= target.max * 0.9;

    let score: Score;
    let passed: boolean;
    let explanation: string;

    if (isOverweight) {
      passed = false;
      score = this.boundScore(Math.max(0, 1 - (currentAlloc - target.max) / target.max));
      explanation =
        `Your portfolio is already ${currentPct.toFixed(1)}% ${target.label} — above your ${maxPct.toFixed(0)}% limit. ` +
        `Adding more would increase concentration risk. Consider other sectors first.`;
    } else if (isNearMax) {
      passed = true;
      score = 0.55 as Score;
      explanation =
        `${target.label} is at ${currentPct.toFixed(1)}% — approaching your ${maxPct.toFixed(0)}% limit. ` +
        `You can still add this, but monitor your banking exposure after.`;
    } else {
      passed = true;
      const headroom = target.max - currentAlloc;
      score = this.boundScore(0.7 + headroom * 0.5);
      explanation =
        `${target.label} is at ${currentPct.toFixed(1)}% — well within your target of ${targetPct.toFixed(0)}%. Good balance.`;
    }

    return Promise.resolve(
      this.createEvaluation(context, passed, score, currentAlloc, explanation, this.getThresholds())
    );
  }

  getThresholds(_context?: CriterionContext): CriterionThresholds {
    return {
      name: this.name,
      description: "Sector allocation vs portfolio targets",
      min: 0,
      max: 0.45,
      target: 0.35,
      unit: "%",
    };
  }

  getLogicExplanation(): string {
    return "Checks if adding this stock would over-concentrate your portfolio in one sector. Based on your target allocations: Banking 35-40%, Industrials 20-25%, Consumer 15-20%, Oil & Gas 10-15%, Telecoms 10-15%.";
  }

  initialize(): Promise<void> {
    return Promise.resolve();
  }

  isHealthy(): Promise<boolean> {
    return Promise.resolve(true);
  }
}

export function createSectorConcentrationCriterion(): SectorConcentrationCriterion {
  return new SectorConcentrationCriterion();
}
