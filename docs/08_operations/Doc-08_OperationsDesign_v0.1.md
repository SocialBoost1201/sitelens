# Doc-08: Operations Design

**Project**: SiteLens
**Version**: 0.1 [DRAFT]
**Status**: Draft — Not finalized

---

## Overview

This document will define the deployment process, monitoring setup, and
operational runbooks for SiteLens.

---

## Sections (TBD)

- [ ] Deployment pipeline (Vercel + GitHub)
- [ ] Environment strategy (local / preview / production)
- [ ] Sentry error tracking configuration
- [ ] PostHog analytics setup
- [x] MCP Figma repo-local workflow baseline
- [ ] Logging conventions
- [ ] Alerting and on-call process
- [ ] Backup and recovery (Supabase)
- [ ] Runbooks for common operational tasks

---

## MCP Figma Repo-Local Workflow [DRAFT]

This repository now includes a minimal MCP Figma baseline for local VS Code
workflows. The goal is to support validation and shared workspace defaults
without claiming features that are actually owned by an external extension or
assistant-specific global configuration.

### Included in SiteLens

- `.vscode/settings.json` defines shared `mcpFigma.*` workspace defaults
- `.vscode/tasks.json` exposes quick VS Code tasks for validation
- `npm run mcp:figma:doctor` checks Node.js, workspace settings, and the
  default WebSocket endpoint
- `npm run mcp:figma:test` performs a strict connectivity check against the
  configured WebSocket port

### Verified baseline

- Node.js requirement is satisfied locally (`v25.9.0` observed during setup)
- Default WebSocket port is `3055`
- Repo-local configuration is limited to workspace files and project scripts

### Explicit non-goals

- This repository does not install the MCP Figma VS Code extension
- This repository does not edit global assistant config files such as
  `~/.cursor/mcp.json`, Windsurf config, or Claude Desktop config
- This repository does not install or manage the Figma plugin
- This repository does not manage the WebSocket server lifecycle directly

### Recommended operator flow

1. Install the MCP Figma VS Code extension manually.
2. Open SiteLens in VS Code so the workspace settings are applied.
3. Run `npm run mcp:figma:doctor` to validate the local baseline.
4. Start the WebSocket server through the extension.
5. Run `npm run mcp:figma:test` to confirm the port is reachable.
6. Complete assistant-specific MCP setup outside the repository, if needed.

### Notes

- If the server is not running yet, `npm run mcp:figma:test` is expected to
  fail with a connection error.
- In restricted or sandboxed environments, the connectivity check may return
  `EPERM` even when the port would otherwise be reachable on a normal local
  machine.
- Shared settings use the documented defaults:
  - `mcpFigma.websocketPort = 3055`
  - `mcpFigma.autoStartWebSocket = false`
  - `mcpFigma.enableStatusBar = true`
  - `mcpFigma.aiAssistant = "cursor"`
