# Husky Setup Guide

Husky is configured but needs to be initialized. Run this after first install:

```bash
pnpm install        # Install dependencies
pnpm prepare        # Initialize Husky hooks
```

This will create:
- `.husky/pre-commit` — Runs lint-staged before commit
- `.husky/commit-msg` — Validates commit message format

## What Happens When You Commit

```bash
git add src/criteria/yield-evaluator.ts
git commit -m "feat: add yield criterion evaluator"

# Husky runs automatically:
# 1. pre-commit hook → lint-staged
#    - Formats changed files with Prettier
#    - Lints with ESLint
#    - Runs Jest on related tests
# 2. commit-msg hook → commitlint
#    - Validates: "feat: add yield criterion evaluator"
#    - Rejects: "wip" or "asdf" or "Fixed stuff"
#    - Only allows: feat, fix, docs, test, refactor, perf, chore, etc.
```

## If Commit Hooks Fail

**Lint/format issues:**
```bash
pnpm lint:fix       # Auto-fix linting
pnpm format         # Auto-format code
git add .           # Re-stage files
git commit -m "feat: message"  # Try again
```

**Commit message format:**
```bash
# ❌ Bad:
git commit -m "wip"
git commit -m "fixes"
git commit -m "Updated files"

# ✅ Good:
git commit -m "feat: add yield criterion evaluator"
git commit -m "fix: handle null dividend values"
git commit -m "docs: add strategy guide"
git commit -m "test: add coverage for earnings criterion"
git commit -m "refactor: extract price calculation"
git commit -m "chore: update dependencies"
```

## Manual Husky Initialization

If `pnpm prepare` doesn't work, initialize manually:

```bash
pnpm husky install

# Create pre-commit hook
cat > .husky/pre-commit << 'EOF'
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

pnpm lint-staged
EOF

# Create commit-msg hook
cat > .husky/commit-msg << 'EOF'
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

pnpm commitlint --edit $1
EOF

# Make hooks executable
chmod +x .husky/pre-commit
chmod +x .husky/commit-msg
```

## Bypass Hooks (Not Recommended)

If you need to bypass hooks temporarily:
```bash
git commit --no-verify -m "chore: skip checks"
```

**⚠️ Warning:** Only use when absolutely necessary. We prefer all commits pass quality checks.

## Reference

- **Husky docs:** https://typicode.github.io/husky/
- **Commitlint docs:** https://commitlint.js.org/
- **Conventional Commits:** https://www.conventionalcommits.org/
