/**
 * main.js v4
 * - Botón play/pause funciona correctamente (sin conflicto con Navigator)
 * - Visualizadores y fondo se detienen/reanudan con pausa y cambio de canción
 * - Fondo KISS: fuego rojo/negro
 * - Fondo LEÓN: partículas azules que caen
 */

const SONGS = [
  {
    index:     0,
    title:     "I Was Made For Lovin' You",
    artist:    'KISS',
    audio:     'audio/kiss.mp3',
    img:       'img/kiss.jpg',
    theme:     'kiss',
    visualizer:'bars',
  },
  {
    index:     1,
    title:     'Locos',
    artist:    'León Larregui',
    audio:     'audio/leon.mp3',
    img:       'img/leon.jpg',
    theme:     'leon',
    visualizer:'wave',
  },
];

const engine      = new AudioEngine();
let   appNavigator = null;
const visualizers  = [];
let   bgCanvas, bgCtx, bgViz = null;

/* ══════════════════════════════════════════════
   ICONO PLAY / PAUSE
   ══════════════════════════════════════════════ */
function updatePlayIcon(playing) {
  const btn = document.getElementById('btn-play');
  if (!btn) return;
  btn.querySelector('.icon-play').style.display  = playing ? 'none'  : 'block';
  btn.querySelector('.icon-pause').style.display = playing ? 'block' : 'none';
}

/* ══════════════════════════════════════════════
   FONDO — FUEGO (KISS)
   ══════════════════════════════════════════════ */
