export interface Ball {
  x: number;
  y: number;
  dx: number;
  dy: number;
  radius: number;
  trail: Array<{ x: number; y: number; age: number }>;
  speed: number;
  ghostFrames?: number; // frames of trail after ball destroyed
}

export interface Paddle {
  x: number;
  y: number;
  width: number;
  height: number;
  speed: number;
  targetX: number;
  tilt: number; // -1..1 for visual rotation based on movement
}

export interface Brick {
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  hits: number;
  maxHits: number;
  points: number;
  destroyed: boolean;
  scale: number;
  shakeX: number;
  isArmored: boolean;
  pulseOffset: number;
  spawnDelay: number;   // 0 = visible immediately; >0 = delayed entrance frame counter
  glow: number;         // accumulated glow from hits / combo
}

export type PowerUpType =
  | 'expand'
  | 'shrink'
  | 'multiball'
  | 'slow'
  | 'fast'
  | 'extralife'
  | 'fireball'
  | 'magnet'
  | 'shield'
  | 'laser'
  | 'bomb'; // explosive chain reaction

export interface PowerUp {
  x: number;
  y: number;
  type: PowerUpType;
  vy: number;
  age: number;
  vx: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  r: number;
  g: number;
  b: number;
  size: number;
  type: 'spark' | 'smoke' | 'shard' | 'glow';
  rotation: number;
  rotationSpeed: number;
}

export interface FloatingText {
  x: number;
  y: number;
  text: string;
  color: string;
  life: number;
  maxLife: number;
  vy: number;
  scale: number;
  big: boolean;
}

export interface LaserShot {
  x: number;
  y: number;
  vy: number;
  power: number;  // 1=normal, 2+ = wider
}

export interface Star {
  x: number;
  y: number;
  size: number;
  speed: number;
  phase: number;
}

export interface Shockwave {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  life: number;
  maxLife: number;
  color: string;
}

export interface ActivePowerUp {
  type: PowerUpType;
  timer: number;
  maxTimer: number;
}

export interface Flash {
  r: number;
  g: number;
  b: number;
  alpha: number;
}

export interface GameState {
  status: 'idle' | 'playing' | 'paused' | 'levelcomplete' | 'gameover' | 'win' | 'transition' | 'starting';
  level: number;
  score: number;
  highScore: number;
  lives: number;
  combo: number;
  bestCombo: number;

  paddle: Paddle;
  balls: Ball[];
  bricks: Brick[];
  powerUps: PowerUp[];
  lasers: LaserShot[];
  particles: Particle[];
  floatingTexts: FloatingText[];
  activePowerUps: ActivePowerUp[];
  stars: Star[];
  shockwaves: Shockwave[];
  flashes: Flash[];

  screenShake: number;
  paddleHitFlash: number;
  shieldHP: number;

  bricksTotal: number;
  bricksLeft: number;
  shotsLeft: number;
  bombCooldown: number;

  transitionTimer: number;
  transitionText: string;

  frame: number;
}

export interface GameConfig {
  canvasWidth: number;
  canvasHeight: number;
  paddleY: number;
  ballSpeed: number;
  ballRadius: number;
  paddleWidthBase: number;
  paddleHeight: number;
  brickWidth: number;
  brickHeight: number;
  brickCols: number;
  brickPadX: number;
  brickPadY: number;
  brickOffsetTop: number;
  powerUpSize: number;
  powerUpSpeed: number;
  powerUpDuration: number;
  laserSpeed: number;
  initialLives: number;
  maxLevel: number;
}
