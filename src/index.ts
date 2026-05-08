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

async function main(): Promise<void> {
  const botToken = requireEnv("TELEGRAM_BOT_TOKEN");
  const allowedUserIds = parseAllowedUserIds(process.env["TELEGRAM_ALLOWED_USERS"]);

  // Initialise global factories so /health can reach them
  getAIProviderFactory({
    defaultProvider: (process.env["AI_PROVIDER"] as "claude" | "gemini") ?? "claude",
    configs: {
      claude: { apiKey: process.env["ANTHROPIC_API_KEY"] },
      gemini: { apiKey: process.env["GEMINI_API_KEY"] },
    },
  });

  getDataProviderFactory({
    primaryProvider: (process.env["DATA_PROVIDER"] as "ngx_pulse" | "mock") ?? "ngx_pulse",
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

  const bot = new TelegramBot({
    token: botToken,
    allowedUserIds,
  });

  await bot.launch();
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
