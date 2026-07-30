import { GameState, Ball, Brick, Particle, PowerUp, PowerUpType, FloatingText, Star, LaserShot, Shockwave, Flash, Paddle } from './types';
import { CFG, LEVELS, ROW_COLORS, ROW_PTS, PU_CFG } from './constants';
import { playSound } from './audio';

// ─── helpers ──────────────────────────────────
function hex2rgb(h: string): [number, number, number] {
  const n = parseInt(h.replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function mkStars(n: number): Star[] {
  return Array.from({ length: n }, () => ({
    x: Math.random() * CFG.canvasWidth,
    y: Math.random() * CFG.canvasHeight,
    size: 0.4 + Math.random() * 1.7,
    speed: 0.08 + Math.random() * 0.32,
    phase: Math.random() * Math.PI * 2,
  }));
}

function mkBall(paddle: Paddle, speed?: number): Ball {
  const s = speed ?? CFG.ballSpeed;
  const angle = -Math.PI / 2 + (Math.random() - 0.5) * (Math.PI / 3.2);
  return {
    x: paddle.x + paddle.width / 2,
    y: paddle.y - CFG.ballRadius - 2,
    dx: s * Math.cos(angle),
    dy: s * Math.sin(angle),
    radius: CFG.ballRadius,
    speed: s,
    trail: [],
  };
}

function mkPaddle(): Paddle {
  const w = CFG.paddleWidthBase;
  return {
    x: CFG.canvasWidth / 2 - w / 2,
    y: CFG.paddleY,
    width: w, height: CFG.paddleHeight,
    speed: 12, targetX: CFG.canvasWidth / 2 - w / 2, tilt: 0,
  };
}

// ─── particle / text / power-up constructors ──
function mkParticles(x: number, y: number, color: string, n: number, opts: Partial<Particle> = {}): Particle[] {
  const [r, g, b] = hex2rgb(color);
  return Array.from({ length: n }, () => {
    const angle = Math.random() * Math.PI * 2;
    const spd   = 1.5 + Math.random() * (opts.type === 'shard' ? 7 : 4.5);
    const life  = (opts.type === 'smoke' ? 55 : opts.type === 'glow' ? 38 : 28) + Math.random() * 18;
    return {
      x, y, vx: Math.cos(angle) * spd, vy: Math.sin(angle) * spd,
      life, maxLife: life, r, g, b,
      size: (opts.type === 'shard' ? 2.5 : 1.8) + Math.random() * 2.2,
      type: opts.type ?? 'spark',
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 0.4,
      ...opts,
    };
  });
}

function mkFloat(x: number, y: number, text: string, color: string, big = false): FloatingText {
  return { x, y, text, color, life: 55, maxLife: 55, vy: -1.3, scale: 0, big };
}

function mkShockwave(x: number, y: number, maxR = 120, color = '#ffffff'): Shockwave {
  return { x, y, radius: 5, maxRadius: maxR, life: 30, maxLife: 30, color };
}

function mkFlash(r: number, g: number, b: number, alpha = 0.6): Flash {
  return { r, g, b, alpha };
}

// ─── brick generation ────────────────────────
function buildBricks(level: number): Brick[] {
  const def  = LEVELS[Math.min(level - 1, LEVELS.length - 1)];
  const { rows, cols, pattern, multiHitRows = [], armoredRows = [] } = def;
  const totalW = cols * (CFG.brickWidth + CFG.brickPadX) - CFG.brickPadX;
  const ox     = (CFG.canvasWidth - totalW) / 2;
  const out: Brick[] = [];

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (!cellVisible(pattern, r, c, rows, cols)) continue;
      const isA = armoredRows.includes(r);
      const isM = multiHitRows.includes(r);
      const maxH = isA ? (level > 16 ? 4 : level > 10 ? 3 : 2) : isM ? (level > 8 ? 3 : 2) : 1;
      const base = ROW_PTS[Math.min(r, ROW_PTS.length - 1)];
      const pts  = base * (isA ? 4 : isM ? 2 : 1);

      out.push({
        x: ox + c * (CFG.brickWidth + CFG.brickPadX),
        y: CFG.brickOffsetTop + r * (CFG.brickHeight + CFG.brickPadY),
        width: CFG.brickWidth, height: CFG.brickHeight,
        color: ROW_COLORS[r % ROW_COLORS.length],
        hits: 0, maxHits: maxH, points: pts, destroyed: false,
        scale: 1, shakeX: 0, isArmored: isA, pulseOffset: Math.random() * Math.PI * 2,
        spawnDelay: 0, glow: 0,
      });
    }
  }
  return out;
}

