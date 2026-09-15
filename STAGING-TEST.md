# Isolated network test release

Status: 12 local tests and the isolated Next build pass. Render Staging environment created on September 16; service and preview deployment pending. Local branch: codex/network-staging.

## Deployment gates

1. Sign into Render and Vercel. Create a separate test service, not a replacement for either production service. Do not purchase a paid plan without approval.
2. Use a dedicated `codex/network-staging` branch after reviewing the existing uncommitted gameplay and store-packaging changes separately. Do not push main for this test.
3. Render server entry point: `node server/index.js`; dependency install: `npm ci`; health path: `/health`; set `REGION` to the actual hosting region.
4. Set NEXT_PUBLIC_TEST_SOCKET_URL to the new test server's HTTPS origin in the Vercel Preview environment, scoped to codex/network-staging. This overrides web/mobile/store game endpoints, including warmup and region probes. The branch refuses to build if the value is missing. Known production game hosts are rejected. Production builds without this variable retain their current endpoints. Do not set this variable in Production.
5. A one-region test checks game behavior but cannot validate global region selection. Real regional comparisons require independent test services in the relevant locations.

## Connectivity check

Regression suite: `node --test server/*.test.js`

`node scripts/check-test-server.cjs https://YOUR-TEST-SERVER`

This performs one health request and three acknowledged socket pings. It does not create rooms, join matchmaking, or load-test a live service.

## Two-device acceptance test

- Test web, mobile and store routes with two independent browser sessions.
- Create/join a private room; verify both clients see matching names, scores and arena selection.
- Agree on an arena, then choose different arenas; verify both clients start in the same selected arena.
- Play fast rallies near both goals; check that drawn lines and ball contacts agree on both devices.
- Finish a match, use Play Again, repeat arena selection, and verify a clean new score.
- Temporarily interrupt a connection for under 15 seconds; verify pause/resume without duplicate goals or lines.
- Repeat with both connections interrupted, an interruption longer than 15 seconds, a reload, and a TEST-server restart. Full reload/restart recovery is not implemented; the UI must return safely instead of hanging.
- Only after functional validation, test latency variation and concurrency on the isolated services. Do not treat the CPU benchmark as production capacity.

Production deployment remains a separate approval after these checks.
