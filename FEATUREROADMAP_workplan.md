# Feature Roadmap / Workplan — Chess × Mortal Kombat

This is the build order. Every task is a checkbox with what it depends on, which files it touches, and what "done" means for that task specifically — so any single task can be picked up, built, and verified on its own.

**Order, top to bottom, is fixed by design:** the rules engine must be provably correct before anything is built on top of it; then Hot-Seat ships live on the internet first; then the computer opponent; then online rooms; then the one optional extra, last. This matches the priority given in the product spec.

**Git workflow for every task below:** implement → commit (one commit per completed task, referencing its task ID) → push to `origin` → open a pull request into `main`. Never force-push. This applies uniformly and isn't repeated under each task.

---

## Phase 0 — Rules engine (blocking: nothing else starts until this passes)

- [ ] **0.1 — Write `rules.js`**
  - **Depends on:** nothing (this is the starting point)
  - **Files:** `rules.js`
  - **Definition of done:** a single JS module, with no external dependencies, that exports functions to: represent a board position, list all legal moves for the side to move, apply a move, and report game status (`in_progress` / `check` / `checkmate` / `stalemate`). Covers all six piece types, castling, en passant, and promotion (returns that a promotion choice is needed rather than guessing one). No UI, no networking — pure game logic, importable by the browser and by server code unchanged.

- [ ] **0.2 — `perft` test harness**
  - **Depends on:** 0.1
  - **Files:** a test script (e.g. `rules.perft.test.js`), run with plain Node.js (`node rules.perft.test.js`) — no test framework dependency needed for something this small
  - **Definition of done:** from the standard starting position, the script reports **exactly** 20 legal move sequences at depth 1, 400 at depth 2, and 8,902 at depth 3, computed using only `rules.js`. The script exits with a non-zero status and a clear message if any count is wrong. This must pass before Phase 1 begins — it's the proof that the rules are correct.

---

## Phase 1 — Hot-Seat, live on the internet

- [ ] **1.1 — Cloudflare Workers project scaffold**
  - **Depends on:** 0.2 (rules proven correct first)
  - **Files:** `wrangler.jsonc`, `public/index.html` (or equivalent static-assets folder), `worker.js` (or equivalent entry point)
  - **Definition of done:** `wrangler.jsonc` configures static assets serving with `not_found_handling: "single-page-application"`, sets `compatibility_date` to the date this task is done, and turns on `observability`. A placeholder page deploys successfully to a real `*.workers.dev` URL on the free plan and loads in a browser.

- [ ] **1.2 — Board rendering + move input**
  - **Depends on:** 1.1
  - **Files:** `public/index.html`, `public/board.js` (or similar), `public/style.css`, imports `rules.js`
  - **Definition of done:** the 8×8 board renders from `rules.js` state with pieces in the starting position, styled per the Figma "Match" frame (dark board, bone/blood piece coloring). Clicking/tapping a piece shows only its legal destination squares (from `rules.js`); clicking an illegal square does nothing — there is no code path that lets an illegal move be submitted. Captures, castling, en passant, and promotion (with a piece-choice prompt) all work visually.

- [ ] **1.3 — Turn flow + game-end screens**
  - **Depends on:** 1.2
  - **Files:** `public/board.js`, `public/style.css`, a Fatality screen component/section in `public/index.html`
  - **Definition of done:** turn indicator updates after each move; check is visually flagged; checkmate shows the full-screen Fatality takeover (styled per the Figma "Fatality" frame) naming the winner; stalemate shows a plain draw message (no Fatality); a "New Game" control resets the board to the starting position.

- [ ] **1.4 — Deploy Hot-Seat live**
  - **Depends on:** 1.3
  - **Files:** none (deploy step) — updates `README.md`'s live URL line
  - **Definition of done:** `wrangler deploy` succeeds; the live `*.workers.dev` URL plays a complete legal game of Hot-Seat chess start-to-finish, including a checkmate and its Fatality screen, on a phone and a laptop browser. README updated with the URL.

---

## Phase 2 — VS Computer

- [ ] **2.1 — Minimax + alpha-beta engine**
  - **Depends on:** 0.2
  - **Files:** `engine.js`, imports `rules.js`
  - **Definition of done:** a pure function `chooseMove(position, color)` that searches 2 half-moves deep using minimax with alpha-beta pruning and returns a legal move. No UI, no `rules.js` duplication — it calls into `rules.js` for move generation and legality.

