# Architecture Review

## Scope

This review is limited to the current codebase in `server.js` and the client files under `public/`. It does not change business logic or API contracts. The goal is to map every mutable in-memory state location and explain runtime risk under a long-lived server, a server restart, Vercel serverless execution, and multi-instance deployment.

## Mutable In-Memory State Map

### 1. Global Variables

#### Server process
- `gameState` in `server.js`.
- `auth` is a long-lived `GoogleAuth` instance from `googleapis`; the library may cache credentials and tokens in memory.
- The `setTimeout` created in `/api/admin/start-round` closes over `gameState` and mutates it later.

#### Browser runtime
- `adminAuthenticated` in `public/admin.js`.
- `pid`, `pname`, `selDirection`, `lastTimerActive`, `cash`, `totalPnl`, `timerInterval`, `timerSec`, `currentRound`, `prevPrices`, and `CIRCUM` in the inline participant script inside `public/participant.html`.
- `participantId`, `selectedDirection`, `timerInterval`, and `lastRound` in `public/participant.js`.

#### Notes
- `public/participant.html` currently contains a large inline implementation, while `public/participant.js` is an alternate implementation that is not wired into the page. That means the repo has two client-side mutable-state models for the participant flow.

### 2. Round State

#### Where it lives
- `gameState.currentRound`
- `gameState.timerActive`
- `gameState.timerSeconds`
- `gameState.currentImage`
- `gameState.currentPrice`
- `gameState.correctDirection`
- `gameState.gameActive`

#### Behavior
- This state is mutated by `/api/admin/start-round` and `/api/admin/end-round`.
- `setTimeout` later flips `gameState.timerActive` to `false` after 30 seconds.
- The state is only held in process memory on the server; there is no persistence layer for it.

### 3. Market State

#### Where it lives
- `gameState.currentPrice` is the only server-side market price variable.
- The participant inline script also maintains `prevPrices` for ticker display in the browser.

#### Behavior
- The server exposes the current price through `/api/game-state` and uses it in order validation and PnL calculation.
- There is no independent market snapshot store or market history cache in memory.

### 4. User State

#### Server-side
- There is no server-side session object, user cache, or auth session state.
- Admin login is stateless; every call checks the posted password against `process.env.ADMIN_PASSWORD`.

#### Client-side
- `adminAuthenticated` exists only in the admin browser tab.
- Participant identity and interaction state exist only in the participant browser tab.
- The participant code stores user-specific UI state such as selected direction, cash/PnL display values, current round markers, and timer display state.

#### Notes
- Participant registration is not kept in memory on the server; the authoritative participant record is written to Google Sheets.

### 5. Leaderboard State

#### Where it lives
- There is no leaderboard cache in server memory.
- `/api/leaderboard` computes the response directly from Google Sheets on each request.
- The browser only keeps a rendered copy of the leaderboard in the DOM.

#### Behavior
- The leaderboard is derived state, not stored state.
- No app-level memoization or cache invalidation logic exists.

### 6. Trade History State

#### Where it lives
- There is no in-memory trade history store in the backend.
- The current code persists the latest participant row to Google Sheets, but it does not keep a server-side audit trail of individual orders.
- The participant browser keeps only transient UI state for the current order selection.

#### Behavior
- A submitted order is immediately converted into a sheet row update.
- After the request returns, the server does not retain a durable history of that trade in memory.

### 7. Google Sheets Cache

#### Where it lives
- There is no explicit application-level Google Sheets cache in the repository.
- The `GoogleAuth` instance and the generated Sheets client may retain credentials or tokens in process memory inside the Google client libraries.

#### Behavior
- Each relevant endpoint performs direct reads or writes against Sheets.
- The app does not maintain a local copy of sheet data between requests.

## Runtime Risk Analysis

### Server Restart

- `gameState` is lost immediately on restart.
- Any timeout scheduled by `setTimeout` is lost.
- All browser-side state is lost when the tab is closed or refreshed, but not because of the server restart itself.
- `GoogleAuth` token cache, if any, is also lost.
- Leaderboard and participant records in Google Sheets survive because they are external to the process.