function cellVisible(pat: string, r: number, c: number, rows: number, cols: number): boolean {
  const midC = Math.floor(cols / 2), midR = Math.floor(rows / 2);
  switch (pat) {
    case 'full':       return true;
    case 'checker':    return (r + c) % 2 === 0;
    case 'diagonal':   return r <= c;
    case 'diamond': {
      const dc = Math.abs(c - midC) / (cols / 2);
      const dr = Math.abs(r - midR) / (rows / 2);
      return dc + dr <= 1;
    }
    case 'diamondinv': {
      const dc = Math.abs(c - midC) / (cols / 2);
      const dr = Math.abs(r - midR) / (rows / 2);
      return dc + dr <= 1 || r === 0 || r === rows - 1;
    }
    case 'pyramid':    return c >= r && c < cols - r;
    case 'invpyramid': return c <= r && c >= cols - 1 - r;
    case 'cross':      return Math.abs(c - midC) <= 1 || Math.abs(r - midR) <= 1;
    case 'zigzag':     return r % 2 === 0 ? c < cols - 1 : c > 0;
    case 'columns':    return c % 3 !== 0;
    case 'hourglass': {
      const t = r / Math.max(1, rows - 1);
      return Math.abs(c - midC) <= (0.5 + Math.abs(t - 0.5)) * (cols / 2);
    }
    case 'fortress':   return r === 0 || r === rows - 1 || c === 0 || c === cols - 1 || (r === midR && c > 1 && c < cols - 2);
    case 'rings':      return Math.min(r, c, rows - 1 - r, cols - 1 - c) % 2 === 0;
    case 'snake':      return r % 2 === 0 ? c <= cols - 2 : c >= 1;
    case 'waves':      return Math.abs(r - (midR + Math.round(Math.sin(c * 0.65) * 2))) <= 2;
    case 'tunnel':     return c < 3 || c > cols - 4 || r < 2 || r > rows - 3;
    case 'arch':       return r >= Math.round(Math.abs(c - midC) * 0.7);
    case 'staircase':  return c <= (cols - 1) * (1 - r / rows) + 1;
    case 'hexagon': {
      const dc = Math.abs(c - midC) / (cols / 2);
      const dr = Math.abs(r - midR) / (rows / 2);
      return dc + dr * 0.85 <= 1.05;
    }
    case 'heart': {
      const hx = (c - midC) / (cols / 2);
      const hy = (r - rows * 0.35) / (rows * 0.7);
      return hx * hx + (hy - Math.sqrt(Math.abs(hx))) ** 2 < 0.6;
    }
    case 'arrowup':    return r >= Math.abs(c - midC) && r < rows - 1;
    case 'grid3':      return r % 3 !== 2 && c % 3 !== 2;
    case 'star': {
      const dc = Math.abs(c - midC);
      return r <= dc + 1 || r >= rows - 1 - dc - 1 || (c >= midC - 2 && c <= midC + 2);
    }
    case 'scatter':    return Math.random() > 0.16;
    default:           return true;
  }
}

// ─── power-up spawn ──────────────────────────
function maybePowerUp(br: Brick, chance: number): PowerUp | null {
  if (Math.random() > chance) return null;
  const types: PowerUpType[] = ['expand','multiball','slow','extralife','fireball','magnet','shield','laser','bomb','shrink','fast'];
  const w = [.14, .12, .11, .09, .11, .08, .08, .09, .07, .06, .05];
  let rand = Math.random(), t: PowerUpType = 'expand';
  for (let i = 0; i < types.length; i++) { rand -= w[i]; if (rand <= 0) { t = types[i]; break; } }
  return {
    x: br.x + br.width / 2 - CFG.powerUpSize / 2,
    y: br.y, type: t, vy: CFG.powerUpSpeed, age: 0,
    vx: (Math.random() - 0.5) * 0.6,
  };
}

