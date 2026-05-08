import { escapeHtml } from "@/utils/html";
import { HoldingWithPrice } from "../services/portfolio-service";
import { PortfolioLot } from "@/types/portfolios";

export function formatPortfolio(holdings: HoldingWithPrice[]): string {
  if (holdings.length === 0) {
    return (
      "<b>📂 Your Portfolio</b>\n\n" +
      "No holdings yet. Use /add_holding to add your first position."
    );
  }

  const totalInvested = holdings.reduce((s, h) => s + h.quantity * h.purchase_price, 0);
  const totalValue = holdings.reduce((s, h) => s + h.currentValue, 0);
  const totalGain = totalValue - totalInvested;
  const totalGainPct = totalInvested > 0 ? (totalGain / totalInvested) * 100 : 0;
  const gainIcon = totalGain >= 0 ? "📈" : "📉";

  const lines: string[] = [
    `<b>📂 Portfolio — ${holdings.length} holding${holdings.length !== 1 ? "s" : ""}</b>`,
    `${gainIcon} Total: ₦${totalValue.toLocaleString("en-NG", { maximumFractionDigits: 2 })} (${totalGainPct >= 0 ? "+" : ""}${totalGainPct.toFixed(1)}%)`,
    `Invested: ₦${totalInvested.toLocaleString("en-NG", { maximumFractionDigits: 2 })}`,
    "",
  ];

  for (const holding of holdings) {
    const gainPct = holding.unrealizedGainPercent;
    const gainSign = gainPct >= 0 ? "+" : "";
    const icon = gainPct >= 0 ? "🟢" : "🔴";
    lines.push(
      `${icon} <b>${escapeHtml(String(holding.symbol))}</b> — ₦${holding.currentPrice.toLocaleString("en-NG", { maximumFractionDigits: 2 })}\n` +
        `   ${holding.quantity} shares · Cost ₦${holding.purchase_price.toLocaleString("en-NG", { maximumFractionDigits: 2 })} · ${gainSign}${gainPct.toFixed(1)}%`
    );
  }

  return lines.join("\n");
}

export function formatAddHolding(
  symbol: string,
  quantity: number,
  price: number,
  totalLots: number
): string {
  const isAdded = totalLots === 1 ? "Added" : "Position updated";
  return (
    `✅ <b>${isAdded}</b>\n\n` +
    `<b>${escapeHtml(symbol)}</b> — ${quantity} shares @ ₦${price.toLocaleString("en-NG", { maximumFractionDigits: 2 })}\n` +
    `Total lots: ${totalLots}\n\n` +
    `Use /portfolio to see your full portfolio.`
  );
}

export function formatRemoveHolding(symbol: string): string {
  return `🗑 <b>${escapeHtml(symbol)}</b> removed from your portfolio.`;
}

export function formatLots(symbol: string, lots: PortfolioLot[]): string {
  if (lots.length === 0) {
    return `No lots found for <b>${escapeHtml(symbol)}</b>.`;
  }

  const lines: string[] = [`<b>📋 Lots — ${escapeHtml(symbol)}</b>\n`];

  lots.forEach((lot, i) => {
    lines.push(
      `${i + 1}. ${lot.purchase_date} — ${lot.quantity} shares @ ₦${lot.purchase_price.toLocaleString("en-NG", { maximumFractionDigits: 2 })}`
    );
  });

  return lines.join("\n");
}
