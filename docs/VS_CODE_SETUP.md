# VS Code Setup Guide

## Recommended Extensions

Install these extensions for optimal development experience:

### Essential
- **Prettier - Code formatter** (esbenp.prettier-vscode)
  - Auto-formats code on save
  - Respects `.prettierrc.json` config

- **ESLint** (dbaeumer.vscode-eslint)
  - Real-time linting
  - Shows errors/warnings inline

- **TypeScript** (ms-vscode.vscode-typescript-next)
  - Enhanced TypeScript support
  - Better intellisense

- **Jest** (orta.vscode-jest)
  - Run tests from editor
  - See test results inline

### Productivity
- **GitLens** (eamodio.gitlens)
  - See who changed what code
  - Blame annotations

- **GitHub Copilot** (GitHub.copilot) + **Copilot Chat** (GitHub.copilot-chat)
  - AI code suggestions
  - Chat for quick questions

### Optional
- **Thunder Client** (rangav.vscode-thunder-client)
  - REST API testing (if needed for future endpoints)

- **SQLTools** (mtxr.sqltools)
  - Supabase database management

---

## VS Code Settings

Create `.vscode/settings.json`:

```json
{
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "files.autoSave": "onFocusChange",
  "[typescript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode",
    "editor.formatOnSave": true
  },
  "typescript.enablePromptUseWorkspaceTsdk": true,
  "typescript.tsdk": "node_modules/typescript/lib",
  "jest.showCoverageOnLoad": false,
  "search.exclude": {
    "**/node_modules": true,
    "**/dist": true,
    "**/.git": true
  }
}
```

---

## Keyboard Shortcuts

Add to `.vscode/keybindings.json`:

```json
[
  {
    "key": "shift+alt+f",
    "command": "editor.action.formatDocument"
  },
  {
    "key": "ctrl+shift+x",
    "command": "eslint.fixAll"
  }
]
```

---

## Useful Commands

```bash
# Format entire project
Ctrl+Shift+P → "Format Document"

# Run tests for current file
Ctrl+Shift+P → "Jest: Run Tests"

# Show git blame
Ctrl+Shift+P → "GitLens: Show Blame"

# Quick fix (ESLint)
Ctrl+. (dot) → Select fix
```

---

## First-Time Setup

```bash
# 1. Clone repo
git clone https://github.com/your-org/yieldsmith.git

# 2. Open in VS Code
code yieldsmith

# 3. Install recommended extensions
# VS Code will show "Install All" prompt

# 4. Install dependencies
pnpm install
pnpm prepare  # Setup Husky

# 5. You're ready!
# Extensions will auto-format on save
# ESLint will show errors inline
# Jest will run tests on changes
```

---

## Debugging

### Debug Jest Tests
In `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Jest Debug",
      "program": "${workspaceFolder}/node_modules/.bin/jest",
      "args": ["--runInBand", "--no-cache"],
      "console": "integratedTerminal",
      "internalConsoleOptions": "neverOpen"
    }
  ]
}
```

Then press `F5` to debug tests with breakpoints.

---

## Tips & Tricks

1. **Format on save** — Prettier runs automatically on file save
2. **Lint on save** — ESLint fixes simple issues (import order, spacing)
3. **Type checking** — TypeScript shows errors in editor in real-time
4. **Git blame** — Hover over code to see who changed it last
5. **Quick fix** — Press `Ctrl+.` to see available fixes

---

**Having issues?** See [../CONTRIBUTING.md](../CONTRIBUTING.md) for help.