// ─── public: create / launch / advance ────────
export function initialState(): GameState {
  const hs = +(localStorage.getItem('cvp_hs') || '0');
  return {
    status: 'idle', level: 1, score: 0, highScore: hs, lives: CFG.initialLives,
    combo: 0, bestCombo: 0,
    paddle: mkPaddle(), balls: [], bricks: [], powerUps: [], lasers: [],
    particles: [], floatingTexts: [], activePowerUps: [], stars: mkStars(120),
    shockwaves: [], flashes: [],
    screenShake: 0, paddleHitFlash: 0, shieldHP: 0,
    bricksTotal: 0, bricksLeft: 0, shotsLeft: 0, bombCooldown: 0,
    transitionTimer: 0, transitionText: '',
    frame: 0,
  };
}

export function launchLevel(s: GameState): GameState {
  const paddle = mkPaddle();
  const bricks = buildBricks(s.level);
  const intro  = LEVELS[Math.min(s.level - 1, LEVELS.length - 1)].introText.toUpperCase();
  return {
    ...s, status: 'starting',
    paddle, balls: [mkBall(paddle)], bricks,
    powerUps: [], lasers: [], particles: [], floatingTexts: [],
    activePowerUps: [], shockwaves: [], flashes: [],
    screenShake: 0, paddleHitFlash: 0, shieldHP: 0,
    bricksTotal: bricks.length, bricksLeft: bricks.length,
    shotsLeft: 0, bombCooldown: 0,
    transitionTimer: 90,
    transitionText: `NIVEAU ${s.level} : ${intro}`,
  };
}

export function advanceLevel(s: GameState): GameState {
  return launchLevel({ ...s, level: s.level + 1 });
}

