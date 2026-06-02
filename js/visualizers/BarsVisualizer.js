/**
 * BarsVisualizer.js v3 — KISS
 * Fuego fluido: columnas ALTAS que llenan toda la tarjeta.
 * Colores: negro → rojo oscuro → rojo → naranja → blanco.
 * Se desvanece con fade-out al pausar/detener.
 */

class BarsVisualizer {
  constructor(canvas, engine) {
    this.canvas  = canvas;
    this.ctx2d   = canvas.getContext('2d');
    this.engine  = engine;
    this.running = false;
    this.raf     = null;
    this.tick    = 0;

    // Mapa de calor — más columnas y filas para llamas más detalladas
    this.COLS = 55;
    this.ROWS = 55;
    this.heat    = [];
    this.targets = [];
    this._initHeat();
  }

  _initHeat() {
    for (let c = 0; c < this.COLS; c++) {
      this.heat[c]    = new Float32Array(this.ROWS).fill(0);
      this.targets[c] = 0;
    }
  }

  start() {
    this.running = true;
    this._resize();
    this._loop();
  }

  stop() {
    this.running = false;
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = null;
    this._fadeOut();
  }

  _fadeOut() {
    let alpha = 1;
    const W = this.canvas.width, H = this.canvas.height;
    const fade = () => {
      alpha -= 0.07;
      if (alpha <= 0) {
        this.ctx2d.clearRect(0, 0, W, H);
        // Enfriar mapa de calor
        for (let c = 0; c < this.COLS; c++)
          this.heat[c].fill(0);
        return;
      }
      this.ctx2d.globalAlpha = alpha;
      this._drawHeat();
      this.ctx2d.globalAlpha = 1;
      requestAnimationFrame(fade);
    };
    fade();
  }

  _resize() {
    const rect = this.canvas.parentElement.getBoundingClientRect();
    this.canvas.width  = rect.width  || 310;
    this.canvas.height = rect.height || 380;
  }

  _loop() {
    if (!this.running) return;
    this.tick++;
    this._updateHeat();
    this._drawHeat();
    this.raf = requestAnimationFrame(() => this._loop());
  }

  _updateHeat() {
    const freq      = this.engine.getFrequencies();
    const amplitude = this.engine.getAmplitude();
    const step      = Math.max(1, Math.floor(freq.length / this.COLS));

    // Base de calor desde las frecuencias
    for (let c = 0; c < this.COLS; c++) {
      let sum = 0;
      for (let k = 0; k < step; k++) sum += freq[c * step + k] || 0;
      const val = sum / step / 255;

      // Inercia: sube rápido, baja despacio → llamas persistentes
      const target = val * (0.95 + amplitude * 0.5);
      this.targets[c] += (target - this.targets[c]) * 0.4;

      // La base siempre caliente al 100% del target
      this.heat[c][this.ROWS - 1] = Math.min(1, this.targets[c] * 1.15);
    }

    // Propagación hacia arriba con difusión lateral (viento)
    for (let c = 0; c < this.COLS; c++) {
      for (let r = 0; r < this.ROWS - 1; r++) {
        const L = this.heat[Math.max(0, c - 1)][r + 1];
        const M = this.heat[c][r + 1];
        const R = this.heat[Math.min(this.COLS - 1, c + 1)][r + 1];
        // Viento leve hacia la izquierda + algo de aleatoriedad
        const spread = L * 0.27 + M * 0.50 + R * 0.23;
        // Enfriamiento muy lento para que las llamas sean LARGAS
        const cool = 0.965 - r * 0.0018;
        this.heat[c][r] = spread * cool;
      }
    }
  }

  _drawHeat() {
    const { ctx2d, canvas } = this;
    const W = canvas.width;
    const H = canvas.height;
    const cellW = W / this.COLS;
    const cellH = H / this.ROWS;

    ctx2d.clearRect(0, 0, W, H);

    for (let c = 0; c < this.COLS; c++) {
      for (let r = 0; r < this.ROWS; r++) {
        const v = Math.min(1, Math.max(0, this.heat[c][r]));
        if (v < 0.012) continue;

        ctx2d.fillStyle = this._heatColor(v);
        // Sin padding para que las celdas se unan y parezca fluido
        ctx2d.fillRect(
          Math.floor(c * cellW),
          Math.floor(r * cellH),
          Math.ceil(cellW) + 1,
          Math.ceil(cellH) + 1
        );
      }
    }

    // Degradé superior: funde las puntas de las llamas en negro
    const topGrad = ctx2d.createLinearGradient(0, 0, 0, H * 0.55);
    topGrad.addColorStop(0,   'rgba(0,0,0,0.92)');
    topGrad.addColorStop(0.6, 'rgba(0,0,0,0.2)');
    topGrad.addColorStop(1,   'rgba(0,0,0,0)');
    ctx2d.fillStyle = topGrad;
    ctx2d.fillRect(0, 0, W, H * 0.55);
  }

  /* Paleta de fuego:
     negro → rojo oscuro → rojo → naranja → amarillo → blanco */
  _heatColor(v) {
    let r, g, b, a;

    if (v < 0.20) {
      const t = v / 0.20;
      r = Math.round(t * 140);
      g = 0; b = 0;
      a = 0.35 + t * 0.45;
    } else if (v < 0.45) {
      const t = (v - 0.20) / 0.25;
      r = Math.round(140 + t * 115);
      g = Math.round(t * 18);
      b = 0;
      a = 0.80 + t * 0.12;
    } else if (v < 0.70) {
      const t = (v - 0.45) / 0.25;
      r = 255;
      g = Math.round(18 + t * 140);
      b = 0;
      a = 0.92 + t * 0.05;
    } else if (v < 0.88) {
      const t = (v - 0.70) / 0.18;
      r = 255;
      g = Math.round(158 + t * 80);
      b = Math.round(t * 60);
      a = 0.97;
    } else {
      const t = (v - 0.88) / 0.12;
      r = 255;
      g = Math.round(238 + t * 17);
      b = Math.round(60 + t * 195);
      a = 1;
    }

    return `rgba(${r},${g},${b},${a})`;
  }
}