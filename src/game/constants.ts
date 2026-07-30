import { GameConfig } from './types';

export const CANVAS_WIDTH  = 900;
export const CANVAS_HEIGHT = 660;

export const CFG: GameConfig = {
  canvasWidth:    CANVAS_WIDTH,
  canvasHeight:   CANVAS_HEIGHT,
  paddleY:        CANVAS_HEIGHT - 38,
  ballSpeed:      4.6,            // slower base → gentler start
  ballRadius:     8,
  paddleWidthBase: 120,           // wider paddle at start
  paddleHeight:   14,
  brickWidth:     72,
  brickHeight:    22,
  brickCols:      11,
  brickPadX:      5,
  brickPadY:      5,
  brickOffsetTop: 72,
  powerUpSize:    28,
  powerUpSpeed:   2.3,
  powerUpDuration: 560,
  laserSpeed:    -14,
  initialLives:   3,
  maxLevel:       24,
};

export const ROW_COLORS = [
  '#f43f5e','#fb923c','#facc15','#a3e635',
  '#22d3ee','#818cf8','#c084fc','#f472b6','#34d399','#60a5fa',
];
export const ROW_PTS = [95,85,75,65,55,45,35,25,18,12];

export const PU_CFG: Record<string, { color:string; icon:string; label:string; kind:'good'|'bad' }> = {
  expand:    { color:'#22c55e', icon:'↔',  label:'Élargir',      kind:'good' },
  shrink:    { color:'#ef4444', icon:'↕',  label:'Rétrécir',     kind:'bad'  },
  multiball: { color:'#a78bfa', icon:'●●', label:'Multi-Balle',  kind:'good' },
  slow:      { color:'#38bdf8', icon:'❄',  label:'Ralenti',      kind:'good' },
  fast:      { color:'#f97316', icon:'⚡', label:'Rapide',       kind:'bad'  },
  extralife: { color:'#ec4899', icon:'♥',  label:'+1 Vie',       kind:'good' },
  fireball:  { color:'#fbbf24', icon:'✦',  label:'Boule Feu',    kind:'good' },
  magnet:    { color:'#14b8a6', icon:'◉',  label:'Aimant',       kind:'good' },
  shield:    { color:'#60a5fa', icon:'▬',  label:'Bouclier',     kind:'good' },
  laser:     { color:'#f472b6', icon:'|',  label:'Laser',        kind:'good' },
  bomb:      { color:'#ff5722', icon:'✸',  label:'Bombe',        kind:'good' },
};

export type Pattern =
  'full' | 'checker' | 'diamond' | 'pyramid' | 'invpyramid' |
  'cross' | 'zigzag' | 'hourglass' | 'fortress' | 'rings' |
  'snake' | 'waves' | 'tunnel' | 'arch' | 'scatter' |
  'heart' | 'arrowup' | 'grid3' | 'diagonal' | 'diamondinv' |
  'columns' | 'staircase' | 'star' | 'hexagon';

export interface LevelDef {
  rows:    number;
  cols:    number;
  speed:   number;
  pattern: Pattern;
  multiHitRows?: number[];
  armoredRows?:  number[];
  puChance: number;
  introText: string;
}

// ── 24 niveaux – début TRÈS facile puis montée progressive ──
export const LEVELS: LevelDef[] = [
  // --- FACILE (1-6) : peu de briques, 1 coup, pas de multi-hit ---
  { rows:3, cols:8,  speed:0.85, pattern:'full',      introText:'Premiers Pas',    puChance:.28 },
  { rows:3, cols:9,  speed:0.88, pattern:'checker',   introText:'Damier Simple',   puChance:.28 },
  { rows:4, cols:9,  speed:0.90, pattern:'pyramid',   introText:'Pyramide',        puChance:.26 },
  { rows:4, cols:10, speed:0.93, pattern:'diamond',   introText:'Diamant',         puChance:.26 },
  { rows:4, cols:10, speed:0.95, pattern:'columns',   introText:'Colonnes',        puChance:.25 },
  { rows:4, cols:10, speed:0.97, pattern:'zigzag',    introText:'Zigzag',          puChance:.25 },

  // --- MOYEN (7-12) : plus de briques, multi-hit apparaît ---
  { rows:5, cols:11, speed:1.00, pattern:'full',      introText:'Mur Complet',     puChance:.24, multiHitRows:[0] },
  { rows:5, cols:11, speed:1.02, pattern:'diagonal',  introText:'Diagonales',      puChance:.24, multiHitRows:[0] },
  { rows:5, cols:11, speed:1.04, pattern:'rings',     introText:'Anneaux',         puChance:.23, multiHitRows:[0] },
  { rows:6, cols:11, speed:1.06, pattern:'fortress',  introText:'Forteresse',      puChance:.23, multiHitRows:[0,1] },
  { rows:6, cols:11, speed:1.08, pattern:'cross',     introText:'Croix',           puChance:.22, multiHitRows:[0,1] },
  { rows:6, cols:11, speed:1.10, pattern:'hourglass', introText:'Sablier',         puChance:.22, multiHitRows:[0,1] },

  // --- DIFFICILE (13-18) : blindage apparaît, plus dense ---
  { rows:7, cols:11, speed:1.14, pattern:'snake',     introText:'Serpent',         puChance:.24, multiHitRows:[0,1,2], armoredRows:[0] },
  { rows:7, cols:11, speed:1.18, pattern:'invpyramid',introText:'Pyramide Inv.',   puChance:.24, multiHitRows:[0,1,2], armoredRows:[0] },
  { rows:7, cols:11, speed:1.22, pattern:'waves',     introText:'Vagues',          puChance:.25, multiHitRows:[0,1,2], armoredRows:[0] },
  { rows:8, cols:11, speed:1.26, pattern:'tunnel',    introText:'Tunnel',          puChance:.25, multiHitRows:[0,1,2,3], armoredRows:[0,1] },
  { rows:8, cols:11, speed:1.30, pattern:'arch',      introText:'Arche',           puChance:.26, multiHitRows:[0,1,2,3], armoredRows:[0,1] },
  { rows:8, cols:11, speed:1.34, pattern:'staircase', introText:'Escalier',        puChance:.26, multiHitRows:[0,1,2,3], armoredRows:[0,1] },

  // --- EXPERT (19-24) : haute densité, multi-blindé, vite ---
  { rows:8, cols:11, speed:1.38, pattern:'hexagon',   introText:'Hexagone',        puChance:.27, multiHitRows:[0,1,2,3,4], armoredRows:[0,1,2] },
  { rows:9, cols:11, speed:1.42, pattern:'heart',     introText:'Cœur de Fer',     puChance:.27, multiHitRows:[0,1,2,3,4], armoredRows:[0,1,2] },
  { rows:9, cols:11, speed:1.46, pattern:'arrowup',   introText:'Flèche',          puChance:.28, multiHitRows:[0,1,2,3,4,5], armoredRows:[0,1,2,3] },
  { rows:9, cols:11, speed:1.50, pattern:'grid3',     introText:'Grille',          puChance:.28, multiHitRows:[0,1,2,3,4,5], armoredRows:[0,1,2,3] },
  { rows:9, cols:11, speed:1.56, pattern:'scatter',   introText:'Chaos',           puChance:.30, multiHitRows:[0,1,2,3,4,5], armoredRows:[0,1,2,3] },
  { rows:10,cols:11, speed:1.64, pattern:'full',      introText:'Boss Final',      puChance:.32, multiHitRows:[0,1,2,3,4,5,6], armoredRows:[0,1,2,3,4] },
];