// ─── main tick ────────────────────────────────
export function tick(s: GameState, mouseX: number | null, keys: Set<string>): GameState {
  // starting → auto-advance
  if (s.status === 'starting') {
    const t = s.transitionTimer - 1;
    if (t <= 0) return { ...s, status: 'playing', transitionTimer: 0 };
    return { ...s, transitionTimer: t, frame: s.frame + 1 };
  }

  if (s.status !== 'playing') return { ...s, frame: s.frame + 1 };

  const ns: GameState = {
    ...s,
    frame: s.frame + 1,
    screenShake: s.screenShake > 0.3 ? s.screenShake * 0.86 : 0,
    paddleHitFlash: Math.max(0, s.paddleHitFlash - 0.065),
    bombCooldown: Math.max(0, s.bombCooldown - 1),
  };

  // ── stars ──
  ns.stars = s.stars.map(st => ({
    ...st, y: st.y + st.speed, phase: st.phase + 0.014,
    ...(st.y > CFG.canvasHeight ? { y: -2, x: Math.random() * CFG.canvasWidth } : {}),
  }));

  // ── paddle ──
  ns.paddle = movePaddle(s.paddle, mouseX, keys);

  // ── active power-ups timers ──
  ns.activePowerUps = s.activePowerUps.map(p => ({ ...p, timer: p.timer - 1 })).filter(p => p.timer > 0);
  syncPaddle(ns);

  // ── laser fire (X) ──
  const newLasers: LaserShot[] = [...s.lasers];
  if ((keys.has('x') || keys.has('X')) && ns.shotsLeft > 0 && s.frame % 10 === 0) {
    newLasers.push(
      { x: ns.paddle.x + 12,                      y: ns.paddle.y - 8, vy: CFG.laserSpeed, power: 1 },
      { x: ns.paddle.x + ns.paddle.width - 14,     y: ns.paddle.y - 8, vy: CFG.laserSpeed, power: 1 },
    );
    ns.shotsLeft = Math.max(0, ns.shotsLeft - 1);
    playSound('laser');
  }

  // ── move lasers ──
  const movedLasers = newLasers.map(l => ({ ...l, y: l.y + l.vy })).filter(l => l.y > 0);

  // ── balls physics ──
  const def = LEVELS[Math.min(s.level - 1, LEVELS.length - 1)];
  let speedMult = def.speed;
  if (hasActive(ns, 'slow')) speedMult *= 0.60;
  if (hasActive(ns, 'fast')) speedMult *= 1.55;

  const newParticles: Particle[] = [];
  const newFloats:    FloatingText[] = [];
  const newShocks:    Shockwave[] = [];
  const newFlashes:   Flash[] = [];
  let   scoreGain = 0;
  let   newScore  = s.score;

  const bricks = s.bricks.map(b => ({ ...b }));

  // ── lasers hit bricks ──
  const afterLaser: LaserShot[] = [];
  for (const laser of movedLasers) {
    let hit = false;
    for (const br of bricks) {
      if (br.destroyed) continue;
      if (laser.x >= br.x && laser.x <= br.x + br.width &&
          laser.y >= br.y && laser.y <= br.y + br.height) {
        br.hits++;
        br.shakeX = 8;
        newParticles.push(...mkParticles(br.x + br.width / 2, br.y + br.height / 2, '#f472b6', 7, { type: 'spark' }));
        if (br.hits >= br.maxHits) {
          br.destroyed = true;
          scoreGain += br.points;
          newFloats.push(mkFloat(br.x + br.width / 2, br.y, `+${br.points}`, br.color));
          newParticles.push(...mkParticles(br.x + br.width / 2, br.y + br.height / 2, br.color, 12, { type: 'shard' }));
          newParticles.push(...mkParticles(br.x + br.width / 2, br.y + br.height / 2, br.color, 8, { type: 'smoke' }));
          const pu = maybePowerUp(br, def.puChance);
          if (pu) ns.powerUps.push(pu);
        }
        hit = true;
        break;
      }
    }
    if (!hit) afterLaser.push(laser);
  }
  ns.lasers = afterLaser;

  // ── ball updates ──
  const aliveBalls: Ball[] = [];
  for (const ball of s.balls) {
    const nb = moveBall(ball, ns, speedMult, bricks, newParticles, newFloats, newShocks, newFlashes, newScore);
    newScore = nb.newScore;
    scoreGain += nb.scoreGain;
    // trail
    nb.ball.trail = [{ x: nb.ball.x, y: nb.ball.y, age: 0 }, ...nb.ball.trail.slice(0, 10).map(p => ({ ...p, age: p.age + 1 }))];

    // out of screen?
    if (nb.ball.y - nb.ball.radius < CFG.canvasHeight) {
      aliveBalls.push(nb.ball);
    } else {
      if (ns.shieldHP > 0) {
        ns.shieldHP--;
        nb.ball.y = CFG.canvasHeight - 40;
        nb.ball.dy = -Math.abs(nb.ball.dy);
        nb.ball.trail = [];
        aliveBalls.push(nb.ball);
        newFloats.push(mkFloat(CFG.canvasWidth / 2, CFG.paddleY - 20, 'BOUCLIER !', '#60a5fa'));
        playSound('wall');
      }
    }
  }

  // ── balls lost → life loss ──
  if (aliveBalls.length === 0) {
    ns.lives--;
    ns.combo = 0;
    ns.screenShake = 14;
    ns.activePowerUps = [];
    ns.shotsLeft = 0;
    syncPaddle(ns);
    newFlashes.push(mkFlash(255, 80, 80, 0.6));
    if (ns.lives <= 0) {
      ns.status = 'gameover';
      if (newScore > ns.highScore) { ns.highScore = newScore; localStorage.setItem('cvp_hs', String(newScore)); }
      playSound('gameOver');
    } else {
      ns.paddle = mkPaddle();
      aliveBalls.push(mkBall(ns.paddle));
    }
  }
  ns.balls = aliveBalls;

  // ── bricks animation ──
  ns.bricks = bricks.map(br => ({
    ...br,
    scale:   br.destroyed ? Math.max(0, br.scale - 0.11) : 1,
    shakeX:  br.shakeX > 0 ? br.shakeX * 0.6 : 0,
    glow:    Math.max(0, br.glow - 0.05),
  })).filter(br => !br.destroyed || br.scale > 0);

  ns.score = newScore;
  if (ns.score > ns.highScore) { ns.highScore = ns.score; localStorage.setItem('cvp_hs', String(ns.score)); }
  ns.bricksLeft = ns.bricks.filter(b => !b.destroyed).length;

  // ── power-ups falling ──
  const S = CFG.powerUpSize;
  ns.powerUps = ns.powerUps.map(p => ({ ...p, x: p.x + p.vx, y: p.y + p.vy, age: p.age + 1 })).filter(p => {
    if (p.y > CFG.canvasHeight + 10) return false;
    const px = ns.paddle.x, py = ns.paddle.y, pw = ns.paddle.width;
    if (p.y + S >= py && p.y <= py + ns.paddle.height && p.x + S >= px && p.x <= px + pw) {
      applyPowerUp(ns, p.type, newFloats, newParticles, newShocks, newFlashes);
      return false;
    }
    return true;
  });

  // ── particles ──
  ns.particles = [...s.particles, ...newParticles]
    .map(p => ({
      ...p,
      x: p.x + p.vx, y: p.y + p.vy, vy: p.vy + (p.type === 'smoke' ? 0.02 : 0.07),
      vx: p.vx * (p.type === 'smoke' ? 0.97 : 0.98),
      rotation: p.rotation + p.rotationSpeed,
      life: p.life - 1,
    }))
    .filter(p => p.life > 0).slice(0, 700);

  // ── floating texts ──
  ns.floatingTexts = [...s.floatingTexts, ...newFloats]
    .map(f => ({ ...f, y: f.y + f.vy, life: f.life - 1, scale: f.scale < 1 ? Math.min(1, f.scale + 0.18) : 1 }))
    .filter(f => f.life > 0).slice(0, 50);

  // ── shockwaves ──
  ns.shockwaves = [...s.shockwaves, ...newShocks].map(sw => ({
    ...sw,
    radius: sw.radius + (sw.maxRadius - sw.radius) * 0.12,
    life: sw.life - 1,
  })).filter(sw => sw.life > 0 && sw.radius < sw.maxRadius);

  // ── flashes ──
  ns.flashes = [...s.flashes, ...newFlashes].map(f => ({ ...f, alpha: f.alpha * 0.88 })).filter(f => f.alpha > 0.02);

  // ── level complete? ──
  if (ns.bricks.filter(b => !b.destroyed).length === 0 && ns.status === 'playing') {
    if (ns.level >= CFG.maxLevel) {
      ns.status = 'win';
      playSound('levelComplete');
    } else {
      ns.status = 'levelcomplete';
      ns.floatingTexts.push(mkFloat(CFG.canvasWidth / 2, CFG.canvasHeight / 2, 'NIVEAU TERMINÉ !', '#22d3ee', true));
      playSound('levelComplete');
    }
  }

  return ns;
}

