// rules.js — the ONE source of truth for chess legality.
// Shared, unmodified, by the hot-seat UI, the computer opponent, and the
// online server (Durable Object). No external chess library is used here.
//
// Board representation: 0x88 (a 128-cell array, indices 0-119 used).
// index = rank * 16 + file, rank 0..7, file 0..7 (a1 = 0, h1 = 7, a8 = 112, h8 = 119).
// (index & 0x88) === 0  <=>  the index is a real square on the board.
// Empty square = null. Occupied square = a single-char piece code:
//   White = uppercase P N B R Q K, Black = lowercase p n b r q k.

export const WHITE = 'w';
export const BLACK = 'b';

const KNIGHT_OFFSETS = [-33, -31, -18, -14, 14, 18, 31, 33];
const KING_OFFSETS = [-17, -16, -15, -1, 1, 15, 16, 17];
const BISHOP_DIRS = [-17, -15, 15, 17];
const ROOK_DIRS = [-16, -1, 1, 16];
const QUEEN_DIRS = [...BISHOP_DIRS, ...ROOK_DIRS];

function isOnBoard(sq) {
  return (sq & 0x88) === 0;
}

function fileOf(sq) {
  return sq & 7;
}

function rankOf(sq) {
  return sq >> 4;
}

export function squareToAlgebraic(sq) {
  return String.fromCharCode(97 + fileOf(sq)) + (rankOf(sq) + 1);
}

export function algebraicToSquare(str) {
  const file = str.charCodeAt(0) - 97;
  const rank = parseInt(str[1], 10) - 1;
  return rank * 16 + file;
}

function colorOf(piece) {
  if (!piece) return null;
  return piece === piece.toUpperCase() ? WHITE : BLACK;
}

function typeOf(piece) {
  return piece ? piece.toLowerCase() : null;
}

function opponent(color) {
  return color === WHITE ? BLACK : WHITE;
}

const CASTLE_SQUARES = {
  [WHITE]: { king: 4, kingsideRook: 7, queensideRook: 0, kingsideEmpty: [5, 6], queensideEmpty: [1, 2, 3], kingsidePath: [4, 5, 6], queensidePath: [4, 3, 2] },
  [BLACK]: { king: 116, kingsideRook: 119, queensideRook: 112, kingsideEmpty: [117, 118], queensideEmpty: [113, 114, 115], kingsidePath: [116, 117, 118], queensidePath: [116, 115, 114] },
};

/** Returns a fresh game state at the standard starting position. */
export function createInitialState() {
  const board = new Array(128).fill(null);
  const backRank = ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R'];
  for (let file = 0; file < 8; file++) {
    board[0 * 16 + file] = backRank[file];
    board[1 * 16 + file] = 'P';
    board[6 * 16 + file] = 'p';
    board[7 * 16 + file] = backRank[file].toLowerCase();
  }
  return {
    board,
    turn: WHITE,
    castling: { K: true, Q: true, k: true, q: true },
    enPassant: null, // square index a pawn just skipped over, capturable this move only
  };
}

function cloneState(state) {
  return {
    board: state.board.slice(),
    turn: state.turn,
    castling: { ...state.castling },
    enPassant: state.enPassant,
  };
}

function findKing(state, color) {
  const king = color === WHITE ? 'K' : 'k';
  for (let sq = 0; sq < 128; sq++) {
    if (isOnBoard(sq) && state.board[sq] === king) return sq;
  }
  return -1;
}

/** Is `square` attacked by any piece of `byColor`? */
export function isSquareAttacked(board, square, byColor) {
  // Pawns: a byColor pawn attacks `square` from one rank behind it, diagonally.
  const pawnBack = byColor === WHITE ? -16 : 16;
  for (const df of [-1, 1]) {
    const from = square + pawnBack + df;
    if (isOnBoard(from) && Math.abs(fileOf(from) - fileOf(square)) === 1) {
      const p = board[from];
      if (p && colorOf(p) === byColor && typeOf(p) === 'p') return true;
    }
  }

  for (const off of KNIGHT_OFFSETS) {
    const from = square + off;
    if (isOnBoard(from)) {
      const p = board[from];
      if (p && colorOf(p) === byColor && typeOf(p) === 'n') return true;
    }
  }

  for (const off of KING_OFFSETS) {
    const from = square + off;
    if (isOnBoard(from)) {
      const p = board[from];
      if (p && colorOf(p) === byColor && typeOf(p) === 'k') return true;
    }
  }

  for (const dir of BISHOP_DIRS) {
    let sq = square + dir;
    while (isOnBoard(sq)) {
      const p = board[sq];
      if (p) {
        if (colorOf(p) === byColor && (typeOf(p) === 'b' || typeOf(p) === 'q')) return true;
        break;
      }
      sq += dir;
    }
  }

  for (const dir of ROOK_DIRS) {
    let sq = square + dir;
    while (isOnBoard(sq)) {
      const p = board[sq];
      if (p) {
        if (colorOf(p) === byColor && (typeOf(p) === 'r' || typeOf(p) === 'q')) return true;
        break;
      }
      sq += dir;
    }
  }

  return false;
}

