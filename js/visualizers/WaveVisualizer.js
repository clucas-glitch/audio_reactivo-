/**
 * WaveVisualizer.js
 * Visualizador de onda circular + partículas — tema León / Locos (teal / morado).
 * Se dibuja sobre el <canvas> de la tarjeta.
 */

class WaveVisualizer {
  /**
   * @param {HTMLCanvasElement} canvas
   * @param {AudioEngine}       engine
   */
  constructor(canvas, engine) {
    this.canvas = canvas;
    this.ctx2d  = canvas.getContext('2d');
    this.engine = engine;
    this.running = false;
    this.raf     = null;
    this.tick    = 0;

    // Partículas flotantes
    this.particles = [];

    // Colores tema LOCOS
    this.colors = {
      wave1: '#4ecdc4',
      wave2: '#a29bfe',
      glow1: 'rgba(78,205,196,0.5)',
      glow2: 'rgba(162,155,254,0.4)',
      part:  ['#4ecdc4','#a29bfe','#f8c8ff','#74b9ff'],
    };
  }

  start() {
    this.running = true;
    this._resize();
    this._initParticles();
    this._loop();
  }

  stop() {
    this.running = false;
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = null;
    this._clear();
  }

  _resize() {
    const rect = this.canvas.parentElement.getBoundingClientRect();
    this.canvas.width  = rect.width  || 310;
    this.canvas.height = rect.height || 380;
  }

  _clear() {
    this.ctx2d.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  /* ── Inicializa partículas ── */
  _initParticles() {
    this.particles = [];
    const W = this.canvas.width;
    const H = this.canvas.height;
    for (let i = 0; i < 30; i++) {
      this.particles.push({
        x:  Math.random() * W,
        y:  Math.random() * H,
        r:  Math.random() * 2.5 + 0.5,
        vx: (Math.random() - 0.5) * 0.4,
        vy: -Math.random() * 0.6 - 0.2,
        alpha: Math.random(),
        color: this.colors.part[Math.floor(Math.random() * this.colors.part.length)],
      });
    }
  }

  _loop() {
    if (!this.running) return;
    this.tick++;
    this._draw();
    this.raf = requestAnimationFrame(() => this._loop());
  }

  _draw() {
    const { ctx2d, canvas, engine, colors, tick } = this;
    const W  = canvas.width;
    const H  = canvas.height;
    const CX = W / 2;
    const CY = H / 2;

    this._clear();

    const freqData  = engine.getFrequencies();
    const waveData  = engine.getWaveform();
    const amplitude = engine.getAmplitude();
    const len       = waveData.length;

    /* ── 1. Onda circular principal ── */
    const baseR = Math.min(W, H) * 0.28;

    for (let pass = 0; pass < 2; pass++) {
      const offset = pass === 0 ? 0 : Math.PI / len;
      const colorA = pass === 0 ? colors.wave1 : colors.wave2;
      const glowA  = pass === 0 ? colors.glow1 : colors.glow2;

      ctx2d.shadowBlur  = 18;
      ctx2d.shadowColor = glowA;
      ctx2d.strokeStyle = colorA;
      ctx2d.lineWidth   = pass === 0 ? 2 : 1.5;
      ctx2d.globalAlpha = pass === 0 ? 1 : 0.7;

      ctx2d.beginPath();
      for (let i = 0; i < len; i++) {
        const angle = (i / len) * Math.PI * 2 + offset;
        const sample = (waveData[i] / 128.0 - 1.0);   // -1 a 1
        const r = baseR + sample * 40 * (1 + amplitude * 2);
        const x = CX + Math.cos(angle) * r;
        const y = CY + Math.sin(angle) * r;
        if (i === 0) ctx2d.moveTo(x, y);
        else         ctx2d.lineTo(x, y);
      }
      ctx2d.closePath();
      ctx2d.stroke();
    }

    ctx2d.globalAlpha = 1;
    ctx2d.shadowBlur  = 0;

    /* ── 2. Barras de frecuencia radiales (exterior) ── */
    const numBars = 64;
    const step    = Math.floor(freqData.length / numBars);

    for (let i = 0; i < numBars; i++) {
      let sum = 0;
      for (let k = 0; k < step; k++) sum += freqData[i * step + k];
      const val   = sum / step / 255;
      const angle = (i / numBars) * Math.PI * 2 - Math.PI / 2;
      const r1    = baseR + 8;
      const r2    = r1 + val * 55 * (1 + amplitude);

      const t     = i / numBars;
      // Interpolación de color entre teal y morado
      const r_c   = Math.round(78  + (162 - 78)  * t);
      const g_c   = Math.round(205 + (155 - 205) * t);
      const b_c   = Math.round(196 + (254 - 196) * t);
      const color = `rgba(${r_c},${g_c},${b_c},0.85)`;

      ctx2d.shadowBlur  = 8;
      ctx2d.shadowColor = color;
      ctx2d.strokeStyle = color;
      ctx2d.lineWidth   = 2;

      ctx2d.beginPath();
      ctx2d.moveTo(CX + Math.cos(angle) * r1, CY + Math.sin(angle) * r1);
      ctx2d.lineTo(CX + Math.cos(angle) * r2, CY + Math.sin(angle) * r2);
      ctx2d.stroke();
    }

    ctx2d.shadowBlur = 0;

    /* ── 3. Círculo central pulsante ── */
    const pulseR = (baseR * 0.28) + amplitude * 20;
    const grad   = ctx2d.createRadialGradient(CX, CY, 0, CX, CY, pulseR);
    grad.addColorStop(0, 'rgba(162,155,254,0.9)');
    grad.addColorStop(1, 'rgba(78,205,196,0.0)');

    ctx2d.shadowBlur  = 20;
    ctx2d.shadowColor = colors.glow2;
    ctx2d.fillStyle   = grad;
    ctx2d.beginPath();
    ctx2d.arc(CX, CY, pulseR, 0, Math.PI * 2);
    ctx2d.fill();
    ctx2d.shadowBlur = 0;

    /* ── 4. Partículas flotantes ── */
    this.particles.forEach(p => {
      p.x += p.vx + Math.sin(tick * 0.02 + p.y * 0.01) * 0.3;
      p.y += p.vy - amplitude * 1.5;
      p.alpha += 0.005;

      if (p.y < -10 || p.alpha > 1.2) {
        p.x     = Math.random() * W;
        p.y     = H + 5;
        p.alpha = 0;
      }

      ctx2d.globalAlpha = Math.min(p.alpha, 1) * 0.75;
      ctx2d.fillStyle   = p.color;
      ctx2d.shadowBlur  = 6;
      ctx2d.shadowColor = p.color;
      ctx2d.beginPath();
      ctx2d.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx2d.fill();
    });

    ctx2d.globalAlpha = 1;
    ctx2d.shadowBlur  = 0;
  }
}