// ─── ball + brick collision ───────────────────
function moveBall(
  ball: Ball, ns: GameState, speedMult: number, bricks: Brick[],
  newParticles: Particle[], newFloats: FloatingText[], newShocks: Shockwave[], newFlashes: Flash[],
  _prevScore: number,
): { ball: Ball; scoreGain: number; newScore: number } {
  let { x, y, dx, dy } = ball;
  const r = ball.radius;
  let scoreGain = 0;

  // magnet attraction
  if (hasActive(ns, 'magnet') && dy > 0) {
    const pcx = ns.paddle.x + ns.paddle.width / 2;
    dx += (pcx - x) * 0.004;
  }

  x += dx * speedMult;
  y += dy * speedMult;

  // walls
  if (x - r < 0)                { x = r;                  dx =  Math.abs(dx); playSound('wall'); }
  if (x + r > CFG.canvasWidth)  { x = CFG.canvasWidth - r; dx = -Math.abs(dx); playSound('wall'); }
  if (y - r < 0)                { y = r;                  dy =  Math.abs(dy); playSound('wall'); }

  // paddle
  const pd = ns.paddle;
  if (dy > 0 && y + r >= pd.y && y + r <= pd.y + pd.height + 5 && x >= pd.x - r && x <= pd.x + pd.width + r) {
    const rel   = (x - (pd.x + pd.width / 2)) / (pd.width / 2);
    const angle = rel * (Math.PI / 2.3);
    const spd   = Math.hypot(dx, dy);
    dx = spd * Math.sin(angle);
    dy = -Math.abs(spd * Math.cos(angle));
    y  = pd.y - r;
    ns.paddleHitFlash = 1;
    playSound('paddle');
  }

  // bricks
  const isFireball = hasActive(ns, 'fireball');
  for (const br of bricks) {
    if (br.destroyed) continue;
    const cx = Math.max(br.x, Math.min(x, br.x + br.width));
    const cy = Math.max(br.y, Math.min(y, br.y + br.height));
    const ddx = x - cx, ddy = y - cy;
    if (ddx * ddx + ddy * ddy < r * r) {
      br.shakeX = 6;
      br.hits++;
      if (br.hits >= br.maxHits || isFireball) {
        br.destroyed = true;
        ns.combo++;
        ns.bestCombo = Math.max(ns.bestCombo, ns.combo);
        const mul    = Math.min(ns.combo, 12);
        const pts    = br.points * mul;
        scoreGain   += pts;
        newFloats.push(mkFloat(br.x + br.width / 2, br.y, `+${pts}`, br.color));
        newParticles.push(...mkParticles(br.x + br.width / 2, br.y + br.height / 2, br.color, br.isArmored ? 22 : 16, { type: 'shard' }));
        newParticles.push(...mkParticles(br.x + br.width / 2, br.y + br.height / 2, br.color, br.isArmored ? 14 : 8, { type: 'smoke' }));
        newParticles.push(...mkParticles(br.x + br.width / 2, br.y + br.height / 2, br.color, 6, { type: 'glow' }));
        ns.screenShake = Math.min(ns.screenShake + (br.isArmored ? 6 : 3), 18);
        const pu = maybePowerUp(br, LEVELS[Math.min(ns.level - 1, LEVELS.length - 1)].puChance);
        if (pu) ns.powerUps.push(pu);
        playSound(br.isArmored ? 'hardBrick' : 'brick');
        if (br.isArmored) { newShocks.push(mkShockwave(br.x + br.width / 2, br.y + br.height / 2, 90, br.color)); newFlashes.push(mkFlash(255, 220, 100, 0.35)); }
      } else {
        newParticles.push(...mkParticles(br.x + br.width / 2, br.y + br.height / 2, br.color, 5, { type: 'spark' }));
        playSound('hardBrick');
      }
      if (!isFireball) {
        // resolve collision: determine axis based on previous position
        const prevX = x - dx * speedMult;
        const hitFromSide = prevX < br.x || prevX > br.x + br.width;
        if (hitFromSide) dx = -dx; else dy = -dy;
      }
      break;
    }
  }

  return { ball: { ...ball, x, y, dx, dy }, scoreGain, newScore: _prevScore + scoreGain };
}

