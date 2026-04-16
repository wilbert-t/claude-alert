#!/usr/bin/env node

/**
 * Claude Code Notifier — Main Hook Script
 *
 * Runs when Claude Code fires the Notification hook.
 * Reads event JSON from stdin, classifies risk, shows native banner notification.
 */

import fs from 'fs';
import path from 'path';
import os from 'os';
import { classifyRisk } from './risk.js';
import * as auditLogger from './audit.js';
import * as settings from './settings.js';
import CharacterState from './character-state.js';
import { notify as platformNotify } from './platform.js';

const LOCK_FILE = path.join(os.homedir(), '.claude-notifier', 'notify.lock');

/**
 * Check rate limits: cooldown + maxAlertsPerMinute.
 * Returns true if sound/alert is allowed, false if throttled.
 */
function checkRateLimit(cooldownSeconds, maxAlertsPerMinute) {
  try {
    const now = Date.now();
    let lock = { timestamp: 0, minuteWindow: now, minuteCount: 0 };
    if (fs.existsSync(LOCK_FILE)) {
      lock = { ...lock, ...JSON.parse(fs.readFileSync(LOCK_FILE, 'utf-8')) };
    }

    // Cooldown check
    if ((now - lock.timestamp) / 1000 < cooldownSeconds) return false;

    // Per-minute cap check — reset window if > 60s old
    if (now - lock.minuteWindow > 60000) {
      lock.minuteWindow = now;
      lock.minuteCount = 0;
    }
    if (lock.minuteCount >= maxAlertsPerMinute) return false;

    return true;
  } catch {
    return true;
  }
}

/**
 * Update rate-limit lock file after firing an alert
 */
function updateLock() {
  try {
    const now = Date.now();
    const dir = path.dirname(LOCK_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    let lock = { timestamp: 0, minuteWindow: now, minuteCount: 0 };
    if (fs.existsSync(LOCK_FILE)) {
      lock = { ...lock, ...JSON.parse(fs.readFileSync(LOCK_FILE, 'utf-8')) };
    }
    if (now - lock.minuteWindow > 60000) { lock.minuteWindow = now; lock.minuteCount = 0; }
    lock.timestamp = now;
    lock.minuteCount += 1;
    fs.writeFileSync(LOCK_FILE, JSON.stringify(lock));
  } catch (err) {
    settings.logError(`Failed to update lock file: ${err.message}`);
  }
}

/**
 * Get risk label for display
 */
function getRiskLabel(level) {
  const labels = {
    low: '🟢 Low',
    medium: '🟡 Medium',
    high: '🔴 High'
  };
  return labels[level] || level;
}

/**
 * Main entry point
 */
async function main() {
  try {
    // Read settings
    const appSettings = settings.read();

    // Initialize character state
    const characterState = new CharacterState();

    // Quiet time check (hours + days)
    const inQuietHours = settings.isQuietHours();
    const inQuietDay   = settings.isQuietDay();
    const isMuted      = inQuietHours || inQuietDay;

    // Read stdin (event JSON from Claude Code hook)
    let eventData = '';
    process.stdin.setEncoding('utf-8');

    for await (const chunk of process.stdin) {
      eventData += chunk;
    }

    if (!eventData.trim()) {
      // No event data — exit gracefully
      process.exit(0);
    }

    let event;
    try {
      event = JSON.parse(eventData);
    } catch (err) {
      settings.logError(`Failed to parse event JSON: ${err.message}`);
      process.exit(0);
    }

    // Extract event details
    const tool = event.tool || 'unknown';
    const command = event.input?.command || event.command || JSON.stringify(event.input || {});
    const description = event.description || `${tool} approval needed`;

    // Classify risk (pass custom patterns from settings)
    const riskLevel = classifyRisk(tool, command, appSettings.customPatterns);

    // Update character state for animation
    try {
      characterState.appendEvent('approval-pending', riskLevel, 1);
      characterState.writeState('pending_' + riskLevel, riskLevel, 1, null, new Date().toISOString());
    } catch (err) {
      settings.logError(`Failed to update character state: ${err.message}`);
    }


    // Log to audit (respects auditEnabled + auditMaxEntries)
    if (appSettings.auditEnabled !== false) {
      auditLogger.log({
        tool,
        command,
        description,
        riskLevel,
        notified: true,
        maxEntries: appSettings.auditMaxEntries ?? 1000
      });
    }

    const cooldown = appSettings.cooldownSeconds ?? 3;
    const maxPerMin = appSettings.maxAlertsPerMinute ?? 10;
    const allowed = checkRateLimit(cooldown, maxPerMin);


    // Show notification banner
    if (appSettings.notificationsEnabled !== false && allowed) {
      const title   = appSettings.notificationTitle || 'Claude Alert';
      const badge   = appSettings.showRiskBadge !== false ? ` — ${getRiskLabel(riskLevel)}` : '';
      const preview = appSettings.showCommandPreview !== false
        ? command.slice(0, 100) + (command.length > 100 ? '…' : '')
        : description;
      platformNotify(`${title}${badge}`, preview);
      updateLock();
    }

    // Success — exit cleanly
    process.exit(0);
  } catch (err) {
    settings.logError(`Notifier crashed: ${err.message}`);
    // Even on error, exit gracefully so we don't block Claude Code
    process.exit(0);
  }
}

main().catch((err) => {
  settings.logError(`Uncaught error in notifier: ${err.message}`);
  process.exit(0);
});
