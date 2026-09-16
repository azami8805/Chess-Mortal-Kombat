// app.js — the controller. Wires mode-select, the game loop, and (later
// phases) the computer opponent and the online client, on top of the pure
// rules.js state and the pure board.js rendering helpers.
import { createInitialState, generateLegalMoves, makeMove, getGameStatus, getCapturedPieces } from './rules.js';
import { renderBoard, renderCaptured, showPromotionModal, showEndScreen, hideEndScreen, showCombatToast, pulseAttack, pulseDeath, pulseLanding, shakeBoard } from './board.js';
import { chooseMove } from './engine.js';
import { fighterFor } from './fighters.js';

const ENGINE_THINK_DELAY_MS = 300; // purely cosmetic — the engine itself resolves in milliseconds

const els = {
  modeSelect: document.getElementById('mode-select-screen'),
  match: document.getElementById('match-screen'),
  colorPick: document.getElementById('color-pick'),
  onlineJoin: document.getElementById('online-join'),
  onlineStatus: document.getElementById('online-status'),
  board: document.getElementById('board'),
  hudBlack: document.getElementById('hud-black'),
  hudWhite: document.getElementById('hud-white'),
  hudTag: document.getElementById('hud-tag'),
  backBtn: document.getElementById('back-btn'),
  newGameBtn: document.getElementById('new-game-btn'),
  newGameMidBtn: document.getElementById('new-game-mid-btn'),
};

const colorOf = (piece) => (piece === piece.toUpperCase() ? 'w' : 'b');
const opponent = (color) => (color === 'w' ? 'b' : 'w');
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Where the captured piece actually sits — usually `to`, but one rank behind it for en passant. */
function captureSquareFor(move) {
  if (move.flags?.enPassant) {
    return move.to + (colorOf(move.piece) === 'w' ? -16 : 16);
  }
  return move.to;
}

function findKingSquare(board, color) {
  const king = color === 'w' ? 'K' : 'k';
  return board.findIndex((p) => p === king);
}

const app = {
  mode: null, // 'hotseat' | 'computer' | 'online'
  state: null,
  selected: null,
  legalMoves: [],
  humanColor: null, // 'computer' mode only: which color the human plays
  engineThinking: false,
  onlineWs: null,
  onlineSeat: null, // 'w' | 'b' | 'spectator', online mode only
  onlineConnected: false,
  lastMove: null, // drives the combat toast and the Fatality flavor text
};

function showScreen(name) {
  els.modeSelect.classList.toggle('hidden', name !== 'menu');
  els.match.classList.toggle('hidden', name !== 'match');
}

function resetSubPanels() {
  els.colorPick.classList.add('hidden');
  els.onlineJoin.classList.add('hidden');
  els.onlineStatus.textContent = '';
}

function startNewGame(mode, options = {}) {
  app.mode = mode;
  app.state = createInitialState();
  app.selected = null;
  app.legalMoves = [];
  app.humanColor = options.humanColor ?? null;
  app.engineThinking = false;
  app.lastMove = null;
  hideEndScreen();
  showScreen('match');
  render();
  maybeTriggerEngineMove();
}

