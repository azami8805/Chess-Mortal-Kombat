// app.js — the controller. Wires mode-select, the game loop, and (later
// phases) the computer opponent and the online client, on top of the pure
// rules.js state and the pure board.js rendering helpers.
import { createInitialState, generateLegalMoves, makeMove, getGameStatus } from './rules.js';
import { renderBoard, renderCaptured, showPromotionModal, showEndScreen, hideEndScreen } from './board.js';

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
};

const colorOf = (piece) => (piece === piece.toUpperCase() ? 'w' : 'b');
const opponent = (color) => (color === 'w' ? 'b' : 'w');

function findKingSquare(board, color) {
  const king = color === 'w' ? 'K' : 'k';
  return board.findIndex((p) => p === king);
}

const app = {
  mode: null, // 'hotseat' | 'computer' | 'online'
  state: null,
  selected: null,
  legalMoves: [],
  capturedByWhite: [],
  capturedByBlack: [],
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

function startNewGame(mode) {
  app.mode = mode;
  app.state = createInitialState();
  app.selected = null;
  app.legalMoves = [];
  app.capturedByWhite = [];
  app.capturedByBlack = [];
  hideEndScreen();
  showScreen('match');
  render();
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

  renderCaptured({ capturedByWhite: app.capturedByWhite, capturedByBlack: app.capturedByBlack });

  els.hudWhite.classList.toggle('inactive', app.state.turn !== 'w');
  els.hudBlack.classList.toggle('inactive', app.state.turn !== 'b');

  const modeLabel = { hotseat: 'HOT-SEAT', computer: 'VS COMPUTER', online: 'ONLINE' }[app.mode] || '';
  const turnLabel = app.state.turn === 'w' ? 'WHITE TO MOVE' : 'BLACK TO MOVE';
  els.hudTag.textContent = `${modeLabel} · ${turnLabel}`;

  if (status === 'checkmate') {
    showEndScreen({ status, winnerColor: opponent(app.state.turn) });
  } else if (status === 'stalemate') {
    showEndScreen({ status });
  }
}

async function handleSquareClick(sq) {
  const status = getGameStatus(app.state);
  if (status === 'checkmate' || status === 'stalemate') return;

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

  applyMove(chosen);
}

function applyMove(move) {
  if (move.captured) {
    const capturingColor = colorOf(move.piece);
    if (capturingColor === 'w') app.capturedByWhite.push(move.captured);
    else app.capturedByBlack.push(move.captured);
  }
  app.state = makeMove(app.state, move);
  app.selected = null;
  app.legalMoves = [];
  render();
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
    els.onlineStatus.textContent = '';
    // Computer opponent lands in Phase 2 — see FEATUREROADMAP_workplan.md.
    els.colorPick.querySelector('.panel-status')?.remove();
    const note = document.createElement('p');
    note.className = 'panel-status';
    note.textContent = 'VS Computer is coming in Phase 2 — hot-seat is live now.';
    els.colorPick.appendChild(note);
  });
});

document.getElementById('room-join-btn').addEventListener('click', () => {
  els.onlineStatus.textContent = 'Online play is coming in Phase 3 — hot-seat is live now.';
});

els.backBtn.addEventListener('click', () => {
  showScreen('menu');
  resetSubPanels();
});

els.newGameBtn.addEventListener('click', () => {
  startNewGame(app.mode);
});
