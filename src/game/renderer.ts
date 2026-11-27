import { GameState, Brick, Particle, PowerUp, FloatingText, LaserShot, Star, Shockwave } from './types';
import { CANVAS_WIDTH, CANVAS_HEIGHT, CFG, PU_CFG, LEVELS } from './constants';
import { hslToHex, lighten, darken, rRect } from './animations';

// ═══════════════════════════════════════════════
export function renderFrame(ctx: CanvasRenderingContext2D, s: GameState, frame: number): void {
  ctx.save();
  if (s.screenShake > 0) ctx.translate((Math.random()-.5)*s.screenShake, (Math.random()-.5)*s.screenShake);

  drawBg(ctx, frame, s.level);
  drawStars(ctx, s.stars);
  drawNebula(ctx, frame, s.level);
  drawGrid(ctx, frame);
  drawProgressBar(ctx, s);
  drawShieldLine(ctx, s, frame);
  drawShockwaves(ctx, s.shockwaves);
  drawBricks(ctx, s.bricks, frame);
  drawPowerUps(ctx, s.powerUps);
  drawLasers(ctx, s.lasers, frame);
  drawPaddle(ctx, s, frame);
  drawBalls(ctx, s, frame);
  drawParticles(ctx, s.particles);
  drawFloatingTexts(ctx, s.floatingTexts);
  drawPowerUpBars(ctx, s);
  if (s.combo >= 3) drawCombo(ctx, s, frame);
  drawBorder(ctx, frame);

  for (const f of s.flashes) { ctx.fillStyle=`rgba(${f.r},${f.g},${f.b},${f.alpha})`; ctx.fillRect(0,0,CANVAS_WIDTH,CANVAS_HEIGHT); }
  if (s.status === 'starting' && s.transitionTimer > 0) drawTransition(ctx, s);
  ctx.restore();
}

// ─── background ──────────────────────────────
function drawBg(ctx: CanvasRenderingContext2D, frame: number, level: number) {
  // hue shifts per level zone
  const baseHue = [220, 260, 340, 30][(Math.min(level-1,23)/6)|0];
  const hue = (baseHue + frame * 0.08) % 360;
  const g = ctx.createRadialGradient(CANVAS_WIDTH/2+Math.sin(frame*0.003)*40, CANVAS_HEIGHT/2+Math.cos(frame*0.004)*30, 0, CANVAS_WIDTH/2, CANVAS_HEIGHT/2, CANVAS_WIDTH*0.9);
  g.addColorStop(0, hslToHex(hue, 50, 9));
  g.addColorStop(0.6, hslToHex(hue, 40, 4));
  g.addColorStop(1, '#000205');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  // second radial for depth
  const g2 = ctx.createRadialGradient(CANVAS_WIDTH*0.7, CANVAS_HEIGHT*0.3, 0, CANVAS_WIDTH*0.7, CANVAS_HEIGHT*0.3, 350);
  g2.addColorStop(0, `hsla(${(hue+60)%360},70%,50%,0.04)`);
  g2.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g2;
  ctx.fillRect(0,0,CANVAS_WIDTH,CANVAS_HEIGHT);
}

function drawStars(ctx: CanvasRenderingContext2D, stars: Star[]) {
  for (const s of stars) {
    const a = 0.22 + Math.sin(s.phase) * 0.22;
    ctx.globalAlpha = a;
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(s.x, s.y, s.size, 0, Math.PI*2); ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawNebula(ctx: CanvasRenderingContext2D, frame: number, level: number) {
  const hues = [200,260,320,40];
  const baseH = hues[(Math.min(level-1,23)/6)|0];
  for (let i = 0; i < 3; i++) {
    const x = 160+i*280+Math.sin(frame*0.002+i*2)*25;
    const y = 100+i*130+Math.cos(frame*0.003+i*1.5)*20;
    const h = baseH + i * 40;
    const g = ctx.createRadialGradient(x,y,0,x,y,160);
    g.addColorStop(0, `hsla(${h},80%,55%,0.065)`);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x,y,160,0,Math.PI*2); ctx.fill();
  }
}

function drawGrid(ctx: CanvasRenderingContext2D, frame: number) {
  const a = 0.035 + Math.sin(frame*0.015)*0.01;
  ctx.strokeStyle = `rgba(100,120,255,${a})`;
  ctx.lineWidth = 1;
  const sz = 48, off = (frame*0.18)%sz;
  for (let x=0; x<CANVAS_WIDTH; x+=sz) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,CANVAS_HEIGHT); ctx.stroke(); }
  for (let y=off; y<CANVAS_HEIGHT; y+=sz) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(CANVAS_WIDTH,y); ctx.stroke(); }
}

