// worker.js — the server side of Online mode. Two parts:
//   1. `Room`, a Durable Object (one instance per room code) that holds the
//      authoritative game state in its own small SQLite database and
//      referees every move using the exact same rules.js the browser uses.
//   2. A plain fetch handler that routes WebSocket connections for
//      "/api/room/<code>" to that room's Durable Object, and everything
//      else to the static assets (handled automatically by not being
//      matched by `run_worker_first` in wrangler.jsonc).
import { createInitialState, generateLegalMoves, makeMove, getGameStatus } from './public/rules.js';

export class Room {
  constructor(ctx, env) {
    this.ctx = ctx;
    this.env = env;
    this.sql = ctx.storage.sql;
    this.sql.exec('CREATE TABLE IF NOT EXISTS game (id INTEGER PRIMARY KEY, state TEXT NOT NULL)');
  }

  getState() {
    const rows = [...this.sql.exec('SELECT state FROM game WHERE id = 0')];
    if (rows.length === 0) {
      const fresh = createInitialState();
      this.setState(fresh);
      return fresh;
    }
    return JSON.parse(rows[0].state);
  }

  // Saved after every single move — no timers, no periodic autosave.
  setState(state) {
    this.sql.exec(
      'INSERT INTO game (id, state) VALUES (0, ?1) ON CONFLICT(id) DO UPDATE SET state = ?1',
      JSON.stringify(state)
    );
  }

  seatsInUse() {
    const seats = new Set();
    for (const ws of this.ctx.getWebSockets()) {
      const attachment = ws.deserializeAttachment();
      if (attachment?.seat) seats.add(attachment.seat);
    }
    return seats;
  }

  // `lastMove` (the move that produced this state, or null e.g. after a
  // reset) rides along in the broadcast only — it's not persisted as part
  // of the saved game state, just used by clients to show the capturing
  // piece's combat move / the mating piece's Fatality.
  broadcastState(lastMove = null) {
    const state = this.getState();
    const message = JSON.stringify({
      type: 'state',
      payload: { ...state, status: getGameStatus(state), lastMove },
    });
    for (const ws of this.ctx.getWebSockets()) ws.send(message);
  }

  async fetch(request) {
    if (request.headers.get('Upgrade') !== 'websocket') {
      return new Response('Expected a WebSocket upgrade', { status: 426 });
    }

    // First connection to grab a color gets it; refreshing a seat that's
    // no longer connected (e.g. a page reload) re-claims that same seat.
    const seatsInUse = this.seatsInUse();
    let seat = 'spectator';
    if (!seatsInUse.has('w')) seat = 'w';
    else if (!seatsInUse.has('b')) seat = 'b';

    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    this.ctx.acceptWebSocket(server);
    server.serializeAttachment({ seat });

    const state = this.getState();
    server.send(JSON.stringify({
      type: 'welcome',
      payload: { ...state, seat, status: getGameStatus(state) },
    }));

    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(ws, rawMessage) {
    let msg;
    try {
      msg = JSON.parse(rawMessage);
    } catch {
      return; // not valid JSON — ignore rather than crash the room
    }

    const seat = ws.deserializeAttachment()?.seat;

    if (msg.type === 'move') {
      const state = this.getState();
      if (seat !== state.turn) return; // out of turn or spectator — server is authoritative, just drop it
      const { from, to, promotion } = msg.payload || {};
      const match = generateLegalMoves(state).find(
        (m) => m.from === from && m.to === to && (m.flags.promotion || null) === (promotion || null)
      );
      if (!match) return; // illegal move — dropped, never applied
      this.setState(makeMove(state, match));
      this.broadcastState(match);
    } else if (msg.type === 'newGame') {
      if (seat !== 'w' && seat !== 'b') return; // only seated players may reset, not spectators
      this.setState(createInitialState());
      this.broadcastState(null);
    }
  }

  async webSocketClose(ws) {
    try {
      ws.close();
    } catch {
      // already closed
    }
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const match = url.pathname.match(/^\/api\/room\/([A-Za-z0-9]{1,12})$/);
    if (!match) {
      return new Response('Not found', { status: 404 });
    }
    const roomCode = match[1].toUpperCase();
    const room = env.ROOM.getByName(roomCode);
    return room.fetch(request);
  },
};
