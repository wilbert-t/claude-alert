#!/usr/bin/env node

/**
 * Uninstall script for Claude Code Notifier skill
 *
 * Removes the Notification hook from ~/.claude/settings.json
 * Optionally cleans up ~/.claude-notifier/ directory
 */

import fs from 'fs';
import path from 'path';
import os from 'os';

const CLAUDE_HOME = path.join(os.homedir(), '.claude');
const SETTINGS_PATH = path.join(CLAUDE_HOME, 'settings.json');
const NOTIFIER_DIR = path.join(os.homedir(), '.claude-notifier');

// Check for --clean-all flag
const cleanAll = process.argv.includes('--clean-all');
const cleanSettings = process.argv.includes('--clean-settings');

/**
 * Read Claude Code settings.json
 */
function readClaudeSettings() {
  try {
    if (fs.existsSync(SETTINGS_PATH)) {
      const content = fs.readFileSync(SETTINGS_PATH, 'utf-8');
      return JSON.parse(content);
    }
  } catch (err) {
    console.error(`⚠️  Could not read ${SETTINGS_PATH}: ${err.message}`);
  }

  return { hooks: {} };
}

/**
 * Write Claude Code settings.json
 */
function writeClaudeSettings(settings) {
  try {
    fs.writeFileSync(SETTINGS_PATH, JSON.stringify(settings, null, 2));
    console.log(`✓ Updated ${SETTINGS_PATH}`);
  } catch (err) {
    console.error(`✗ Failed to write settings: ${err.message}`);
    throw err;
  }
}

/**
 * Remove Notification hook from settings
 */
function removeNotificationHook(settings) {
  if (!settings.hooks || !settings.hooks.Notification) {
    return false; // Hook didn't exist
  }

  // Filter out our hook
  const filtered = settings.hooks.Notification.filter(
    hook => !hook.run || !hook.run.includes('notify.js')
  );

  if (filtered.length === settings.hooks.Notification.length) {
    return false; // Our hook wasn't found
  }

  if (filtered.length === 0) {
    // No more Notification hooks, remove the key
    delete settings.hooks.Notification;
  } else {
    settings.hooks.Notification = filtered;
  }

  return true; // Hook was removed
}

/**
 * Remove PreToolUse hook from settings
 */
function removePreToolUseHook(settings) {
  if (!settings.hooks || !settings.hooks.PreToolUse) {
    return false; // Hook didn't exist
  }

  // Filter out our hook
  const filtered = settings.hooks.PreToolUse.filter(
    hook => !hook.hooks || !hook.hooks.some(h => h.command && h.command.includes('pre-tool.js'))
  );

  if (filtered.length === settings.hooks.PreToolUse.length) {
    return false; // Our hook wasn't found
  }

  if (filtered.length === 0) {
    // No more PreToolUse hooks, remove the key
    delete settings.hooks.PreToolUse;
  } else {
    settings.hooks.PreToolUse = filtered;
  }

  return true; // Hook was removed
}

/**
 * Remove notifier directory
 */
function removeNotifierDir(cleanAudit = false) {
  try {
    if (!fs.existsSync(NOTIFIER_DIR)) {
      return false;
    }

    if (cleanAudit) {
      // Remove entire directory
      fs.rmSync(NOTIFIER_DIR, { recursive: true, force: true });
      console.log(`✓ Removed ${NOTIFIER_DIR}`);
      return true;
    } else {
      // Keep audit.json for record-keeping, remove everything else
      const files = fs.readdirSync(NOTIFIER_DIR);
      for (const file of files) {
        if (file !== 'audit.json') {
          fs.rmSync(path.join(NOTIFIER_DIR, file), { recursive: true, force: true });
        }
      }
      console.log(`✓ Cleaned up ${NOTIFIER_DIR} (kept audit.json)`);
      return true;
    }
  } catch (err) {
    console.error(`⚠️  Could not clean up ${NOTIFIER_DIR}: ${err.message}`);
    return false;
  }
}

/**
 * Main uninstall function
 */
async function uninstall() {
  console.log('\n🔔 Claude Code Notifier — Uninstallation\n');

  try {
    // Step 1: Remove hooks from Claude settings
    console.log('🔧 Removing Claude Code hooks...');
    const claudeSettings = readClaudeSettings();
    const notificationHookRemoved = removeNotificationHook(claudeSettings);
    const preToolHookRemoved = removePreToolUseHook(claudeSettings);

    if (notificationHookRemoved || preToolHookRemoved) {
      writeClaudeSettings(claudeSettings);
      if (notificationHookRemoved) console.log('✓ Notification hook removed');
      if (preToolHookRemoved) console.log('✓ PreToolUse hook removed');
    } else {
      console.log('ℹ️  No hooks were configured (nothing to remove)');
    }

    // Step 2: Clean up notifier directory
    console.log('\n📁 Cleaning up notifier directory...');

    if (cleanAll) {
      removeNotifierDir(true);
    } else if (cleanSettings) {
      removeNotifierDir(false);
    } else {
      // Ask what to do
      console.log('\nYour approval history is stored in:');
      console.log(`  ${NOTIFIER_DIR}/audit.json\n`);

      // For non-interactive uninstall, just keep it
      removeNotifierDir(false);
      console.log('✓ Settings removed (audit log preserved for your records)');
      console.log('\n💡 To remove everything including audit logs:');
      console.log('  node setup/uninstall.js --clean-all\n');
    }

    // Success
    console.log('\n✅ Uninstallation complete!\n');

  } catch (err) {
    console.error('\n❌ Uninstallation failed:', err.message, '\n');
    process.exit(1);
  }
}

// Run uninstall
uninstall().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