// ─── in-canvas progress bar ──────────────────
function drawProgressBar(ctx: CanvasRenderingContext2D, s: GameState) {
  if (s.bricksTotal<=0) return;
  const pct = 1 - s.bricksLeft/s.bricksTotal;
  const w = CANVAS_WIDTH - 40;
  const y = 12, h = 5;
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.fillRect(20, y, w, h);
  const g = ctx.createLinearGradient(20,0,20+w,0);
  g.addColorStop(0,'#22d3ee'); g.addColorStop(0.5,'#818cf8'); g.addColorStop(1,'#f472b6');
  ctx.fillStyle = g;
  ctx.fillRect(20, y, w*pct, h);
  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  ctx.fillRect(20, y, w, 2);
}

// ─── shield ──────────────────────────────────
function drawShieldLine(ctx: CanvasRenderingContext2D, s: GameState, frame: number) {
  if (s.shieldHP<=0) return;
  const y = CFG.paddleY+26;
  const alpha = 0.32+Math.sin(frame*0.16)*0.18;
  ctx.save();
  const g = ctx.createLinearGradient(0,y-3,0,y+6);
  g.addColorStop(0, `rgba(56,189,248,${alpha})`);
  g.addColorStop(1, 'rgba(56,189,248,0)');
  ctx.fillStyle = g;
  ctx.fillRect(14,y-3,CANVAS_WIDTH-28,8);
  ctx.shadowColor='#38bdf8'; ctx.shadowBlur=14;
  ctx.strokeStyle=`rgba(125,211,252,${alpha*0.8})`; ctx.lineWidth=2;
  ctx.beginPath(); ctx.moveTo(14,y); ctx.lineTo(CANVAS_WIDTH-14,y); ctx.stroke();
  ctx.shadowBlur=0;
  for (let i=0; i<s.shieldHP; i++) {
    ctx.fillStyle='#7dd3fc'; ctx.shadowColor='#60a5fa'; ctx.shadowBlur=6;
    ctx.beginPath(); ctx.arc(CANVAS_WIDTH/2-(s.shieldHP-1)*8+i*16,y,3.5,0,Math.PI*2); ctx.fill();
  }
  ctx.restore();
}

function drawShockwaves(ctx: CanvasRenderingContext2D, waves: Shockwave[]) {
  for (const w of waves) {
    const pct=w.life/w.maxLife;
    ctx.save(); ctx.globalAlpha=pct*0.6;
    ctx.strokeStyle=w.color; ctx.shadowColor=w.color; ctx.shadowBlur=20;
    ctx.lineWidth=3*pct+1;
    ctx.beginPath(); ctx.arc(w.x,w.y,w.radius,0,Math.PI*2); ctx.stroke();
    ctx.restore();
  }
}

