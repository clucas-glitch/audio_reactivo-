/**
 * BarsVisualizer.js
 * Visualizador de barras verticales — tema KISS (rojo/negro).
 * Se dibuja sobre un <canvas> específico de la tarjeta.
 */

class BarsVisualizer {
  /**
   * @param {HTMLCanvasElement} canvas  — el canvas de la tarjeta
   * @param {AudioEngine}       engine  — instancia compartida del motor de audio
   */
  constructor(canvas, engine) {
    this.canvas = canvas;
    this.ctx2d = canvas.getContext('2d');
    this.engine = engine;
    this.running = false;
    this.raf = null;

    // Colores del tema KISS
    this.colors = {
      barTop:    '#ff4444',
      barMid:    '#cc1111',
      barBot:    '#660000',
      glow:      'rgba(255, 60, 60, 0.45)',
      bg:        'rgba(0, 0, 0, 0.0)',   // transparente: se ve la portada debajo
    };
  }

  /* ── Inicia el loop de dibujo ── */
  start() {
    this.running = true;
    this._resize();
    this._loop();
  }

  /* ── Detiene el loop ── */
  stop() {
    this.running = false;
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = null;
    this._clear();
  }

  /* ── Ajusta tamaño del canvas al contenedor ── */
  _resize() {
    const rect = this.canvas.parentElement.getBoundingClientRect();
    this.canvas.width  = rect.width  || 310;
    this.canvas.height = rect.height || 380;
  }

  /* ── Loop principal ── */
  _loop() {
    if (!this.running) return;
    this._draw();
    this.raf = requestAnimationFrame(() => this._loop());
  }

  /* ── Limpia el canvas ── */
  _clear() {
    const { ctx2d, canvas } = this;
    ctx2d.clearRect(0, 0, canvas.width, canvas.height);
  }

  /* ── Dibuja el frame ── */
  _draw() {
    const { ctx2d, canvas, engine, colors } = this;
    const W = canvas.width;
    const H = canvas.height;

    this._clear();

    const freqData = engine.getFrequencies();
    const numBars  = 48;
    const barW     = (W / numBars) * 0.6;
    const gap      = (W / numBars) * 0.4;
    const step     = Math.floor(freqData.length / numBars);

    for (let i = 0; i < numBars; i++) {
      // Promedia un pequeño bloque de bins para suavizar
      let sum = 0;
      for (let k = 0; k < step; k++) sum += freqData[i * step + k];
      const val = sum / step / 255;

      const barH  = val * H * 0.85;
      const x     = i * (barW + gap) + gap / 2;
      const y     = H - barH;

      // Gradiente por barra
      const grad = ctx2d.createLinearGradient(x, y, x, H);
      grad.addColorStop(0,   colors.barTop);
      grad.addColorStop(0.5, colors.barMid);
      grad.addColorStop(1,   colors.barBot);

      // Glow exterior
      ctx2d.shadowBlur  = 14;
      ctx2d.shadowColor = colors.glow;

      ctx2d.fillStyle = grad;
      ctx2d.beginPath();
      ctx2d.roundRect(x, y, barW, barH, [3, 3, 0, 0]);
      ctx2d.fill();

      // Capuchón reflejo (pequeño rectángulo brillante arriba)
      if (barH > 6) {
        ctx2d.shadowBlur = 0;
        ctx2d.fillStyle = 'rgba(255,180,180,0.55)';
        ctx2d.fillRect(x, y, barW, 2);
      }
    }

    ctx2d.shadowBlur = 0;

    // Línea de baseline
    ctx2d.strokeStyle = 'rgba(255,60,60,0.3)';
    ctx2d.lineWidth   = 1;
    ctx2d.beginPath();
    ctx2d.moveTo(0, H - 1);
    ctx2d.lineTo(W, H - 1);
    ctx2d.stroke();
  }
}