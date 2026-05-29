# Architecture Audit

## 1. Existing Architecture

The application is currently a single Node.js Express process in [server.js](server.js) that serves static files from [public/](public), exposes a small JSON API, and stores the core round control state in process memory. Participant data and leaderboard data live in Google Sheets through the `googleapis` client.

The frontend is split into two static browser surfaces:
- Admin flow in [public/admin.html](public/admin.html) and [public/admin.js](public/admin.js)
- Participant flow in [public/participant.html](public/participant.html) and [public/participant.js](public/participant.js)

The codebase is a hybrid of process-local state, DOM-driven UI state, and spreadsheet-backed persistence.

## 2. Data Flow

1. Admin enters a password in the browser.
2. The browser posts to `/api/admin/login`.
3. On success, admin actions call `/api/admin/start-round` and `/api/admin/end-round`.
4. The server mutates in-memory `gameState` and reads/writes Google Sheets.
5. Participant registration posts to `/api/participant/register` and stores a new row in Sheets.
6. Participant order submission posts to `/api/participant/order`, reads the participant row from Sheets, updates the row, and returns the new balance.
7. Both browser surfaces poll `/api/game-state` and `/api/leaderboard`.

## 3. API Flow

Current endpoints:
- `POST /api/admin/login`
- `POST /api/admin/start-round`
- `POST /api/admin/end-round`
- `POST /api/participant/register`
- `GET /api/game-state`
- `POST /api/participant/order`
- `GET /api/leaderboard`

The frontend depends on these routes and their current payload shapes. Any migration must preserve these contracts until a compatibility layer exists.

## 4. State Flow

### Server state
- `gameState` in memory
- `setTimeout` callback mutating `gameState.timerActive`
- `GoogleAuth`/Sheets client object held by the Node process

### Client state
- Admin login flag in browser memory
- Participant selection/timer/leaderboard/render state in browser memory
- Polling intervals in both browser surfaces

### Persistent state
- Participant rows and PnL values in Google Sheets

## 5. Trading Flow

The trading lifecycle is:
1. Admin starts a round with image, direction, and price.
2. `gameState` becomes active.
3. Participant submits a directional order and units.
4. The server validates the round timer and balance, then writes the updated row to Sheets.
5. Admin ends the round and the server computes PnL for every participant.

This logic is currently embedded in route handlers and directly coupled to spreadsheet row layout.

## 6. Leaderboard Flow

`/api/leaderboard` reads the full sheet, slices off the header row, maps each participant row to `{ name, cashBalance, totalPnl }`, sorts by `totalPnl`, and returns the array.

The frontend polls this endpoint and renders the response directly.

## 7. Admin Flow

Admin login is client-driven and stateless on the server. The admin browser stores authentication only in `adminAuthenticated` and toggles UI visibility locally. The server never creates a session or token.

The admin UI currently reads game state and leaderboard data by polling the public API.

## 8. Participant Flow

Participant registration stores a new row in Sheets and returns a generated participant ID. The participant UI keeps the ID in browser memory for the lifetime of the tab. Orders are submitted against the current round state and the row is updated in Sheets.

## 9. Google Sheets Integration Flow

The server uses a service account credentials file and the Sheets API directly. Current patterns:
- Append on registration
- Full-sheet read on order submission and leaderboard generation
- Row update on order submission and round close

There is no application-level cache or transactional wrapper around these operations.

## 10. Security Issues

- Admin authentication is not enforced server-side after login.
- Round state is exposed through `/api/game-state`.
- Participant names and image URLs can flow into `innerHTML` in the browser.
- Order submission trusts client-supplied `participantId` and `direction` too much.
- The server depends on a local credential file and environment file.

## 11. Performance Bottlenecks

- Full sheet reads on every leaderboard poll.
- Full sheet reads on order submission.
- Per-row update loops during round close.
- Frequent polling in both client UIs.
- Duplicated render logic in static browser code.

## 12. Vercel Deployment Risks

- The process uses `app.listen`, which does not map cleanly to serverless handlers.
- `gameState` lives only in memory.
- `setTimeout` is unsafe for business logic in a serverless environment.
- Spreadsheet auth uses a local credential file path.
- The current app assumes a long-lived Node process.

## 13. Dead Code / Duplicate Code / Unused Files

- [public/participant.js](public/participant.js) initially duplicated participant logic relative to the old inline script in [public/participant.html](public/participant.html). That duplication has been removed in the current branch state.
- `path` is imported in [server.js](server.js) but not used.
- `timerSeconds` and `gameActive` exist in `gameState` but are not used as durable state.
- The old page-specific HTML shells are implementation detail, not product requirements.

## 14. Hidden Dependencies

- Spreadsheet column positions are part of the application contract.
- The browser relies on global handler names and IDs in the DOM.
- The admin UI depends on the server exposing every round field in `/api/game-state`.
- The participant UI depends on repeated polling rather than push updates.
