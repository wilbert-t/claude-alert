#!/usr/bin/env node

/**
 * Claude Code Notifier — PostToolUse Hook
 *
 * Runs after every tool use (meaning the tool was approved and executed).
 * If a MED/HIGH pending-approval.json exists, the user just approved from
 * the terminal → trigger celebration animation and clean up.
 */

import fs from 'fs';
import path from 'path';
import os from 'os';
import readline from 'readline';
import { fileURLToPath } from 'url';
import CharacterState from './character-state.js';
import * as settings from './settings.js';

const NOTIFIER_DIR = path.join(os.homedir(), '.claude-notifier');
const PENDING_FILE = path.join(NOTIFIER_DIR, 'pending-approval.json');

async function main() {
  try {
    // Drain stdin (Claude Code pipes PostToolUse event JSON here)
    const rl = readline.createInterface({ input: process.stdin, output: null });
    try {
      await new Promise((resolve) => { rl.once('line', resolve); });
    } catch { /* ignore */ }
    rl.close();

    // Only celebrate if there was a pending MED/HIGH approval
    // (LOW risk is auto-approved silently and never writes pending-approval.json)
    if (fs.existsSync(PENDING_FILE)) {
      const characterState = new CharacterState();
      characterState.writeState('celebrating', null, 0, null, null);
      try { fs.rmSync(PENDING_FILE, { force: true }); } catch {}
    }

  } catch (err) {
    settings.logError(`post-tool crashed: ${err.message}`);
  }
  process.exit(0);
}

const isDirectExecution =
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectExecution) {
  main().catch(() => process.exit(0));
}
