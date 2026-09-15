// CPU-only baseline; this deliberately does not claim socket/network capacity.
const { performance } = require('node:perf_hooks');
const { createRoomObject, tickRoomPhysics } = require('../server/index');
for (const count of [10, 50, 100, 250]) {
  const rooms = Array.from({ length: count }, (_, i) => createRoomObject({ code: 'B' + i, hostSocketId: 'h', guestSocketId: 'g' }));
  const samples = [];
  for (let frame = 0; frame < 300; frame++) {
    const start = performance.now();
    for (const room of rooms) {
      room.state.phase = 'playing';
      room.state.winner = null;
      room.state.ball = { x: 200, y: 400, vx: 9, vy: 4 };
      room.lines = Array.from({ length: 4 }, (_, n) => ({ x1: 40, y1: 500 + n * 20, x2: 160, y2: 500 + n * 20, life: 45, owner: n % 2 ? 'host' : 'guest' }));
      tickRoomPhysics(room);
    }
    samples.push(performance.now() - start);
  }
  samples.sort((a,b) => a-b);
  console.log(JSON.stringify({ rooms: count, p95BatchMs: +samples[284].toFixed(2), maxBatchMs: +samples.at(-1).toFixed(2), frameBudgetMs: 16.67 }));
}
