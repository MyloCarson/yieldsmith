import { TelegramBot } from "./bot/telegram-bot";
import { parseAllowedUserIds } from "./bot/middleware/auth.middleware";
import { StockService } from "./bot/services/stock-service";
import { PortfolioService } from "./bot/services/portfolio-service";
import { getSupabaseClient } from "./db/supabase-client";
import { getAIProviderFactory } from "./implementations/ai-providers/ai-provider-factory";
import { getDataProviderFactory } from "./implementations/data-providers/data-provider-factory";
import { getNotificationProviderFactory } from "./implementations/notification-providers/notification-provider-factory";
import { getCriterionFactory } from "./implementations/criteria/criterion-factory";

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`Missing required environment variable: ${key}`);
  return value;
}

function parseAIProvider(value: string | undefined): "claude" | "gemini" | "mock" {
  if (value === "claude" || value === "gemini" || value === "mock") return value;
  if (value) {
    process.stderr.write(`[WARN] Unknown AI_PROVIDER "${value}", falling back to "claude".\n`);
  }
  return "claude";
}

function parseDataProvider(value: string | undefined): "ngx_pulse" | "mock" {
  if (value === "ngx_pulse" || value === "mock") return value;
  if (value) {
    process.stderr.write(`[WARN] Unknown DATA_PROVIDER "${value}", falling back to "ngx_pulse".\n`);
  }
  return "ngx_pulse";
}

async function main(): Promise<void> {
  const botToken = requireEnv("TELEGRAM_BOT_TOKEN");
  requireEnv("SUPABASE_URL");
  requireEnv("SUPABASE_SERVICE_ROLE_KEY");
  const allowedUserIds = parseAllowedUserIds(process.env["TELEGRAM_ALLOWED_USERS"]);
  const openAccess = process.env["TELEGRAM_OPEN_ACCESS"] === "true";

  getAIProviderFactory({
    defaultProvider: parseAIProvider(process.env["AI_PROVIDER"]),
    configs: {
      claude: { apiKey: process.env["ANTHROPIC_API_KEY"] },
      gemini: { apiKey: process.env["GEMINI_API_KEY"] },
    },
  });

  const dataFactory = getDataProviderFactory({
    primaryProvider: parseDataProvider(process.env["DATA_PROVIDER"]),
    configs: {
      ngx_pulse: { apiKey: process.env["NGX_PULSE_API_KEY"] },
    },
  });

  getNotificationProviderFactory({
    defaultProvider: "telegram",
    configs: {
      telegram: { botToken },
    },
  });

  const criterionFactory = getCriterionFactory();
  await criterionFactory.initializeAll();

  const stockProvider = await dataFactory.getStockProvider();
  const stockService = new StockService(stockProvider, criterionFactory);
  const portfolioService = new PortfolioService(getSupabaseClient(), stockProvider);

  const bot = new TelegramBot(
    { token: botToken, allowedUserIds, openAccess },
    stockService,
    portfolioService
  );
  await bot.launch();
}

main().catch((error) => {
  process.stderr.write(`Fatal error: ${String(error)}\n`);
  process.exit(1);
});
