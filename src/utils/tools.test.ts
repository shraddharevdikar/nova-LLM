import test from 'node:test';
import assert from 'node:assert/strict';
import { safeCalculate, executeSandboxedCode } from './tools.ts';

test('safeCalculate computes standard arithmetic correctly', () => {
  const res = safeCalculate('(12 + 8) * 5 / 2');
  assert.equal(res.result, 50);
});

test('safeCalculate rejects malicious or invalid characters', () => {
  assert.throws(() => {
    safeCalculate('process.exit()');
  });
  assert.throws(() => {
    safeCalculate('alert(1)');
  });
});

test('executeSandboxedCode executes JS and captures console output', () => {
  const result = executeSandboxedCode('javascript', `
    const nums = [1, 2, 3, 4, 5];
    const sum = nums.reduce((a, b) => a + b, 0);
    console.log("Sum is:", sum);
  `);

  assert.equal(result.stdout[0], 'Sum is: 15');
  assert.equal(result.error, undefined);
  assert.ok(result.executionTimeMs >= 0);
});

test('executeSandboxedCode captures runtime errors gracefully', () => {
  const result = executeSandboxedCode('javascript', `
    undefinedVariable.property;
  `);

  assert.ok(result.stdout.some((line) => line.includes('[ERROR]')));
});
