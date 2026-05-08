import { TelegramBot } from "./bot/telegram-bot";
import { parseAllowedUserIds } from "./bot/middleware/auth.middleware";
import { getAIProviderFactory } from "./implementations/ai-providers/ai-provider-factory";
import { getDataProviderFactory } from "./implementations/data-providers/data-provider-factory";
import { getNotificationProviderFactory } from "./implementations/notification-providers/notification-provider-factory";

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`Missing required environment variable: ${key}`);
  return value;
}

function parseAIProvider(value: string | undefined): "claude" | "gemini" {
  if (value === "claude" || value === "gemini") return value;
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
  const allowedUserIds = parseAllowedUserIds(process.env["TELEGRAM_ALLOWED_USERS"]);

  getAIProviderFactory({
    defaultProvider: parseAIProvider(process.env["AI_PROVIDER"]),
    configs: {
      claude: { apiKey: process.env["ANTHROPIC_API_KEY"] },
      gemini: { apiKey: process.env["GEMINI_API_KEY"] },
    },
  });

  getDataProviderFactory({
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

  const bot = new TelegramBot({ token: botToken, allowedUserIds });
  await bot.launch();
}

main().catch((error) => {
  process.stderr.write(`Fatal error: ${String(error)}\n`);
  process.exit(1);
});
