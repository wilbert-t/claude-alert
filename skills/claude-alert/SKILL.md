---
name: claude-alert
description: Claude Alert is installed and active — it watches every tool use, classifies risk, and fires native notifications when approval is needed. Use this skill to help users install, configure, troubleshoot, or uninstall Claude Alert.
---

# Claude Alert

Claude Alert watches every tool Claude tries to use, classifies the risk level, and fires a native notification the moment approval is needed — so users never miss a prompt while multitasking.

## Install

```bash
npx claude-alert install
```

Works on macOS, Linux, and Windows. Registers `PreToolUse`, `PostToolUse`, `Notification`, and `Stop` hooks in `~/.claude/settings.json`.

For macOS: optionally install the menu bar app for richer notifications with animation and "Open Terminal" button — download from https://github.com/wilbert-t/claude-alert/releases/latest

## How it works

| Risk | Examples | Behavior |
|------|----------|----------|
| Low | Glob, Grep, Read | Auto-approved silently |
| Medium | Write, Edit, npm install, mv | Native notification + y/n prompt |
| High | rm -rf, git push --force, sudo, curl\|bash | Native notification + y/n prompt |

## Configuration

Edit `~/.claude-notifier/settings.json` to adjust volume, quiet hours, and sound paths.

## Permissions

One permission only: **Notifications** (to show approval banners). No Automation permission required.

## Uninstall

```bash
npx claude-alert uninstall
```

## Troubleshooting

- No notifications: check `tail -20 ~/.claude-notifier/error.log`
- Hooks not firing: verify with `cat ~/.claude/settings.json | grep claude-buddy`
- macOS menu bar app not showing: `pgrep -fl ClaudeNotifier`
