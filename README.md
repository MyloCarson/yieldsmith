# 🌾 Yieldsmith

**Telegram bot for NGX dividend stock monitoring and AI-powered investment recommendations.**

Monitor dividend stocks, track portfolio performance, and get AI-driven insights on when to buy using intelligent investment strategies.

---

## **What is Yieldsmith?**

Yieldsmith helps you reach your dividend income goals by:
- 📊 **Monitoring** dividend stocks on NGX (extensible to US stocks, UK, etc.)
- 🤖 **AI-Powered Recommendations** using Claude (swappable to Gemini, OpenAI)
- 📈 **Tracking Portfolio** performance with tax-adjusted yields
- 🔔 **Smart Alerts** for dividends, price movements, rebalancing
- 🎯 **4 Investment Strategies** tailored to different market conditions

### **Goal: ₦500k Annual Dividend Income in 5 Years**

At ₦200k monthly investment pace (~₦2.4M yearly), Yieldsmith tracks your progress and recommends entry points across 4 dividend-focused strategies.

---

## **Quick Start**

### **Prerequisites**
- Node.js 18+
- pnpm 9+ (faster, stricter package manager)
- Telegram Bot Token (from @BotFather)
- Supabase account (free tier works)
- API keys for:
  - **AI Provider**: Claude (default), Gemini, or OpenAI
  - **Data Provider**: NGX Pulse (NGX stocks)

### **Installation**

```bash
# Install pnpm if you don't have it
npm install -g pnpm

# Clone repository
git clone https://github.com/your-org/yieldsmith.git
cd yieldsmith

# Install dependencies
pnpm install

# Setup environment
cp .env.example .env
# Edit .env with your API keys

# Run migrations
pnpm run db:migrate

# Start development
pnpm run dev
```

### **Commands**

```bash
pnpm run build        # Compile TypeScript
pnpm test             # Run tests
pnpm run lint         # Check code style
pnpm run format       # Auto-format code (Prettier)
pnpm run typecheck    # Type checking
pnpm run lint:fix     # Fix linting issues
pnpm start            # Production build
```

---

## **Project Structure**

```
yieldsmith/
├── src/
│   ├── core/              # Interfaces (market-agnostic)
│   ├── markets/           # Market implementations (NGX, US)
│   ├── data/
│   │   ├── providers/     # Data adapters (NGX Pulse, Alpha Vantage)
│   │   └── repository.ts  # Database layer
│   ├── criteria/
│   │   └── evaluators/    # Stock evaluation rules
│   ├── strategies/        # Investment strategies
│   ├── services/          # Business logic
│   ├── ai/                # AI providers (Claude, Gemini, OpenAI)
│   ├── notifications/     # Alert delivery (Telegram, Slack, Discord)
│   ├── types/             # TypeScript types
│   ├── utils/             # Pure functions
│   └── index.ts           # Entry point
├── tests/
│   ├── unit/
│   ├── integration/
│   └── setup.ts
├── config/
│   ├── criteria.config.json      # Evaluation thresholds
│   ├── strategies.config.json    # Strategy definitions
│   ├── markets.config.json       # Market configurations
│   ├── ai.config.json            # AI provider config
│   └── notifications.config.json # Alert settings
├── supabase/
│   ├── migrations/        # Database schema
│   └── seed.sql           # Test data
├── docs/
│   ├── ARCHITECTURE.md    # System design
│   ├── STRATEGIES.md      # Investment strategies
│   ├── CRITERIA.md        # Evaluation criteria
│   └── DEPLOYMENT.md      # Production checklist
├── package.json
├── tsconfig.json
├── jest.config.js
├── .eslintrc.json
├── .env.example
└── README.md
```

---

## **Features**

### **📱 Telegram Commands**

#### **Portfolio Management**
- `/portfolio` — View current holdings
- `/add_holding` — Add stock to portfolio
- `/remove_holding` — Remove stock from portfolio
- `/performance` — Portfolio returns & metrics

#### **Investment Insights**
- `/recommend` — AI recommendations based on your strategy
- `/explore` — Discover dividend stocks (without buying)
- `/stock_health` — Detailed stock analysis

#### **Dividend Tracking**
- `/dividend_calendar` — Upcoming dividend payments
- `/dividend_history` — Historical dividends
- `/goal_roadmap` — Progress toward ₦500k goal

#### **Risk Management**
- `/portfolio_health` — Concentration risk, sector analysis
- `/rebalance` — Portfolio rebalancing suggestions
- `/alerts` — Configure notification preferences

#### **Settings**
- `/settings` — Update goals, strategies, thresholds
- `/help` — Bot commands and guide
- `/health` — System status

---

## **Architecture Highlights**

### **1. Market Abstraction**
Swap NGX for US stocks **without code changes**:
```typescript
// Configure in config/markets.config.json
{
  "enabled_markets": ["ngx", "us_stocks"]
}
// Bot automatically loads appropriate provider
```

### **2. AI Provider Swappability**
Switch between Claude, Gemini, or OpenAI without code changes:
```json
// config/ai.config.json
{ "provider": "claude" }
// Tomorrow: change to "gemini" or "openai" + environment variable
// Supported: claude, gemini, openai
```

