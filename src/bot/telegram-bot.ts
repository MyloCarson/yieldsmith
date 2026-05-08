import { Telegraf } from "telegraf";
import { BotConfig, BotContext } from "./types";
import { createAuthMiddleware, warnIfOpenAccess } from "./middleware/auth.middleware";
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
    warnIfOpenAccess(allowedUserIds);
    if (allowedUserIds.length > 0) {
      this.bot.use(createAuthMiddleware(allowedUserIds));
    }
  }

  private registerCommands(): void {
    this.bot.command("start", (ctx) => handleStart(ctx));
    this.bot.command("help", (ctx) => handleHelp(ctx));
    this.bot.command("health", (ctx) => handleHealth(ctx));

    this.bot.on("message", async (ctx) => {
      await ctx.reply("Unknown command. Type /help to see available commands.");
    });
  }

  async launch(): Promise<void> {
    if (this.running) return;
    this.running = true;

    await this.bot.launch();
    process.stdout.write("Yieldsmith bot is running.\n");

    process.once("SIGINT", () => this.stop("SIGINT"));
    process.once("SIGTERM", () => this.stop("SIGTERM"));
  }

  stop(signal?: string): void {
    this.bot.stop(signal);
    this.running = false;
  }
}
