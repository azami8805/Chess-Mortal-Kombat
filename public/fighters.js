// fighters.js — the Mortal Kombat flavor layer. Pure data, no game logic:
// maps each piece type to its fighter identity, its combat move (shown when
// it captures something), and its Fatality (shown when it delivers
// checkmate). Never affects legality — rules.js knows nothing of this file.
export const FIGHTERS = {
  k: { name: 'KING', title: 'THE SOVEREIGN', move: 'ROYAL GUARD SLAM', fatality: 'CROWN OF RUIN' },
  q: { name: 'QUEEN', title: 'THE EXECUTIONER', move: 'CROSS-BOARD IMPALE', fatality: 'REGICIDE FLOURISH' },
  r: { name: 'ROOK', title: 'THE JUGGERNAUT', move: 'WALL CRUSH', fatality: 'FORTRESS COLLAPSE' },
  b: { name: 'BISHOP', title: 'THE EXORCIST', move: 'DIAGONAL REND', fatality: 'RITUAL BANISHMENT' },
  n: { name: 'KNIGHT', title: 'THE CAVALRY', move: 'FLANK TRAMPLE', fatality: 'SKEWERING CHARGE' },
  p: { name: 'PAWN', title: 'THE RECRUIT', move: 'SHIELDBREAKER JAB', fatality: 'LAST STAND DETONATION' },
};

export function fighterFor(piece) {
  return FIGHTERS[piece.toLowerCase()];
}