- [ ] **2.2 — Engine speed check**
  - **Depends on:** 2.1
  - **Files:** a benchmark script (e.g. `engine.bench.js`)
  - **Definition of done:** run against a handful of representative positions (opening, mid-game with many pieces, an endgame), the engine returns a move in under 2 seconds every time on ordinary hardware. If any position is too slow, 2.1 is revised (e.g. a depth or time-budget fallback) before moving on.

- [ ] **2.3 — VS Computer mode UI**
  - **Depends on:** 1.3 (reuses the board/turn/Fatality UI), 2.2
  - **Files:** `public/index.html` (mode select screen per Figma), `public/board.js`
  - **Definition of done:** the Mode Select screen (per Figma) offers Hot-Seat / VS Computer / Online; choosing VS Computer prompts for White or Black, then the engine automatically and legally plays the other color after each of the player's moves, within the 2-second budget, with no way to move for the engine's side.

- [ ] **2.4 — Deploy VS Computer live**
  - **Depends on:** 2.3
  - **Files:** none (deploy step)
  - **Definition of done:** the live site plays a full game against the computer as either color, ending correctly in checkmate/stalemate.

---

## Phase 3 — Online rooms

- [ ] **3.1 — Room Durable Object**
  - **Depends on:** 0.2, 1.1
  - **Files:** `worker.js` (Durable Object class), `wrangler.jsonc` (`new_sqlite_classes` binding for the class, `env.ROOM` binding)
  - **Definition of done:** `env.ROOM.getByName(roomCode)` returns one Durable Object instance per unique room code; each instance keeps a small SQLite table storing the move list / current position; the position is written after **every** move (no timers, no periodic save).

- [ ] **3.2 — WebSocket protocol + server-side move validation**
  - **Depends on:** 3.1
  - **Files:** `worker.js`, imports `rules.js`
  - **Definition of done:** connections are accepted with `ctx.acceptWebSocket()`; every message is JSON of the shape `{ "type": ..., "payload": ... }`; the first connection to a room is assigned White via `ws.serializeAttachment()`, the second Black, any further connection is a read-only spectator; a submitted move is checked against `rules.js` server-side and rejected if illegal or out-of-turn, regardless of what the client sent; `wrangler.jsonc` routes the WebSocket path through `run_worker_first` so it never falls through to static-asset handling.

- [ ] **3.3 — Online client UI**
  - **Depends on:** 1.3 (reuses board/turn/Fatality UI), 3.2
  - **Files:** `public/index.html` (room code entry), `public/board.js` (WebSocket client logic)
  - **Definition of done:** entering the same room code on two devices/browser tabs connects both to the same game; moves made on one appear live on the other; a spectator (third+ joiner) sees the game but cannot move; a page refresh reconnects to the same room, restores the correct seat (White/Black/spectator) and the current position from the server; either player can trigger "New Game," which resets the board for everyone in the room.

- [ ] **3.4 — Deploy Online live**
  - **Depends on:** 3.3
  - **Files:** none (deploy step)
  - **Definition of done:** two separate physical devices, given the same room code, play a full live game against each other over the internet, including a mid-game refresh on one device that rejoins cleanly.

---

## Phase 4 — Optional extra (pick one, build last)

- [ ] **4.0 — Decide which extra to build**
  - **Depends on:** nothing structurally, but scheduled last on purpose
  - **Files:** none (decision only) — record the choice by checking one box below
  - **Options** (see ProductSpec §5 for full descriptions): ☐ None · ☐ Undo (Hot-Seat only) · ☐ Captured pieces + material count · ☐ Sound on move · ☐ Resign button (Online)

- [ ] **4.1 — Implement the chosen extra**
  - **Depends on:** 4.0, and whichever earlier phase it touches (Hot-Seat extras depend on Phase 1; the Online extra depends on Phase 3)
  - **Files:** depends on choice — e.g. captured-pieces tray touches `public/board.js` + `public/style.css`; resign button touches `worker.js` + `public/board.js`
  - **Definition of done:** defined once the choice is made, following the same pattern as every task above.

- [ ] **4.2 — Deploy final version**
  - **Depends on:** 4.1
  - **Files:** none (deploy step)
  - **Definition of done:** live site reflects the finished extra; README status line updated to "done."

---

## How to use this document

Each unchecked box is a task you can hand me one at a time — e.g. "let's do 0.1" or "start Phase 1." I'll implement it, run whatever verification its Definition of Done calls for, commit, push, and open a PR, then come back here and check the box.

**Pick your first task whenever you're ready — I'd suggest starting at 0.1, since everything else depends on it.**