// ─── bricks (enriched) ──────────────────────
function drawBricks(ctx: CanvasRenderingContext2D, bricks: Brick[], frame: number) {
  for (const br of bricks) {
    if (br.destroyed && br.scale<=0) continue;
    const cx=br.x+br.width/2, cy=br.y+br.height/2;
    ctx.save();
    ctx.translate(cx+br.shakeX, cy); ctx.scale(br.scale,br.scale); ctx.translate(-cx,-cy);

    // shadow
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    rRect(ctx, br.x+2, br.y+3, br.width, br.height, 4); ctx.fill();

    // body gradient (3-stop for depth)
    const g = ctx.createLinearGradient(br.x, br.y, br.x+br.width*0.2, br.y+br.height);
    g.addColorStop(0, lighten(br.color, 55));
    g.addColorStop(0.45, br.color);
    g.addColorStop(1, darken(br.color, 32));
    ctx.fillStyle = g;
    rRect(ctx, br.x, br.y, br.width, br.height, 4); ctx.fill();

    // neon edge glow
    const glowSize = br.isArmored ? 18+Math.sin(frame*0.08+br.pulseOffset)*6 : 8;
    ctx.shadowColor = br.isArmored ? '#e2e8f0' : br.color;
    ctx.shadowBlur = glowSize;
    ctx.strokeStyle = br.isArmored ? '#e2e8f0' : lighten(br.color, 60);
    ctx.lineWidth = br.isArmored ? 2.2 : 1.3;
    rRect(ctx, br.x, br.y, br.width, br.height, 4); ctx.stroke();
    ctx.shadowBlur = 0;

    // glass highlight
    const hl = ctx.createLinearGradient(br.x, br.y, br.x, br.y+br.height*0.45);
    hl.addColorStop(0, 'rgba(255,255,255,0.28)');
    hl.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = hl;
    ctx.fillRect(br.x+3, br.y+1, br.width-6, br.height*0.4);

    // left rim light
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.fillRect(br.x+1, br.y+3, 2, br.height-6);

    // armored hatch
    if (br.isArmored) {
      ctx.strokeStyle = `rgba(255,255,255,${0.25+Math.sin(frame*0.04+br.pulseOffset)*0.12})`;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(br.x+7,br.y+4); ctx.lineTo(br.x+br.width-7,br.y+br.height-4);
      ctx.moveTo(br.x+br.width-7,br.y+4); ctx.lineTo(br.x+7,br.y+br.height-4);
      ctx.stroke();
    }

    // hits remaining
    if (br.maxHits>1) {
      const rem = br.maxHits-br.hits;
      ctx.shadowColor='rgba(0,0,0,0.8)'; ctx.shadowBlur=3;
      ctx.fillStyle='rgba(255,255,255,0.92)';
      ctx.font='bold 11px monospace'; ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.fillText(String(rem), cx, cy);
      ctx.shadowBlur=0;
    }

    // cracks
    if (br.hits>0 && br.maxHits>1) {
      ctx.strokeStyle='rgba(0,0,0,0.5)'; ctx.lineWidth=1.3;
      ctx.beginPath();
      ctx.moveTo(br.x+br.width*0.2,br.y); ctx.lineTo(br.x+br.width*0.42,br.y+br.height*0.5); ctx.lineTo(br.x+br.width*0.65,br.y+br.height);
      ctx.stroke();
      if (br.hits>1) {
        ctx.beginPath();
        ctx.moveTo(br.x+br.width*0.6,br.y); ctx.lineTo(br.x+br.width*0.5,br.y+br.height*0.45); ctx.lineTo(br.x+br.width*0.3,br.y+br.height);
        ctx.stroke();
      }
    }

    ctx.restore();
  }
}

