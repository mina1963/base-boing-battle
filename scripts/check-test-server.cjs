// Read-only deployment check: never creates rooms or enters matchmaking.
const { io } = require('socket.io-client');

async function main() {
  const input = process.argv[2];
  if (!input) throw new Error('Usage: node scripts/check-test-server.cjs https://YOUR-TEST-SERVER');
  const url = new URL(input);
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) {
    throw new Error('Provide an HTTP(S) server URL without credentials.');
  }
  const response = await fetch(new URL('/health', url), { signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw new Error('Health check failed: HTTP ' + response.status);
  const health = await response.json();
  console.log('Health endpoint reachable. Region:', health.region || 'not configured');
  const socket = io(url.origin, { forceNew: true, reconnection: false, timeout: 15000 });
  try {
    await new Promise((resolve, reject) => {
      socket.once('connect', resolve);
      socket.once('connect_error', reject);
    });
    const samples = [];
    for (let i = 0; i < 3; i++) {
      const start = performance.now();
      await new Promise((resolve, reject) => {
        socket.timeout(3000).emit('region-ping', (error, reply) => {
          if (error) return reject(new Error('region-ping timed out; verify the new server version is deployed.'));
          if (!reply || typeof reply.serverNow !== 'number') return reject(new Error('Unexpected region-ping response.'));
          resolve();
        });
      });
      samples.push(Math.round(performance.now() - start));
    }
    console.log('Socket protocol reachable. RTT samples (ms):', samples.join(', '));
    console.log('PASS: connectivity only; this does not verify gameplay, regional latency, or capacity.');
  } finally {
    socket.disconnect();
  }
}

main().catch(error => { console.error(error.message); process.exitCode = 1; });
