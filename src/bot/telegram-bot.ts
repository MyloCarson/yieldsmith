import { Telegraf } from "telegraf";
import { BotConfig, BotContext } from "./types";
import { createAuthMiddleware, createDenyAllMiddleware } from "./middleware/auth.middleware";
import { createErrorHandlerMiddleware } from "./middleware/error-handler.middleware";
import { handleStart } from "./commands/start.command";
import { handleHelp } from "./commands/help.command";
import { handleHealth } from "./commands/health.command";

export class TelegramBot {
  private readonly bot: Telegraf<BotContext>;
  private running = false;

  constructor(config: BotConfig) {
    this.bot = new Telegraf<BotContext>(config.token);
    this.registerMiddleware(config);
    this.registerCommands();
  }

  private registerMiddleware(config: BotConfig): void {
    this.bot.use(createErrorHandlerMiddleware());

    const allowedUserIds = config.allowedUserIds ?? [];
    if (allowedUserIds.length > 0) {
      this.bot.use(createAuthMiddleware(allowedUserIds));
    } else if (config.openAccess) {
      process.stderr.write(
        "[WARN] TELEGRAM_OPEN_ACCESS=true — bot is open to ALL Telegram users.\n"
      );
    } else {
      this.bot.use(createDenyAllMiddleware());
    }
  }

  private registerCommands(): void {
    this.bot.command("start", (ctx) => handleStart(ctx));
    this.bot.command("help", (ctx) => handleHelp(ctx));
    this.bot.command("health", (ctx) => handleHealth(ctx));

    this.bot.on("text", async (ctx) => {
      if (ctx.message.text.startsWith("/")) {
        await ctx.reply("Unknown command. Type /help to see available commands.");
      }
    });
  }

  async launch(): Promise<void> {
    if (this.running) return;

    await this.bot.launch();
    this.running = true;
    process.stdout.write("Yieldsmith bot is running.\n");

    process.once("SIGINT", () => this.stop("SIGINT"));
    process.once("SIGTERM", () => this.stop("SIGTERM"));
  }

  stop(signal?: string): void {
    this.bot.stop(signal);
    this.running = false;
  }
}
