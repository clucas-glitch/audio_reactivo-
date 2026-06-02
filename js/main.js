/**
 * main.js v2
 * - Respuesta INMEDIATA al hover/touch (sin delay)
 * - Visualizador en el FONDO también
 * - Iconos SVG en play/pause
 */

/* ── Metadata de canciones ── */
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

/* ── Instancias globales ── */
const engine      = new AudioEngine();
let   appNavigator = null;
const visualizers  = [];

/* ── Canvas de FONDO ── */
let bgCanvas, bgCtx, bgViz = null;

/* ══════════════════════════════════════
   VISUALIZADOR DE FONDO
   Versión simplificada que dibuja el mismo
   efecto pero grande, oscuro y difuminado
   ══════════════════════════════════════ */
function createBgVisualizer(type) {
  const W = bgCanvas.width  = window.innerWidth;
  const H = bgCanvas.height = window.innerHeight;

  let raf = null;
  let running = false;
  let tick = 0;

  function start() {
    running = true;
    bgCanvas.classList.add('active');
    loop();
  }

  function stop() {
    running = false;
    bgCanvas.classList.remove('active');
    if (raf) cancelAnimationFrame(raf);
    bgCtx.clearRect(0, 0, W, H);
  }

  function loop() {
    if (!running) return;
    tick++;
    draw();
    raf = requestAnimationFrame(loop);
  }

  function draw() {
    bgCtx.clearRect(0, 0, W, H);

    if (type === 'bars') drawBars();
    else                 drawWave();
  }

  function drawBars() {
    const freq      = engine.getFrequencies();
    const numBars   = 80;
    const step      = Math.floor(freq.length / numBars);
    const barW      = W / numBars;
    const amplitude = engine.getAmplitude();

    bgCtx.globalAlpha = 0.22;

    for (let i = 0; i < numBars; i++) {
      let sum = 0;
      for (let k = 0; k < step; k++) sum += freq[i * step + k];
      const val  = sum / step / 255;
      const barH = val * H * 1.1;
      const x    = i * barW;

      const grad = bgCtx.createLinearGradient(x, H - barH, x, H);
      grad.addColorStop(0, `rgba(255,60,60,${val * 0.9})`);
      grad.addColorStop(1, 'rgba(100,0,0,0)');

      bgCtx.fillStyle = grad;
      bgCtx.fillRect(x, H - barH, barW - 1, barH);
    }

    bgCtx.globalAlpha = 1;
  }

  function drawWave() {
    const wave      = engine.getWaveform();
    const freq      = engine.getFrequencies();
    const amplitude = engine.getAmplitude();
    const CX = W / 2, CY = H / 2;
    const baseR = Math.min(W, H) * 0.32;

    bgCtx.globalAlpha = 0.18;

    // Onda circular grande en el fondo
    for (let pass = 0; pass < 2; pass++) {
      const len = wave.length;
      bgCtx.strokeStyle = pass === 0 ? '#4ecdc4' : '#a29bfe';
      bgCtx.lineWidth   = pass === 0 ? 3 : 2;
      bgCtx.shadowBlur  = 30;
      bgCtx.shadowColor = pass === 0 ? '#4ecdc4' : '#a29bfe';

      bgCtx.beginPath();
      for (let i = 0; i < len; i++) {
        const angle  = (i / len) * Math.PI * 2;
        const sample = (wave[i] / 128.0 - 1.0);
        const r      = baseR + sample * 80 * (1 + amplitude * 3);
        const x      = CX + Math.cos(angle) * r;
        const y      = CY + Math.sin(angle) * r;
        i === 0 ? bgCtx.moveTo(x, y) : bgCtx.lineTo(x, y);
      }
      bgCtx.closePath();
      bgCtx.stroke();
    }

    bgCtx.shadowBlur  = 0;
    bgCtx.globalAlpha = 1;
  }

  return { start, stop };
}

/* ══════════════════════════════════════
   ACTUALIZAR ÍCONO PLAY / PAUSE
   ══════════════════════════════════════ */
function updatePlayIcon(playing) {
  const btnPlay   = document.getElementById('btn-play');
  const iconPlay  = btnPlay.querySelector('.icon-play');
  const iconPause = btnPlay.querySelector('.icon-pause');
  if (playing) {
    iconPlay.style.display  = 'none';
    iconPause.style.display = 'block';
  } else {
    iconPlay.style.display  = 'block';
    iconPause.style.display = 'none';
  }
}

