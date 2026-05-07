# Developer Setup Guide

Complete guide for setting up Yieldsmith development environment.

---

## **Quick Setup (5 minutes)**

### Prerequisites
- **Node.js 18.19.0+** (check with `node --version`)
- **pnpm 9+** (install with `npm install -g pnpm`)
- **Git** (for version control)
- **VS Code** (recommended editor)

### Setup Steps

```bash
# 1. Clone repository
git clone https://github.com/your-org/yieldsmith.git
cd yieldsmith

# 2. Verify Node version
nvm use  # Uses .nvmrc automatically if you have nvm

# 3. Install dependencies
pnpm install

# 4. Setup git hooks (Husky)
pnpm prepare

# 5. Setup environment
cp .env.example .env
# Edit .env with your API keys

# 6. Test setup
pnpm typecheck  # Should complete with no errors
pnpm lint       # Should show no issues
pnpm test       # Tests should pass

# 7. You're ready!
pnpm run dev
```

---

## **Environment Variables**

Copy `.env.example` to `.env` and fill in:

```bash
# Telegram
TELEGRAM_BOT_TOKEN=your_bot_token

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your_anon_key

# AI (pick one or all three)
AI_PROVIDER=claude  # or gemini, openai
CLAUDE_API_KEY=sk-ant-...
GEMINI_API_KEY=AIzaSy...
OPENAI_API_KEY=sk-proj-...

# Data Provider
NGX_PULSE_API_KEY=your_ngx_key

# Other
NODE_ENV=development
LOG_LEVEL=debug
```

---

## **Git Workflow**

### Before First Commit

```bash
# Husky hooks installed?
ls .husky/pre-commit .husky/commit-msg

# If not, run:
pnpm prepare
```

### Making a Commit

```bash
# Edit files
vi src/criteria/yield-evaluator.ts

# Stage changes
git add src/criteria/yield-evaluator.ts

# Try to commit
git commit -m "feat: add yield evaluator"

# Husky automatically:
# 1. Formats code (Prettier)
# 2. Lints code (ESLint)
# 3. Runs related tests (Jest)
# 4. Validates commit message (Commitlint)

# If checks fail, fix and try again
pnpm lint:fix
pnpm format
git add .
git commit -m "feat: add yield evaluator"
```

### Commit Message Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:** `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `chore`, `ci`

**Examples:**
```bash
git commit -m "feat: add yield criterion evaluator"
git commit -m "fix: handle null dividend values"
git commit -m "docs: add strategy documentation"
git commit -m "test: add yield evaluator tests"
git commit -m "refactor: extract price calculation to utils"
```

**Invalid commits (will be rejected):**
```bash
git commit -m "wip"              # ❌ Not a valid type
git commit -m "Updated files"    # ❌ Not lowercase
git commit -m "feat: ."          # ❌ Subject is just period
git commit -m "feat: added stuff" # ❌ Not imperative mood
```

---

## **Development Commands**

```bash
# Development (watch mode)
pnpm run dev

# Type checking (during development)
pnpm typecheck

# Linting
pnpm lint              # Check for issues
pnpm lint:fix          # Auto-fix issues

# Formatting
pnpm format            # Format all code
pnpm format:check      # Check if formatted (CI)

# Testing
pnpm test              # Run all tests once
pnpm test:watch        # Watch mode (re-run on change)
pnpm test:coverage     # Coverage report

# Database
pnpm run db:migrate    # Run migrations
pnpm run db:seed       # Seed test data

# Build for production
pnpm run build
pnpm start
```

---

## **VS Code Setup**

See [VS_CODE_SETUP.md](VS_CODE_SETUP.md) for detailed VS Code configuration.

Quick start:
1. Install recommended extensions (VS Code prompt)
2. Create `.vscode/settings.json` from the guide
3. Auto-formatting and linting work on save

---

## **Husky Git Hooks**