// ─── paddle (with tilt + multi-state look) ──
function drawPaddle(ctx: CanvasRenderingContext2D, s: GameState, frame: number) {
  const p = s.paddle;
  const hasExp = s.activePowerUps.some(x=>x.type==='expand');
  const hasShr = s.activePowerUps.some(x=>x.type==='shrink');
  const hasLas = s.activePowerUps.some(x=>x.type==='laser');
  const hasMag = s.activePowerUps.some(x=>x.type==='magnet');
  const base = hasLas?'#f472b6':hasMag?'#14b8a6':hasExp?'#22c55e':hasShr?'#ef4444':'#6366f1';

  ctx.save();
  const cx=p.x+p.width/2, cy=p.y+p.height/2;
  ctx.translate(cx,cy); ctx.rotate(p.tilt*0.04); ctx.translate(-cx,-cy);

  // glow
  ctx.shadowColor=base; ctx.shadowBlur=24+Math.sin(frame*0.12)*5+s.paddleHitFlash*30;

  // body
  const g = ctx.createLinearGradient(p.x,p.y,p.x,p.y+p.height);
  g.addColorStop(0,lighten(base,60)); g.addColorStop(0.5,base); g.addColorStop(1,darken(base,35));
  ctx.fillStyle=g;
  rRect(ctx,p.x,p.y,p.width,p.height,8); ctx.fill();

  // border
  ctx.strokeStyle=lighten(base,45); ctx.lineWidth=1.5;
  rRect(ctx,p.x,p.y,p.width,p.height,8); ctx.stroke();

  // glass highlight
  ctx.fillStyle='rgba(255,255,255,0.28)';
  ctx.fillRect(p.x+5,p.y+2,p.width-10,p.height*0.35);

  // center marker
  ctx.fillStyle='rgba(255,255,255,0.4)';
  ctx.fillRect(p.x+p.width/2-1,p.y+3,2,p.height-6);

  // laser cannons
  if (hasLas) {
    ctx.fillStyle='#f472b6'; ctx.shadowColor='#f472b6'; ctx.shadowBlur=8;
    ctx.fillRect(p.x+8,p.y-7,5,9); ctx.fillRect(p.x+p.width-13,p.y-7,5,9);
  }
  if (hasMag) {
    ctx.strokeStyle='rgba(20,184,166,0.9)'; ctx.lineWidth=2; ctx.shadowColor='#14b8a6'; ctx.shadowBlur=6;
    ctx.beginPath(); ctx.arc(p.x+18,p.y+p.height/2,7,0,Math.PI); ctx.stroke();
    ctx.beginPath(); ctx.arc(p.x+p.width-18,p.y+p.height/2,7,0,Math.PI); ctx.stroke();
  }
  ctx.restore();
}

// ─── balls ────────────────────────────────────
function drawBalls(ctx: CanvasRenderingContext2D, s: GameState, frame: number) {
  const fb = s.activePowerUps.some(x=>x.type==='fireball');
  for (const ball of s.balls) {
    // trail (stored in ball, not as particles)
    for (let i=0; i<ball.trail.length; i++) {
      const t=ball.trail[i], pct=1-i/(ball.trail.length+1);
      ctx.globalAlpha = pct*(fb?0.5:0.2);
      ctx.fillStyle = fb ? '#fbbf24' : `hsl(${(frame*2+i*30)%360},80%,72%)`;
      ctx.beginPath(); ctx.arc(t.x,t.y,ball.radius*pct*0.7,0,Math.PI*2); ctx.fill();
    }
    ctx.globalAlpha=1;

    // outer glow ring for fireball
    if (fb) {
      const rg = ctx.createRadialGradient(ball.x,ball.y,ball.radius,ball.x,ball.y,ball.radius*3);
      rg.addColorStop(0,'rgba(251,191,36,0.35)');
      rg.addColorStop(1,'rgba(220,38,38,0)');
      ctx.fillStyle=rg;
      ctx.beginPath(); ctx.arc(ball.x,ball.y,ball.radius*3,0,Math.PI*2); ctx.fill();
    }

    ctx.save();
    ctx.shadowColor = fb?'#fbbf24':'#a5b4fc';
    ctx.shadowBlur = fb?30:15;
    const bg = ctx.createRadialGradient(ball.x-ball.radius*0.3,ball.y-ball.radius*0.3,0,ball.x,ball.y,ball.radius);
    if (fb) { bg.addColorStop(0,'#fef9c3'); bg.addColorStop(0.45,'#fbbf24'); bg.addColorStop(1,'#dc2626'); }
    else    { bg.addColorStop(0,'#fff'); bg.addColorStop(0.5,'#c7d2fe'); bg.addColorStop(1,'#4338ca'); }
    ctx.fillStyle=bg;
    ctx.beginPath(); ctx.arc(ball.x,ball.y,ball.radius,0,Math.PI*2); ctx.fill();
    // specular
    ctx.fillStyle='rgba(255,255,255,0.72)';
    ctx.beginPath(); ctx.arc(ball.x-ball.radius*0.3,ball.y-ball.radius*0.35,ball.radius*0.22,0,Math.PI*2); ctx.fill();
    ctx.restore();
  }
}