function createBgFire() {
  bgCanvas.width  = window.innerWidth;
  bgCanvas.height = window.innerHeight;
  const W = bgCanvas.width, H = bgCanvas.height;

  const COLS = 80, ROWS = 50;
  const heat = [], targets = [];
  for (let c = 0; c < COLS; c++) {
    heat[c]    = new Float32Array(ROWS).fill(0);
    targets[c] = 0;
  }

  let raf, running = false;

  function start() {
    running = true;
    bgCanvas.classList.add('active');
    loop();
  }

  function stop() {
    running = false;
    if (raf) cancelAnimationFrame(raf);
    // Fade out del fondo
    let alpha = 0.28;
    const fade = () => {
      alpha -= 0.04;
      if (alpha <= 0) {
        bgCanvas.classList.remove('active');
        bgCtx.clearRect(0, 0, W, H);
        return;
      }
      bgCtx.globalAlpha = alpha / 0.28;
      drawFrame();
      bgCtx.globalAlpha = 1;
      requestAnimationFrame(fade);
    };
    fade();
  }

  function loop() {
    if (!running) return;
    updateFrame();
    drawFrame();
    raf = requestAnimationFrame(loop);
  }

  function updateFrame() {
    const freq = engine.getFrequencies();
    const amplitude = engine.getAmplitude();
    const step = Math.max(1, Math.floor(freq.length / COLS));
    for (let c = 0; c < COLS; c++) {
      let sum = 0;
      for (let k = 0; k < step; k++) sum += freq[c * step + k] || 0;
      const val = sum / step / 255;
      targets[c] += (val * (0.95 + amplitude * 0.4) - targets[c]) * 0.35;
      heat[c][ROWS - 1] = Math.min(1, targets[c] * 1.1);
    }
    for (let c = 0; c < COLS; c++) {
      for (let r = 0; r < ROWS - 1; r++) {
        const L = heat[Math.max(0, c-1)][r+1];
        const M = heat[c][r+1];
        const R = heat[Math.min(COLS-1, c+1)][r+1];
        heat[c][r] = (L*0.27 + M*0.50 + R*0.23) * (0.965 - r*0.0018);
      }
    }
  }

  function heatColor(v) {
    let r, g, b, a;
    if (v < 0.20)      { const t=v/0.20;       r=Math.round(t*140);          g=0;                    b=0;               a=0.35+t*0.45; }
    else if (v < 0.45) { const t=(v-0.20)/0.25; r=Math.round(140+t*115);     g=Math.round(t*18);     b=0;               a=0.80+t*0.12; }
    else if (v < 0.70) { const t=(v-0.45)/0.25; r=255;                       g=Math.round(18+t*140); b=0;               a=0.92+t*0.05; }
    else               { const t=(v-0.70)/0.30;  r=255;                       g=Math.round(158+t*97); b=Math.round(t*80);a=0.97; }
    return `rgba(${r},${g},${b},${a})`;
  }

  function drawFrame() {
    bgCtx.clearRect(0, 0, W, H);
    const cellW = W/COLS, cellH = H/ROWS;
    bgCtx.globalAlpha = 0.26;
    for (let c = 0; c < COLS; c++) {
      for (let r = 0; r < ROWS; r++) {
        const v = Math.min(1, heat[c][r]);
        if (v < 0.015) continue;
        bgCtx.fillStyle = heatColor(v);
        bgCtx.fillRect(Math.floor(c*cellW), Math.floor(r*cellH), Math.ceil(cellW)+1, Math.ceil(cellH)+1);
      }
    }
    bgCtx.globalAlpha = 1;
    // Funde parte superior
    const g = bgCtx.createLinearGradient(0,0,0,H*0.45);
    g.addColorStop(0, 'rgba(0,0,0,0.9)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    bgCtx.fillStyle = g;
    bgCtx.fillRect(0, 0, W, H*0.45);
  }

  return { start, stop };
}

/* ══════════════════════════════════════════════
   FONDO — PARTÍCULAS QUE CAEN (LEÓN)
   ══════════════════════════════════════════════ */
function createBgDots() {
  bgCanvas.width  = window.innerWidth;
  bgCanvas.height = window.innerHeight;
  const W = bgCanvas.width, H = bgCanvas.height;

  const NUM = 200;
  const particles = [];

  function newParticle(startY) {
    return {
      x:      Math.random() * W,
      y:      startY !== undefined ? startY : -Math.random() * H,
      vx:     (Math.random() - 0.5) * 0.5,
      vy:     Math.random() * 1.0 + 0.3,
      r:      Math.random() * 3 + 1,
      baseR:  Math.random() * 3 + 1,
      alpha:  Math.random() * 0.5 + 0.3,
      bright: 0,
      hue:    195 + Math.random() * 35,
    };
  }

  for (let i = 0; i < NUM; i++)
    particles.push(newParticle(-Math.random() * H));

  let raf, running = false, tick = 0, masterAlpha = 1;

  function start() {
    running = true;
    masterAlpha = 1;
    bgCanvas.classList.add('active');
    loop();
  }

  function stop() {
    running = false;
    if (raf) cancelAnimationFrame(raf);
    // Fade out
    const fade = () => {
      masterAlpha -= 0.06;
      if (masterAlpha <= 0) {
        bgCanvas.classList.remove('active');
        bgCtx.clearRect(0, 0, W, H);
        return;
      }
      drawFrame(masterAlpha);
      requestAnimationFrame(fade);
    };
    fade();
  }

  function loop() {
    if (!running) return;
    tick++;
    updateParticles();
    drawFrame(1);
    raf = requestAnimationFrame(loop);
  }

  function updateParticles() {
    const freq      = engine.getFrequencies();
    const amplitude = engine.getAmplitude();
    const t         = tick * 0.018;
    const bands     = 32;
    const step      = Math.max(1, Math.floor(freq.length / bands));
    const energy    = new Float32Array(bands);
    for (let b = 0; b < bands; b++) {
      let sum = 0;
      for (let k = 0; k < step; k++) sum += freq[b*step+k] || 0;
      energy[b] = sum / step / 255;
    }

    particles.forEach(p => {
      const bin = Math.min(Math.floor((p.x / W) * bands), bands-1);
      const e   = energy[bin];
      p.bright  = e;

      const speedBoost = 1 + e * 4 * (1 + amplitude * 2);
      p.vy = p.vy * 0.88 + (Math.random() * 1.0 + 0.3) * speedBoost * 0.12;
      p.vx += Math.sin(t + p.y * 0.04) * 0.035;
      p.vx *= 0.97;
      p.x  += p.vx;
      p.y  += p.vy;
      p.r   = p.baseR + e * 5 * (1 + amplitude * 1.5);

      if (p.y > H + 10 || p.x < -10 || p.x > W + 10) {
        const fresh = newParticle();
        Object.assign(p, fresh);
      }
    });
  }

  function drawFrame(master) {
    bgCtx.clearRect(0, 0, W, H);
    particles.forEach(p => {
      const b = p.bright;
      const r = Math.max(0.5, p.r);
      let R, G, B, a;
      if (b < 0.25)      { const t=b/0.25;           R=10+t*30;   G=50+t*100;  B=160+t*80; a=(0.2+t*0.35)*p.alpha; }
      else if (b < 0.6)  { const t=(b-0.25)/0.35;    R=40+t*110;  G=150+t*80;  B=240;      a=(0.55+t*0.3)*p.alpha; }
      else               { const t=(b-0.6)/0.4;       R=150+t*105; G=230+t*25;  B=255;      a=0.85*p.alpha; }

      if (b > 0.2) { bgCtx.shadowBlur = r*3; bgCtx.shadowColor = `hsla(${p.hue},90%,65%,${b*0.5})`; }
      else bgCtx.shadowBlur = 0;

      bgCtx.globalAlpha = Math.min((a || 0.1) * master, 1);
      bgCtx.fillStyle   = `rgb(${Math.round(R)},${Math.round(G)},${Math.round(B)})`;
      bgCtx.beginPath();
      bgCtx.arc(p.x, p.y, r, 0, Math.PI * 2);
      bgCtx.fill();
    });
    bgCtx.globalAlpha = 1;
    bgCtx.shadowBlur  = 0;
  }

  return { start, stop };
}

/* ══════════════════════════════════════════════
   ARRANCAR / DETENER VISUALIZADORES
   ══════════════════════════════════════════════ */
function startAll(index) {
  visualizers.forEach(v => v && v.stop());
  if (bgViz) { bgViz.stop(); bgViz = null; }

  const cardViz = visualizers[index];
  if (cardViz) cardViz.start();

  bgViz = SONGS[index].visualizer === 'bars' ? createBgFire() : createBgDots();
  bgViz.start();

  // Marcar tarjeta como playing
  document.querySelectorAll('.card').forEach((c, i) =>
    c.classList.toggle('playing', i === index)
  );

  updatePlayIcon(true);
}

function stopAll(index) {
  const cardViz = visualizers[index];
  if (cardViz) cardViz.stop();
  if (bgViz)   { bgViz.stop(); bgViz = null; }

  document.querySelectorAll('.card')[index]?.classList.remove('playing');
  updatePlayIcon(false);
}

/* ══════════════════════════════════════════════
   INIT
   ══════════════════════════════════════════════ */
const progressSlider = document.getElementById('progress-slider');
const currentTimeEl  = document.getElementById('current-time');
const durationTimeEl = document.getElementById('duration-time');

function formatTime(sec) {
  if (!isFinite(sec)) return '0:00';

  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);

  return `${m}:${String(s).padStart(2, '0')}`;
} function updateProgressUI() {
  const progress = engine.getProgress();

  progressSlider.value = progress * 100;

  currentTimeEl.textContent =
    formatTime(engine.getCurrentTime());

  durationTimeEl.textContent =
    formatTime(engine.getDuration());

  requestAnimationFrame(updateProgressUI);
}

