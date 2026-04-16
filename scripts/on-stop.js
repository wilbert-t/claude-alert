#!/usr/bin/env node

/**
 * Claude Code Stop hook — resets character state to celebrating (then auto-idles).
 * Fires when a Claude Code session ends.
 */

import fs from 'fs';
import path from 'path';
import os from 'os';

const STATE_PATH = path.join(os.homedir(), '.claude-notifier', 'state.json');

try {
  const state = {
    status: 'celebrating',
    riskLevel: null,
    pendingCount: 0,
    lastEventTime: new Date().toISOString(),
    celebratingUntil: null,
    firstPendingTime: null
  };
  fs.writeFileSync(STATE_PATH, JSON.stringify(state, null, 2));
} catch {
  // Silent fail — never block Claude Code
}
