import { escapeHtml } from "@/utils/html";
import { RecommendationResult } from "../services/recommendation-service";

const ACTION_LABEL: Record<string, string> = {
  buy: "✅ BUY",
  hold: "⏸ HOLD",
  sell: "🚫 SELL",
};

const CONFIDENCE_LABEL: Record<string, string> = {
  high: "Very confident",
  medium: "Fairly confident",
  low: "Uncertain — do your own research",
};

export function formatRecommendation(result: RecommendationResult): string {
  const { evaluation, recommendation } = result;
  const rec = recommendation.recommendation;
  const actionLabel = ACTION_LABEL[rec] ?? rec.toUpperCase();
  const confidenceLabel = CONFIDENCE_LABEL[recommendation.confidence] ?? recommendation.confidence;
  const scoreBar = buildScoreBar(recommendation.score);
  const scorePercent = Math.round(recommendation.score * 100);

  const lines: string[] = [
    `<b>🤖 AI Take — ${escapeHtml(String(evaluation.symbol))}</b>`,
    ``,
    `${actionLabel}  (${escapeHtml(confidenceLabel)})`,
    `${scoreBar} ${scorePercent}%  ·  Current price: ₦${evaluation.currentPrice.toLocaleString("en-NG")}`,
  ];

  if (recommendation.targetPrice) {
    const upside =
      ((recommendation.targetPrice - evaluation.currentPrice) / evaluation.currentPrice) * 100;
    const direction = upside >= 0 ? "📈" : "📉";
    lines.push(
      `Fair value estimate: ₦${recommendation.targetPrice.toLocaleString("en-NG")} ${direction} (${upside >= 0 ? "+" : ""}${upside.toFixed(1)}% from now)`
    );
  }

  lines.push(``);
  lines.push(`<b>📋 Summary</b>`);
  lines.push(escapeHtml(recommendation.reasoning.overall));

  if (recommendation.reasoning.dividend) {
    lines.push(``);
    lines.push(`<b>💰 Dividend outlook</b>`);
    lines.push(escapeHtml(recommendation.reasoning.dividend));
  }

  if (recommendation.reasoning.fundamental) {
    lines.push(``);
    lines.push(`<b>🏭 Company health</b>`);
    lines.push(escapeHtml(recommendation.reasoning.fundamental));
  }

  if (recommendation.reasoning.valuation) {
    lines.push(``);
    lines.push(`<b>🔍 Is it fairly priced?</b>`);
    lines.push(escapeHtml(recommendation.reasoning.valuation));
  }

  if (recommendation.keyStrengths.length > 0) {
    lines.push(``);
    lines.push(`<b>✅ What's good</b>`);
    for (const s of recommendation.keyStrengths) {
      lines.push(`• ${escapeHtml(s)}`);
    }
  }

  if (recommendation.keyConcerns.length > 0) {
    lines.push(``);
    lines.push(`<b>⚠️ Watch out for</b>`);
    for (const c of recommendation.keyConcerns) {
      lines.push(`• ${escapeHtml(c)}`);
    }
  }

  if (recommendation.investmentHorizon) {
    lines.push(``);
    lines.push(
      `<i>Best held for: ${escapeHtml(formatHorizon(recommendation.investmentHorizon))}</i>`
    );
  }

  return lines.join("\n");
}

function buildScoreBar(score: number): string {
  const clamped = Number.isFinite(score) ? Math.min(1, Math.max(0, score)) : 0;
  const filled = Math.round(clamped * 5);
  return "█".repeat(filled) + "░".repeat(5 - filled);
}

function formatHorizon(horizon: string): string {
  const map: Record<string, string> = {
    "short-term": "a few months",
    "medium-term": "1–2 years",
    "long-term": "3+ years",
  };
  return map[horizon] ?? horizon;
}
