/**
 * main.js
 * Punto de entrada. Instancia el engine, los visualizadores y el navegador.
 * Conecta todo y arranca el loop de animación.
 */

/* ── Metadata de canciones ── */
const SONGS = [
  {
    index:  0,
    title:  'I Was Made For Lovin\' You',
    artist: 'KISS',
    audio:  'audio/kiss.mp3',
    img:    'img/kiss.jpg',
    theme:  'kiss',                // clase CSS body.theme-kiss
    visualizer: 'bars',            // qué visualizador usar
  },
  {
    index:  1,
    title:  'Locos',
    artist: 'León Larregui',
    audio:  'audio/leon.mp3',
    img:    'img/leon.jpg',
    theme:  'leon',
    visualizer: 'wave',
  },
];

/* ── Instancias globales ── */
const engine    = new AudioEngine();
let   navigator = null;

/* Lista de visualizadores activos (uno por tarjeta) */
const visualizers = [];

/* ── Inicializar todo ── */
async function init() {
  // 1. Crear navigator (maneja UI + eventos)
  navigator = new Navigator(SONGS, engine);

  // 2. Crear un visualizador por cada canción
  SONGS.forEach((song, i) => {
    const canvas = document.getElementById(`canvas-${i}`);
    let viz;

    if (song.visualizer === 'bars') {
      viz = new BarsVisualizer(canvas, engine);
    } else if (song.visualizer === 'wave') {
      viz = new WaveVisualizer(canvas, engine);
    }

    visualizers.push(viz);
  });

  // 3. Cargar la primera canción
  const loaded = await engine.load(SONGS[0].audio);
  if (!loaded) {
    console.warn('[main] No se pudo cargar la primera canción. Verifica que audio/kiss.mp3 exista.');
  }

  // 4. Activar tarjeta inicial
  const cards = document.querySelectorAll('.card');
  cards[0].classList.add('active');

  // 5. Cuando cambie de canción: cambiar visualizador activo
  navigator.onChange((index) => {
    // Detener todos los visualizadores
    visualizers.forEach(v => v && v.stop());

    // El visualizador del índice nuevo ya se activa cuando empiece el audio
    // (el play lo dispara el usuario con hold/click en btnPlay)
  });

  // 6. Escuchar play/pause para arrancar/detener visualizadores
  engine.onPlay = () => {
    visualizers.forEach(v => v && v.stop());
    const currentViz = visualizers[navigator.current];
    if (currentViz) currentViz.start();
    document.getElementById('btn-play').innerHTML = '&#9646;&#9646;';
  };

  engine.onPause = () => {
    const currentViz = visualizers[navigator.current];
    if (currentViz) currentViz.stop();
    document.getElementById('btn-play').innerHTML = '&#9654;';
  };

  // 7. Redimensionar canvas si cambia el tamaño de ventana
  window.addEventListener('resize', () => {
    visualizers.forEach(v => {
      if (v && v._resize) v._resize();
    });
  });

  console.log('[main] Audio Reactor listo. Mantén el mouse sobre la tarjeta activa para reproducir.');
}

/* ── Arrancar cuando el DOM esté listo ── */
document.addEventListener('DOMContentLoaded', init);