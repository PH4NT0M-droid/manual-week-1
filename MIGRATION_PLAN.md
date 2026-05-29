# Migration Plan

## Goal

Move the application to a production-grade React + TypeScript + Express architecture while preserving:
- all current business rules
- all current API contracts
- all calculation logic
- all Google Sheets integration behavior
- the current UI flow unless a change is required for maintainability, performance, accessibility, or deployment

## Core Constraint

The target stack requests Vite and also requests that all HTML files be removed. A standard Vite app requires a single HTML entry file for bootstrapping. The practical migration path is to remove the legacy page-specific HTML files and converge to one Vite entry shell while preserving the same UI flow.

## Phase 0: Freeze Contracts

- Record every current request/response shape.
- Preserve `/api/admin/login`, `/api/admin/start-round`, `/api/admin/end-round`, `/api/participant/register`, `/api/game-state`, `/api/participant/order`, and `/api/leaderboard`.
- Preserve spreadsheet column layout and write order.

## Phase 1: New Monorepo Layout

- Introduce `src/client`, `src/server`, and `src/shared`.
- Add TypeScript config with strict mode.
- Add path aliases.
- Add ESLint and Prettier.
- Add environment validation.

## Phase 2: Frontend Migration

- Replace admin static page with React pages and reusable components.
- Replace participant static page with React pages and reusable components.
- Move polling, order submission, round state, and leaderboard rendering into hooks and services.
- Remove inline event handlers and direct DOM mutation.
- Keep the same visible UI and same API calls.

## Phase 3: Shared API Layer

- Create typed API wrappers for admin, participant, leaderboard, and market actions.
- Standardize error handling and typed responses.
- Keep payloads identical to the existing backend contracts.

## Phase 4: Backend Migration

- Move route handlers into `routes/` and controller/service layers.
- Move Sheets interaction into `services/sheets`.
- Move round and market state into dedicated services with typed state objects.
- Keep route paths and response bodies unchanged.

## Phase 5: Persistent State Strategy

- Replace process-local round state with persistent storage.
- Keep Sheets as the participant ledger until a safer transactional store is introduced.
- Add a durable store for round timing, market state, and trade ledger.

## Phase 6: Vercel Compatibility

- Convert the server into a serverless-friendly entrypoint.
- Remove reliance on `app.listen` for production deployment.
- Replace timeout-driven business logic with timestamp-derived state.

## Phase 7: Performance Improvements

- Reduce full-sheet reads.
- Add request deduplication/caching where behavior allows.
- Avoid repeated expensive calculations on every poll.
- Keep correctness ahead of optimization.

## Phase 8: Validation

- Verify admin login flow.
- Verify round start/end flow.
- Verify participant registration.
- Verify order submission.
- Verify leaderboard ordering.
- Verify Google Sheets writes and reads.

## Suggested Rollout Order

1. Scaffold TypeScript and React without changing API endpoints.
2. Port frontend pages to React.
3. Port server to TypeScript.
4. Introduce durable state storage.
5. Remove legacy HTML and inline scripts.
6. Deploy behind Vercel-compatible entrypoints.
