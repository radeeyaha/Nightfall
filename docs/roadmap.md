# Post-MVP roadmap

Items to tackle after the core game loop is stable.

## Reconnect on tab refresh

**Goal:** Reloading the tab keeps the same player in the same room; lobby/game state comes back via existing `lobby:fetch` / `lobby:watch` without a “lost seat.”

**Direction:**

- Issue a stable **session token** (or signed cookie) on `room:create` / `room:join`.
- Client stores it (e.g. `localStorage`) keyed by room or globally.
- On connect (or first message), send **resume** with that token; server maps token → `playerId` and rebinds `socket.id`.
- Decide policy when the same token connects twice: drop the old socket or explicit “take over.”

## Restore player by local session id

**Goal:** An opaque id on the device identifies the seat across refreshes and revisits.

**Direction:**

- Persist `{ roomCode, sessionId }` after a successful join/create ack.
- Add something like `session:resume` (name TBD) with ack: `{ ok, playerId?, ...LobbyState }` or error.
- Store `sessionId` on the server (on `ConnectedPlayer` or a small map) and validate on resume.

## Preserve room while server is running

**Goal:** Rooms and phase timers last for the lifetime of **one server process** (already true for in-memory store).

**Clarifications:**

- Document that **process restart** wipes all rooms (current MVP).
- If you need survival across deploys/restarts later: external store (Redis/DB) for room + player rows and optional timer reconciliation.

---

*Last updated: post-MVP planning note.*
