// scripts/character-state.js

import fs from 'fs';
import path from 'path';
import os from 'os';

class CharacterState {
  constructor() {
    this.baseDir = path.join(os.homedir(), '.claude-notifier');
    this.statePath = path.join(this.baseDir, 'state.json');
    this.eventsPath = path.join(this.baseDir, 'events.jsonl');

    // Ensure directory exists
    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true });
    }
  }

  /**
   * Write current character state to state.json
   * @param {string} status - idle | pending_low | pending_medium | pending_high | celebrating
   * @param {string} riskLevel - low | medium | high
   * @param {number} pendingCount - number of pending approvals
   * @param {string|null} celebratingUntil - ISO timestamp when celebration ends (null if not celebrating)
   * @param {string|null} firstPendingTime - ISO timestamp of oldest pending approval (null if idle)
   */
  writeState(status, riskLevel, pendingCount, celebratingUntil = null, firstPendingTime = null) {
    // Validate inputs
    const validStatuses = ['idle', 'pending_low', 'pending_medium', 'pending_high', 'celebrating'];
    const validRiskLevels = ['low', 'medium', 'high'];

    if (!validStatuses.includes(status)) {
      const err = new Error(`Invalid status: ${status}`);
      this.logError(`writeState validation error: ${err.message}`);
      return;
    }

    if (riskLevel !== null && !validRiskLevels.includes(riskLevel)) {
      const err = new Error(`Invalid riskLevel: ${riskLevel}`);
      this.logError(`writeState validation error: ${err.message}`);
      return;
    }

    if (typeof pendingCount !== 'number' || pendingCount < 0) {
      const err = new Error(`Invalid pendingCount: ${pendingCount}`);
      this.logError(`writeState validation error: ${err.message}`);
      return;
    }

    const state = {
      status,
      riskLevel,
      pendingCount,
      lastEventTime: new Date().toISOString(),
      celebratingUntil,
      firstPendingTime
    };

    try {
      fs.writeFileSync(this.statePath, JSON.stringify(state, null, 2));
    } catch (err) {
      // Log to error.log instead of throwing
      this.logError(`writeState failed: ${err.message}`);
    }
  }

  /**
   * Append event to events.jsonl
   * @param {string} type - approval-pending | approval-approved | approval-cleared | approval-denied
   * @param {string|null} risk - low | medium | high (for approval-pending)
   * @param {number|null} count - pending count (for approval-pending)
   */
  appendEvent(type, risk = null, count = null) {
    // Validate inputs
    const validTypes = ['approval-pending', 'approval-approved', 'approval-cleared', 'approval-denied'];
    const validRisks = ['low', 'medium', 'high'];

    if (!validTypes.includes(type)) {
      const err = new Error(`Invalid type: ${type}`);
      this.logError(`appendEvent validation error: ${err.message}`);
      return;
    }

    if (risk !== null && !validRisks.includes(risk)) {
      const err = new Error(`Invalid risk: ${risk}`);
      this.logError(`appendEvent validation error: ${err.message}`);
      return;
    }

    if (count !== null && (typeof count !== 'number' || count < 0)) {
      const err = new Error(`Invalid count: ${count}`);
      this.logError(`appendEvent validation error: ${err.message}`);
      return;
    }

    const event = {
      type,
      ts: new Date().toISOString()
    };

    if (risk) event.risk = risk;
    if (count !== null && count !== undefined) event.count = count;

    try {
      const line = JSON.stringify(event) + '\n';
      fs.appendFileSync(this.eventsPath, line);
    } catch (err) {
      this.logError(`appendEvent failed: ${err.message}`);
    }
  }

  /**
   * Determine character status based on pending approvals
   * Returns: idle, pending_low, pending_medium, pending_high
   * Also returns the highest risk level found
   */
  calculateStatusFromPending(pendingApprovals) {
    if (!pendingApprovals || pendingApprovals.length === 0) {
      return { status: 'idle', riskLevel: null };
    }

    // Find highest risk level
    let highestRisk = 'low';
    for (const approval of pendingApprovals) {
      const risk = approval.riskLevel || 'low';
      if (risk === 'high') {
        highestRisk = 'high';
        break;
      } else if (risk === 'medium' && highestRisk !== 'high') {
        highestRisk = 'medium';
      }
    }

    const statusMap = {
      low: 'pending_low',
      medium: 'pending_medium',
      high: 'pending_high'
    };

    return {
      status: statusMap[highestRisk],
      riskLevel: highestRisk
    };
  }

  /**
   * Helper: Log error to ~/.claude-notifier/error.log
   */
  logError(message) {
    const errorPath = path.join(this.baseDir, 'error.log');
    const timestamp = new Date().toISOString();
    const line = `[${timestamp}] ${message}\n`;
    try {
      fs.appendFileSync(errorPath, line);
    } catch (err) {
      // Silent fail, don't break the skill
    }
  }
}

export default CharacterState;
