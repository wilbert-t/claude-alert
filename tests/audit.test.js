import { test } from 'node:test';
import assert from 'node:assert';
import fs from 'fs';
import path from 'path';
import os from 'os';
import * as auditLogger from '../scripts/audit.js';

const TEST_DIR = path.join(os.homedir(), '.claude-notifier-test');
const TEST_AUDIT_FILE = path.join(TEST_DIR, 'audit.json');

// Helper to set up test environment
function setupTestDir() {
  if (!fs.existsSync(TEST_DIR)) {
    fs.mkdirSync(TEST_DIR, { recursive: true });
  }
}

// Helper to clean up
function cleanupTestDir() {
  if (fs.existsSync(TEST_DIR)) {
    fs.rmSync(TEST_DIR, { recursive: true, force: true });
  }
}

test('Audit Logger', async (t) => {
  setupTestDir();

  await t.test('Log event', async (t) => {
    const entry = auditLogger.log({
      tool: 'Bash',
      command: 'ls -la',
      riskLevel: 'low',
      notified: true
    });

    assert.ok(entry.id);
    assert.strictEqual(entry.tool, 'Bash');
    assert.strictEqual(entry.riskLevel, 'low');
    assert.strictEqual(entry.notified, true);
  });

  await t.test('Read all entries', async (t) => {
    auditLogger.log({ tool: 'Glob', command: 'src/**/*.js', riskLevel: 'low' });
    auditLogger.log({ tool: 'Write', command: 'file.js', riskLevel: 'medium' });

    const entries = auditLogger.readAll();
    assert.ok(entries.length >= 2);
  });

  await t.test('Read last N entries', async (t) => {
    const last3 = auditLogger.readLast(3);
    assert.ok(last3.length <= 3);
  });

  await t.test('Filter by risk level', async (t) => {
    auditLogger.clear();
    auditLogger.log({ tool: 'Bash', command: 'rm -rf /', riskLevel: 'high' });
    auditLogger.log({ tool: 'Write', command: 'file.js', riskLevel: 'medium' });
    auditLogger.log({ tool: 'Read', command: 'file.js', riskLevel: 'low' });

    const high = auditLogger.filterByRisk('high');
    assert.strictEqual(high.length, 1);
    assert.strictEqual(high[0].riskLevel, 'high');
  });

  await t.test('Filter by tool', async (t) => {
    auditLogger.clear();
    auditLogger.log({ tool: 'Bash', command: 'cmd1', riskLevel: 'medium' });
    auditLogger.log({ tool: 'Bash', command: 'cmd2', riskLevel: 'medium' });
    auditLogger.log({ tool: 'Write', command: 'file', riskLevel: 'medium' });

    const bash = auditLogger.filterByTool('Bash');
    assert.strictEqual(bash.length, 2);
    assert(bash.every(e => e.tool === 'Bash'));
  });

  await t.test('Get statistics', async (t) => {
    auditLogger.clear();
    auditLogger.log({ tool: 'Bash', command: 'rm -rf /', riskLevel: 'high' });
    auditLogger.log({ tool: 'Write', command: 'file', riskLevel: 'medium' });
    auditLogger.log({ tool: 'Read', command: 'file', riskLevel: 'low' });

    const stats = auditLogger.getStats();
    assert.strictEqual(stats.total, 3);
    assert.strictEqual(stats.byRisk.high, 1);
    assert.strictEqual(stats.byRisk.medium, 1);
    assert.strictEqual(stats.byRisk.low, 1);
  });

  await t.test('Clear audit log', async (t) => {
    auditLogger.log({ tool: 'Bash', command: 'test', riskLevel: 'high' });
    auditLogger.clear();

    const entries = auditLogger.readAll();
    assert.strictEqual(entries.length, 0);
  });

  cleanupTestDir();
});
