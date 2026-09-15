# Chess × Mortal Kombat

*by Azami*

A browser chess game with a dark, cinematic fighting-game skin. Every rule of real chess applies — captures just trigger a combat flourish, and checkmate triggers a full-screen **Fatality**. Runs entirely on Cloudflare's free hosting tier, no build step, no framework.

**Live URL:** _(added after the first deploy — see [FEATUREROADMAP_workplan.md](FEATUREROADMAP_workplan.md), Task 1.4)_

**Figma concept design:** https://www.figma.com/design/2JQSqGFpuPBICRJUGD61ys/Chess-x-Mortal-Kombat-Concept

---

## What this is

Three ways to play, one shared rulebook:

| Mode | What happens |
|---|---|
| **Hot-Seat** | Two people share one screen/device, taking turns. |
| **VS Computer** | You pick White or Black; the browser calculates the other side's moves. |
| **Online** | Two people on two different devices type the same room code and play live. |

Full details of the rules, screens, and what "finished" means live in [ProductSpec.md](ProductSpec.md). The build order and task checklist live in [FEATUREROADMAP_workplan.md](FEATUREROADMAP_workplan.md).

## Plain-English tech glossary

A few terms used throughout these docs, defined once here so you don't need a coding background to follow along:

- **Cloudflare Workers** — a hosting service that runs small pieces of code very close to whoever is visiting the site (instead of one central server far away). It's what serves this game to your browser.
- **Durable Object** — a special kind of mini-server that Cloudflare Workers can spin up, one per "thing" you need to track statefully (here: one per online game room). It remembers who's in the room and whose turn it is, for as long as the room exists.
- **SQLite** — a small, self-contained database format. Each Durable Object room keeps its own tiny SQLite database recording the moves made so far, so the game survives a page refresh.
- **WebSocket** — a live, two-way connection between a browser and a server that stays open, so moves can be pushed instantly instead of the browser having to keep asking "anything new?".
- **`wrangler`** — the command-line tool used to configure and publish a Cloudflare Workers project. `wrangler.jsonc` is its settings file.
- **Static assets** — the plain HTML/CSS/JS files that make up the game's look and board; these are served directly rather than generated on the fly.
- **SPA (Single-Page Application) fallback** — a hosting setting that says "if someone requests a page that doesn't exist as a file, just serve `index.html` and let the in-page JavaScript figure out what to show." Used here so refreshing an online-game URL doesn't 404.
- **Minimax / alpha-beta pruning** — the algorithm the computer opponent uses to decide its move: it looks ahead a fixed number of moves ("depth"), scores each resulting position, and picks the best one, while `alpha-beta pruning` is a shortcut that skips branches it can prove won't matter, so it runs fast enough on modest hardware.
- **`perft` test** — short for "performance test" in chess-programming circles; it counts every legal move sequence from a position out to a fixed depth. It's the standard way to prove a chess rules engine has no bugs, because the correct counts from the starting position are publicly known and exact (depth 1 = 20, depth 2 = 400, depth 3 = 8,902).

## Repository conventions

- All game rules (legal moves, check, checkmate, castling, en passant, promotion) live in **one file**, `rules.js` — no external chess library. It's shared by every mode (hot-seat, computer, online server) so there is exactly one source of truth for "is this move legal?".
- Plain HTML, CSS, and JavaScript only — no React, no build step.
- Git workflow: one commit per completed roadmap task, pushed to `origin`, opened as a pull request against `main`. No force-pushes.

## Status

📄 Documentation phase — see the workplan for the first buildable task.
