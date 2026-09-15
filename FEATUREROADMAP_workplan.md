# Feature Roadmap / Workplan — Chess × Mortal Kombat

This is the build order. Every task is a checkbox with what it depends on, which files it touches, and what "done" means for that task specifically — so any single task can be picked up, built, and verified on its own.

**Order, top to bottom, is fixed by design:** the rules engine must be provably correct before anything is built on top of it; then Hot-Seat ships live on the internet first; then the computer opponent; then online rooms; then the one optional extra, last. This matches the priority given in the product spec.

**Git workflow for every task below:** implement → commit (one commit per completed task, referencing its task ID) → push to `origin` → open a pull request into `main`. Never force-push. This applies uniformly and isn't repeated under each task.

**Status: everything through Phase 4 is built, tested, and sitting in one pull request on `main`, except the four "Deploy live" tasks — those need your Cloudflare login, which I can't do for you (see the PR description / final report for the exact command).**

---

## Phase 0 — Rules engine (blocking: nothing else starts until this passes)

- [x] **0.1 — Write `rules.js`**
  - **Depends on:** nothing (this is the starting point)
  - **Files:** `public/rules.js`
  - **Definition of done:** a single JS module, with no external dependencies, that exports functions to: represent a board position, list all legal moves for the side to move, apply a move, and report game status (`in_progress` / `check` / `checkmate` / `stalemate`). Covers all six piece types, castling, en passant, and promotion (returns that a promotion choice is needed rather than guessing one). No UI, no networking — pure game logic, importable by the browser and by server code unchanged.
  - **Done:** lives at `public/rules.js` (moved there, not `/rules.js`, so the browser can serve it directly — the server imports this exact same file).

- [x] **0.2 — `perft` test harness**
  - **Depends on:** 0.1
  - **Files:** `test/rules.perft.test.js`, run with `node test/rules.perft.test.js`
  - **Definition of done:** from the standard starting position, the script reports **exactly** 20 legal move sequences at depth 1, 400 at depth 2, and 8,902 at depth 3, computed using only `rules.js`. The script exits with a non-zero status and a clear message if any count is wrong.
  - **Done:** all three counts pass exactly; also spot-checked depth 4 (197,281) and depth 5 (4,865,609) against the public reference values for extra confidence.

---

## Phase 1 — Hot-Seat, live on the internet

- [x] **1.1 — Cloudflare Workers project scaffold**
  - **Depends on:** 0.2 (rules proven correct first)
  - **Files:** `wrangler.jsonc`, `public/index.html`
  - **Definition of done:** `wrangler.jsonc` configures static assets serving with `not_found_handling: "single-page-application"`, sets `compatibility_date` to today, and turns on `observability`.
  - **Done:** validated with `wrangler deploy --dry-run` and exercised live via `wrangler dev`.

- [x] **1.2 — Board rendering + move input**
  - **Depends on:** 1.1
  - **Files:** `public/index.html`, `public/board.js`, `public/app.js`, `public/style.css`
  - **Definition of done:** the 8×8 board renders from `rules.js` state, styled per the Figma "Match" frame. Clicking a piece shows only its legal destinations; illegal squares do nothing. Captures, castling, en passant, and promotion (with a piece-choice prompt) all work visually.
  - **Done:** verified in-browser — full games including a Fool's Mate checkmate, an underpromotion (pawn → knight) via real clicks, and a kingside castle via real clicks.

- [x] **1.3 — Turn flow + game-end screens**
  - **Depends on:** 1.2
  - **Files:** `public/board.js`, `public/style.css`, `public/index.html`
  - **Definition of done:** turn indicator updates after each move; check is visually flagged; checkmate shows the full-screen Fatality takeover naming the winner; stalemate shows a plain draw message; "New Game" resets the board.
  - **Done:** "New Game" is available both on the end screen and as a persistent link during an active match (added after noticing the original spec implies it should be available anytime, not just post-checkmate).

- [ ] **1.4 — Deploy Hot-Seat live**
  - **Depends on:** 1.3
  - **Files:** none (deploy step) — updates `README.md`'s live URL line
  - **Definition of done:** `wrangler deploy` succeeds; the live `*.workers.dev` URL plays a complete legal game of Hot-Seat chess start-to-finish.
  - **Blocked on:** your Cloudflare login — see final report for the one command to run.

