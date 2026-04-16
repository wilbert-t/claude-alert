#!/usr/bin/env node

/**
 * Install script for Claude Code Notifier skill
 *
 * Configures the Notification hook in ~/.claude/settings.json
 * Creates ~/.claude-notifier/ directory and default settings.json
 */

import fs from 'fs';
import path from 'path';
import os from 'os';
import { execFileSync } from 'child_process';
import { fileURLToPath } from 'url';
import * as settingsManager from '../scripts/settings.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CLAUDE_HOME = path.join(os.homedir(), '.claude');
const SETTINGS_PATH = path.join(CLAUDE_HOME, 'settings.json');
const NOTIFIER_DIR = path.join(os.homedir(), '.claude-notifier');
const NOTIFIER_SETTINGS = path.join(NOTIFIER_DIR, 'settings.json');

// Scripts are copied to a stable location so npx cache clears don't break hooks
const SOURCE_SCRIPTS_DIR = path.join(__dirname, '..', 'scripts');
const STABLE_SCRIPTS_DIR = path.join(NOTIFIER_DIR, 'scripts');
const NOTIFY_SCRIPT = path.join(STABLE_SCRIPTS_DIR, 'notify.js');
const PRE_TOOL_SCRIPT = path.join(STABLE_SCRIPTS_DIR, 'pre-tool.js');
const POST_TOOL_SCRIPT = path.join(STABLE_SCRIPTS_DIR, 'post-tool.js');


/**
 * Ensure Claude Code settings directory exists
 */
function ensureClaudeDir() {
  if (!fs.existsSync(CLAUDE_HOME)) {
    fs.mkdirSync(CLAUDE_HOME, { recursive: true });
    console.log(`✓ Created ${CLAUDE_HOME}`);
  }
}

/**
 * Read Claude Code settings.json
 */