function isInCheck(state, color) {
  const kingSq = findKing(state, color);
  return isSquareAttacked(state.board, kingSq, opponent(color));
}

const PROMOTION_PIECES = ['q', 'r', 'b', 'n'];

/** All pseudo-legal moves for the side to move (own-king safety NOT checked yet). */
function generatePseudoMoves(state) {
  const { board, turn } = state;
  const moves = [];
  const lastRank = turn === WHITE ? 7 : 0;
  const startRank = turn === WHITE ? 1 : 6;
  const pawnDir = turn === WHITE ? 16 : -16;

  for (let sq = 0; sq < 128; sq++) {
    if (!isOnBoard(sq)) continue;
    const piece = board[sq];
    if (!piece || colorOf(piece) !== turn) continue;
    const type = typeOf(piece);

    if (type === 'p') {
      const one = sq + pawnDir;
      if (isOnBoard(one) && !board[one]) {
        pushPawnMove(moves, sq, one, piece, null, lastRank);
        const two = sq + pawnDir * 2;
        if (rankOf(sq) === startRank && !board[two]) {
          moves.push({ from: sq, to: two, piece, captured: null, flags: { doublePawnPush: true } });
        }
      }
      for (const df of [-1, 1]) {
        const to = sq + pawnDir + df;
        if (!isOnBoard(to) || Math.abs(fileOf(to) - fileOf(sq)) !== 1) continue;
        const target = board[to];
        if (target && colorOf(target) !== turn) {
          pushPawnMove(moves, sq, to, piece, target, lastRank);
        } else if (!target && state.enPassant === to) {
          moves.push({ from: sq, to, piece, captured: board[to + (turn === WHITE ? -16 : 16)], flags: { enPassant: true } });
        }
      }
    } else if (type === 'n') {
      for (const off of KNIGHT_OFFSETS) {
        const to = sq + off;
        if (!isOnBoard(to)) continue;
        const target = board[to];
        if (!target || colorOf(target) !== turn) {
          moves.push({ from: sq, to, piece, captured: target, flags: {} });
        }
      }
    } else if (type === 'k') {
      for (const off of KING_OFFSETS) {
        const to = sq + off;
        if (!isOnBoard(to)) continue;
        const target = board[to];
        if (!target || colorOf(target) !== turn) {
          moves.push({ from: sq, to, piece, captured: target, flags: {} });
        }
      }
      addCastlingMoves(state, moves);
    } else {
      const dirs = type === 'b' ? BISHOP_DIRS : type === 'r' ? ROOK_DIRS : QUEEN_DIRS;
      for (const dir of dirs) {
        let to = sq + dir;
        while (isOnBoard(to)) {
          const target = board[to];
          if (!target) {
            moves.push({ from: sq, to, piece, captured: null, flags: {} });
          } else {
            if (colorOf(target) !== turn) {
              moves.push({ from: sq, to, piece, captured: target, flags: {} });
            }
            break;
          }
          to += dir;
        }
      }
    }
  }

  return moves;
}

function pushPawnMove(moves, from, to, piece, captured, lastRank) {
  if (rankOf(to) === lastRank) {
    for (const promo of PROMOTION_PIECES) {
      moves.push({ from, to, piece, captured, flags: { promotion: promo } });
    }
  } else {
    moves.push({ from, to, piece, captured, flags: {} });
  }
}