// ─── lasers ──────────────────────────────────
function drawLasers(ctx: CanvasRenderingContext2D, lasers: LaserShot[], frame: number) {
  for (const l of lasers) {
    ctx.save();
    const g = ctx.createLinearGradient(l.x,l.y,l.x,l.y+20);
    g.addColorStop(0,'#fff'); g.addColorStop(0.4,'#f472b6'); g.addColorStop(1,'#9d174d');
    ctx.fillStyle=g; ctx.shadowColor='#f472b6'; ctx.shadowBlur=12+Math.sin(frame*0.3)*3;
    ctx.fillRect(l.x-2,l.y,4,20);
    ctx.restore();
  }
}

// ─── power-ups ───────────────────────────────
function drawPowerUps(ctx: CanvasRenderingContext2D, pus: PowerUp[]) {
  const S = CFG.powerUpSize;
  for (const pu of pus) {
    const cfg = PU_CFG[pu.type];
    const rot = pu.age*0.04, pl = Math.sin(pu.age*0.1)*3;
    const cx=pu.x+S/2, cy=pu.y+S/2;
    ctx.save(); ctx.translate(cx,cy); ctx.rotate(rot);

    // pulsing rings
    ctx.globalAlpha=0.2; ctx.fillStyle=cfg.color;
    ctx.beginPath(); ctx.arc(0,0,S/2+pl+10,0,Math.PI*2); ctx.fill();
    ctx.globalAlpha=0.12;
    ctx.beginPath(); ctx.arc(0,0,S/2+pl+17,0,Math.PI*2); ctx.fill();

    // body
    ctx.globalAlpha=1;
    ctx.shadowColor=cfg.color; ctx.shadowBlur=16;
    const bg = ctx.createRadialGradient(-3,-3,0,0,0,S/2);
    bg.addColorStop(0, lighten(cfg.color,40));
    bg.addColorStop(1, cfg.color);
    ctx.fillStyle=bg;
    ctx.beginPath(); ctx.arc(0,0,S/2,0,Math.PI*2); ctx.fill();
    ctx.strokeStyle=lighten(cfg.color,50); ctx.lineWidth=2; ctx.stroke();
    ctx.shadowBlur=0;

    // icon
    ctx.fillStyle='#fff'; ctx.font='bold 13px monospace'; ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText(cfg.icon,0,1);
    ctx.restore();
  }
}

// ─── particles ───────────────────────────────
function drawParticles(ctx: CanvasRenderingContext2D, particles: Particle[]) {
  for (const p of particles) {
    const alpha = p.life/p.maxLife;
    ctx.save(); ctx.globalAlpha=alpha;
    ctx.translate(p.x,p.y); ctx.rotate(p.rotation);
    const col=`rgb(${p.r|0},${p.g|0},${p.b|0})`;
    ctx.shadowColor=col; ctx.shadowBlur=p.type==='glow'?10:4;
    ctx.fillStyle=col;
    switch(p.type) {
      case 'shard': ctx.fillRect(-p.size/2,-p.size/2,p.size,p.size); break;
      case 'spark':
        ctx.beginPath(); ctx.moveTo(0,-p.size*1.8); ctx.lineTo(p.size*0.4,0); ctx.lineTo(0,p.size*1.8); ctx.lineTo(-p.size*0.4,0); ctx.closePath(); ctx.fill(); break;
      case 'smoke':
        ctx.globalAlpha=alpha*0.45; ctx.beginPath(); ctx.arc(0,0,p.size*(1.6-alpha*0.5),0,Math.PI*2); ctx.fill(); break;
      default:
        ctx.beginPath(); ctx.arc(0,0,p.size,0,Math.PI*2); ctx.fill(); break;
    }
    ctx.restore();
  }
}

// ─── floating texts ──────────────────────────
function drawFloatingTexts(ctx: CanvasRenderingContext2D, texts: FloatingText[]) {
  for (const f of texts) {
    const alpha=f.life/f.maxLife, scale=f.scale*(f.big?1.3:1);
    ctx.save(); ctx.globalAlpha=alpha; ctx.translate(f.x,f.y); ctx.scale(scale,scale);
    ctx.font=`${f.big?900:700} ${f.big?20:16}px system-ui,sans-serif`;
    ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.shadowColor=f.color; ctx.shadowBlur=10;
    ctx.strokeStyle='rgba(0,0,0,0.65)'; ctx.lineWidth=3; ctx.strokeText(f.text,0,0);
    ctx.fillStyle=f.color; ctx.fillText(f.text,0,0);
    ctx.restore();
  }
}

