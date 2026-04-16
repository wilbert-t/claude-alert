import fs from 'fs';
import path from 'path';
import os from 'os';

const NOTIFIER_DIR = path.join(os.homedir(), '.claude-notifier');
const SETTINGS_FILE = path.join(NOTIFIER_DIR, 'settings.json');
const ERROR_LOG = path.join(NOTIFIER_DIR, 'error.log');

const DEFAULT_SETTINGS = {
  // Rate limiting
  cooldownSeconds: 3,
  maxAlertsPerMinute: 10,

  // Notifications
  notificationsEnabled: true,
  notificationTitle: 'Claude Alert',
  showRiskBadge: true,
  showCommandPreview: true,

  // Quiet time
  quietHoursStart: null,
  quietHoursEnd: null,
  quietDays: [],

  // Auto-approve
  autoApproveLevel: 'low',
  autoApproveTrustedPaths: [],
  customPatterns: {
    high: [],
    medium: [],
    low: []
  },

  // Audit log
  auditEnabled: true,
  auditMaxEntries: 1000
};

/**
 * Ensure ~/.claude-notifier directory exists
 */
function ensureDir() {
  if (!fs.existsSync(NOTIFIER_DIR)) {
    fs.mkdirSync(NOTIFIER_DIR, { recursive: true });
  }
}

/**
 * Read settings from disk, or return defaults if missing
 */
export function read() {
  try {
    ensureDir();
    if (fs.existsSync(SETTINGS_FILE)) {
      const content = fs.readFileSync(SETTINGS_FILE, 'utf-8');
      return JSON.parse(content);
    }
  } catch (err) {
    logError(`Failed to read settings: ${err.message}`);
  }
  return { ...DEFAULT_SETTINGS };
}

/**
 * Write settings to disk
 */
export function write(settings) {
  try {
    ensureDir();
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2));
  } catch (err) {
    logError(`Failed to write settings: ${err.message}`);
  }
}

/**
 * Update a single setting
 */
export function update(key, value) {
  const settings = read();
  settings[key] = value;
  write(settings);
}

/**
 * Merge partial settings
 */
export function merge(partial) {
  const settings = read();
  Object.assign(settings, partial);
  write(settings);
}

/**
 * Reset settings to defaults
 */
export function reset() {
  write({ ...DEFAULT_SETTINGS });
}

/**
 * Get default settings
 */
export function defaults() {
  return { ...DEFAULT_SETTINGS };
}

/**
 * Validate settings object
 */
export function validate(settings) {
  const errors = [];

  if (settings.cooldownSeconds !== undefined &&
      (typeof settings.cooldownSeconds !== 'number' || settings.cooldownSeconds < 0)) {
    errors.push('cooldownSeconds must be a non-negative number');
  }

  if (settings.maxAlertsPerMinute !== undefined &&
      (typeof settings.maxAlertsPerMinute !== 'number' || settings.maxAlertsPerMinute < 1)) {
    errors.push('maxAlertsPerMinute must be a number >= 1');
  }

  if (settings.notificationsEnabled !== undefined && typeof settings.notificationsEnabled !== 'boolean') {
    errors.push('notificationsEnabled must be boolean');
  }

  if (settings.showRiskBadge !== undefined && typeof settings.showRiskBadge !== 'boolean') {
    errors.push('showRiskBadge must be boolean');
  }

  if (settings.showCommandPreview !== undefined && typeof settings.showCommandPreview !== 'boolean') {
    errors.push('showCommandPreview must be boolean');
  }

  if (settings.quietDays !== undefined) {
    const validDays = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];
    if (!Array.isArray(settings.quietDays)) {
      errors.push('quietDays must be an array');
    } else if (settings.quietDays.some(d => !validDays.includes(d.toLowerCase()))) {
      errors.push('quietDays entries must be day names (e.g. "saturday")');
    }
  }

  if (settings.autoApproveLevel !== undefined &&
      !['low', 'medium', 'none'].includes(settings.autoApproveLevel)) {
    errors.push('autoApproveLevel must be "low", "medium", or "none"');
  }

  if (settings.autoApproveTrustedPaths !== undefined && !Array.isArray(settings.autoApproveTrustedPaths)) {
    errors.push('autoApproveTrustedPaths must be an array');
  }

  if (settings.customPatterns !== undefined) {
    if (typeof settings.customPatterns !== 'object' || Array.isArray(settings.customPatterns)) {
      errors.push('customPatterns must be an object with high/medium/low arrays');
    } else {
      for (const level of ['high', 'medium', 'low']) {
        if (settings.customPatterns[level] !== undefined &&
            !Array.isArray(settings.customPatterns[level])) {
          errors.push(`customPatterns.${level} must be an array`);
        }
      }
    }
  }

  if (settings.auditEnabled !== undefined && typeof settings.auditEnabled !== 'boolean') {
    errors.push('auditEnabled must be boolean');
  }

  if (settings.auditMaxEntries !== undefined &&
      (typeof settings.auditMaxEntries !== 'number' || settings.auditMaxEntries < 1)) {
    errors.push('auditMaxEntries must be a number >= 1');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Check if today is a quiet day
 */
export function isQuietDay() {
  const settings = read();
  if (!Array.isArray(settings.quietDays) || settings.quietDays.length === 0) return false;
  const days = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
  const today = days[new Date().getDay()];
  return settings.quietDays.map(d => d.toLowerCase()).includes(today);
}

/**
 * Log error to ~/.claude-notifier/error.log
 */
export function logError(message) {
  try {
    ensureDir();
    const timestamp = new Date().toISOString();
    const entry = `[${timestamp}] ${message}\n`;
    fs.appendFileSync(ERROR_LOG, entry);
  } catch (err) {
    // Fail silently to avoid infinite recursion
    console.error(`Failed to log error: ${err.message}`);
  }
}

/**
 * Check if within quiet hours
 */
export function isQuietHours() {
  const settings = read();
  if (!settings.quietHoursStart || !settings.quietHoursEnd) {
    return false;
  }

  const now = new Date();
  const [startH, startM] = settings.quietHoursStart.split(':').map(Number);
  const [endH, endM] = settings.quietHoursEnd.split(':').map(Number);

  const startSecs = startH * 3600 + startM * 60;
  const endSecs = endH * 3600 + endM * 60;
  const nowSecs = now.getHours() * 3600 + now.getMinutes() * 60;

  if (startSecs < endSecs) {
    return nowSecs >= startSecs && nowSecs < endSecs;
  } else {
    // Spans midnight
    return nowSecs >= startSecs || nowSecs < endSecs;
  }
}