### Vercel Serverless Invocation

- `gameState` is not reliable across invocations.
- Warm invocations may temporarily reuse memory, but cold starts reset state.
- The `setTimeout` round-close behavior is unsafe in a serverless runtime because the process may freeze or terminate before the timeout fires.
- Any browser-side state remains in the client tab, but the server cannot depend on it.
- Auth token caching may appear to work on a warm instance but cannot be treated as durable.

### Multi-Instance Deployment

- Each instance would have its own isolated `gameState`, so round status can diverge across instances.
- One instance may accept orders while another still thinks the round is closed or active, depending on which instance handled the admin request.
- The timeout-based round closure would fire independently per instance, producing inconsistent state transitions.
- Client requests for `/api/game-state` or `/api/leaderboard` could see inconsistent results if load-balanced across instances without shared state.
- There is no distributed lock or shared cache to coordinate writes to Sheets.

## Race-Condition Risks

### High Risk
- `/api/participant/order` performs a read-modify-write flow against Google Sheets without any locking.
- Two orders for the same participant can read the same balance and both succeed, causing an overspend or lost update.
- A participant order may race with `/api/admin/end-round`, causing PnL to be computed against stale or partially updated row data.
- `/api/admin/start-round` and the timeout callback both mutate `gameState.timerActive`; overlapping calls can produce a stale active/inactive state.

### Medium Risk
- `/api/leaderboard` and `/api/game-state` can observe intermediate states while admin actions are in progress.
- Repeated polling in the client can briefly render inconsistent UI if the server state changes between requests.

### Low Risk
- Admin login is stateless and does not share mutable server-side session state.
- The browser-only state is isolated per user tab and does not cross users.

## Current Architecture Summary

The current design is a hybrid of:
- ephemeral server process memory for round control,
- browser memory for UI state,
- Google Sheets for participant persistence and derived leaderboard data.

That is workable for a single process and a controlled environment, but it is fragile once the server can restart, scale horizontally, or run in serverless mode.

## Migration Plan To Persistent Storage

### Principles
- Preserve every current route, request body, and response shape used by `admin.html` and `participant.html`.
- Move only the storage backend, not the API contract.
- Keep the server as the orchestration layer, but make it stateless.

### Phase 1: Introduce a single source of truth for runtime state
- Add a persistent store for round state, market state, and trade state.
- Keep the existing Google Sheets writes for participant balances if that is still required operationally, but stop treating Sheets as the only runtime source of truth for game control.
- Persist the equivalent of `gameState` so `/api/game-state` can be reconstructed after restart.

### Phase 2: Replace timeout-driven round closure with persisted scheduling
- Store `roundStartAt`, `roundEndsAt`, and `roundStatus` in persistent storage.
- On read, derive whether the round is active by comparing timestamps rather than relying on an in-process timer.
- Keep the 30-second behavior identical from the client’s perspective.

### Phase 3: Make order writes atomic
- Wrap participant balance checks and updates in a transactional write path.
- Add an idempotency key or order version if the client can retry requests.
- If Sheets remains the balance store, add a server-side mutex or move the balance row into a transactional database before writing back to Sheets as a reporting sink.

### Phase 4: Persist trade history explicitly
- Add a trade ledger table with one row per order and one row per round result.
- Derive the current participant state from the ledger plus the latest balance snapshot.
- Keep the current order response payload unchanged so the UI does not need to change.

### Phase 5: Persist leaderboard derivation
- Compute leaderboard entries from stored participant state or a materialized view.
- Cache only as a performance optimization, not as the source of truth.

### Phase 6: Remove process-local assumptions
- Treat every server instance as stateless.
- Remove reliance on `setTimeout` for business logic.
- Keep `GoogleAuth` token caching as a library optimization only, never as business state.

## Recommended Target Model

A production-safe target would be:
- persistent round table
- persistent trades table
- persistent participant table
- optional materialized leaderboard view
- stateless Express handlers
- browser state only for UI interaction

This preserves the current API contract while making the app restart-safe, serverless-safe, and multi-instance-safe.
