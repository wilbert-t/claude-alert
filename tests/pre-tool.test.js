import { test } from 'node:test';
import assert from 'node:assert';
import fs from 'fs';
import path from 'path';
import os from 'os';

// We'll import helpers after they exist
import { writePendingApproval, readResponse, writeResponse, cleanup } from '../scripts/pre-tool.js';

const NOTIFIER_DIR  = path.join(os.homedir(), '.claude-notifier');
const PENDING_FILE  = path.join(NOTIFIER_DIR, 'pending-approval.json');
const RESPONSE_FILE = path.join(NOTIFIER_DIR, 'approval-response.json');

test('pre-tool helpers', async (t) => {
  await t.test('writePendingApproval creates file with correct fields', async () => {
    cleanup(); // ensure clean slate
    writePendingApproval('123', 'Bash', 'rm -rf /tmp', 'high', 'Permanently deletes files recursively — cannot be undone');
    assert.ok(fs.existsSync(PENDING_FILE));
    const data = JSON.parse(fs.readFileSync(PENDING_FILE, 'utf-8'));
    assert.strictEqual(data.id, '123');
    assert.strictEqual(data.tool, 'Bash');
    assert.strictEqual(data.risk, 'high');
    assert.strictEqual(data.impact, 'Permanently deletes files recursively — cannot be undone');
    assert.ok(data.requestedAt);
    cleanup();
  });

  await t.test('writePendingApproval truncates long commands to 200 chars', async () => {
    cleanup();
    const longCmd = 'x'.repeat(300);
    writePendingApproval('456', 'Bash', longCmd, 'medium', 'some impact');
    const data = JSON.parse(fs.readFileSync(PENDING_FILE, 'utf-8'));
    assert.strictEqual(data.command.length, 200);
    cleanup();
  });

  await t.test('readResponse returns null when file does not exist', async () => {
    cleanup();
    assert.strictEqual(readResponse('abc'), null);
  });

  await t.test('readResponse returns null when id does not match', async () => {
    cleanup();
    fs.mkdirSync(NOTIFIER_DIR, { recursive: true });
    fs.writeFileSync(RESPONSE_FILE, JSON.stringify({ id: 'other', decision: 'approved' }));
    assert.strictEqual(readResponse('abc'), null);
    cleanup();
  });

  await t.test('readResponse returns decision when id matches', async () => {
    cleanup();
    fs.mkdirSync(NOTIFIER_DIR, { recursive: true });
    fs.writeFileSync(RESPONSE_FILE, JSON.stringify({ id: 'abc', decision: 'approved' }));
    assert.strictEqual(readResponse('abc'), 'approved');
    cleanup();
  });

  await t.test('readResponse returns rejected decision', async () => {
    cleanup();
    fs.mkdirSync(NOTIFIER_DIR, { recursive: true });
    fs.writeFileSync(RESPONSE_FILE, JSON.stringify({ id: 'abc', decision: 'rejected' }));
    assert.strictEqual(readResponse('abc'), 'rejected');
    cleanup();
  });

  await t.test('writeResponse writes approved decision', async () => {
    cleanup();
    const ok = writeResponse('abc', 'approved', 'terminal');
    assert.strictEqual(ok, true);
    assert.strictEqual(readResponse('abc'), 'approved');
    cleanup();
  });

  await t.test('cleanup can keep response file when requested', async () => {
    cleanup();
    fs.mkdirSync(NOTIFIER_DIR, { recursive: true });
    fs.writeFileSync(PENDING_FILE, '{}');
    fs.writeFileSync(RESPONSE_FILE, JSON.stringify({ id: 'abc', decision: 'approved' }));
    cleanup({ removePending: true, removeResponse: false });
    assert.ok(!fs.existsSync(PENDING_FILE));
    assert.ok(fs.existsSync(RESPONSE_FILE));
    cleanup();
  });

  await t.test('cleanup removes both files', async () => {
    fs.mkdirSync(NOTIFIER_DIR, { recursive: true });
    fs.writeFileSync(PENDING_FILE, '{}');
    fs.writeFileSync(RESPONSE_FILE, '{}');
    cleanup();
    assert.ok(!fs.existsSync(PENDING_FILE));
    assert.ok(!fs.existsSync(RESPONSE_FILE));
  });
});
