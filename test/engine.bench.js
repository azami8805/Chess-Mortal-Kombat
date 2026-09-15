// Speed proof for engine.js: the computer opponent must return a legal
// move within 2 seconds. Checked against the opening position, a wide-open
// position engineered to maximize branching factor (worst case for search
// speed), and an endgame. Run with: node test/engine.bench.js
import { createInitialState, algebraicToSquare } from '../public/rules.js';
import { chooseMove } from '../public/engine.js';

const LIMIT_MS = 2000;

function emptyState(turn) {
  return { board: new Array(128).fill(null), turn, castling: { K: false, Q: false, k: false, q: false }, enPassant: null };
}

function place(state, piece, square) {
  state.board[algebraicToSquare(square)] = piece;
  return state;
}

// A wide-open, pawn-less position — maximum mobility for every piece on
// both sides, the worst case for how many moves the engine has to search.
function wideOpenPosition() {
  const state = emptyState('w');
  place(state, 'K', 'e1'); place(state, 'Q', 'd4'); place(state, 'R', 'a1'); place(state, 'R', 'h1');
  place(state, 'B', 'c1'); place(state, 'B', 'f1'); place(state, 'N', 'b1'); place(state, 'N', 'g1');
  place(state, 'k', 'e8'); place(state, 'q', 'd5'); place(state, 'r', 'a8'); place(state, 'r', 'h8');
  place(state, 'b', 'c8'); place(state, 'b', 'f8'); place(state, 'n', 'b8'); place(state, 'n', 'g8');
  return state;
}

function kingAndPawnEndgame() {
  const state = emptyState('w');
  place(state, 'K', 'e4'); place(state, 'P', 'e5');
  place(state, 'k', 'e8');
  return state;
}

const positions = [
  ['Opening position', createInitialState()],
  ['Wide-open position (worst-case branching)', wideOpenPosition()],
  ['King + pawn endgame', kingAndPawnEndgame()],
];

let allOk = true;
for (const [label, state] of positions) {
  const start = Date.now();
  const move = chooseMove(state, 2);
  const ms = Date.now() - start;
  const ok = move !== null && ms < LIMIT_MS;
  allOk = allOk && ok;
  console.log(`${label}: ${ms}ms, move=${move ? `${move.from}->${move.to}` : 'null'} — ${ok ? 'PASS' : 'FAIL'}`);
}

if (!allOk) {
  console.error('\nengine.js FAILED the 2-second response requirement.');
  process.exit(1);
}
console.log('\nAll positions answered well within the 2-second budget.');
