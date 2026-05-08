import { AIRecommendation } from "@core/ai-provider";
import { escapeHtml } from "@/utils/html";
import { RecommendationResult } from "../services/recommendation-service";

const ACTION_ICON: Record<string, string> = {
  buy: "✅",
  hold: "⚠️",
  sell: "❌",
};

const CONFIDENCE_LABEL: Record<string, string> = {
  high: "High Confidence",
  medium: "Medium Confidence",
  low: "Low Confidence",
};

export function formatRecommendation(result: RecommendationResult): string {
  const { evaluation, recommendation } = result;
  const rec = recommendation.recommendation;
  const icon = ACTION_ICON[rec] ?? "❓";
  const actionLabel = rec.toUpperCase();
  const confidenceLabel = CONFIDENCE_LABEL[recommendation.confidence] ?? recommendation.confidence;
  const scorePercent = Math.round(recommendation.score * 100);
  const scoreBar = buildScoreBar(recommendation.score);

  const lines: string[] = [
    `<b>🤖 AI Recommendation — ${escapeHtml(String(evaluation.symbol))}</b>`,
    ``,
    `${icon} <b>${actionLabel}</b> (${confidenceLabel})`,
    `Score: ${scoreBar} ${scorePercent}%`,
    `Price: ₦${evaluation.currentPrice.toLocaleString("en-NG")}`,
  ];

  if (recommendation.targetPrice) {
    const direction = recommendation.targetPrice > evaluation.currentPrice ? "▲" : "▼";
    lines.push(`Target: ₦${recommendation.targetPrice.toLocaleString("en-NG")} ${direction}`);
  }

  lines.push(``);
  lines.push(`<b>Overall:</b> ${escapeHtml(recommendation.reasoning.overall)}`);

  if (recommendation.reasoning.dividend) {
    lines.push(`<b>Dividend:</b> ${escapeHtml(recommendation.reasoning.dividend)}`);
  }

  if (recommendation.reasoning.fundamental) {
    lines.push(`<b>Fundamental:</b> ${escapeHtml(recommendation.reasoning.fundamental)}`);
  }

  if (recommendation.reasoning.valuation) {
    lines.push(`<b>Valuation:</b> ${escapeHtml(recommendation.reasoning.valuation)}`);
  }

  if (recommendation.keyStrengths.length > 0) {
    lines.push(``);
    lines.push(`<b>Key Strengths</b>`);
    for (const strength of recommendation.keyStrengths) {
      lines.push(`• ${escapeHtml(strength)}`);
    }
  }

  if (recommendation.keyConcerns.length > 0) {
    lines.push(``);
    lines.push(`<b>Key Concerns</b>`);
    for (const concern of recommendation.keyConcerns) {
      lines.push(`• ${escapeHtml(concern)}`);
    }
  }

  const metaParts: string[] = [];
  if (recommendation.investmentHorizon) {
    metaParts.push(`Horizon: ${formatHorizon(recommendation.investmentHorizon)}`);
  }
  metaParts.push(`Model: ${escapeHtml(recommendation.metadata.modelUsed)}`);

  lines.push(``);
  lines.push(`<i>${metaParts.join(" · ")}</i>`);

  return lines.join("\n");
}

function buildScoreBar(score: number): string {
  const filled = Math.round(score * 5);
  return "█".repeat(filled) + "░".repeat(5 - filled);
}

function formatHorizon(horizon: AIRecommendation["investmentHorizon"]): string {
  if (!horizon) return "";
  return horizon
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join("-");
}