/* ══════════════════════════════════════
   INIT
   ══════════════════════════════════════ */
async function init() {
  bgCanvas = document.getElementById('bg-canvas');
  bgCtx    = bgCanvas.getContext('2d');

  // 1. Navigator
  appNavigator = new Navigator(SONGS, engine);

  // 2. Visualizadores de tarjeta
  SONGS.forEach((song, i) => {
    const canvas = document.getElementById(`canvas-${i}`);
    let viz;
    if (song.visualizer === 'bars') viz = new BarsVisualizer(canvas, engine);
    else                             viz = new WaveVisualizer(canvas, engine);
    visualizers.push(viz);
  });

  // 3. Cargar primera canción
  const ok = await engine.load(SONGS[0].audio);
  if (!ok) console.warn('[main] No se pudo cargar kiss.mp3 — verifica la carpeta audio/');

  // 4. Tarjeta inicial activa
  document.querySelectorAll('.card')[0].classList.add('active');

  // 5. Cambio de canción → recrear visualizador de fondo
  appNavigator.onChange((index) => {
    visualizers.forEach(v => v && v.stop());
    if (bgViz) bgViz.stop();
    bgViz = null;
  });

  // 6. ON PLAY → arrancar visualizadores + fondo INMEDIATO
  engine.onPlay = () => {
    // Tarjeta
    visualizers.forEach(v => v && v.stop());
    const cardViz = visualizers[appNavigator.current];
    if (cardViz) cardViz.start();

    // Fondo
    if (bgViz) bgViz.stop();
    bgViz = createBgVisualizer(SONGS[appNavigator.current].visualizer);
    bgViz.start();

    // Icono
    updatePlayIcon(true);
  };

  // 7. ON PAUSE → detener todo
  engine.onPause = () => {
    const cardViz = visualizers[appNavigator.current];
    if (cardViz) cardViz.stop();
    if (bgViz)   bgViz.stop();
    updatePlayIcon(false);
  };

  // 8. Resize
  window.addEventListener('resize', () => {
    if (bgCanvas) {
      bgCanvas.width  = window.innerWidth;
      bgCanvas.height = window.innerHeight;
    }
    visualizers.forEach(v => v && v._resize && v._resize());
  });

  /* ── HOLD INMEDIATO en tarjetas ──
     El audio arranca en cuanto el usuario
     pone el dedo/mouse. Sin delay.         */
  document.querySelectorAll('.card').forEach((card, i) => {
    let holdTimer = null;

    const onStart = (e) => {
      if (i !== appNavigator.current) {
        appNavigator.goTo(i);
        return;
      }
      e.preventDefault();
      card.classList.add('touch-hold', 'holding');

      // Arrancar inmediatamente (0 ms de delay)
      holdTimer = setTimeout(() => {
        if (!engine.isLoaded) return;
        engine.play();
        card.classList.add('playing');
      }, 0);
    };

    const onEnd = () => {
      card.classList.remove('touch-hold', 'holding');
      clearTimeout(holdTimer);
      // En táctil: soltar pausa
      if (window.matchMedia('(pointer:coarse)').matches) {
        engine.pause();
        card.classList.remove('playing');
      }
    };

    card.addEventListener('mousedown',  onStart);
    card.addEventListener('mouseup',    onEnd);
    card.addEventListener('mouseleave', onEnd);
    card.addEventListener('touchstart', onStart, { passive: false });
    card.addEventListener('touchend',   onEnd);
    card.addEventListener('touchcancel',onEnd);
  });

  // Botón play de la barra también actualiza clase .playing en la tarjeta
  const btnPlay = document.getElementById('btn-play');
  btnPlay.addEventListener('click', () => {
    engine.toggle();
    const card = document.querySelectorAll('.card')[appNavigator.current];
    card.classList.toggle('playing', engine.isPlaying);
  });

  engine.onEnd = () => {
    document.querySelectorAll('.card')[appNavigator.current].classList.remove('playing');
    updatePlayIcon(false);
    setTimeout(() => appNavigator.next(), 800);
  };

  console.log('[main] ✓ Audio Reactor v2 listo');
}

document.addEventListener('DOMContentLoaded', init);