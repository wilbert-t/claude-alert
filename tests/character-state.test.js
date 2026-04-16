import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert';
import fs from 'fs';
import path from 'path';
import os from 'os';
import CharacterState from '../scripts/character-state.js';

const TEST_DIR = path.join(os.homedir(), '.claude-notifier-test');

// Test helper: create instance with custom directory
function createTestInstance() {
  // Ensure test directory exists before creating instance
  if (!fs.existsSync(TEST_DIR)) {
    fs.mkdirSync(TEST_DIR, { recursive: true });
  }

  const instance = new CharacterState();
  // Override paths for testing - MUST set all three
  instance.baseDir = TEST_DIR;
  instance.statePath = path.join(TEST_DIR, 'state.json');
  instance.eventsPath = path.join(TEST_DIR, 'events.jsonl');
  return instance;
}

// Clean up after each test
function cleanup() {
  if (fs.existsSync(TEST_DIR)) {
    fs.rmSync(TEST_DIR, { recursive: true });
  }
}

describe('CharacterState', () => {
  afterEach(cleanup);

  it('constructor initializes paths correctly', () => {
    const cs = createTestInstance();
    assert.strictEqual(cs.baseDir, TEST_DIR);
    assert.strictEqual(cs.statePath, path.join(TEST_DIR, 'state.json'));
    assert.strictEqual(cs.eventsPath, path.join(TEST_DIR, 'events.jsonl'));
  });

  it('writeState writes valid JSON to state.json', () => {
    const cs = createTestInstance();
    cs.writeState('idle', 'low', 0);

    assert.ok(fs.existsSync(cs.statePath));
    const content = fs.readFileSync(cs.statePath, 'utf8');
    const state = JSON.parse(content);

    assert.strictEqual(state.status, 'idle');
    assert.strictEqual(state.riskLevel, 'low');
    assert.strictEqual(state.pendingCount, 0);
  });

  it('appendEvent appends JSONL lines correctly', () => {
    const cs = createTestInstance();
    cs.appendEvent('approval-pending', 'high', 2);

    assert.ok(fs.existsSync(cs.eventsPath));
    const content = fs.readFileSync(cs.eventsPath, 'utf8');
    const event = JSON.parse(content.trim());

    assert.strictEqual(event.type, 'approval-pending');
    assert.strictEqual(event.risk, 'high');
    assert.strictEqual(event.count, 2);
    assert.ok(event.ts);
  });

  it('appendEvent omits risk/count when null', () => {
    const cs = createTestInstance();
    cs.appendEvent('approval-cleared');

    const content = fs.readFileSync(cs.eventsPath, 'utf8');
    const event = JSON.parse(content.trim());

    assert.strictEqual(event.type, 'approval-cleared');
    assert.strictEqual(event.risk, undefined);
    assert.strictEqual(event.count, undefined);
  });

  it('calculateStatusFromPending returns idle for empty array', () => {
    const cs = createTestInstance();
    const result = cs.calculateStatusFromPending([]);

    assert.deepStrictEqual(result, { status: 'idle', riskLevel: null });
  });

  it('calculateStatusFromPending returns highest risk correctly', () => {
    const cs = createTestInstance();

    // Mixed risks: should return high
    const result1 = cs.calculateStatusFromPending([
      { riskLevel: 'low' },
      { riskLevel: 'medium' },
      { riskLevel: 'high' }
    ]);
    assert.strictEqual(result1.status, 'pending_high');
    assert.strictEqual(result1.riskLevel, 'high');

    // Only medium: should return medium
    const result2 = cs.calculateStatusFromPending([
      { riskLevel: 'medium' },
      { riskLevel: 'low' }
    ]);
    assert.strictEqual(result2.status, 'pending_medium');
    assert.strictEqual(result2.riskLevel, 'medium');
  });

  it('invalid parameters are logged, not thrown', () => {
    const cs = createTestInstance();

    // Invalid status should not throw
    assert.doesNotThrow(() => {
      cs.writeState('invalid', 'low', 0);
    });

    // No state.json should be created
    assert.ok(!fs.existsSync(cs.statePath));

    // But error should be logged
    assert.ok(fs.existsSync(path.join(TEST_DIR, 'error.log')));
  });

  it('logError creates error.log file', () => {
    const cs = createTestInstance();
    cs.logError('Test error message');

    assert.ok(fs.existsSync(path.join(TEST_DIR, 'error.log')));
    const content = fs.readFileSync(path.join(TEST_DIR, 'error.log'), 'utf8');
    assert.ok(content.includes('Test error message'));
  });
});
