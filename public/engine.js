// engine.js — the computer opponent. Runs entirely in the browser (no
// server round-trip). Minimax search with alpha-beta pruning, looking
// `depth` half-moves ahead (default 2: the engine's move, then your best
// reply) before picking a move. Pure function of rules.js — no UI code.
import { generateLegalMoves, makeMove, getGameStatus } from './rules.js';

const PIECE_VALUE = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

// Positive = good for White, negative = good for Black. This is the only
// "understanding" the engine has of chess: count material on the board,
// plus a large bonus/penalty for delivering or suffering checkmate.
function evaluate(state, status) {
  if (status === 'checkmate') {
    // The side to move has just been checkmated — bad for them, good for the other side.
    return state.turn === 'w' ? -100000 : 100000;
  }
  if (status === 'stalemate') return 0;

  let score = 0;
  for (const piece of state.board) {
    if (!piece) continue;
    const value = PIECE_VALUE[piece.toLowerCase()];
    score += piece === piece.toUpperCase() ? value : -value;
  }
  return score;
}

/** Returns only a score (no move) — used for the recursive part of the search. */
function search(state, depth, alpha, beta) {
  const status = getGameStatus(state);
  if (depth === 0 || status === 'checkmate' || status === 'stalemate') {
    return evaluate(state, status);
  }

  const moves = generateLegalMoves(state);
  const maximizing = state.turn === 'w';
  let bestScore = maximizing ? -Infinity : Infinity;

  for (const move of moves) {
    const score = search(makeMove(state, move), depth - 1, alpha, beta);
    bestScore = maximizing ? Math.max(bestScore, score) : Math.min(bestScore, score);
    if (maximizing) alpha = Math.max(alpha, bestScore);
    else beta = Math.min(beta, bestScore);
    if (beta <= alpha) break; // alpha-beta prune: this branch can't affect the final choice
  }

  return bestScore;
}

/**
 * Picks a legal move for the side to move. Always returns a move if one
 * exists. Ties for the best score are broken randomly (rather than always
 * picking the first move found) so the engine doesn't visibly shuffle the
 * same piece back and forth when several moves score identically.
 */
export function chooseMove(state, depth = 2) {
  const legalMoves = generateLegalMoves(state);
  if (legalMoves.length === 0) return null; // checkmate/stalemate — caller should have already stopped play

  try {
    const maximizing = state.turn === 'w';
    let bestScore = maximizing ? -Infinity : Infinity;
    let bestMoves = [];
    let alpha = -Infinity;
    let beta = Infinity;

    for (const move of legalMoves) {
      const score = search(makeMove(state, move), depth - 1, alpha, beta);
      if (maximizing ? score > bestScore : score < bestScore) {
        bestScore = score;
        bestMoves = [move];
      } else if (score === bestScore) {
        bestMoves.push(move);
      }
      if (maximizing) alpha = Math.max(alpha, bestScore);
      else beta = Math.min(beta, bestScore);
    }

    return bestMoves[Math.floor(Math.random() * bestMoves.length)];
  } catch {
    // Defensive fallback: never leave the game stuck without a legal move.
    return legalMoves[0];
  }
}
