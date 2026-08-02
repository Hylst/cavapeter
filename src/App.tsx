import { useRef, useEffect, useCallback, useState } from 'react';
import { GameState } from './game/types';
import { initialState, launchLevel, advanceLevel, tick } from './game/engine';
import { renderFrame, renderOverlay } from './game/renderer';
import { CANVAS_WIDTH, CANVAS_HEIGHT, CFG, LEVELS } from './game/constants';
import { ambientMusic, setMusicEnabled, setSFXEnabled } from './game/audio';

// ─── HUD snapshot ────────────────────────────
interface HUD {
  score: number; highScore: number; lives: number; level: number;
  combo: number; bestCombo: number; status: GameState['status'];
  bricksLeft: number; bricksTotal: number; shotsLeft: number; shieldHP: number;
  transitionText: string;
}
function snap(s: GameState): HUD {
  return { score:s.score, highScore:s.highScore, lives:s.lives, level:s.level,
    combo:s.combo, bestCombo:s.bestCombo, status:s.status,
    bricksLeft:s.bricksLeft, bricksTotal:s.bricksTotal,
    shotsLeft:s.shotsLeft, shieldHP:s.shieldHP, transitionText:s.transitionText };
}
function hudChanged(a: HUD, b: HUD) {
  return (Object.keys(a) as (keyof HUD)[]).some(k => a[k] !== b[k]);
}

