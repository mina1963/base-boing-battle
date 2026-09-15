const test = require('node:test');
const assert = require('node:assert/strict');
const { io: connect } = require('socket.io-client');
const { server, io } = require('./index');
const { selectRegion } = require('../public/region-selector');
function event(socket, name) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => { socket.off(name, done); reject(new Error('Timed out: ' + name)); }, 3000);
    function done(value) { clearTimeout(timer); resolve(value); }
    socket.once(name, done);
  });
}
test('real sockets: malformed requests, private room, full room and disconnect cleanup', async (t) => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const url = 'http://127.0.0.1:' + server.address().port;
  const clients = [];
  t.after(async () => { clients.forEach(s => s.disconnect()); await new Promise(resolve => io.close(resolve)); });
  const selection = await selectRegion({ EU: url, US: 'http://127.0.0.1:1' }, 'US', connect);
  assert.equal(selection.region, 'EU');
  assert.equal(selection.measured, true);
  assert.equal(selection.measurements.EU.failedProbes, 0);
  async function client() {
    const s = connect(url, { transports: ['websocket'], reconnection: false, autoConnect: false });
    clients.push(s);
    const ready = event(s, 'connect'); s.connect(); await ready; return s;
  }
  const host = await client(), guest = await client(), outsider = await client();
  for (const name of ['draw-line', 'find-match', 'client-ready', 'play-again-ready']) {
    const response = event(outsider, 'request-error');
    outsider.emit(name, null);
    assert.equal((await response).code, 'INVALID_PAYLOAD');
  }
  const ping = await host.timeout(2000).emitWithAck('region-ping');
  assert.equal(typeof ping.serverNow, 'number');
  const created = await host.timeout(2000).emitWithAck('create-room', { username: 'HOST' });
  const joined = await guest.timeout(2000).emitWithAck('join-room', { roomCode: created.roomCode, username: 'GUEST' });
  assert.equal(joined.role, 'guest');
  const full = await outsider.timeout(2000).emitWithAck('join-room', { roomCode: created.roomCode });
  assert.equal(full.error, 'ROOM FULL');
  const vote = event(host, 'arena-vote-start');
  host.emit('client-ready', { roomCode: created.roomCode, role: 'host' });
  guest.emit('client-ready', { roomCode: created.roomCode, role: 'guest' });
  await vote;
  const countdown = event(host, 'game-state');
  host.emit('vote-arena', { roomCode: created.roomCode, arena: 'base' });
  guest.emit('vote-arena', { roomCode: created.roomCode, arena: 'base' });
  assert.equal((await countdown).phase, 'countdown');
  const originalId = guest.id;
  const paused = event(host, 'connection-paused');
  guest.io.engine.close();
  await paused;
  const resumed = event(host, 'connection-resumed');
  const reconnected = event(guest, 'connect');
  guest.connect(); await reconnected; await resumed;
  assert.equal(guest.recovered, true);
  assert.equal(guest.id, originalId);
  const playing = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => { host.off('game-state', check); reject(new Error('Playing state timeout')); }, 10000);
    function check(state) { if (state.phase === 'playing') { clearTimeout(timer); host.off('game-state', check); resolve(state); } }
    host.on('game-state', check);
  });
  assert.equal(playing.phase, 'playing');
  const remote = event(guest, 'remote-line');
  const accepted = await host.timeout(2000).emitWithAck('draw-line', { roomCode: created.roomCode, line: { x1: 90, y1: 670, x2: 210, y2: 670 } });
  assert.equal(accepted.accepted, true);
  assert.equal((await remote).id, accepted.lineId);
  const invalid = await outsider.timeout(2000).emitWithAck('draw-line', { roomCode: created.roomCode, line: { x1: 90, y1: 670, x2: 210, y2: 670 } });
  assert.equal(invalid.accepted, false);
  const left = event(host, 'opponent-left');
  guest.disconnect(); await left;
  const missing = await outsider.timeout(2000).emitWithAck('join-room', { roomCode: created.roomCode });
  assert.equal(missing.error, 'ROOM NOT FOUND');
  const health = await (await fetch(url + '/health')).json();
  assert.equal(health.activeRooms, 0);
});
