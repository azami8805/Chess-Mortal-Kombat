# Product Spec — Chess × Mortal Kombat

This document defines *what* we're building and *what "done" means*. It does not schedule the work — see [FEATUREROADMAP_workplan.md](FEATUREROADMAP_workplan.md) for that.

Terms in *italics* the first time they appear are defined in the [Glossary](#glossary) at the bottom, or in the [README](README.md#plain-english-tech-glossary).

---

## 1. Concept

Chess, played straight — but re-skinned as a fighting game. Every chess piece is a Mortal-Kombat-style fighter with a name, a title, a signature "combat move" (flavor text shown when it captures), and a "Fatality" (a dramatic finishing move shown to the winner when the opposing king is checkmated). The chess rules never bend for the theme — the theme is cosmetic dressing on top of a fully legal, fully enforced game of chess.

**Visual reference:** [Figma — Chess x Mortal Kombat Concept](https://www.figma.com/design/2JQSqGFpuPBICRJUGD61ys/Chess-x-Mortal-Kombat-Concept) (generated from this spec's art direction — see below for what's on each page). This is a concept board, not a final pixel-perfect UI spec: it fixes the palette, typography, tone, and screen layout so implementation has a single source of truth to build against, and it will get more detailed as the actual game screens get built.

### 1.1 Art direction (from the Figma "Style Guide" page)

- **Palette:** near-black background (`#0B0B0E`), a slightly lighter charcoal panel color (`#161416`), blood red (`#A6182B`) as the primary accent, ember orange (`#E2572B`) as a secondary accent, bone white (`#EDEAE3`) for primary text, muted steel gray (`#5A5A63`) for secondary text, and gold (`#C9A227`) reserved for royal pieces (King/Queen) and celebratory moments.
- **Typography:** condensed display type (Bebas Neue) for headings, piece names, and anything meant to feel like a fighting-game title card; Inter (regular/semi-bold/bold) for body copy and UI labels.
- **Mood:** low-key/hard lighting, blood-red rim light, gritty stone/concrete arena implied behind the board rather than a plain white background. Each piece reads as a character portrait, not a cute icon.
- **Motion cues (for later polish, not required for "done"):** a capture triggers a brief strike flourish on the losing piece; checkmate cuts to a full-screen Fatality card.

### 1.2 The roster (from the Figma "Character Roster" page)

| Piece | Fighter title | Combat move (on capture) | Fatality (on checkmate) |
|---|---|---|---|
| King | The Sovereign | Royal Guard Slam | Crown of Ruin |
| Queen | The Executioner | Cross-Board Impale | Regicide Flourish |
| Rook | The Juggernaut | Wall Crush | Fortress Collapse |
| Bishop | The Exorcist | Diagonal Rend | Ritual Banishment |
| Knight | The Cavalry | Flank Trample | Skewering Charge |
| Pawn | The Recruit | Shieldbreaker Jab | Last Stand Detonation |

These are flavor text/labels shown in the UI when the corresponding event happens (a capture, or the winning checkmate) — they do not change any chess rule. Only the checkmating side's piece performs a Fatality; a captured piece's "combat move" plays for every capture regardless of which piece did the capturing.

### 1.3 Screens (from the Figma "Game Screens" page)

- **Mode Select** — landing screen, three choices: Hot-Seat, VS Computer, Online. ([frame](https://www.figma.com/design/2JQSqGFpuPBICRJUGD61ys/Chess-x-Mortal-Kombat-Concept?node-id=4-3))
- **Match** — the board itself, plus a HUD bar showing whose turn it is and which mode is active. Standard starting position shown for reference. ([frame](https://www.figma.com/design/2JQSqGFpuPBICRJUGD61ys/Chess-x-Mortal-Kombat-Concept?node-id=4-27))
- **Fatality** — full-screen takeover shown the instant checkmate is delivered, naming the winning side, with a way to start a new game. ([frame](https://www.figma.com/design/2JQSqGFpuPBICRJUGD61ys/Chess-x-Mortal-Kombat-Concept?node-id=5-2))

A "captured pieces / material count" tray is sketched on the Match frame as a placeholder — it is the leading candidate for the optional extra (§5) but is **not required** unless chosen.

---

## 2. The three modes

### 2.1 Hot-Seat
- Two people, one screen, one device.
- Board is always oriented the same way (White at the bottom) unless we later decide to flip it each turn — not required for "done."
- Turn passes automatically after each legal move; the HUD shows whose move it is.

### 2.2 VS Computer
- Before the game starts, the player picks White or Black.
- The browser plays the other color automatically, using an in-browser engine — no server round-trip, no network dependency.
- Engine algorithm: *minimax* with *alpha-beta pruning*, search depth 2 (it looks 2 half-moves ahead — i.e., its move and your best reply — before choosing).
- **Hard requirement:** the engine always returns a legal move within **2 seconds**, on ordinary consumer hardware, from any legal position (including ones with many legal moves, e.g. an open middlegame). If depth 2 alpha-beta search is ever too slow in a pathological position, the engine must still return *some* legal move inside the 2-second budget (e.g. by falling back to a shallower search) rather than hang or crash.

### 2.3 Online
- Two players each type the same short room code into the app on their own device to join the same game.
- **First person to join plays White. Second person plays Black. Anyone after that is a spectator ("watch" mode) — they see the game live but cannot move.**
- The server is authoritative: it is the only place that decides whether a submitted move is legal and whose turn it is. A client cannot force a move the server disagrees with.
- **Refreshing the page rejoins the same game** — the player's seat (White/Black/spectator) and the current board position are restored from server-side state, not from anything stored only in the browser.
- **"New game" resets the board for both players** — either player can trigger it, and it takes effect for everyone connected to that room code.
- No accounts, no matchmaking, no lobby list — a room code is the entire mechanism for finding your opponent.

---

## 3. Definition of Done

The game is "done" when **all** of the following are true:

### 3.1 Rules correctness (applies to every mode — this is the foundation)
- [ ] All six piece types move and capture per standard chess rules.
- [ ] Check and checkmate are detected correctly.
- [ ] Stalemate is detected correctly (game ends in a draw, no Fatality plays).
- [ ] Castling (both kingside and queenside, both colors) is legal exactly when standard chess rules allow it, and illegal otherwise (king/rook haven't moved, squares between them empty, king not in/through/into check).
- [ ] En passant capture is available exactly one move after the qualifying pawn double-step, and expires after that.
- [ ] Pawn promotion lets the player choose which piece to promote to (Queen, Rook, Bishop, or Knight) — it does not default silently to Queen.
- [ ] **An illegal move must be impossible to make** — not "allowed then rejected," but simply not selectable/droppable/submittable in the UI, and rejected server-side in Online mode even if a client tried to force it.
- [ ] This is proven, not just claimed: a *perft* test from the standard starting position returns exactly 20 legal move sequences at depth 1, 400 at depth 2, and 8,902 at depth 3, using only our own `rules.js`.

### 3.2 Per-mode behavior
- [ ] Hot-Seat: full games playable start-to-finish on one device, including all rules above.
- [ ] VS Computer: engine responds legally within 2 seconds every move, for either color the human picks.
- [ ] Online: room-code join works, seat assignment (White/Black/spectator) is correct, moves sync live to all connected clients, refresh rejoins the same game and position, "New game" resets for everyone in the room.

### 3.3 Look
- [ ] The board, pieces, HUD, mode-select screen, and checkmate/Fatality screen visually match the palette, typography, and tone fixed in the Figma concept file (§1.1–1.3) — not pixel-identical, but clearly the same design language.

---

## 4. Explicitly not in scope

To keep this buildable, the following are deliberately **excluded** (not "later," just not part of this project unless the user asks separately):

- Accounts or logins of any kind.
- Chess clocks / time controls.
- Player ratings or rankings.
- Draw by threefold repetition or the fifty-move rule (draws only happen here via stalemate).
- Opening books / opening theory for the computer opponent.
- Move export (e.g. PGN files).
- React or any other frontend framework — plain HTML/CSS/JS only.
- Any third-party chess rules engine (e.g. chess.js) or chess AI library — the rules and the computer opponent are both written from scratch in this repo.
- Socket.IO, Express, or the `ws` npm package — only Cloudflare's native WebSocket API.

---

## 5. Optional extra (built last, after everything above works)

**Chosen: captured pieces + material count.** A tray under the board shows each side's captured fighters and the point-value difference between the two sides. It was the leading candidate since it was already sketched as a placeholder on the Match screen, and it's implemented as a pure derivation from the current board (whatever pieces are missing from the standard starting set), so it stays correct automatically in every mode without separate bookkeeping.

The other options considered, for reference: undo (Hot-Seat only), sound on move, and a resign button (Online).

---

## 6. Technical architecture (plain English, details in the roadmap)

- **Hosting:** Cloudflare Workers, free tier. The static HTML/CSS/JS files are served as *static assets*; a small worker script handles the WebSocket connections for Online mode.
- **Routing:** requests that aren't for a real file fall back to `index.html` (*SPA fallback*), so refreshing mid-game doesn't break. Requests to the WebSocket path are routed to the worker code first (`run_worker_first`) rather than treated as a static file request.
- **One rulebook:** `rules.js` is the single place chess legality is decided. Hot-Seat and VS Computer both run it directly in the browser; the Online server runs the exact same file to referee moves. This guarantees the three modes can never disagree about what's legal.
- **Online room state:** each room code maps to one *Durable Object* (via `env.ROOM.getByName(roomCode)`), which keeps a small *SQLite* table of the moves made so far and saves it after every single move (no timers, no periodic autosave — every move is durable the instant it happens). Player identity (which socket is White vs. Black) is stored on the WebSocket connection itself via `ws.serializeAttachment()`, not in a separate session system.
- **Message format:** every WebSocket message is JSON shaped like `{ "type": "...", "payload": { ... } }` — e.g. a move might be sent as `{ "type": "move", "payload": { "from": "e2", "to": "e4" } }`.

---

## Glossary

See the [README's tech glossary](README.md#plain-english-tech-glossary) for Cloudflare Workers, Durable Objects, SQLite, WebSockets, `wrangler`, static assets, SPA fallback, minimax/alpha-beta, and `perft`. Chess-specific terms:

- **Check** — the king is currently under attack and must be gotten out of danger this turn.
- **Checkmate** — the king is in check and there is no legal move to escape it; the game ends immediately.
- **Stalemate** — the player to move has no legal move, but their king is *not* in check; the game ends in a draw.
- **Castling** — a special once-per-game move where the king and a rook move simultaneously, allowed only under specific conditions.
- **En passant** — a special pawn capture available only immediately after an opponent's pawn moves two squares forward past your pawn.
- **Promotion** — when a pawn reaches the far end of the board, it must become a Queen, Rook, Bishop, or Knight.
