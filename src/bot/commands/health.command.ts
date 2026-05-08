import { BotContext } from "../types";
import { getAIProviderFactory } from "@/implementations/ai-providers/ai-provider-factory";
import { getDataProviderFactory } from "@/implementations/data-providers/data-provider-factory";
import { getNotificationProviderFactory } from "@/implementations/notification-providers/notification-provider-factory";

export async function handleHealth(ctx: BotContext): Promise<void> {
  await ctx.replyWithHTML("<b>🔍 Checking system status...</b>");

  const [aiStatus, dataStatus, notificationStatus] = await Promise.all([
    checkAIProvider(),
    checkDataProvider(),
    checkNotificationProvider(),
  ]);

  const lines: string[] = ["<b>⚙️ System Health</b>\n"];
  lines.push(formatStatus("AI Provider", aiStatus));
  lines.push(formatStatus("Data Provider", dataStatus));
  lines.push(formatStatus("Notification Provider", notificationStatus));

  const allHealthy = aiStatus.healthy && dataStatus.healthy && notificationStatus.healthy;
  lines.push(`\n${allHealthy ? "✅ All systems operational" : "⚠️ Some systems degraded"}`);

  await ctx.replyWithHTML(lines.join("\n"));
}

interface ProviderStatus {
  healthy: boolean;
  label: string;
  status: string;
  error?: string;
}

function formatStatus(name: string, result: ProviderStatus): string {
  const icon = result.healthy ? "✅" : "❌";
  const detail = result.error ? ` — ${result.error}` : ` (${result.status})`;
  return `${icon} <b>${name}</b>: ${result.label}${detail}`;
}

async function checkAIProvider(): Promise<ProviderStatus> {
  try {
    const factory = getAIProviderFactory();
    const provider = await factory.getDefaultProvider();
    const result = await provider.healthCheck();
    return {
      healthy: result.healthy,
      label: provider.name,
      status: result.status,
      error: result.error,
    };
  } catch (error) {
    return {
      healthy: false,
      label: "unavailable",
      status: "down",
      error: error instanceof Error ? error.message : "unknown error",
    };
  }
}

async function checkDataProvider(): Promise<ProviderStatus> {
  try {
    const factory = getDataProviderFactory();
    const result = await factory.healthCheck();
    return {
      healthy: result.healthy,
      label: result.primaryProvider,
      status: result.status,
    };
  } catch (error) {
    return {
      healthy: false,
      label: "unavailable",
      status: "down",
      error: error instanceof Error ? error.message : "unknown error",
    };
  }
}

async function checkNotificationProvider(): Promise<ProviderStatus> {
  try {
    const factory = getNotificationProviderFactory();
    const provider = await factory.getDefaultProvider();
    const result = await provider.healthCheck();
    return {
      healthy: result.healthy,
      label: provider.name,
      status: result.status,
      error: result.error,
    };
  } catch (error) {
    return {
      healthy: false,
      label: "unavailable",
      status: "down",
      error: error instanceof Error ? error.message : "unknown error",
    };
  }
}