// ─── power-up application ────────────────────
function applyPowerUp(s: GameState, t: PowerUpType, floats: FloatingText[], particles: Particle[], shocks: Shockwave[], flashes: Flash[]): void {
  const add = (type: PowerUpType, dur = CFG.powerUpDuration) => {
    s.activePowerUps = s.activePowerUps.filter(p => p.type !== type);
    s.activePowerUps.push({ type, timer: dur, maxTimer: dur });
  };
  const col = PU_CFG[t].color;
  const [r, g, b] = hex2rgb(col);
  floats.push(mkFloat(CFG.canvasWidth / 2, CFG.paddleY - 46, PU_CFG[t].label.toUpperCase(), col, true));
  particles.push(...mkParticles(CFG.canvasWidth / 2, CFG.paddleY, col, 16, { type: 'glow' }));
  flashes.push(mkFlash(r, g, b, 0.35));

  switch (t) {
    case 'expand':    s.activePowerUps = s.activePowerUps.filter(p => p.type !== 'shrink'); add('expand'); syncPaddle(s); break;
    case 'shrink':    s.activePowerUps = s.activePowerUps.filter(p => p.type !== 'expand'); add('shrink', CFG.powerUpDuration / 2); syncPaddle(s); break;
    case 'slow':      s.activePowerUps = s.activePowerUps.filter(p => p.type !== 'fast');  add('slow');  break;
    case 'fast':      s.activePowerUps = s.activePowerUps.filter(p => p.type !== 'slow');  add('fast', CFG.powerUpDuration / 2); break;
    case 'fireball':  add('fireball', CFG.powerUpDuration / 2); break;
    case 'magnet':    add('magnet'); break;
    case 'shield':    s.shieldHP = Math.min(s.shieldHP + 3, 8); break;
    case 'laser':     add('laser'); s.shotsLeft = Math.min(s.shotsLeft + 14, 30); break;
    case 'extralife': s.lives = Math.min(s.lives + 1, 9); playSound('life'); return;
    case 'multiball': {
      if (s.balls.length < 9) {
        const base = s.balls[0];
        if (base) {
          const spd = Math.hypot(base.dx, base.dy);
          for (let i = 0; i < 2; i++) {
            const ang = (Math.random() - 0.5) * Math.PI * 0.9;
            s.balls.push({ ...base, dx: spd * Math.sin(ang), dy: -Math.abs(spd * Math.cos(ang)), trail: [] });
          }
        }
      }
      break;
    }
    case 'bomb': {
      // explode: destroy nearby bricks in a radius
      if (s.balls.length > 0) {
        const bx = s.balls[0].x, by = s.balls[0].y;
        shocks.push(mkShockwave(bx, by, 200, '#ff5722'));
        flashes.push(mkFlash(255, 100, 20, 0.5));
        s.screenShake = Math.min(s.screenShake + 18, 25);
        const radius = 150;
        for (const br of s.bricks) {
          if (br.destroyed) continue;
          const bcx = br.x + br.width / 2, bcy = br.y + br.height / 2;
          const d = Math.hypot(bcx - bx, bcy - by);
          if (d < radius) {
            br.destroyed = true;
            const pts = Math.round(br.points * (1 - d / radius));
            s.score += pts;
            particles.push(...mkParticles(bcx, bcy, br.color, 14, { type: 'shard' }));
            particles.push(...mkParticles(bcx, bcy, br.color, 8, { type: 'smoke' }));
          }
        }
      }
      break;
    }
  }
  playSound(t === 'bomb' ? 'laser' : 'powerup');
}

