import { test } from 'node:test';
import assert from 'node:assert';
import * as platform from '../scripts/platform.js';

test('platform.js', async (t) => {

  await t.test('exports all four functions', () => {
    assert.strictEqual(typeof platform.notify, 'function');
    assert.strictEqual(typeof platform.focusTerminal, 'function');
    assert.strictEqual(typeof platform.isCompanionRunning, 'function');
    assert.strictEqual(typeof platform.launchCompanion, 'function');
    assert.strictEqual(platform.playSound, undefined);
  });

  await t.test('notify: does not throw on darwin', () => {
    assert.doesNotThrow(() => platform.notify('Test', 'body', 'darwin'));
  });

  await t.test('notify: does not throw on win32 when powershell unavailable', () => {
    // On macOS, win32 path will fail subprocess — must not throw
    assert.doesNotThrow(() => platform.notify('Test', 'body', 'win32'));
  });

  await t.test('notify: does not throw on linux when notify-send unavailable', () => {
    assert.doesNotThrow(() => platform.notify('Test', 'body', 'linux'));
  });

  await t.test('focusTerminal: no-op and no throw on non-darwin', () => {
    assert.doesNotThrow(() => platform.focusTerminal('com.some.App', 'win32'));
    assert.doesNotThrow(() => platform.focusTerminal('com.some.App', 'linux'));
  });

  await t.test('isCompanionRunning: returns false on non-darwin', () => {
    assert.strictEqual(platform.isCompanionRunning('win32'), false);
    assert.strictEqual(platform.isCompanionRunning('linux'), false);
  });

  await t.test('isCompanionRunning: returns boolean on darwin', () => {
    const result = platform.isCompanionRunning('darwin');
    assert.strictEqual(typeof result, 'boolean');
  });

  await t.test('launchCompanion: no-op and no throw on non-darwin', () => {
    assert.doesNotThrow(() => platform.launchCompanion('win32'));
    assert.doesNotThrow(() => platform.launchCompanion('linux'));
  });

});