function readClaudeSettings() {
  if (!fs.existsSync(SETTINGS_PATH)) {
    return { hooks: {} };
  }
  const content = fs.readFileSync(SETTINGS_PATH, 'utf-8');
  return JSON.parse(content); // Let parse errors propagate — don't silently overwrite settings
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
 * Add Notification hook to settings
 */
function addNotificationHook(settings) {
  if (!settings.hooks) {
    settings.hooks = {};
  }

  // Check if Notification hook already exists
  if (!settings.hooks.Notification) {
    settings.hooks.Notification = [];
  }

  // Check if our hook is already registered (support both old and new format)
  const hookExists = settings.hooks.Notification.some(
    hook =>
      (hook.run && hook.run.includes('notify.js')) ||
      (hook.hooks && hook.hooks.some(h => h.command && h.command.includes('notify.js')))
  );

  if (!hookExists) {
    settings.hooks.Notification.push({
      matcher: '',
      hooks: [
        {
          type: 'command',
          command: `node ${NOTIFY_SCRIPT}`
        }
      ]
    });
    return true; // Hook was added
  }

  return false; // Hook already existed
}

/**
 * Add PreToolUse hook to settings
 */
function addPreToolUseHook(settings) {
  if (!settings.hooks) settings.hooks = {};
  if (!settings.hooks.PreToolUse) settings.hooks.PreToolUse = [];

  const hookExists = settings.hooks.PreToolUse.some(
    hook => hook.hooks?.some(h => h.command?.includes('pre-tool.js'))
  );

  if (!hookExists) {
    settings.hooks.PreToolUse.push({
      matcher: '',
      hooks: [{ type: 'command', command: `node ${PRE_TOOL_SCRIPT}` }]
    });
    return true;
  }
  return false;
}

/**
 * Add PostToolUse hook to settings
 */
function addPostToolUseHook(settings) {
  if (!settings.hooks) settings.hooks = {};
  if (!settings.hooks.PostToolUse) settings.hooks.PostToolUse = [];

  const hookExists = settings.hooks.PostToolUse.some(
    hook => hook.hooks?.some(h => h.command?.includes('post-tool.js'))
  );

  if (!hookExists) {
    settings.hooks.PostToolUse.push({
      matcher: '',
      hooks: [{ type: 'command', command: `node ${POST_TOOL_SCRIPT}` }]
    });
    return true;
  }
  return false;
}

/**
 * Create notifier directory and settings
 */
function initializeNotifierDir() {
  try {
    if (!fs.existsSync(NOTIFIER_DIR)) {
      fs.mkdirSync(NOTIFIER_DIR, { recursive: true });
      console.log(`✓ Created ${NOTIFIER_DIR}`);
    }

    // Write notifier settings if not present
    if (!fs.existsSync(NOTIFIER_SETTINGS)) {
      fs.writeFileSync(NOTIFIER_SETTINGS, JSON.stringify(settingsManager.defaults(), null, 2));
      console.log(`✓ Created default notifier settings at ${NOTIFIER_SETTINGS}`);
    } else {
      console.log(`✓ Notifier settings already exist at ${NOTIFIER_SETTINGS}`);
    }
  } catch (err) {
    console.error(`✗ Failed to initialize notifier directory: ${err.message}`);
    throw err;
  }
}

/**
 * Copy scripts to stable location (~/.claude-notifier/scripts/)
 * so hooks keep working even if the npx cache is cleared.
 */
function copyScripts() {
  try {
    fs.mkdirSync(STABLE_SCRIPTS_DIR, { recursive: true });
    const files = fs.readdirSync(SOURCE_SCRIPTS_DIR).filter(f => f.endsWith('.js'));
    for (const file of files) {
      fs.copyFileSync(
        path.join(SOURCE_SCRIPTS_DIR, file),
        path.join(STABLE_SCRIPTS_DIR, file)
      );
    }
    console.log(`✓ Copied scripts to ${STABLE_SCRIPTS_DIR}`);
  } catch (err) {
    console.error(`✗ Failed to copy scripts: ${err.message}`);
    throw err;
  }
}

/**
 * Verify system sounds are available (platform-aware)
 */
function verifySounds() {
  if (process.platform === 'darwin') {
    const sounds = [
      '/System/Library/Sounds/Glass.aiff',
      '/System/Library/Sounds/Ping.aiff',
      '/System/Library/Sounds/Sosumi.aiff'
    ];
    const missing = sounds.filter(s => !fs.existsSync(s));
    if (missing.length > 0) {
      console.warn(`⚠️  Some system sounds not found: ${missing.join(', ')}`);
      console.warn('   Customize soundPaths in ~/.claude-notifier/settings.json');
    } else {
      console.log('✓ System sounds verified');
    }
  } else if (process.platform === 'win32') {
    console.log('✓ Using Windows SystemSounds (Asterisk / Exclamation / Hand)');
  } else {
    // Linux — check for notify-send and paplay
    try {
      execFileSync('which', ['notify-send'], { stdio: 'ignore' });
      console.log('✓ notify-send available');
    } catch {
      console.warn('⚠️  notify-send not found. Install with: sudo apt install libnotify-bin');
    }
    try {
      execFileSync('which', ['paplay'], { stdio: 'ignore' });
      console.log('✓ paplay available');
    } catch {
      console.warn('⚠️  paplay not found. Install with: sudo apt install pulseaudio-utils');
    }
  }
}

/**
 * Main install function
 */
async function install() {
  console.log('\n🔔 Claude Code Notifier — Installation\n');

  // Plugin mode: hooks are already registered by hooks/hooks.json.
  // Just create ~/.claude-notifier/ and settings — skip script copying and settings.json edits.
  const isPluginMode = !!process.env.CLAUDE_PLUGIN_ROOT;

  try {
    // Step 1: Initialize notifier directory (always needed)
    console.log('📁 Setting up directories...');
    initializeNotifierDir();

    if (isPluginMode) {
      console.log('ℹ️  Running as Claude Code plugin — hooks registered via hooks.json, skipping manual hook registration.');
    } else {
      // Step 2: Ensure Claude directory exists (npm mode only)
      ensureClaudeDir();

      // Step 3: Copy scripts to stable location
      console.log('\n📋 Installing scripts...');
      copyScripts();

      // Step 4: Read Claude settings and add hooks
      console.log('\n🔧 Configuring Claude Code hooks...');
      const claudeSettings = readClaudeSettings();
      const hookAdded = addNotificationHook(claudeSettings);
      addPreToolUseHook(claudeSettings);
      addPostToolUseHook(claudeSettings);
      writeClaudeSettings(claudeSettings);

      if (!hookAdded) {
        console.log('ℹ️  Notification hook was already configured.');
      }
    }

    // Step 5: Verify sounds (always)
    console.log('\n🔊 Verifying alert sounds...');
    verifySounds();

    // Success!
    console.log('\n✅ Installation complete!\n');
    console.log('📋 Next steps:');
    console.log('  1. Review settings: nano ~/.claude-notifier/settings.json');
    const soundTest = process.platform === 'darwin'
      ? 'afplay /System/Library/Sounds/Glass.aiff'
      : process.platform === 'win32'
        ? 'powershell -Command "[System.Media.SystemSounds]::Asterisk.Play()"'
        : 'paplay /usr/share/sounds/freedesktop/stereo/message.oga';
    console.log(`  2. Test a sound: ${soundTest}`);
    if (process.platform === 'darwin') {
      console.log('  3. (Optional) Install the menu bar app for richer notifications:');
      console.log('     https://github.com/wilbert-t/claude-alert/releases/latest');
    }
    console.log('  4. To uninstall: npx claude-alert uninstall\n');

  } catch (err) {
    console.error('\n❌ Installation failed:', err.message, '\n');
    process.exit(1);
  }
}

// Run install
install().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
