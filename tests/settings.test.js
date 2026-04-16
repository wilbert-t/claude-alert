import { test } from 'node:test';
import assert from 'node:assert';
import fs from 'fs';
import path from 'path';
import os from 'os';
import * as settingsModule from '../scripts/settings.js';

// Note: These tests will use the real ~/.claude-notifier directory
// This is acceptable because they're non-destructive and add/read test data

test('Settings Manager', async (t) => {
  await t.test('Read defaults', async (t) => {
    const settings = settingsModule.read();
    assert.ok(typeof settings.cooldownSeconds === 'number');
    assert.ok(typeof settings.autoApproveLevel === 'string');
  });

  await t.test('Reset to defaults', async (t) => {
    settingsModule.reset();
    const settings = settingsModule.read();
    const defaults = settingsModule.defaults();

    assert.deepStrictEqual(settings, defaults);
  });

  await t.test('Update single setting', async (t) => {
    settingsModule.update('cooldownSeconds', 5);
    const settings = settingsModule.read();
    assert.strictEqual(settings.cooldownSeconds, 5);
    settingsModule.reset();
  });

  await t.test('Merge settings', async (t) => {
    settingsModule.merge({
      notificationsEnabled: false,
      autoApproveLevel: 'medium'
    });
    const settings = settingsModule.read();
    assert.strictEqual(settings.notificationsEnabled, false);
    assert.strictEqual(settings.autoApproveLevel, 'medium');
    settingsModule.reset();
  });

  await t.test('Validate settings', async (t) => {
    const valid = { autoApproveLevel: 'low', cooldownSeconds: 3 };
    const result = settingsModule.validate(valid);
    assert.ok(result.valid);
  });

  await t.test('Validate invalid cooldownSeconds', async (t) => {
    const invalid = { cooldownSeconds: -1 };
    const result = settingsModule.validate(invalid);
    assert.ok(!result.valid);
    assert.ok(result.errors.length > 0);
  });

  await t.test('Quiet hours detection', async (t) => {
    // Set quiet hours to current time
    const now = new Date();
    const hour = String(now.getHours()).padStart(2, '0');
    const min = String(now.getMinutes()).padStart(2, '0');

    settingsModule.merge({
      quietHoursStart: hour + ':00',
      quietHoursEnd: '23:59'
    });

    // Should be in quiet hours
    const inQuiet = settingsModule.isQuietHours();
    assert.ok(inQuiet);

    // Reset
    settingsModule.reset();
  });

  await t.test('Get defaults', async (t) => {
    const defaults = settingsModule.defaults();
    assert.strictEqual(defaults.autoApproveLevel, 'low');
    assert.strictEqual(defaults.cooldownSeconds, 3);
    assert.strictEqual(defaults.notificationsEnabled, true);
  });

  await t.test('Defaults include all new settings', async (t) => {
    const defaults = settingsModule.defaults();
    assert.strictEqual(defaults.autoApproveLevel, 'low');
    assert.deepStrictEqual(defaults.customPatterns, { high: [], medium: [], low: [] });
    assert.strictEqual(defaults.cooldownSeconds, 3);
    assert.strictEqual(defaults.maxAlertsPerMinute, 10);
    assert.strictEqual(defaults.notificationsEnabled, true);
    assert.strictEqual(defaults.notificationTitle, 'Claude Alert');
    assert.strictEqual(defaults.showRiskBadge, true);
    assert.strictEqual(defaults.showCommandPreview, true);
    assert.deepStrictEqual(defaults.quietDays, []);
    assert.deepStrictEqual(defaults.autoApproveTrustedPaths, []);
    assert.strictEqual(defaults.auditEnabled, true);
    assert.strictEqual(defaults.auditMaxEntries, 1000);
  });

  await t.test('Validate valid autoApproveLevel values', async (t) => {
    for (const level of ['low', 'medium', 'none']) {
      const result = settingsModule.validate({ autoApproveLevel: level });
      assert.ok(result.valid, `Expected valid for autoApproveLevel="${level}"`);
    }
  });

  await t.test('Validate invalid autoApproveLevel', async (t) => {
    const result = settingsModule.validate({ autoApproveLevel: 'high' });
    assert.ok(!result.valid);
    assert.ok(result.errors.some(e => e.includes('autoApproveLevel')));
  });

  await t.test('Validate valid customPatterns', async (t) => {
    const result = settingsModule.validate({
      customPatterns: { high: ['my-cmd'], medium: [], low: ['safe-script'] }
    });
    assert.ok(result.valid);
  });

  await t.test('Validate invalid customPatterns (not object)', async (t) => {
    const result = settingsModule.validate({
      customPatterns: 'high'
    });
    assert.ok(!result.valid);
    assert.ok(result.errors.some(e => e.includes('customPatterns')));
  });

  await t.test('Validate cooldownSeconds and maxAlertsPerMinute', async (t) => {
    const good = settingsModule.validate({ cooldownSeconds: 5, maxAlertsPerMinute: 20 });
    assert.ok(good.valid);
    const bad = settingsModule.validate({ cooldownSeconds: -1 });
    assert.ok(!bad.valid);
  });

  await t.test('Validate quietDays with valid day names', async (t) => {
    const good = settingsModule.validate({ quietDays: ['saturday', 'sunday'] });
    assert.ok(good.valid);
    const bad = settingsModule.validate({ quietDays: ['notaday'] });
    assert.ok(!bad.valid);
  });

  await t.test('isQuietDay returns false when quietDays is empty', async (t) => {
    settingsModule.merge({ quietDays: [] });
    assert.strictEqual(settingsModule.isQuietDay(), false);
    settingsModule.reset();
  });

  await t.test('Validate auditEnabled and auditMaxEntries', async (t) => {
    const good = settingsModule.validate({ auditEnabled: false, auditMaxEntries: 500 });
    assert.ok(good.valid);
    const bad = settingsModule.validate({ auditMaxEntries: 0 });
    assert.ok(!bad.valid);
  });
});
