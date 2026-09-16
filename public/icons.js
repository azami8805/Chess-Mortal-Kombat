// icons.js — Mortal-Kombat-style fighter emblems for each piece, replacing
// plain chess glyphs. Pure SVG markup, no images/fonts/libraries. Every icon
// shares a 0 0 24 24 viewBox so they drop into a square cleanly. The body
// uses `currentColor` (so CSS still controls white/black piece coloring);
// small "cutout" details (eyes, visor slits) use a fixed dark fill so they
// read on both bone-white and blood-red pieces.

const CUTOUT = 'var(--void)';

const ICONS = {
  // KING — "The Sovereign": a crowned skull.
  k: `
    <polygon points="4,8 4,3 7.5,6.5 12,2 16.5,6.5 20,3 20,8" fill="currentColor"/>
    <rect x="5" y="7.5" width="14" height="10" rx="5" fill="currentColor"/>
    <circle cx="9.2" cy="12.5" r="1.5" fill="${CUTOUT}"/>
    <circle cx="14.8" cy="12.5" r="1.5" fill="${CUTOUT}"/>
    <polygon points="12,14 11,16 13,16" fill="${CUTOUT}"/>
    <rect x="7" y="17" width="10" height="1.6" fill="${CUTOUT}"/>
  `,
  // QUEEN — "The Executioner": a bladed crown over a veiled face.
  q: `
    <polygon points="12,1 13.6,6 17,3.5 15.8,8 20,7 16.6,10.5 20,13 15.6,12.2 17.5,17 12,13.6 6.5,17 8.4,12.2 4,13 7.4,10.5 4,7 8.2,8 7,3.5 10.4,6" fill="currentColor"/>
    <polygon points="7,17 12,22 17,17" fill="currentColor"/>
    <polygon points="12,17.5 11,19.5 13,19.5" fill="${CUTOUT}"/>
  `,
  // ROOK — "The Juggernaut": an armored gauntlet-fist tower.
  r: `
    <rect x="5" y="3" width="3" height="3" fill="currentColor"/>
    <rect x="10.5" y="3" width="3" height="3" fill="currentColor"/>
    <rect x="16" y="3" width="3" height="3" fill="currentColor"/>
    <rect x="5" y="5.5" width="14" height="3.5" fill="currentColor"/>
    <rect x="6.5" y="9" width="11" height="9" fill="currentColor"/>
    <rect x="5" y="18" width="14" height="3" fill="currentColor"/>
    <rect x="8.5" y="11.5" width="1.6" height="4" fill="${CUTOUT}"/>
    <rect x="11.2" y="11.5" width="1.6" height="4" fill="${CUTOUT}"/>
    <rect x="13.9" y="11.5" width="1.6" height="4" fill="${CUTOUT}"/>
  `,
  // BISHOP — "The Exorcist": a hooded visor.
  b: `
    <polygon points="12,2 14,5.5 12,5 10,5.5" fill="currentColor"/>
    <path d="M12 4 C 6 6, 5 12, 7 20 L 17 20 C 19 12, 18 6, 12 4 Z" fill="currentColor"/>
    <rect x="7.5" y="11" width="9" height="1.8" fill="${CUTOUT}"/>
    <polygon points="12,15 10.7,18 13.3,18" fill="${CUTOUT}"/>
  `,
  // KNIGHT — "The Cavalry": an armored warhorse head, profile facing right.
  n: `
    <path d="M8 9 C 6 10.5, 5 14, 6 20 L 13 20 C 13 15.5, 12 13, 13 10 C 13.5 8.5, 13 7, 12 6 Z" fill="currentColor"/>
    <ellipse cx="14.5" cy="10" rx="5" ry="4.3" fill="currentColor"/>
    <polygon points="18.5,7.5 23,10.5 18.5,13.5" fill="currentColor"/>
    <polygon points="11,3 14,7 9,6.5" fill="currentColor"/>
    <polygon points="13,6.5 15,3.5 15.5,7" fill="currentColor"/>
    <circle cx="16" cy="9" r="1.1" fill="${CUTOUT}"/>
  `,
  // PAWN — "The Recruit": a masked soldier helmet.
  p: `
    <path d="M12 3 C 7 3, 5.5 7, 6 11 C 6 13.5, 7 15, 7 17 L 17 17 C 17 15, 18 13.5, 18 11 C 18.5 7, 17 3, 12 3 Z" fill="currentColor"/>
    <rect x="10.8" y="8" width="2.4" height="6.5" fill="${CUTOUT}"/>
    <rect x="7.5" y="10" width="9" height="2" fill="${CUTOUT}"/>
    <rect x="6" y="18" width="12" height="2.5" rx="1" fill="currentColor"/>
  `,
};

export function pieceIconSVG(piece) {
  const type = piece.toLowerCase();
  const inner = ICONS[type] || '';
  return `<svg viewBox="0 0 24 24" class="piece-icon" aria-hidden="true">${inner}</svg>`;
}
