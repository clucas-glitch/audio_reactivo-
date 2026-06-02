/**
 * AudioEngine.js
 * Maneja la carga de audio, FFT, amplitud y reproducción.
 * Usa Web Audio API directamente (sin p5.sound) para mayor control.
 */

class AudioEngine {
  constructor() {
    this.ctx = null;          // AudioContext
    this.source = null;       // BufferSourceNode activo
    this.analyser = null;     // AnalyserNode
    this.gainNode = null;     // GainNode para volumen
    this.buffer = null;       // AudioBuffer decodificado
    this.startTime = 0;       // Timestamp cuando empezó
    this.pauseOffset = 0;     // Offset para reanudar
    this.isPlaying = false;
    this.isLoaded = false;

    // Datos de análisis
    this.fftSize = 256;
    this.freqData = null;     // Uint8Array con frecuencias
    this.timeData = null;     // Uint8Array con forma de onda

    // Callbacks externos
    this.onPlay = null;
    this.onPause = null;
    this.onEnd = null;
  }

  /* ── Inicializar contexto (debe llamarse tras gesto del usuario) ── */
  init() {
    if (this.ctx) return;
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = this.fftSize;
    this.analyser.smoothingTimeConstant = 0.82;

    this.gainNode = this.ctx.createGain();
    this.gainNode.gain.value = 0.8;

    // Cadena: source → analyser → gain → destino
    this.analyser.connect(this.gainNode);
    this.gainNode.connect(this.ctx.destination);

    const bufLen = this.analyser.frequencyBinCount;
    this.freqData = new Uint8Array(bufLen);
    this.timeData = new Uint8Array(bufLen);
  }

  /* ── Cargar archivo de audio desde URL ── */
  async load(url) {
    this.init();
    this.stop();
    this.isLoaded = false;

    try {
      const resp = await fetch(url);
      const arrayBuffer = await resp.arrayBuffer();
      this.buffer = await this.ctx.decodeAudioData(arrayBuffer);
      this.pauseOffset = 0;
      this.isLoaded = true;
      console.log(`[AudioEngine] Cargado: ${url}`);
      return true;
    } catch (err) {
      console.error('[AudioEngine] Error cargando audio:', err);
      return false;
    }
  }

  /* ── Play ── */
  play() {
    if (!this.isLoaded || this.isPlaying) return;
    this.ctx.resume();

    this.source = this.ctx.createBufferSource();
    this.source.buffer = this.buffer;
    this.source.connect(this.analyser);
    this.source.onended = () => {
      if (this.isPlaying) {
        this.isPlaying = false;
        this.pauseOffset = 0;
        if (this.onEnd) this.onEnd();
      }
    };

    this.source.start(0, this.pauseOffset);
    this.startTime = this.ctx.currentTime - this.pauseOffset;
    this.isPlaying = true;

    if (this.onPlay) this.onPlay();
  }

  /* ── Pause ── */
  pause() {
    if (!this.isPlaying) return;
    this.pauseOffset = this.ctx.currentTime - this.startTime;
    this.source.stop();
    this.isPlaying = false;
    if (this.onPause) this.onPause();
  }

  /* ── Toggle play/pause ── */
  toggle() {
    if (this.isPlaying) this.pause();
    else this.play();
  }

  /* ── Stop completo ── */
  stop() {
    if (this.source) {
      try { this.source.stop(); } catch(e) {}
      this.source = null;
    }
    this.isPlaying = false;
    this.pauseOffset = 0;
  }

  /* ── Volumen 0–1 ── */
  setVolume(v) {
    if (this.gainNode) this.gainNode.gain.value = Math.max(0, Math.min(1, v));
  }

  /* ── Leer datos de frecuencia (llamar en cada frame) ── */
  getFrequencies() {
    if (!this.analyser) return this.freqData;
    this.analyser.getByteFrequencyData(this.freqData);
    return this.freqData;
  }

  /* ── Leer forma de onda ── */
  getWaveform() {
    if (!this.analyser) return this.timeData;
    this.analyser.getByteTimeDomainData(this.timeData);
    return this.timeData;
  }

  /* ── Amplitud promedio (0–1) ── */
  getAmplitude() {
    const data = this.getFrequencies();
    if (!data.length) return 0;
    let sum = 0;
    for (let i = 0; i < data.length; i++) sum += data[i];
    return sum / (data.length * 255);
  }

  /* ── Progreso de reproducción (0–1) ── */
  getProgress() {
    if (!this.buffer || !this.ctx) return 0;
    if (!this.isPlaying) return this.pauseOffset / this.buffer.duration;
    return (this.ctx.currentTime - this.startTime) / this.buffer.duration;
  }
}