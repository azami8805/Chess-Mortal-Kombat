// Correctness proof for rules.js: counts every legal move sequence from the
// standard starting position out to a fixed depth. The correct counts are
// public, well-known values every chess-programming rules engine is checked
// against. Run with: node test/rules.perft.test.js
import { createInitialState, perft } from '../public/rules.js';

const EXPECTED = { 1: 20, 2: 400, 3: 8902 };

let allPassed = true;
for (const depth of Object.keys(EXPECTED).map(Number)) {
  const state = createInitialState();
  const start = Date.now();
  const actual = perft(state, depth);
  const ms = Date.now() - start;
  const expected = EXPECTED[depth];
  const ok = actual === expected;
  allPassed = allPassed && ok;
  console.log(`perft(${depth}) = ${actual} (expected ${expected}) — ${ok ? 'PASS' : 'FAIL'} [${ms}ms]`);
}

if (!allPassed) {
  console.error('\nrules.js FAILED the perft correctness test.');
  process.exit(1);
}
console.log('\nAll perft counts correct — rules.js move generation is proven correct to depth 3.');