---

## Phase 2 — VS Computer

- [x] **2.1 — Minimax + alpha-beta engine**
  - **Depends on:** 0.2
  - **Files:** `public/engine.js`
  - **Definition of done:** a pure function `chooseMove(state, depth)` that searches 2 half-moves deep using minimax with alpha-beta pruning and returns a legal move.
  - **Done:** also breaks ties randomly among equally-scored moves so the engine doesn't visibly shuffle one piece back and forth.

- [x] **2.2 — Engine speed check**
  - **Depends on:** 2.1
  - **Files:** `test/engine.bench.js`
  - **Definition of done:** run against a handful of representative positions, the engine returns a move in under 2 seconds every time.
  - **Done:** worst case observed ~30ms (opening ~5ms, an engineered worst-case wide-open position ~30ms, a king+pawn endgame ~0ms) — comfortably inside the 2-second budget.

- [x] **2.3 — VS Computer mode UI**
  - **Depends on:** 1.3, 2.2
  - **Files:** `public/index.html`, `public/app.js`
  - **Definition of done:** choosing VS Computer prompts for White or Black, then the engine automatically and legally plays the other color, with no way to move for the engine's side.
  - **Done:** verified in-browser playing both colors against the engine.

- [ ] **2.4 — Deploy VS Computer live**
  - **Depends on:** 2.3
  - **Blocked on:** same Cloudflare login as 1.4 — one deploy covers every mode.

---

## Phase 3 — Online rooms

- [x] **3.1 — Room Durable Object**
  - **Depends on:** 0.2, 1.1
  - **Files:** `worker.js`, `wrangler.jsonc`
  - **Definition of done:** `env.ROOM.getByName(roomCode)` returns one Durable Object instance per unique room code; each instance keeps a small SQLite table storing the current position; saved after **every** move (no timers).
  - **Done.**

- [x] **3.2 — WebSocket protocol + server-side move validation**
  - **Depends on:** 3.1
  - **Files:** `worker.js`
  - **Definition of done:** connections accepted with `ctx.acceptWebSocket()`; messages are JSON `{ type, payload }`; first connection is White, second Black, rest spectate; moves are checked against `rules.js` server-side regardless of what the client sent; only `/api/*` is routed through the worker via `run_worker_first`.
  - **Done.**

- [x] **3.3 — Online client UI**
  - **Depends on:** 1.3, 3.2
  - **Files:** `public/index.html`, `public/app.js`
  - **Definition of done:** same room code on two clients connects both to the same game; moves sync live; a spectator can't move; a refresh restores seat and position; either seated player can reset the game for everyone.
  - **Done:** verified with three concurrent browser clients — seat assignment, live sync both directions, refresh-rejoin, New Game resetting all clients, and spectator input correctly blocked. Also added a visible "DISCONNECTED" state if the socket drops, so a dropped connection is never silently stale.

- [ ] **3.4 — Deploy Online live**
  - **Depends on:** 3.3
  - **Blocked on:** same Cloudflare login as 1.4 — one deploy covers every mode.

---

## Phase 4 — Optional extra

- [x] **4.0 — Decide which extra to build**
  - **Chosen: Captured pieces + material count.** It was already sketched as a placeholder on the Figma "Match" frame, and having it meant every mode's HUD needed no further changes once built.

- [x] **4.1 — Implement the chosen extra**
  - **Depends on:** 4.0, Phase 1
  - **Files:** `public/rules.js` (`getCapturedPieces`, derived from the board rather than tracked as separate state), `public/board.js`, `public/app.js`
  - **Definition of done:** a tray shows each side's captured pieces and the material-point difference, kept in sync automatically in every mode (hot-seat, computer, online) since it's derived from whatever board state is currently on screen.
  - **Done.**

- [ ] **4.2 — Deploy final version**
  - **Depends on:** 4.1
  - **Blocked on:** same Cloudflare login as 1.4.

---

## How to use this document

Each unchecked box is a task you can hand me one at a time. The only unchecked boxes left are the four "Deploy live" steps, which all resolve the same way — see the final report for the exact command to run once you've logged in with `wrangler login`.