**Example switching to Gemini:**
```bash
# .env
AI_PROVIDER=gemini
GEMINI_API_KEY=AIzaSy...

# Restart bot - automatically uses Gemini ✅
```

### **3. Configuration-Driven**
All thresholds in JSON, no code changes:
```json
// config/criteria.config.json
{
  "yield": {
    "ngx": { "min": 0.025, "max": 0.10 },
    "us_stocks": { "min": 0.015, "max": 0.08 }
  }
}
```

### **4. Notification Flexibility**
Default: Telegram  
Optional: Slack, Discord, Email (same interface)

---

## **Configuration**

### **Markets** (`config/markets.config.json`)
```json
{
  "markets": [
    {
      "id": "ngx",
      "name": "Nigerian Stock Exchange",
      "timezone": "Africa/Lagos",
      "dataProvider": "ngx_pulse",
      "active": true
    }
  ]
}
```

### **Strategies** (`config/strategies.config.json`)
```json
{
  "strategies": [
    {
      "id": "yield-opportunity",
      "name": "Yield Opportunity",
      "enabled": true,
      "criteria": ["yield", "pe_ratio", "price"],
      "minCriteriaMet": 2
    }
  ]
}
```

### **Criteria** (`config/criteria.config.json`)
```json
{
  "criteria": [
    {
      "name": "yield",
      "markets": {
        "ngx": { "min": 0.025, "max": 0.10 },
        "us_stocks": { "min": 0.015, "max": 0.08 }
      }
    }
  ]
}
```

---

## **Development Workflow**

**Sequential, Reviewable Development:**
1. Feature announced (build plan)
2. Code written in `/src`
3. Tests written (80%+ coverage)
4. Presented for review with links
5. You review & approve
6. You commit to git (full control)
7. Next feature begins

**No auto-commits. No sub-agents. You control git history.**

---

## **Testing**

```bash
# Run all tests
pnpm test

# Watch mode (re-run on changes)
pnpm test:watch

# Coverage report
pnpm test:coverage
```

Target: **>80% coverage** across all modules enforced by Jest.

---

## **Documentation**

Complete guides available in `docs/`:
- [docs/DEVELOPER_SETUP.md](docs/DEVELOPER_SETUP.md) — Full developer onboarding
- [docs/HUSKY_SETUP.md](docs/HUSKY_SETUP.md) — Git hooks and commit conventions
- [docs/VS_CODE_SETUP.md](docs/VS_CODE_SETUP.md) — VS Code configuration
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — System design (coming)
- [docs/PROJECT_RULES.md](docs/PROJECT_RULES.md) — Code standards (coming)

---

## **Deployment**

### **Environment Variables**
1. Copy `.env.example` → `.env`
2. Add your API keys (Claude/Gemini/OpenAI, Supabase, Telegram)
3. Verify with: `pnpm run typecheck`

### **Database**
```bash
# Run migrations
pnpm run db:migrate

# Seed test data (optional)
pnpm run db:seed
```

### **Start Bot**
```bash
pnpm run build
pnpm start
```

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for full checklist.

---

## **Contributing**

See [CONTRIBUTING.md](CONTRIBUTING.md) for:
- Bug reporting
- Adding new markets
- Creating new strategies
- Implementing new criteria
- Improving documentation

**Easy contributions:** Good first issues labeled `help-wanted`.

---

## **Roadmap**

### **MVP (v0.1 - In Progress)**
- ✅ NGX market monitoring
- ✅ 4 investment strategies
- ✅ Portfolio tracking
- ✅ Telegram bot commands
- ✅ Claude AI recommendations

### **v0.2 (Planned)**
- US stock market support
- Additional strategies (earnings growth, etc.)
- Email notifications
- Web dashboard (read-only)

### **v1.0 (Planned)**
- Mobile app
- Advanced analytics
- Institutional integrations
- Multi-language support

---

## **Troubleshooting**

### **Bot not responding**
```bash
# Check bot token
echo $TELEGRAM_BOT_TOKEN
# Verify database connection
pnpm run db:migrate
# Check logs
pnpm run dev  # Watch logs in development
```

### **API rate limits**
- NGX Pulse: 100 calls/minute
- Claude: Based on subscription (free tier: 5 req/min)
- Gemini: Based on subscription
- OpenAI: Based on subscription
- Configure in `.env` (`RATE_LIMIT_PER_SECOND=30`)

### **Tests failing**
```bash
pnpm run lint:fix   # Auto-fix linting issues
pnpm run format     # Format code with Prettier
pnpm test -- --no-coverage  # Faster test run
```

---

## **Support**

- 📧 Email: akannidavidseun@gmail.com
- 🐛 Issues: GitHub Issues
- 💬 Discussions: GitHub Discussions
- 📚 Docs: See `/docs` folder

---

## **License**

MIT License. See [LICENSE](LICENSE) for details.

---

**Built with ❤️ to help you reach your dividend goals. 🎯**
