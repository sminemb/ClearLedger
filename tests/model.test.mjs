import { test } from 'node:test';
import assert from 'node:assert/strict';
import { amount, summary, validate, csv, empty, sample } from '../dist/model.mjs';
test('money is exact and invalid amounts are rejected', () => {
  assert.equal(amount('0.29'), 29); assert.equal(amount('123.4'), 12340);
  for (const input of ['-1', 'NaN', '1.001', '', '1e3', '1000000000']) assert.throws(() => amount(input));
});
test('monthly totals and budgets count expenses only', () => {
  const state = sample('2026-11'); const totals = summary(state, '2026-11');
  assert.equal(totals.income, 485000); assert.equal(totals.expenses, 234050);
  assert.equal(totals.remaining, 250950); assert.equal(totals.categories.Shopping, 28000);
  assert.equal(summary(state, '2026-12').expenses, 0);
});
test('restored records are validated, including dates and duplicate IDs', () => {
  assert.deepEqual(validate(empty()), empty());
  for (const mutate of [s => s.transactions[0].date = '2026-02-30', s => s.transactions[0].amount = -1, s => s.transactions.push(s.transactions[0]), s => s.currency = 'BAD', s => s.budgets['2026-11'].Shopping = -1]) {
    const state = sample('2026-11'); mutate(state); assert.throws(() => validate(state));
  }
});
test('CSV escapes quotes and spreadsheet formulas', () => {
  const state = sample('2026-11'); state.transactions[0].description = '=SUM(1,2)"\n';
  const result = csv(state); assert.ok(result.includes('"\'=SUM(1,2)""\n"')); assert.ok(result.includes('USD'));
});