// ─── utilities ────────────────────────────────
function hasActive(s: GameState, t: PowerUpType) { return s.activePowerUps.some(p => p.type === t); }

function syncPaddle(s: GameState) {
  let w = CFG.paddleWidthBase;
  if (hasActive(s, 'expand')) w = Math.min(w * 1.65, CFG.canvasWidth / 3);
  if (hasActive(s, 'shrink')) w = w * 0.58;
  s.paddle.width = w;
  s.paddle.x = Math.max(0, Math.min(s.paddle.x, CFG.canvasWidth - w));
}

function movePaddle(p: Paddle, mx: number | null, keys: Set<string>): Paddle {
  let tx = p.targetX;
  if (mx !== null) tx = mx - p.width / 2;
  else {
    if (keys.has('ArrowLeft')  || keys.has('a') || keys.has('A')) tx -= 13;
    if (keys.has('ArrowRight') || keys.has('d') || keys.has('D')) tx += 13;
  }
  tx = Math.max(0, Math.min(CFG.canvasWidth - p.width, tx));
  const nx = p.x + (tx - p.x) * 0.30;
  const clamped = Math.max(0, Math.min(CFG.canvasWidth - p.width, nx));
  const tilt = Math.max(-1, Math.min(1, (tx - clamped) / 30));
  return { ...p, targetX: tx, x: clamped, tilt };
}
