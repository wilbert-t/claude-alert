import fs from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';

const NOTIFIER_DIR = path.join(os.homedir(), '.claude-notifier');
const AUDIT_FILE = path.join(NOTIFIER_DIR, 'audit.json');

/**
 * Ensure ~/.claude-notifier directory and audit.json file exist
 */
function ensureFile() {
  if (!fs.existsSync(NOTIFIER_DIR)) {
    fs.mkdirSync(NOTIFIER_DIR, { recursive: true });
  }

  if (!fs.existsSync(AUDIT_FILE)) {
    fs.writeFileSync(AUDIT_FILE, JSON.stringify([], null, 2));
  }
}

/**
 * Generate unique event ID
 */
function generateId() {
  return `approval-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
}

/**
 * Log an approval event to the audit file
 * @param {object} event - Event data
 * @param {string} event.tool - Tool name (e.g., "Bash", "Write")
 * @param {string} event.command - Command/action being approved
 * @param {string} event.riskLevel - "low", "medium", or "high"
 * @param {boolean} event.notified - Whether user was notified
 * @param {string} [event.description] - Optional description
 */
export function log(event) {
  try {
    ensureFile();

    const entry = {
      id: event.id || generateId(),
      tool: event.tool || 'unknown',
      command: String(event.command || '').slice(0, 200), // Truncate to 200 chars
      description: event.description ? String(event.description).slice(0, 500) : null,
      riskLevel: event.riskLevel || 'medium',
      timestamp: event.timestamp || Date.now(),
      notified: Boolean(event.notified)
    };

    // Read current entries
    let entries = [];
    try {
      const content = fs.readFileSync(AUDIT_FILE, 'utf-8');
      entries = JSON.parse(content);
      if (!Array.isArray(entries)) {
        entries = [];
      }
    } catch (err) {
      console.error(`Failed to parse audit file: ${err.message}`);
      entries = [];
    }

    // Append new entry
    entries.push(entry);

    // Trim to configured max (default 1000, hard cap 10000)
    const maxEntries = Math.min(event.maxEntries ?? 1000, 10000);
    if (entries.length > maxEntries) {
      entries = entries.slice(-maxEntries);
    }

    // Write back
    fs.writeFileSync(AUDIT_FILE, JSON.stringify(entries, null, 2));

    return entry;
  } catch (err) {
    console.error(`Audit log failed: ${err.message}`);
    return null;
  }
}

/**
 * Read all audit entries
 */
export function readAll() {
  try {
    ensureFile();
    const content = fs.readFileSync(AUDIT_FILE, 'utf-8');
    return JSON.parse(content) || [];
  } catch (err) {
    console.error(`Failed to read audit log: ${err.message}`);
    return [];
  }
}

/**
 * Read last N entries
 */
export function readLast(count = 10) {
  const entries = readAll();
  return entries.slice(-count);
}

/**
 * Filter entries by risk level
 */
export function filterByRisk(level) {
  return readAll().filter(e => e.riskLevel === level);
}

/**
 * Filter entries by tool
 */
export function filterByTool(tool) {
  return readAll().filter(e => e.tool === tool);
}

/**
 * Filter entries by date range
 * @param {number} startTime - Unix timestamp
 * @param {number} endTime - Unix timestamp
 */
export function filterByDateRange(startTime, endTime) {
  return readAll().filter(e => e.timestamp >= startTime && e.timestamp <= endTime);
}

/**
 * Get audit statistics
 */
export function getStats() {
  const entries = readAll();

  const stats = {
    total: entries.length,
    byRisk: { low: 0, medium: 0, high: 0 },
    byTool: {},
    notified: 0,
    firstEntry: entries[0] ? new Date(entries[0].timestamp) : null,
    lastEntry: entries[entries.length - 1] ? new Date(entries[entries.length - 1].timestamp) : null
  };

  for (const entry of entries) {
    stats.byRisk[entry.riskLevel]++;
    stats.byTool[entry.tool] = (stats.byTool[entry.tool] || 0) + 1;
    if (entry.notified) stats.notified++;
  }

  return stats;
}

/**
 * Clear all audit entries
 * WARNING: This is destructive!
 */
export function clear() {
  try {
    ensureFile();
    fs.writeFileSync(AUDIT_FILE, JSON.stringify([], null, 2));
  } catch (err) {
    console.error(`Failed to clear audit log: ${err.message}`);
  }
}

/**
 * Export audit log to JSON file
 */
export function exportToFile(filePath) {
  try {
    const entries = readAll();
    fs.writeFileSync(filePath, JSON.stringify(entries, null, 2));
    return filePath;
  } catch (err) {
    console.error(`Failed to export audit log: ${err.message}`);
    return null;
  }
}