function render() {
  const status = getGameStatus(app.state);
  const checkedSquare = status === 'check' || status === 'checkmate' ? findKingSquare(app.state.board, app.state.turn) : null;
  const targets = app.selected != null ? app.legalMoves.filter((m) => m.from === app.selected).map((m) => m.to) : [];

  renderBoard(els.board, {
    board: app.state.board,
    selected: app.selected,
    legalTargets: targets,
    checkedSquare,
    onSquareClick: handleSquareClick,
  });

  renderCaptured(getCapturedPieces(app.state.board));

  els.hudWhite.classList.toggle('inactive', app.state.turn !== 'w');
  els.hudBlack.classList.toggle('inactive', app.state.turn !== 'b');

  if (app.mode === 'online' && !app.onlineConnected) {
    els.hudTag.textContent = 'DISCONNECTED — go back and rejoin with the room code';
  } else {
    const modeLabel = { hotseat: 'HOT-SEAT', computer: 'VS COMPUTER', online: 'ONLINE' }[app.mode] || '';
    const turnLabel = app.engineThinking ? 'ENGINE THINKING…' : app.state.turn === 'w' ? 'WHITE TO MOVE' : 'BLACK TO MOVE';
    const seatLabel = app.mode === 'online' && app.onlineSeat ? ` · YOU ARE ${app.onlineSeat === 'spectator' ? 'SPECTATING' : app.onlineSeat === 'w' ? 'WHITE' : 'BLACK'}` : '';
    els.hudTag.textContent = `${modeLabel} · ${turnLabel}${seatLabel}`;
  }

}

/** Shown separately from render() so a checkmate can shake the board first, then cut to the Fatality screen. */
function revealEndScreenIfOver() {
  const status = getGameStatus(app.state);
  if (status === 'checkmate') {
    const matingPiece = app.lastMove?.piece;
    showEndScreen({
      status,
      winnerColor: opponent(app.state.turn),
      matingPiece,
      matingFighter: matingPiece ? fighterFor(matingPiece) : null,
    });
  } else if (status === 'stalemate') {
    showEndScreen({ status });
  }
}

async function handleSquareClick(sq) {
  const status = getGameStatus(app.state);
  if (status === 'checkmate' || status === 'stalemate') return;
  if (app.engineThinking) return;
  if (app.mode === 'computer' && app.state.turn !== app.humanColor) return;
  if (app.mode === 'online' && (!app.onlineConnected || app.onlineSeat !== app.state.turn)) return;

  const piece = app.state.board[sq];

  if (app.selected == null) {
    if (piece && colorOf(piece) === app.state.turn) {
      app.selected = sq;
      app.legalMoves = generateLegalMoves(app.state).filter((m) => m.from === sq);
      render();
    }
    return;
  }

  if (sq === app.selected) {
    app.selected = null;
    app.legalMoves = [];
    render();
    return;
  }

  if (piece && colorOf(piece) === app.state.turn) {
    app.selected = sq;
    app.legalMoves = generateLegalMoves(app.state).filter((m) => m.from === sq);
    render();
    return;
  }

  const candidates = app.legalMoves.filter((m) => m.from === app.selected && m.to === sq);
  if (candidates.length === 0) return;

  let chosen = candidates[0];
  if (candidates.length > 1) {
    const promo = await showPromotionModal(app.state.turn);
    chosen = candidates.find((m) => m.flags.promotion === promo);
  }

  if (app.mode === 'online') {
    app.onlineWs.send(JSON.stringify({ type: 'move', payload: { from: chosen.from, to: chosen.to, promotion: chosen.flags.promotion || null } }));
    app.selected = null;
    app.legalMoves = [];
    render(); // the authoritative board update arrives via the server's broadcast
  } else {
    applyMove(chosen);
  }
}

async function applyMove(move) {
  if (move.captured) {
    await pulseDeath(captureSquareFor(move));
  } else {
    pulseAttack(move.from);
    await wait(140);
  }

  app.state = makeMove(app.state, move);
  app.lastMove = move;
  app.selected = null;
  app.legalMoves = [];
  render();
  pulseLanding(move.to);

  const status = getGameStatus(app.state);
  if (status === 'checkmate') {
    shakeBoard();
    await wait(350);
    revealEndScreenIfOver();
  } else {
    if (move.captured) showCombatToast(fighterFor(move.piece));
    if (status === 'stalemate') revealEndScreenIfOver();
  }

  maybeTriggerEngineMove();
}