See [HUSKY_SETUP.md](HUSKY_SETUP.md) for detailed hook configuration.

What happens automatically:
- **pre-commit** — Formats, lints, and tests changed files
- **commit-msg** — Validates commit message format

---

## **Testing**

Target: **>80% coverage** enforced by Jest

```bash
# Run specific test file
pnpm test -- yield-evaluator

# Run tests matching pattern
pnpm test -- --testNamePattern="should evaluate yield"

# Watch mode (recommended during development)
pnpm test:watch

# Coverage report
pnpm test:coverage
```

View coverage:
```bash
open coverage/lcov-report/index.html  # Open in browser
```

---

## **Debugging**

### Debug TypeScript Source

```bash
# Terminal debug
node --inspect-brk node_modules/.bin/ts-node src/index.ts

# Or use VS Code launch config (see VS_CODE_SETUP.md)
# Press F5 to start debugging with breakpoints
```

### View Logs During Development

```bash
pnpm run dev
# Logs appear in terminal with timestamps and context
```

---

## **Common Issues**

### "pnpm not found"
```bash
npm install -g pnpm
pnpm --version
```

### "Cannot find module @anthropic-ai/sdk"
```bash
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

### "Tests fail locally but pass in CI"
```bash
# Clear cache
rm -rf .jest-cache coverage
pnpm test --no-cache
```

### "Commit rejected: lint errors"
```bash
pnpm lint:fix        # Auto-fix linting issues
pnpm format          # Format code
git add .
git commit -m "feat: message"
```

### "EditorConfig not working in VS Code"
```bash
# Install extension: EditorConfig for VS Code
# Reload window: Ctrl+Shift+P → Developer: Reload Window
```

---

## **File Structure**

```
yieldsmith/
├── src/
│   ├── core/              # Interfaces (market-agnostic)
│   ├── types/             # TypeScript type definitions
│   ├── markets/           # Market implementations
│   ├── data/
│   │   ├── providers/     # Data adapters
│   │   └── repository.ts  # Database access
│   ├── criteria/
│   │   └── evaluators/    # Stock evaluation criteria
│   ├── strategies/        # Investment strategies
│   ├── services/          # Business logic
│   ├── ai/                # AI provider implementations
│   ├── notifications/     # Alert/notification system
│   ├── utils/             # Utility functions
│   └── index.ts           # Entry point
├── tests/
│   ├── unit/
│   └── integration/
├── config/
│   ├── criteria.config.json
│   ├── strategies.config.json
│   ├── markets.config.json
│   ├── ai.config.json
│   └── notifications.config.json
├── supabase/
│   └── migrations/
├── docs/
├── .github/
│   └── workflows/
│   └── pull_request_template.md
├── .husky/               # Git hooks
├── .vscode/              # VS Code settings
├── package.json
├── tsconfig.json
├── jest.config.js
├── .eslintrc.json
├── .prettierrc.json
├── .editorconfig
├── .env.example
└── README.md
```

---

## **Next Steps**

1. ✅ Complete quick setup above
2. ✅ Review [PROJECT_RULES.md](PROJECT_RULES.md)
3. ✅ Read [ARCHITECTURE.md](ARCHITECTURE.md)
4. ✅ Check [CONTRIBUTING.md](../CONTRIBUTING.md)
5. ✅ Start contributing!

---

## **Getting Help**

- **TypeScript issues** → Check `tsconfig.json` settings
- **Test failures** → Read test output carefully, run with `--verbose`
- **Git issues** → See [HUSKY_SETUP.md](HUSKY_SETUP.md)
- **Editor issues** → See [VS_CODE_SETUP.md](VS_CODE_SETUP.md)
- **General questions** → Check [CONTRIBUTING.md](../CONTRIBUTING.md)

---

**Ready to develop? Run:**
```bash
pnpm install
pnpm prepare
pnpm run dev
```

Happy coding! 🚀
