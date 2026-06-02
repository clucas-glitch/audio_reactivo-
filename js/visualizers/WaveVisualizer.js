/**
 * WaveVisualizer.js v3 — León Larregui / Locos
 * Partículas que CAEN desde arriba en toda la pantalla.
 * Tamaño y velocidad reaccionan a la frecuencia.
 * Se detienen/desvanecen al pausar o cambiar canción.
 */

class WaveVisualizer {
  constructor(canvas, engine) {
    this.canvas  = canvas;
    this.ctx2d   = canvas.getContext('2d');
    this.engine  = engine;
    this.running = false;
    this.raf     = null;
    this.tick    = 0;
    this.fading  = false;   // true cuando está en pausa o stop
    this.globalAlpha = 1;

    this.particles = [];
   this.maxParticles =
  window.innerWidth < 768
    ? 180
    : 320;
  }

  start() {
    this.running     = true;
    this.fading      = false;
    this.globalAlpha = 1;
    this._resize();
    this._spawnInitial();
    this._loop();
  }

  stop() {
    this.running = false;
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = null;
    // Fade out rápido y limpiar
    this._fadeOut();
  }

  _fadeOut() {
    this.fading = true;
    this.globalAlpha = 1;
    const fade = () => {
      this.globalAlpha -= 0.06;
      if (this.globalAlpha <= 0) {
        this.ctx2d.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.fading = false;
        this.particles = [];
        return;
      }
      this._drawParticles(this.globalAlpha);
      requestAnimationFrame(fade);
    };
    fade();
  }

  _resize() {
    const rect = this.canvas.parentElement.getBoundingClientRect();
    this.canvas.width  = rect.width  || 310;
    this.canvas.height = rect.height || 380;
  }

  /* ── Crea partículas iniciales distribuidas en toda la parte superior ── */
  _spawnInitial() {
    const W = this.canvas.width;
    this.particles = [];
    for (let i = 0; i < this.maxParticles; i++) {
      this.particles.push(this._newParticle(
        Math.random() * W,
        -Math.random() * this.canvas.height  // esparcidas fuera de pantalla arriba
      ));
    }
  }

  _newParticle(x, y) {
    return {
      x:     x !== undefined ? x : Math.random() * (this.canvas.width || 310),
      y:     y !== undefined ? y : -Math.random() * 20,
      vx:    (Math.random() - 0.5) * 0.15,
      vy:    Math.random() * 0.6 + 0.2,     // velocidad de caída base
r: Math.random() * 4 + 3,
baseR: Math.random() * 4 + 3,
      alpha: Math.random() * 0.4 + 0.8,
      // Qué frecuencia la controla (distribuida por posición X)
      freqBin: 0,
      bright: 0,
      // Variación de color: azul frío, azul eléctrico, blanco
      hue: 190 + Math.random() * 40,
    };
  }

  _loop() {
    if (!this.running) return;
    this.tick++;
    this._update();
    this._drawParticles(1);
    this.raf = requestAnimationFrame(() => this._loop());
  }

  _update() {
    const W         = this.canvas.width;
    const H         = this.canvas.height;
    const freq      = this.engine.getFrequencies();
    const amplitude = this.engine.getAmplitude();
    const t         = this.tick * 0.018;

    // Energía por banda (mapea al eje X)
    const bands = 32;
    const step  = Math.max(1, Math.floor(freq.length / bands));
    const energy = new Float32Array(bands);
    for (let b = 0; b < bands; b++) {
      let sum = 0;
      for (let k = 0; k < step; k++) sum += freq[b * step + k] || 0;
      energy[b] = sum / step / 255;
    }

    this.particles.forEach(p => {
      // Banda de frecuencia según posición X
      const bin    = Math.floor((p.x / W) * bands);
      const e      = energy[Math.min(bin, bands - 1)];
      p.bright     = e;
      p.freqBin    = bin;

      // La frecuencia acelera la caída y aumenta el tamaño
      const speedBoost = 1 + e * 3.5 * (1 + amplitude * 2);
      p.vy = (p.vy * 0.85) + ((Math.random() * 1.2 + 0.4) * speedBoost * 0.15);

      // Oscilación horizontal suave
      p.vx += Math.sin(t + p.y * 0.04) * 0.04;
      p.vx *= 0.96;

      p.x += p.vx;
      p.y += p.vy;

      // Tamaño pulsante con la frecuencia
     p.r = p.baseR + e * 10 * (1 + amplitude * 2.5);

      // Reciclar partícula cuando sale por abajo
      if (p.y > H + 10 || p.x < -10 || p.x > W + 10) {
        // Renace arriba en posición X aleatoria
        const fresh = this._newParticle();
        p.x      = fresh.x;
        p.y      = -fresh.r;
        p.vx     = fresh.vx;
        p.vy     = fresh.vy;
        p.r      = fresh.r;
        p.baseR  = fresh.baseR;
        p.alpha  = fresh.alpha;
        p.hue    = fresh.hue;
        p.bright = 0;
      }
    });
  }

  _drawParticles(masterAlpha) {
    const { ctx2d, canvas } = this;
    const W = canvas.width, H = canvas.height;

    ctx2d.clearRect(0, 0, W, H);
    const glow = ctx2d.createRadialGradient(
  W / 2,
  H / 2,
  10,
  W / 2,
  H / 2,
  W
);

glow.addColorStop(0,'rgba(100,200,255,0.25)');
glow.addColorStop(1,'rgba(0,0,0,0)');

ctx2d.fillStyle = glow;
ctx2d.fillRect(0,0,W,H);
const overlay = ctx2d.createLinearGradient(
  0,
  0,
  0,
  H
);

overlay.addColorStop(0,'rgba(80,180,255,0.20)');
overlay.addColorStop(0.5,'rgba(80,180,255,0.12)');
overlay.addColorStop(1,'rgba(0,0,0,0)');

overlay.addColorStop(0,'rgba(80,180,255,0.15)');
overlay.addColorStop(1,'rgba(0,0,0,0)');

ctx2d.fillStyle = overlay;
ctx2d.fillRect(0,0,W,H);

    this.particles.forEach(p => {
      const b = p.bright;
      const r = Math.max(0.5, p.r);

      // Color: azul oscuro → azul eléctrico → blanco
      let R, G, B, a;
      if (b < 0.25) {
        const t = b / 0.25;
        R = Math.round(10  + t * 30);
        G = Math.round(50  + t * 100);
        B = Math.round(160 + t * 80);
        a = (0.25 + t * 0.4) * p.alpha;
      } else if (b < 0.6) {
        const t = (b - 0.25) / 0.35;
        R = Math.round(40  + t * 110);
        G = Math.round(150 + t * 80);
        B = 240;
        a = (0.65 + t * 0.25) * p.alpha;
      } else {
        const t = (b - 0.6) / 0.4;
        R = Math.round(150 + t * 105);
        G = Math.round(230 + t * 25);
        B = 255;
        a = 0.9 * p.alpha;
      }

      // Glow en partículas activas
      if (b > 0.2) {
        ctx2d.shadowBlur  = r * 4;
        ctx2d.shadowColor = `hsla(${p.hue}, 90%, 65%, ${b * 0.7})`;
      } else {
        ctx2d.shadowBlur = 0;
      }

      ctx2d.globalAlpha = Math.min(a *2* masterAlpha, 1);
      ctx2d.fillStyle   = `rgb(${R},${G},${B})`;
      ctx2d.beginPath();
      ctx2d.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx2d.fill();
    });

    ctx2d.globalAlpha = 1;
    ctx2d.shadowBlur  = 0;
  }
}