function maybeTriggerEngineMove() {
  if (app.mode !== 'computer') return;
  const status = getGameStatus(app.state);
  if (status === 'checkmate' || status === 'stalemate') return;
  if (app.state.turn === app.humanColor) return;

  app.engineThinking = true;
  render();
  setTimeout(() => {
    const move = chooseMove(app.state, 2);
    app.engineThinking = false;
    if (move) applyMove(move);
    else render();
  }, ENGINE_THINK_DELAY_MS);
}

// ---------- Online client ----------

function connectToRoom(code) {
  els.onlineStatus.textContent = 'Connecting…';
  const proto = location.protocol === 'https:' ? 'wss' : 'ws';
  const ws = new WebSocket(`${proto}://${location.host}/api/room/${encodeURIComponent(code)}`);

  ws.addEventListener('open', () => {
    els.onlineStatus.textContent = '';
  });

  ws.addEventListener('message', async (event) => {
    const msg = JSON.parse(event.data);
    if (msg.type === 'welcome') {
      app.mode = 'online';
      app.onlineWs = ws;
      app.onlineSeat = msg.payload.seat;
      app.onlineConnected = true;
      applyServerState(msg.payload);
      hideEndScreen();
      showScreen('match');
      render();
    } else if (msg.type === 'state') {
      const move = msg.payload.lastMove;
      if (move) {
        if (move.captured) await pulseDeath(captureSquareFor(move));
        else {
          pulseAttack(move.from);
          await wait(140);
        }
      }

      applyServerState(msg.payload);
      render();

      if (move) {
        pulseLanding(move.to);
        const status = getGameStatus(app.state);
        if (status === 'checkmate') {
          shakeBoard();
          await wait(350);
          revealEndScreenIfOver();
        } else {
          if (move.captured) showCombatToast(fighterFor(move.piece));
          if (status === 'stalemate') revealEndScreenIfOver();
        }
      }
    }
  });

  ws.addEventListener('close', () => {
    if (app.onlineWs !== ws) return; // an old, already-replaced connection — ignore
    app.onlineConnected = false;
    els.onlineStatus.textContent = 'Disconnected from room.';
    if (app.mode === 'online') render();
  });

  ws.addEventListener('error', () => {
    els.onlineStatus.textContent = 'Could not connect — check the room code and try again.';
  });
}

function applyServerState(payload) {
  app.state = { board: payload.board, turn: payload.turn, castling: payload.castling, enPassant: payload.enPassant };
  app.lastMove = payload.lastMove || null;
  app.selected = null;
  app.legalMoves = [];
}

// ---------- Mode select wiring ----------

document.querySelectorAll('.mode-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    const mode = btn.dataset.mode;
    resetSubPanels();
    if (mode === 'hotseat') {
      startNewGame('hotseat');
    } else if (mode === 'computer') {
      els.colorPick.classList.remove('hidden');
    } else if (mode === 'online') {
      els.onlineJoin.classList.remove('hidden');
    }
  });
});

els.colorPick.querySelectorAll('.pill-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    startNewGame('computer', { humanColor: btn.dataset.color });
  });
});

document.getElementById('room-join-btn').addEventListener('click', () => {
  const code = document.getElementById('room-code-input').value.trim().toUpperCase();
  if (!code) {
    els.onlineStatus.textContent = 'Enter a room code first.';
    return;
  }
  connectToRoom(code);
});

els.backBtn.addEventListener('click', () => {
  if (app.mode === 'online' && app.onlineWs) {
    app.onlineWs.close();
    app.onlineWs = null;
    app.onlineSeat = null;
    app.onlineConnected = false;
  }
  showScreen('menu');
  resetSubPanels();
});

function requestNewGame() {
  if (app.mode === 'online') {
    app.onlineWs.send(JSON.stringify({ type: 'newGame' }));
  } else {
    startNewGame(app.mode, { humanColor: app.humanColor });
  }
}

els.newGameBtn.addEventListener('click', requestNewGame);
els.newGameMidBtn.addEventListener('click', requestNewGame);
