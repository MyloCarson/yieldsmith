import { CriterionEvaluation } from "@core/criterion";
import { escapeHtml } from "@/utils/html";
import { StockEvaluation, ExploreCandidate } from "../services/stock-service";

export function formatStockEvaluation(result: StockEvaluation): string {
  const scorePercent = Math.round(result.overallScore * 100);
  const scoreBar = buildScoreBar(result.overallScore);

  const lines: string[] = [
    `<b>📊 ${escapeHtml(String(result.symbol))} — Stock Health</b>`,
    `Price: ₦${result.currentPrice.toLocaleString("en-NG")}`,
    `Score: ${scoreBar} ${scorePercent}% (${result.passCount}/${result.totalCount} criteria passed)`,
    "",
  ];

  const grouped = groupByCategory(result.evaluations);
  for (const [category, evaluations] of grouped) {
    lines.push(`<b>${escapeHtml(formatCategoryName(category))}</b>`);
    for (const evaluation of evaluations) {
      lines.push(formatEvaluationLine(evaluation));
    }
    lines.push("");
  }

  return lines.join("\n").trimEnd();
}

export function formatExploreResults(candidates: ExploreCandidate[]): string {
  if (candidates.length === 0) {
    return "No dividend stocks found matching your criteria.";
  }

  const lines: string[] = ["<b>🔍 Top Dividend Stocks</b>\n"];

  candidates.forEach((candidate, index) => {
    const scorePercent = Math.round(candidate.overallScore * 100);
    lines.push(
      `${index + 1}. <b>${escapeHtml(String(candidate.symbol))}</b> — ${escapeHtml(candidate.name)}\n` +
        `   ${escapeHtml(candidate.sector)} · ₦${candidate.currentPrice.toLocaleString("en-NG")} · Score: ${scorePercent}% (${candidate.passCount}/${candidate.totalCount})`
    );
  });

  return lines.join("\n");
}

function formatEvaluationLine(evaluation: CriterionEvaluation): string {
  const icon = evaluation.passed ? "✅" : "❌";
  const score = Math.round(evaluation.score * 100);
  return `${icon} ${escapeHtml(evaluation.criterionDisplayName)}: ${escapeHtml(evaluation.explanation)} <i>(${score}%)</i>`;
}

function buildScoreBar(score: number): string {
  const filled = Math.round(score * 5);
  return "█".repeat(filled) + "░".repeat(5 - filled);
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
