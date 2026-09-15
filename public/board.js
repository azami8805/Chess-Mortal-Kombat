// board.js — pure DOM rendering helpers. No game rules live here; this file
// only turns a rules.js state (plus some UI-only selection info) into HTML.

const GLYPHS = {
  K: '♔', Q: '♕', R: '♖', B: '♗', N: '♘', P: '♙',
  k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟',
};

const MATERIAL_VALUE = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

export function pieceGlyph(piece) {
  return GLYPHS[piece] || '';
}

/** Row/col are screen coordinates (row 0 = top = rank 8, col 0 = file a). */
export function squareFromRowCol(row, col) {
  const rank = 7 - row;
  return rank * 16 + col;
}

export function renderBoard(container, { board, selected, legalTargets, checkedSquare, onSquareClick }) {
  container.innerHTML = '';
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const sq = squareFromRowCol(row, col);
      const rank = 7 - row;
      const isDark = (rank + col) % 2 === 0;

      const el = document.createElement('div');
      el.className = `square ${isDark ? 'dark' : 'light'}`;
      el.dataset.square = String(sq);

      const piece = board[sq];
      if (piece) {
        const span = document.createElement('span');
        span.className = `piece ${piece === piece.toUpperCase() ? 'white' : 'black'}`;
        span.textContent = pieceGlyph(piece);
        el.appendChild(span);
      }

      if (selected === sq) el.classList.add('selected');
      if (legalTargets && legalTargets.includes(sq)) {
        el.classList.add('legal-target');
        if (piece) el.classList.add('has-piece');
      }
      if (checkedSquare === sq) el.classList.add('in-check');

      el.addEventListener('click', () => onSquareClick(sq));
      container.appendChild(el);
    }
  }
}

export function renderCaptured({ capturedByWhite, capturedByBlack }) {
  const whiteEl = document.getElementById('captured-by-white');
  const blackEl = document.getElementById('captured-by-black');
  const whiteMatEl = document.getElementById('material-white');
  const blackMatEl = document.getElementById('material-black');

  whiteEl.textContent = capturedByWhite.map(pieceGlyph).join(' ');
  blackEl.textContent = capturedByBlack.map(pieceGlyph).join(' ');

  const sum = (pieces) => pieces.reduce((total, p) => total + (MATERIAL_VALUE[p.toLowerCase()] || 0), 0);
  const whitePoints = sum(capturedByWhite);
  const blackPoints = sum(capturedByBlack);

  whiteMatEl.textContent = whitePoints > blackPoints ? `+${whitePoints - blackPoints}` : '';
  blackMatEl.textContent = blackPoints > whitePoints ? `+${blackPoints - whitePoints}` : '';
}

export function showPromotionModal(color) {
  return new Promise((resolve) => {
    const modal = document.getElementById('promotion-modal');
    const choicesEl = document.getElementById('promotion-choices');
    choicesEl.innerHTML = '';

    for (const type of ['q', 'r', 'b', 'n']) {
      const piece = color === 'w' ? type.toUpperCase() : type;
      const btn = document.createElement('button');
      btn.className = 'promotion-choice';
      btn.textContent = pieceGlyph(piece);
      btn.addEventListener('click', () => {
        modal.classList.add('hidden');
        resolve(type);
      });
      choicesEl.appendChild(btn);
    }

    modal.classList.remove('hidden');
  });
}

export function showEndScreen({ status, winnerColor, matingFighter, matingPiece }) {
  const overlay = document.getElementById('end-screen');
  const glyphEl = document.getElementById('end-glyph');
  const titleEl = document.getElementById('end-title');
  const fatalityNameEl = document.getElementById('end-fatality-name');
  const subtitleEl = document.getElementById('end-subtitle');

  if (status === 'checkmate') {
    glyphEl.textContent = matingPiece ? pieceGlyph(matingPiece) : (winnerColor === 'w' ? GLYPHS.K : GLYPHS.k);
    titleEl.textContent = 'FATALITY';
    fatalityNameEl.textContent = matingFighter ? `"${matingFighter.fatality}" — ${matingFighter.title}` : '';
    subtitleEl.textContent = `CHECKMATE — ${winnerColor === 'w' ? 'WHITE' : 'BLACK'} WINS`;
  } else {
    glyphEl.textContent = '½';
    titleEl.textContent = 'DRAW';
    fatalityNameEl.textContent = '';
    subtitleEl.textContent = 'STALEMATE — NO LEGAL MOVES';
  }

  overlay.classList.remove('hidden');
}

export function hideEndScreen() {
  document.getElementById('end-screen').classList.add('hidden');
}

let combatToastTimer = null;

/** Briefly flashes the capturing fighter's combat move over the board. */
export function showCombatToast(fighter) {
  const toast = document.getElementById('combat-toast');
  document.getElementById('combat-toast-title').textContent = fighter.title;
  document.getElementById('combat-toast-move').textContent = fighter.move;

  clearTimeout(combatToastTimer);
  toast.classList.remove('hidden');
  // Force a reflow so re-triggering the transition works on rapid captures.
  void toast.offsetWidth;
  toast.classList.add('visible');

  combatToastTimer = setTimeout(() => {
    toast.classList.remove('visible');
    combatToastTimer = setTimeout(() => toast.classList.add('hidden'), 200);
  }, 1000);
}