function addCastlingMoves(state, moves) {
  const { turn, board, castling } = state;
  const c = CASTLE_SQUARES[turn];
  const kingsideFlag = turn === WHITE ? 'K' : 'k';
  const queensideFlag = turn === WHITE ? 'Q' : 'q';
  const opp = opponent(turn);

  if (isInCheck(state, turn)) return; // can't castle out of check

  if (castling[kingsideFlag] && c.kingsideEmpty.every((sq) => !board[sq]) && board[c.kingsideRook] === (turn === WHITE ? 'R' : 'r')) {
    if (c.kingsidePath.every((sq) => !isSquareAttacked(board, sq, opp))) {
      moves.push({ from: c.king, to: c.kingsidePath[2], piece: board[c.king], captured: null, flags: { castle: 'K' } });
    }
  }
  if (castling[queensideFlag] && c.queensideEmpty.every((sq) => !board[sq]) && board[c.queensideRook] === (turn === WHITE ? 'R' : 'r')) {
    if (c.queensidePath.every((sq) => !isSquareAttacked(board, sq, opp))) {
      moves.push({ from: c.king, to: c.queensidePath[2], piece: board[c.king], captured: null, flags: { castle: 'Q' } });
    }
  }
}

/** Applies a move (assumed pseudo-legal) and returns a NEW state. Does not mutate `state`. */
export function makeMove(state, move) {
  const next = cloneState(state);
  const { from, to, piece, flags } = move;
  const color = colorOf(piece);

  next.board[from] = null;
  next.board[to] = flags.promotion ? (color === WHITE ? flags.promotion.toUpperCase() : flags.promotion) : piece;

  if (flags.enPassant) {
    const capturedPawnSq = to + (color === WHITE ? -16 : 16);
    next.board[capturedPawnSq] = null;
  }

  if (flags.castle) {
    const c = CASTLE_SQUARES[color];
    if (flags.castle === 'K') {
      next.board[c.kingsideRook] = null;
      next.board[c.kingsidePath[1]] = color === WHITE ? 'R' : 'r';
    } else {
      next.board[c.queensideRook] = null;
      next.board[c.queensidePath[1]] = color === WHITE ? 'R' : 'r';
    }
  }

  // Update castling rights.
  if (typeOf(piece) === 'k') {
    if (color === WHITE) { next.castling.K = false; next.castling.Q = false; }
    else { next.castling.k = false; next.castling.q = false; }
  }
  for (const sq of [from, to]) {
    if (sq === 0) next.castling.Q = false;
    if (sq === 7) next.castling.K = false;
    if (sq === 112) next.castling.q = false;
    if (sq === 119) next.castling.k = false;
  }

  next.enPassant = flags.doublePawnPush ? (from + to) / 2 : null;
  next.turn = opponent(state.turn);

  return next;
}

/** Legal moves for the side to move: pseudo-legal moves that don't leave the mover's own king in check. */
export function generateLegalMoves(state) {
  const pseudo = generatePseudoMoves(state);
  const legal = [];
  for (const move of pseudo) {
    const next = makeMove(state, move);
    if (!isInCheck(next, state.turn)) legal.push(move);
  }
  return legal;
}

/** 'in_progress' | 'check' | 'checkmate' | 'stalemate' */
export function getGameStatus(state) {
  const legalMoves = generateLegalMoves(state);
  const inCheck = isInCheck(state, state.turn);
  if (legalMoves.length === 0) return inCheck ? 'checkmate' : 'stalemate';
  return inCheck ? 'check' : 'in_progress';
}

const STARTING_COUNT = { p: 8, n: 2, b: 2, r: 2, q: 1, k: 1 };

/**
 * Derives which pieces have been captured, purely from what's missing on
 * the board compared to the standard starting set — no move history needed.
 * Returns lowercase-typed piece letters (e.g. 'q', 'p') in each list.
 */
export function getCapturedPieces(board) {
  const onBoard = { P: 0, N: 0, B: 0, R: 0, Q: 0, K: 0, p: 0, n: 0, b: 0, r: 0, q: 0, k: 0 };
  for (const piece of board) {
    if (piece) onBoard[piece]++;
  }

  const capturedByWhite = []; // black pieces missing = captured by White
  const capturedByBlack = []; // white pieces missing = captured by Black
  for (const type of ['q', 'r', 'b', 'n', 'p']) {
    for (let i = 0; i < STARTING_COUNT[type] - onBoard[type]; i++) capturedByWhite.push(type);
    for (let i = 0; i < STARTING_COUNT[type] - onBoard[type.toUpperCase()]; i++) capturedByBlack.push(type.toUpperCase());
  }
  return { capturedByWhite, capturedByBlack };
}

/** Counts leaf nodes at exactly `depth` plies — the standard chess "perft" correctness test. */
export function perft(state, depth) {
  if (depth === 0) return 1;
  const moves = generateLegalMoves(state);
  if (depth === 1) return moves.length;
  let count = 0;
  for (const move of moves) {
    count += perft(makeMove(state, move), depth - 1);
  }
  return count;
}
