const test = require('node:test');
const assert = require('node:assert/strict');
const { rankRegion, selectRegion } = require('../public/region-selector');
test('stable connection outranks a lower median with large jitter', () => {
  assert.ok(rankRegion([60,62,64]).score < rankRegion([20,40,160]).score);
});
test('insufficient samples cannot win and timeouts have a penalty', () => {
  assert.equal(rankRegion([20,null,null]).score, Infinity);
  assert.ok(rankRegion([20,21,null]).score > rankRegion([60,62,64]).score);
});
test('no configured regions falls back without opening a connection', async () => {
  const result = await selectRegion({}, 'EU', () => { throw new Error('unexpected connection'); });
  assert.equal(result.region, 'EU');
  assert.equal(result.measured, false);
});