// ─── combo indicator ─────────────────────────
function drawCombo(ctx: CanvasRenderingContext2D, s: GameState, frame: number) {
  const x=CANVAS_WIDTH-60, y=46;
  const scale=1+Math.sin(frame*0.2)*0.05;
  ctx.save(); ctx.translate(x,y); ctx.scale(scale,scale);
  ctx.font='900 30px system-ui,sans-serif'; ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.shadowColor='#fbbf24'; ctx.shadowBlur=16;
  ctx.fillStyle='#fbbf24'; ctx.fillText(`×${Math.min(s.combo,12)}`,0,0);
  ctx.font='700 10px system-ui,sans-serif'; ctx.fillStyle='#fff'; ctx.shadowBlur=4;
  ctx.fillText('COMBO',0,18);
  ctx.restore();
}

// ─── power-up bars ───────────────────────────
function drawPowerUpBars(ctx: CanvasRenderingContext2D, s: GameState) {
  const filtered = s.activePowerUps.filter(p=>p.type!=='extralife'&&p.type!=='multiball'&&p.type!=='bomb');
  if (!filtered.length) return;
  const BW=70,BH=8,GAP=9,sx=14,sy=CANVAS_HEIGHT-22;
  filtered.forEach((ap,i)=>{
    const cfg=PU_CFG[ap.type]; const pct=ap.timer/ap.maxTimer; const x=sx+i*(BW+GAP);
    ctx.fillStyle='rgba(0,0,0,0.55)'; rRect(ctx,x,sy,BW,BH,3); ctx.fill();
    ctx.fillStyle=cfg.color; rRect(ctx,x,sy,BW*pct,BH,3); ctx.fill();
    ctx.strokeStyle=cfg.color; ctx.lineWidth=1; rRect(ctx,x,sy,BW,BH,3); ctx.stroke();
    ctx.fillStyle='#fff'; ctx.font='bold 8px monospace'; ctx.textAlign='left'; ctx.textBaseline='bottom';
    ctx.fillText(cfg.label,x,sy-2);
  });
}

// ─── border ──────────────────────────────────
function drawBorder(ctx: CanvasRenderingContext2D, frame: number) {
  const h=(frame*0.3)%360;
  const g = ctx.createLinearGradient(0,0,CANVAS_WIDTH,CANVAS_HEIGHT);
  g.addColorStop(0,hslToHex(h,75,55)); g.addColorStop(0.5,hslToHex((h+90)%360,75,55)); g.addColorStop(1,hslToHex((h+180)%360,75,55));
  ctx.strokeStyle=g; ctx.lineWidth=2.5; ctx.shadowColor=`hsl(${h},75%,55%)`; ctx.shadowBlur=14;
  ctx.strokeRect(1,1,CANVAS_WIDTH-2,CANVAS_HEIGHT-2); ctx.shadowBlur=0;
}

// ─── transition ──────────────────────────────
function drawTransition(ctx: CanvasRenderingContext2D, s: GameState) {
  const alpha = s.transitionTimer<30 ? s.transitionTimer/30 : s.transitionTimer>60 ? (90-s.transitionTimer)/30 : 1;
  ctx.fillStyle = `rgba(0,0,0,${0.7*Math.max(0,alpha)})`;
  ctx.fillRect(0,0,CANVAS_WIDTH,CANVAS_HEIGHT);
  ctx.save(); ctx.globalAlpha=Math.max(0,alpha);
  ctx.font='900 44px system-ui,sans-serif'; ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.shadowColor='#22d3ee'; ctx.shadowBlur=22; ctx.fillStyle='#22d3ee';
  ctx.fillText(s.transitionText, CANVAS_WIDTH/2, CANVAS_HEIGHT/2);
  ctx.restore();
}