updateProgressUI();
   async function init() {
  bgCanvas = document.getElementById('bg-canvas');
  bgCtx    = bgCanvas.getContext('2d');

  // 1. Navigator (sin listeners de play — los maneja main.js)
  appNavigator = new Navigator(SONGS, engine);

  // 2. Visualizadores de tarjeta
  SONGS.forEach((song, i) => {
    const canvas = document.getElementById(`canvas-${i}`);
    visualizers.push(
      song.visualizer === 'bars'
        ? new BarsVisualizer(canvas, engine)
        : new WaveVisualizer(canvas, engine)
    );
  });
  progressSlider.addEventListener('input', () => {
  engine.seek(progressSlider.value / 100);
});

  // 3. Cargar primera canción
  const ok = await engine.load(SONGS[0].audio);
  if (!ok) console.warn('[main] No se pudo cargar kiss.mp3 — verifica audio/');

  // 4. Tarjeta inicial
  document.querySelectorAll('.card')[0].classList.add('active');

  // 5. Callbacks del engine
  engine.onPlay  = () => startAll(appNavigator.current);
  engine.onPause = () => stopAll(appNavigator.current);
  engine.onEnd   = () => {
    stopAll(appNavigator.current);
    setTimeout(() => appNavigator.next(), 800);
  };

  // 6. Cuando cambia canción: detener todo
  appNavigator.onChange(index => {
    visualizers.forEach(v => v && v.stop());
    if (bgViz) { bgViz.stop(); bgViz = null; }
    updatePlayIcon(false);
  });

  /* ── BOTÓN PLAY/PAUSE (único listener aquí) ── */
  document.getElementById('btn-play').addEventListener('click', () => {
    engine.toggle();
    // engine.onPlay / engine.onPause se disparan automáticamente
  });

  /* ── HOLD en tarjetas — respuesta inmediata ── */
  document.querySelectorAll('.card').forEach((card, i) => {
    let holdTimer = null;

    const onStart = (e) => {
      if (i !== appNavigator.current) {
        appNavigator.goTo(i);
        return;
      }
      e.preventDefault();
      card.classList.add('touch-hold', 'holding');
      holdTimer = setTimeout(() => {
        if (!engine.isLoaded) return;
        engine.play();  // dispara engine.onPlay → startAll()
      }, 0);
    };

    const onEnd = () => {
      card.classList.remove('touch-hold', 'holding');
      clearTimeout(holdTimer);
      // En táctil: soltar = pausa
      if (window.matchMedia('(pointer:coarse)').matches) {
        engine.pause();  // dispara engine.onPause → stopAll()
      }
    };

    card.addEventListener('mousedown',   onStart);
    card.addEventListener('mouseup',     onEnd);
    card.addEventListener('mouseleave',  onEnd);
    card.addEventListener('touchstart',  onStart, { passive: false });
    card.addEventListener('touchend',    onEnd);
    card.addEventListener('touchcancel', onEnd);
  });

  /* ── Teclado ── */
  document.addEventListener('keydown', (e) => {
    if (e.key === ' ') {
      e.preventDefault();
      engine.toggle();
    }
  });

  /* ── Resize ── */
  window.addEventListener('resize', () => {
    bgCanvas.width  = window.innerWidth;
    bgCanvas.height = window.innerHeight;
    visualizers.forEach(v => v && v._resize && v._resize());
  });

  console.log('[main] ✓ Audio Reactor v4 listo');
}

document.addEventListener('DOMContentLoaded', init);