/**
 * Sector Concentration Criterion
 * Evaluates portfolio diversification across sectors
 *
 * Rationale:
 * - High concentration in single sector: high systematic risk
 * - Diversified: better risk management
 * - Useful for portfolio-level evaluation
 */

import { CriterionContext, CriterionEvaluation, CriterionThresholds } from "@core/criterion";
import { Score } from "@/types/common";
import { CriterionValidationError } from "@core/errors";
import { RiskCriterion } from "./base-criterion";

/**
 * Sector Concentration Criterion Implementation
 */
export class SectorConcentrationCriterion extends RiskCriterion {
  readonly name = "sector_concentration";
  readonly displayName = "Sector Concentration";
  readonly description = "Stock is in a sector that maintains portfolio diversification";
  readonly weight: Score = 0.05 as Score;

  protected validateRequiredFields(context: CriterionContext): void {
    if (!context.stockData?.sector) {
      throw new CriterionValidationError(this.name, ["sector"]);
    }
  }

  evaluate(context: CriterionContext): Promise<CriterionEvaluation> {
    this.validateContext(context);

    // This is a simplified implementation
    // In production, would need portfolio context to evaluate concentration
    // For now, treat single stock as acceptable unless sector is known to be problematic
    const sector = context.stockData?.sector ?? "Unknown";

    // Score based on sector diversification (simplified)
    const diversifiedSectors = [
      "Consumer",
      "Healthcare",
      "Technology",
      "Financials",
      "Industrials",
      "Materials",
    ];
    const isWellDiversifiedSector = diversifiedSectors.includes(sector);

    const score: Score = isWellDiversifiedSector ? (0.8 as Score) : (0.6 as Score);
    const isAcceptable = true; // Single stocks don't have concentration risk

    const explanation = this.buildExplanation(sector, isWellDiversifiedSector);

    return Promise.resolve(
      this.createEvaluation(context, isAcceptable, score, 0, explanation, this.getThresholds())
    );
  }

  getThresholds(_context?: CriterionContext): CriterionThresholds {
    return {
      name: this.name,
      description: "Sector diversification indicator",
      min: 0,
      max: 1,
      target: 0.75,
      unit: "score",
    };
  }

  getLogicExplanation(): string {
    return `
Sector Concentration Risk:
- Single stock: Not applicable (portfolio-level concern)
- For portfolios: Monitor sector concentration
- Target: No sector > 25% of portfolio
- Maximum: No sector > 40% of portfolio

Well-diversified sectors: Lower systematic risk
Concentrated sectors: Higher systematic risk
    `.trim();
  }

  initialize(): Promise<void> {
    return Promise.resolve();
  }

  isHealthy(): Promise<boolean> {
    return Promise.resolve(true);
  }

  private buildExplanation(sector: string, isWellDiversified: boolean): string {
    return `
Sector: ${sector}

${
  isWellDiversified
    ? "✓ Operates in a diversified sector - Good for portfolio balance"
    : "⚠ Operates in a concentrated sector - Monitor portfolio exposure"
}

Note: This criterion is most useful for portfolio-level analysis.
    `.trim();
  }
}

export function createSectorConcentrationCriterion(): SectorConcentrationCriterion {
  return new SectorConcentrationCriterion();
}