// ═════════════════════════════════════════════
export default function App() {
  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const gsRef        = useRef<GameState>(initialState());
  const keysRef      = useRef<Set<string>>(new Set());
  const mouseXRef    = useRef<number | null>(null);
  const rafRef       = useRef<number>(0);
  const frameRef     = useRef(0);
  const prevHudRef   = useRef<HUD>(snap(gsRef.current));

  const [hud,        setHud]        = useState<HUD>(prevHudRef.current);
  const [musicOn,    setMusicOn]    = useState(false);
  const [sfxOn,      setSfxOn]      = useState(true);
  const [fullscreen, setFullscreen] = useState(false);
  const [showInfo,   setShowInfo]   = useState(false);

  // ── actions ────────────────────────────────
  const doStart = useCallback(() => {
    const s = launchLevel(initialState());
    gsRef.current = s;
    if (musicOn) ambientMusic.start(s.level);
  }, [musicOn]);

  const doNext = useCallback(() => {
    const s = advanceLevel(gsRef.current);
    gsRef.current = s;
    if (musicOn) ambientMusic.start(s.level);
  }, [musicOn]);

  const doRestart = useCallback(() => {
    const s = launchLevel(initialState());
    gsRef.current = s;
    if (musicOn) ambientMusic.start(s.level);
  }, [musicOn]);

  const doPause = useCallback(() => {
    const s = gsRef.current;
    if (s.status === 'playing')  { gsRef.current = { ...s, status: 'paused' };  ambientMusic.stop(); }
    else if (s.status === 'paused') { gsRef.current = { ...s, status: 'playing' }; if (musicOn) ambientMusic.start(s.level); }
  }, [musicOn]);

  const doFullscreen = useCallback(() => {
    if (!document.fullscreenElement) containerRef.current?.requestFullscreen?.();
    else document.exitFullscreen?.();
  }, []);

  const doMusicToggle = useCallback(() => {
    const n = !musicOn;
    setMusicOn(n);
    setMusicEnabled(n);
    if (n && gsRef.current.status === 'playing') ambientMusic.start(gsRef.current.level);
    else if (!n) ambientMusic.stop();
  }, [musicOn]);

  const doSfxToggle = useCallback(() => {
    const n = !sfxOn; setSfxOn(n); setSFXEnabled(n);
  }, [sfxOn]);

  // ── fullscreen listener ────────────────────
  useEffect(() => {
    const h = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', h);
    return () => document.removeEventListener('fullscreenchange', h);
  }, []);

  // ── keyboard ───────────────────────────────
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      keysRef.current.add(e.key);
      if (e.key === ' ') {
        e.preventDefault();
        const s = gsRef.current;
        if (s.status === 'idle') doStart();
        else if (s.status === 'levelcomplete') doNext();
        else if (s.status === 'gameover' || s.status === 'win') doRestart();
      }
      if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') doPause();
      if (e.key === 'f' || e.key === 'F') doFullscreen();
      if (e.key === 'm' || e.key === 'M') doMusicToggle();
    };
    const up = (e: KeyboardEvent) => keysRef.current.delete(e.key);
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); };
  }, [doStart, doNext, doRestart, doPause, doFullscreen, doMusicToggle]);

  // ── mouse / touch ──────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const toX = (cx: number) => {
      const r = canvas.getBoundingClientRect();
      return (cx - r.left) * (CANVAS_WIDTH / r.width);
    };
    const mm = (e: MouseEvent)  => { mouseXRef.current = toX(e.clientX); };
    const ml = ()               => { mouseXRef.current = null; };
    const mc = ()               => {
      const s = gsRef.current;
      if (s.status === 'idle') doStart();
      else if (s.status === 'levelcomplete') doNext();
      else if (s.status === 'gameover' || s.status === 'win') doRestart();
    };
    const tm = (e: TouchEvent) => { e.preventDefault(); mouseXRef.current = toX(e.touches[0].clientX); };
    const ts = (e: TouchEvent) => { e.preventDefault(); mc(); mouseXRef.current = toX(e.touches[0].clientX); };
    canvas.addEventListener('mousemove',  mm);
    canvas.addEventListener('mouseleave', ml);
    canvas.addEventListener('click',      mc);
    canvas.addEventListener('touchmove',  tm, { passive: false });
    canvas.addEventListener('touchstart', ts, { passive: false });
    return () => {
      canvas.removeEventListener('mousemove', mm);
      canvas.removeEventListener('mouseleave', ml);
      canvas.removeEventListener('click', mc);
      canvas.removeEventListener('touchmove', tm);
      canvas.removeEventListener('touchstart', ts);
    };
  }, [doStart, doNext, doRestart]);

  // ── game loop ──────────────────────────────
  useEffect(() => {
    const loop = () => {
      const canvas = canvasRef.current;
      if (!canvas) { rafRef.current = requestAnimationFrame(loop); return; }
      const ctx = canvas.getContext('2d');
      if (!ctx) { rafRef.current = requestAnimationFrame(loop); return; }
      frameRef.current++;
      gsRef.current = tick(gsRef.current, mouseXRef.current, keysRef.current);
      renderFrame(ctx, gsRef.current, frameRef.current);
      renderOverlay(ctx, gsRef.current, frameRef.current);
      // update HUD ~10×/s
      if (frameRef.current % 6 === 0) {
        const h = snap(gsRef.current);
        if (hudChanged(prevHudRef.current, h)) { prevHudRef.current = h; setHud(h); }
      }
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  // ── derived ────────────────────────────────
  const progress = hud.bricksTotal > 0 ? 1 - hud.bricksLeft / hud.bricksTotal : 0;
  const def = LEVELS[Math.min(hud.level - 1, LEVELS.length - 1)];

  return (
    <div ref={containerRef}
      className="flex min-h-screen min-h-dvh flex-col items-center justify-center bg-gray-950 px-2 py-2 sm:p-3 select-none overflow-hidden"
    >
      {/* ── title ── */}
      <h1 className="text-3xl sm:text-5xl font-black tracking-widest bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent mb-1">
        ÇA VA PÉTER
      </h1>
      <p className="text-[10px] sm:text-[11px] font-mono text-gray-500 mb-2">
        Par Hylst, Geoffroy, avec l'aide d'une IA &nbsp;|&nbsp; {CFG.maxLevel} niveaux
      </p>

      {/* ── HUD row 1 ── */}
      <div className="mb-1.5 w-full max-w-[900px] grid grid-cols-2 sm:grid-cols-4 gap-1.5 px-0.5 text-xs">
        <Stat l="Score"  v={hud.score.toLocaleString('fr-FR')}      c="text-white" />
        <Stat l="Niveau" v={`${hud.level} / ${CFG.maxLevel}`}       c="text-cyan-400" />
        <Stat l="Record" v={hud.highScore.toLocaleString('fr-FR')}  c="text-amber-400" />
        <div className="rounded-lg border border-slate-700/60 bg-slate-900/80 px-2.5 py-1.5">
          <div className="text-[9px] font-mono uppercase tracking-wider text-gray-500">Vies</div>
          <div className="flex gap-px mt-0.5">
            {Array.from({ length: hud.lives }).map((_, i) =>
              <span key={i} className="text-red-500 text-sm leading-none drop-shadow-[0_0_3px_rgba(239,68,68,0.6)]">♥</span>
            )}
            {hud.lives === 0 && <span className="text-gray-600">—</span>}
          </div>
        </div>
      </div>

      {/* ── HUD row 2 ── */}
      <div className="mb-1.5 w-full max-w-[900px] grid grid-cols-3 gap-1.5 px-0.5 text-xs">
        {/* progress */}
        <div className="col-span-1 sm:col-span-1 rounded-lg border border-slate-700/60 bg-slate-900/80 px-2.5 py-1.5">
          <div className="flex justify-between items-center text-[9px] font-mono text-gray-500 mb-0.5">
            <span className="uppercase tracking-wider">{def.introText}</span>
            <span>{Math.round(progress * 100)}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
            <div className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-violet-500 to-pink-400 transition-all duration-200"
              style={{ width: `${progress * 100}%` }} />
          </div>
        </div>
        {/* combo */}
        <div className="rounded-lg border border-yellow-500/20 bg-slate-900/80 px-2.5 py-1.5">
          <div className="text-[9px] font-mono uppercase tracking-wider text-gray-500">Combo</div>
          <div className="text-base font-black text-yellow-400 leading-tight">
            ×{hud.combo} <span className="text-[10px] text-gray-500 font-normal">max ×{hud.bestCombo}</span>
          </div>
        </div>
        {/* laser + shield */}
        <div className="rounded-lg border border-pink-500/20 bg-slate-900/80 px-2.5 py-1.5">
          <div className="text-[9px] font-mono uppercase tracking-wider text-gray-500">Laser / Bouclier</div>
          <div className="flex items-center gap-2 leading-tight">
            <span className="text-pink-400 font-black text-sm">{hud.shotsLeft}×</span>
            <span className="text-blue-400 font-black text-sm">{hud.shieldHP}🛡</span>
          </div>
        </div>
      </div>

      {/* ── canvas ── */}
      <div className="canvas-wrap relative overflow-hidden rounded-xl border-2 border-indigo-500/20 shadow-[0_0_40px_rgba(99,102,241,0.15)] w-full max-w-[900px]">
        <canvas ref={canvasRef} width={CANVAS_WIDTH} height={CANVAS_HEIGHT}
          className="block w-full h-auto cursor-none" />
      </div>

      {/* ── controls ── */}
      <div className="mt-2 flex flex-wrap justify-center gap-1.5">
        {hud.status === 'idle'          && <Btn onClick={doStart}   g="from-indigo-600 to-purple-600" big>▶ Commencer</Btn>}
        {hud.status === 'playing'       && <Btn onClick={doPause}   g="from-slate-700 to-slate-600">⏸ Pause</Btn>}
        {hud.status === 'paused'        && <Btn onClick={doPause}   g="from-green-600 to-emerald-600" big>▶ Reprendre</Btn>}
        {hud.status === 'levelcomplete' && <Btn onClick={doNext}    g="from-cyan-600 to-blue-600" big>⏭ Niveau suivant</Btn>}
        {hud.status === 'gameover'      && <Btn onClick={doRestart} g="from-red-600 to-orange-600" big>🔄 Rejouer</Btn>}
        {hud.status === 'win'           && <Btn onClick={doRestart} g="from-amber-500 to-yellow-500" big>🏆 Rejouer</Btn>}
        <Btn onClick={doFullscreen} g="from-slate-700 to-slate-600">{fullscreen ? '⛶ Fenêtre' : '⛶ Plein écran'}</Btn>
        <Btn onClick={doMusicToggle} g={musicOn ? 'from-indigo-700 to-violet-700' : 'from-slate-700 to-slate-600'}>🎵 {musicOn ? 'ON' : 'OFF'}</Btn>
        <Btn onClick={doSfxToggle}   g={sfxOn  ? 'from-indigo-700 to-violet-700' : 'from-slate-700 to-slate-600'}>🔊 {sfxOn ? 'ON' : 'OFF'}</Btn>
        <Btn onClick={() => setShowInfo(true)} g="from-slate-700 to-slate-600">ℹ️ Infos</Btn>
      </div>

      <p className="mt-1.5 text-center text-[10px] font-mono text-gray-600 max-w-[900px] hidden sm:block">
        Souris / ← → / Tactile · Laser : X · Pause : P · Plein écran : F · Musique : M
      </p>

      {showInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={() => setShowInfo(false)}>
          <div className="w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-2xl border border-indigo-500/20 bg-slate-900 shadow-[0_0_40px_rgba(99,102,241,0.15)]" onClick={e => e.stopPropagation()}>
            <div className="p-6 space-y-3.5 text-sm leading-relaxed text-gray-300">
              <h3 className="text-xl font-black bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">Comment ce jeu a été fait</h3>
              <p><strong className="text-white">Stack :</strong> React 19, TypeScript 5.9, Tailwind CSS 4, Vite 7, compilé en un seul fichier HTML, aucune dépendance chargée depuis l'extérieur.</p>
              <p><strong className="text-white">Graphismes :</strong> tout est dessiné en Canvas 2D à chaque image (briques, balle, paddle, particules), aucun sprite ni image externe.</p>
              <p><strong className="text-white">Musique &amp; sons :</strong> synthétisés en direct avec l'API Web Audio, aucun fichier audio chargé.</p>
              <p><strong className="text-white">Interactions :</strong> souris, flèches ou tactile pour déplacer le paddle, clic ou touche X pour tirer au laser quand le power-up est actif.</p>
              <p><strong className="text-white">Architecture :</strong> logique de jeu pure séparée du rendu (moteur, dessin et audio dans des modules distincts sans dépendance React), une seule boucle <code>requestAnimationFrame</code> qui met à jour l'état puis redessine, le HUD React ne se rafraîchit que si une valeur affichée a changé.</p>
              <p><strong className="text-white">Algorithmes notables :</strong> l'angle de rebond de la balle sur le paddle dépend du point d'impact (toucher le bord renvoie plus à l'oblique que toucher le centre), disposition des briques régénérée par niveau, 11 power-ups différents qui tombent aléatoirement selon une chance propre à chaque niveau.</p>
            </div>
            <div className="border-t border-slate-800 p-4 text-center">
              <button onClick={() => setShowInfo(false)} className="px-6 py-2 rounded-lg font-bold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:brightness-110 active:scale-95 transition-all">Fermer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── small ui ────────────────────────────────
function Stat({ l, v, c }: { l: string; v: string; c: string }) {
  return (
    <div className="rounded-lg border border-slate-700/60 bg-slate-900/80 px-2.5 py-1.5">
      <div className="text-[9px] font-mono uppercase tracking-wider text-gray-500">{l}</div>
      <div className={`text-base sm:text-lg font-black tabular-nums leading-tight ${c}`}>{v}</div>
    </div>
  );
}

function Btn({ children, onClick, g, big }: { children: React.ReactNode; onClick: () => void; g: string; big?: boolean }) {
  return (
    <button onClick={onClick}
      className={`${big ? 'px-5 py-2 text-sm' : 'px-3 py-1.5 text-xs'} font-bold text-white rounded-lg bg-gradient-to-r ${g} hover:brightness-110 active:scale-95 transition-all shadow-lg`}
    >{children}</button>
  );
}
