---
name: Claude Alert
description: Native macOS notification system for Claude Code. Alerts you with sound and a banner notification the moment Claude needs approval, auto-approves safe operations silently, and focuses your terminal so you can respond instantly.
type: tool
triggers:
  - hook: PreToolUse
    description: Fired before every tool use — classifies risk and fires notification for MED/HIGH
    run: node scripts/pre-tool.js
  - hook: PostToolUse
    description: Fired after a tool runs — triggers celebration animation on approval
    run: node scripts/post-tool.js
  - hook: Notification
    description: Fired on Claude Code notification events — plays alert sound
    run: node scripts/notify.js
  - hook: Stop
    description: Fired when Claude session ends — resets menu bar state
    run: node scripts/on-stop.js
---

# Claude Alert

Never miss a Claude Code approval prompt again. Claude Alert watches every tool Claude tries to use, classifies the risk, and fires a native macOS banner notification the instant your attention is needed — then focuses your exact terminal window so you can approve and keep moving.

## Why Claude Code Users Need This

Claude Code is built to work autonomously, but it must pause and ask for permission before running anything risky. The problem: it pauses silently. If you step away, switch windows, or glance at your phone, Claude just sits there waiting. You lose time and flow.

Claude Alert solves this with three behaviors:

1. **LOW risk operations** (reading files, searching, listing) are auto-approved silently. No interruptions for safe work.
2. **MED/HIGH risk operations** (writing files, installing packages, deleting, force-pushing) trigger a native macOS banner notification with a sound. Claude's native terminal prompt still handles the actual approval.
3. **Tap "Open Terminal"** in the notification → your terminal comes to front → you approve or deny instantly.

The result: Claude works uninterrupted on safe tasks, alerts you only when it matters, and gets your terminal in front of you immediately.

## Installation

```bash
npx claude-alert install
```

Registers `PreToolUse`, `PostToolUse`, `Notification`, and `Stop` hooks in `~/.claude/settings.json`. Works on macOS, Linux, and Windows.

### macOS menu bar app (optional)

Download `ClaudeNotifier.app.zip` from [Releases](https://github.com/wilbert-t/claude-alert/releases/latest), unzip, and open. Grant notification permission when macOS asks.

**No other permissions required.** Claude Alert does not request Automation permission.

## Risk Levels

| Risk | Examples | What Happens |
|------|----------|--------------|
| **Low** | Glob, Grep, Read, LS | Auto-approved silently |
| **Medium** | Write, Edit, Bash (general), npm install, mv | Banner notification + Claude's native y/n prompt |
| **High** | rm -rf, git push --force, DROP TABLE, sudo, curl\|bash, mkfs | Banner notification + Claude's native y/n prompt |

## Configuration

`~/.claude-notifier/settings.json`:

```json
{
  "soundEnabled": true,
  "volume": 0.8,
  "soundPaths": {
    "low": "/System/Library/Sounds/Glass.aiff",
    "medium": "/System/Library/Sounds/Ping.aiff",
    "high": "/System/Library/Sounds/Sosumi.aiff"
  },
  "lowSoundEnabled": true,
  "mediumSoundEnabled": true,
  "highSoundEnabled": true,
  "quietHoursStart": null,
  "quietHoursEnd": null
}
```

### Quiet Hours

```json
"quietHoursStart": "22:00",
"quietHoursEnd": "08:00"
```

## Recommended: Switch to Alert Style

In System Settings → Notifications → ClaudeNotifier, switch from **Banners** to **Alerts**. Alerts stay on screen until you dismiss them — better for approval prompts that require action.

## Audit Log

All approvals are logged to `~/.claude-notifier/audit.json`:

```bash
jq '.[-10:]' ~/.claude-notifier/audit.json
jq '[.[] | select(.riskLevel == "high")]' ~/.claude-notifier/audit.json
```

## Uninstall

```bash
node setup/uninstall.js          # Remove hooks, keep audit log
node setup/uninstall.js --clean-all  # Remove everything
```

## Privacy

- All data stored locally in `~/.claude-notifier/`
- No network requests, no telemetry
- macOS only (uses UNUserNotificationCenter, native menu bar app)
