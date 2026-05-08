import { CriterionEvaluation } from "@core/criterion";
import { escapeHtml } from "@/utils/html";
import { StockEvaluation, ExploreCandidate } from "../services/stock-service";

// Plain English names for each criterion
const PLAIN_NAMES: Record<string, string> = {
  dividend_yield: "Dividend income",
  pe_ratio: "Fairly priced?",
  dividend_coverage: "Dividend safety",
  payout_ratio: "Payout affordability",
  dividend_growth: "Growing dividends",
  debt_to_equity: "Debt level",
  book_value: "Asset value",
  volatility: "Price stability",
  liquidity: "Easy to trade",
  earnings_growth: "Growing profits",
  roe: "Company returns",
  quality_score: "Overall quality",
  sector_concentration: "Sector balance",
};

// Plain English category headings with emojis
const PLAIN_CATEGORIES: Record<string, string> = {
  dividend: "💰 Dividends",
  valuation: "📊 Price & Value",
  risk: "⚠️ Risk Checks",
  growth: "📈 Growth",
  quality: "🏆 Quality",
  portfolio: "🏦 Portfolio Fit",
  technical: "📉 Price Trend",
};

export function formatStockEvaluation(result: StockEvaluation): string {
  const scoreBar = buildScoreBar(result.overallScore);
  const rating = getRating(result.overallScore);

  const lines: string[] = [
    `<b>📊 ${escapeHtml(String(result.symbol))} — Health Check</b>`,
    `Price: ₦${result.currentPrice.toLocaleString("en-NG")}`,
    `${scoreBar} ${rating} — ${result.passCount} of ${result.totalCount} checks passed`,
    "",
  ];

  const grouped = groupByCategory(result.evaluations);
  for (const [category, evaluations] of grouped) {
    const heading = PLAIN_CATEGORIES[category] ?? formatCategoryName(category);
    lines.push(`<b>${escapeHtml(heading)}</b>`);
    for (const evaluation of evaluations) {
      lines.push(formatEvaluationLine(evaluation));
    }
    lines.push("");
  }

  return lines.join("\n").trimEnd();
}

export function formatExploreResults(candidates: ExploreCandidate[]): string {
  if (candidates.length === 0) {
    return "No dividend stocks found matching your criteria right now.";
  }

  const lines: string[] = ["<b>🔍 Top Dividend Stocks on NGX</b>\n"];

  candidates.forEach((candidate, index) => {
    const scorePercent = Math.round(candidate.overallScore * 100);
    const rating = getRating(candidate.overallScore);
    lines.push(
      `${index + 1}. <b>${escapeHtml(String(candidate.symbol))}</b> — ${escapeHtml(candidate.name)}\n` +
        `   ${escapeHtml(candidate.sector)} · ₦${candidate.currentPrice.toLocaleString("en-NG")} · ${rating} (${scorePercent}%)`
    );
  });

  return lines.join("\n");
}

function formatEvaluationLine(evaluation: CriterionEvaluation): string {
  const icon = evaluation.passed ? "✅" : "❌";
  const name = PLAIN_NAMES[evaluation.criterionName] ?? evaluation.criterionDisplayName;
  const summary = buildPlainSummary(evaluation);
  return `${icon} <b>${escapeHtml(name)}</b>: ${escapeHtml(summary)}`;
}

function buildPlainSummary(e: CriterionEvaluation): string {
  const { criterionName, passed, actualValue, explanation } = e;

  switch (criterionName) {
    case "dividend_yield":
      if (!passed) {
        if (explanation.includes("months ago") || explanation.includes("on record")) {
          // Extract the core message from the explanation
          const match = explanation.match(/Last dividend was paid (\d+) months ago/);
          if (match) return `No dividend for ${match[1]} months — does not qualify`;
          return "No recent dividend — does not qualify as a dividend stock";
        }
        return `Too low — pays ${actualValue.toFixed(1)}% per year after tax (minimum 3%)`;
      }
      return `Pays ${actualValue.toFixed(1)}% per year after tax`;

    case "pe_ratio":
      if (!passed) {
        if (actualValue === 0) return "Cannot check — company has no earnings";
        // Read verdict from the explanation directly (it's already plain from the criterion)
        return explanation;
      }
      return explanation;

    case "dividend_coverage":
      if (!passed) return "Company may struggle to keep paying dividends at this level";
      return `Company earnings cover the dividend ${actualValue.toFixed(1)}x over — safe`;

    case "payout_ratio":
      if (!passed) {
        if (actualValue > 1) return "Paying out more than it earns — not sustainable";
        return `Only ${(actualValue * 100).toFixed(0)}% of profits go to dividends — too low`;
      }
      return `${(actualValue * 100).toFixed(0)}% of profits paid as dividends — healthy balance`;

    case "dividend_growth":
      if (!passed) return "Dividends not growing consistently";
      return `Dividends growing at ${(actualValue * 100).toFixed(1)}% per year — good sign`;

    case "debt_to_equity":
      if (!passed) return `High debt compared to company value (${actualValue.toFixed(2)}x) — higher risk`;
      return `Low debt (${actualValue.toFixed(2)}x) — company is financially stable`;

    case "book_value":
      if (!passed) return "Priced significantly above the company's net worth";
      return "Price is reasonable compared to company assets";

    case "volatility":
      if (!passed) return "Price moves around a lot — more risk than average";
      return "Relatively stable price — lower day-to-day risk";

    case "liquidity":
      if (!passed) return "Low trading volume — can be hard to buy or sell quickly";
      return "Good trading volume — easy to buy and sell";

    case "earnings_growth":
      if (!passed) return "Company profits not growing";
      return "Company profits are growing";

    case "roe":
      if (!passed) return "Company not generating strong returns on shareholder money";
      return `Good returns on investor money (${(actualValue * 100).toFixed(1)}%)`;

    case "quality_score":
      if (!passed) return "Overall quality below our threshold";
      return `Good overall quality score (${(actualValue * 100).toFixed(0)}%)`;

    case "sector_concentration":
      // The explanation from the new criterion is already plain English
      return explanation.split(".")[0] ?? "Sector check";

    default:
      return explanation.split("\n")[0] ?? e.criterionDisplayName;
  }
}

function buildScoreBar(score: number): string {
  const clamped = Math.min(1, Math.max(0, score));
  const filled = Math.round(clamped * 5);
  return "█".repeat(filled) + "░".repeat(5 - filled);
}

function getRating(score: number): string {
  if (score >= 0.8) return "Strong ✨";
  if (score >= 0.65) return "Good";
  if (score >= 0.5) return "Average";
  if (score >= 0.35) return "Weak";
  return "Poor";
}

function groupByCategory(evaluations: CriterionEvaluation[]): Map<string, CriterionEvaluation[]> {
  const grouped = new Map<string, CriterionEvaluation[]>();
  for (const evaluation of evaluations) {
    const category = evaluation.metadata.category;
    if (!grouped.has(category)) grouped.set(category, []);
    grouped.get(category)!.push(evaluation);
  }
  return grouped;
}

function formatCategoryName(category: string): string {
  return category
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
