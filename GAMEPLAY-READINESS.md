# Gameplay readiness — September 15, 2026

## Verified locally

- Server lines preserve accepted client coordinates, including y=670–678 near the lower goal. Previously the server silently clamped them to y=655.
- Web pointer positions now use the same 22px field boundary as mobile/store.
- Wall collisions update the direction of remaining physics substeps.
- Invalid coordinates, wrong-half lines and malformed socket payloads are rejected.
- Five physics regressions and one real three-client socket scenario pass via `npm run test:server`.
- Real socket test covers private room creation/join, full-room rejection, malformed requests, region ping acknowledgement and room cleanup after disconnect.
- Health endpoint exposes region, event-loop p95 and physics batch timing. Configure REGION separately per deployed server.
- Socket `region-ping` acknowledges timing probes with rate limiting; all three clients now use the shared selector described below.

## CPU baseline, not production capacity

`node scripts/bench-physics.cjs` measured p95 batches of 0.07 / 0.19 / 0.22 / 0.60 ms for 10 / 50 / 100 / 250 simulated rooms on the local development computer. This does not include real socket fan-out, regional network traffic, rendering or production hardware. Do not use these numbers to promise concurrent-player capacity.

## Next gates before release

1. Measure actual client rendering, RTT variation and input-to-authoritative-contact delay under latency/loss. No browser or device gameplay test has yet been performed for these changes.
2. Line acknowledgements and unique server line IDs are implemented on web/mobile/store. Explicit rejection removes the prediction and refunds its cost while it is still visible; timeout removes it without assuming rejection. Hit/removal notifications remove the matching line. Real socket tests verify accepted IDs and unauthorized rejection. Browser/device validation remains required.
3. Short transport recovery is implemented with Socket.IO recovery sessions and a 15-second frozen-room window during countdown/play. Real socket testing verifies restored socket identity and countdown resumption. Still test real-device play recovery, both clients dropping, timeout, page reload and server restart. Page reload/server restart recovery is not provided by this in-memory mechanism.
4. Shared RTT/jitter selection is implemented in public/region-selector.js: three socket acknowledgement samples, failure penalty, five-second deadline, 25ms hysteresis and locale fallback. Web selects once before opening its game connection; mobile/store measure before each new connection request. Selection never runs in an active match. Failed probes are not a measurement of packet loss. Global room routing is still pending, so region selection alone does not make cross-region private rooms work.
5. Add global room directory and gradual matchmaking with a latency ceiling, then provision Singapore. Keep authoritative per-frame physics local to the chosen game server.
6. Run production-like multi-client load and restart tests; then choose paid instances. No hosting purchases or deployments have been performed.

Previous store packaging work remains in the working tree. Do not accidentally publish it as part of a server-only release.

## Latest validation

- Nine tests pass, including ranking and real socket region selection/line acknowledgements.
- Production Next build succeeded. Final web prediction identity adjustment passed TypeScript and the regression suite.
- In-app browser could not open the local preview (ERR_BLOCKED_BY_CLIENT); no visual/gameplay verification is claimed.
- Deployment order: publish both game servers with region-ping, recovery and line acknowledgements first; then publish clients and region-selector.js. Do not publish clients against the old server protocol.
