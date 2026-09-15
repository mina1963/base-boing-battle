const test = require('node:test');
const assert = require('node:assert/strict');
const { createRoomObject, tickRoomPhysics, normalizePlayerLine } = require('./index');
function room(ball) {
  const value = createRoomObject({ code: 'TEST', hostSocketId: 'h', guestSocketId: 'g' });
  value.state.phase = 'playing';
  value.state.ball = ball;
  return value;
}
test('goal-adjacent player line stays exactly where the client drew it', () => {
  const input = { x1: 100, y1: 670, x2: 200, y2: 678 };
  const line = normalizePlayerLine(input, 'host');
  assert.deepEqual(line, { owner: 'host', ...input, life: 45 });
  const guest = normalizePlayerLine({ x1: 100, y1: 30, x2: 200, y2: 22 }, 'guest');
  assert.equal(guest.y2, 22);
});
test('invalid coordinates and opponent-half lines are rejected', () => {
  for (const input of [null, { x1: 100, y1: 100, x2: 200, y2: 100 },
    { x1: NaN, y1: 400, x2: 200, y2: 400 },
    { x1: 0, y1: 400, x2: 200, y2: 400 }]) {
    assert.equal(normalizePlayerLine(input, 'host'), null);
  }
});
test('remaining substeps follow reflected wall velocity', () => {
  const r = room({ x: 23, y: 400, vx: -9, vy: 1 });
  tickRoomPhysics(r);
  assert.ok(r.state.ball.x > 27);
  assert.ok(r.state.ball.vx > 0);
});
test('maximum-speed ball hits a goal-adjacent line before scoring', () => {
  const r = room({ x: 150, y: 649, vx: 0, vy: 10 });
  r.lines.push(normalizePlayerLine({ x1: 90, y1: 670, x2: 210, y2: 670 }, 'host'));
  tickRoomPhysics(r);
  assert.ok(r.state.ball.vy < 0);
  assert.equal(r.state.guestScore, 0);
  assert.equal(r.lines.length, 0);
});
test('a finishing goal cannot increment the score on later ticks', () => {
  const r = room({ x: 200, y: 693, vx: 0, vy: 10 });
  r.state.guestScore = 6;
  tickRoomPhysics(r);
  for (let i = 0; i < 120; i++) tickRoomPhysics(r);
  assert.equal(r.state.guestScore, 7);
  assert.equal(r.state.phase, 'finished');
});
