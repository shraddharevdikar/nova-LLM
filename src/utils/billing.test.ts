import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateTokenCost, checkPlanAllowance, PLAN_CONFIGS } from './billing.ts';

test('calculateTokenCost calculates standard flash model costs accurately', () => {
  const cost = calculateTokenCost('gemini-3.8-flash', 1000, 1000);
  // (1000 / 1e6)*0.15 = 0.00015, (1000 / 1e6)*0.60 = 0.00060 -> sum = 0.00075
  assert.equal(cost, 0.00075);
});

test('checkPlanAllowance allows modes on free plan within quota', () => {
  const result = checkPlanAllowance('free', 'agent', 10);
  assert.equal(result.allowed, true);
});

test('checkPlanAllowance allows pro plan for agent mode', () => {
  const result = checkPlanAllowance('pro', 'agent', 50);
  assert.equal(result.allowed, true);
});

test('checkPlanAllowance enforces daily quota limit', () => {
  const result = checkPlanAllowance('free', 'fast', 50);
  assert.equal(result.allowed, false);
  assert.match(result.reason || '', /Daily message quota/);
});
