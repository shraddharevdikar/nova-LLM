import test from 'node:test';
import assert from 'node:assert/strict';
import { detectIntent, routeModel } from './modelRouter.ts';

test('detectIntent categorizes research queries with current facts', () => {
  const mode = detectIntent('What are the latest discoveries in CRISPR gene editing and recent clinical trials?');
  assert.equal(mode, 'research');
});

test('detectIntent categorizes coding queries', () => {
  const mode = detectIntent('Can you refactor this TypeScript React component to use useReducer?');
  assert.equal(mode, 'coding');
});

test('detectIntent categorizes complex logic and proofs as thinking mode', () => {
  const mode = detectIntent('Give me a step by step proof of the Riemann Hypothesis in simplified terms');
  assert.equal(mode, 'thinking');
});

test('routeModel resolves auto mode correctly', () => {
  const decision = routeModel('auto', 'Who won the recent sports championship?');
  assert.equal(decision.mode, 'research');
  assert.equal(decision.enableSearchGrounding, true);
});

test('routeModel respects explicit thinking mode with HIGH thinkingLevel', () => {
  const decision = routeModel('thinking', 'Explain quantum entanglement');
  assert.equal(decision.mode, 'thinking');
  assert.equal(decision.thinkingLevel, 'HIGH');
});