// ═══════════════════════════════════════════════
//  Overlay (idle / paused / gameover…)
// ═══════════════════════════════════════════════
export function renderOverlay(ctx: CanvasRenderingContext2D, s: GameState, frame: number): void {
  if (s.status==='playing'||s.status==='starting') return;
  ctx.fillStyle='rgba(0,0,0,0.75)'; ctx.fillRect(0,0,CANVAS_WIDTH,CANVAS_HEIGHT);
  const cx=CANVAS_WIDTH/2, cy=CANVAS_HEIGHT/2;
  const blink = Math.floor(frame/36)%2===0;
  const def = LEVELS[Math.min(s.level-1,LEVELS.length-1)];

  if (s.status==='idle') {
    big(ctx,'ÇA VA PÉTER',cx,cy-65,'#818cf8',frame,58);
    med(ctx,`${CFG.maxLevel} niveaux · 11 power-ups · Combos`,cx,cy+2,'#94a3b8');
    sm(ctx,'Souris / ← → / Tactile · Laser : X · Pause : P',cx,cy+28,'#64748b');
    sm(ctx,'Par Hylst, Geoffroy, avec l\'aide d\'une IA',cx,cy+56,'#475569');
    if (blink) sm(ctx,'▶  CLIQUEZ POUR JOUER',cx,cy+95,'#a5b4fc');
  }
  if (s.status==='paused') {
    big(ctx,'PAUSE',cx,cy-20,'#fbbf24',frame,52);
    if (blink) sm(ctx,'Appuyez sur P pour reprendre',cx,cy+40,'#94a3b8');
  }
  if (s.status==='gameover') {
    big(ctx,'GAME OVER',cx,cy-65,'#ef4444',frame,54);
    med(ctx,`Score : ${s.score.toLocaleString('fr-FR')}  ·  Record : ${s.highScore.toLocaleString('fr-FR')}`,cx,cy+2,'#fbbf24');
    sm(ctx,`Niveau atteint : ${s.level}, ${def.introText}`,cx,cy+34,'#94a3b8');
    if (blink) sm(ctx,'Cliquez pour rejouer',cx,cy+80,'#94a3b8');
  }
  if (s.status==='levelcomplete') {
    big(ctx,`NIVEAU ${s.level} ✓`,cx,cy-55,'#22d3ee',frame,46);
    med(ctx,`Score : ${s.score.toLocaleString('fr-FR')}`,cx,cy+5,'#fbbf24');
    if (blink) sm(ctx,'Cliquez pour le niveau suivant',cx,cy+60,'#94a3b8');
  }
  if (s.status==='win') {
    big(ctx,'🏆 VICTOIRE 🏆',cx,cy-70,'#fbbf24',frame,52);
    med(ctx,`Score Final : ${s.score.toLocaleString('fr-FR')}`,cx,cy-10,'#22d3ee');
    med(ctx,'Tous les niveaux terminés !',cx,cy+24,'#a78bfa');
    if (blink) sm(ctx,'Cliquez pour rejouer',cx,cy+72,'#94a3b8');
  }
}

function big(ctx: CanvasRenderingContext2D,t:string,x:number,y:number,col:string,frame:number,sz:number) {
  ctx.save(); ctx.font=`900 ${sz}px system-ui,sans-serif`; ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.shadowColor=col; ctx.shadowBlur=22+Math.sin(frame*0.08)*6;
  ctx.strokeStyle='rgba(0,0,0,0.65)'; ctx.lineWidth=4; ctx.strokeText(t,x,y);
  ctx.fillStyle=col; ctx.fillText(t,x,y); ctx.restore();
}
function med(ctx: CanvasRenderingContext2D,t:string,x:number,y:number,col:string) {
  ctx.save(); ctx.font='700 20px system-ui,sans-serif'; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillStyle=col; ctx.fillText(t,x,y); ctx.restore();
}
function sm(ctx: CanvasRenderingContext2D,t:string,x:number,y:number,col:string) {
  ctx.save(); ctx.font='500 15px system-ui,sans-serif'; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillStyle=col; ctx.fillText(t,x,y); ctx.restore();
}
