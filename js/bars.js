// ═══════════════════════════════════════════════════════════════
//  waves.js  –  Visualizador circular de audio reactivo (p5.js)
//  Canción: Corazones – Motel
//  Anillos concéntricos con ondas sinusoidales rojas/amarillas
// ═══════════════════════════════════════════════════════════════

const AUDIO_PATH = "/audio/Corazones.mp3";

let song;
let fft;
let amplitude;

const FFT_BINS  = 512;
const SMOOTHING = 0.85;

// Número de anillos concéntricos
const NUM_RINGS = 10;

// ── Paleta rojo → naranja → amarillo ────────────────────────────
// ringIdx = 0 (centro) .. NUM_RINGS-1 (exterior)
// energy  = 0..1
function getRingColor(ringIdx, energy, alpha) {
    colorMode(HSB, 360, 100, 100, 255);
    const t = ringIdx / (NUM_RINGS - 1);           // 0=centro 1=exterior
    const h = map(t, 0, 1, 55, 0);                 // amarillo centro → rojo exterior
    const s = map(energy, 0, 1, 80, 100);
    const b = map(energy, 0, 1, 75, 100);
    const c = color(h, s, b, alpha);
    colorMode(RGB, 255);
    return c;
}

// ── Dibuja UN anillo con onda sinusoidal que lo recorre ──────────
// El anillo base es un círculo; la onda lo deforma radialmente
// usando los datos del FFT según el ángulo.
function drawRing(ringIdx, spectrum, energy) {
    const maxR     = min(width, height) * 0.47;
    const minR     = min(width, height) * 0.04;
    const baseR    = map(ringIdx, 0, NUM_RINGS - 1, minR, maxR);

    // Amplitud de deformación: más grande en anillos exteriores
    const maxAmp   = baseR * map(energy, 0, 1, 0.12, 0.55);

    // Número de ondas alrededor del anillo (frecuencia angular)
    // varía por anillo para crear el patrón entrelazado de la imagen
    const freq     = 2 + ringIdx * 0.7;

    // Desfase temporal lento para que se muevan
    const phaseT   = frameCount * 0.012 * (ringIdx % 2 === 0 ? 1 : -1);

    const alpha    = map(ringIdx, 0, NUM_RINGS - 1, 180, 230);
    const col      = getRingColor(ringIdx, energy, alpha);
    const sw       = map(energy, 0, 1, 0.8, 3.2);

    stroke(col);
    strokeWeight(sw);
    noFill();

    const steps = 360;
    beginShape();
    for (let i = 0; i <= steps; i++) {
        const frac    = i / steps;
        const angle   = frac * TWO_PI - HALF_PI;

        // Bin del espectro para este ángulo
        const specIdx = floor(frac * (spectrum.length * 0.6));
        const rawE    = spectrum[specIdx] / 255;

        // Deformación: combina FFT + seno para patrón orgánico
        const wave    = sin(frac * TWO_PI * freq + phaseT);
        const disp    = wave * maxAmp * (0.4 + rawE * 0.6);

        const r = baseR + disp;
        curveVertex(cos(angle) * r, sin(angle) * r);
    }

    // Cerrar la curva suavemente
    for (let i = 0; i < 3; i++) {
        const frac    = i / steps;
        const angle   = frac * TWO_PI - HALF_PI;
        const specIdx = floor(frac * (spectrum.length * 0.6));
        const rawE    = spectrum[specIdx] / 255;
        const wave    = sin(frac * TWO_PI * freq + phaseT);
        const disp    = wave * maxAmp * (0.4 + rawE * 0.6);
        const r       = baseR + disp;
        curveVertex(cos(angle) * r, sin(angle) * r);
    }
    endShape();
}

// ── Líneas radiales que irradian desde el centro ─────────────────
// Imitan las líneas verticales de la imagen que cruzan los anillos
function drawRadialLines(spectrum, energy) {
    const maxR  = min(width, height) * 0.47;
    const count = 72;   // cada 5 grados

    for (let i = 0; i < count; i++) {
        const frac    = i / count;
        const angle   = frac * TWO_PI - HALF_PI;
        const specIdx = floor(frac * spectrum.length * 0.8);
        const rawE    = spectrum[specIdx] / 255;

        if (rawE < 0.15) continue;   // solo líneas con energía suficiente

        const len   = map(rawE, 0.15, 1, maxR * 0.05, maxR * 0.9);
        const alpha = map(rawE, 0.15, 1, 30, 120);

        colorMode(HSB, 360, 100, 100, 255);
        const h = map(frac, 0, 1, 0, 55);
        stroke(h, 90, 100, alpha);
        colorMode(RGB, 255);
        strokeWeight(map(rawE, 0, 1, 0.5, 1.5));

        line(0, 0, cos(angle) * len, sin(angle) * len);
    }
}

// ── p5 lifecycle ─────────────────────────────────────────────────

function preload() {
    soundFormats('mp3');
    song = loadSound(AUDIO_PATH);
}

function setup() {
    createCanvas(windowWidth, windowHeight);
    colorMode(RGB, 255);

    fft = new p5.FFT(SMOOTHING, FFT_BINS);
    fft.setInput(song);

    amplitude = new p5.Amplitude();
    amplitude.setInput(song);
    amplitude.smooth(0.85);

    song.play();
}

function draw() {
    const spectrum = fft.analyze();
    const level    = amplitude.getLevel();

    // Fondo muy oscuro con trail largo para el efecto de estela
    colorMode(RGB, 255);
    background(0, 0, 0, 15);

    const cx = width  / 2;
    const cy = height / 2;

    push();
    translate(cx, cy);

    // Primero las líneas radiales (debajo)
    drawRadialLines(spectrum, level);

    // Luego los anillos de afuera hacia adentro
    for (let i = NUM_RINGS - 1; i >= 0; i--) {
        drawRing(i, spectrum, level);
    }

    pop();
}

function mousePressed() {
    userStartAudio();
    if (song.isLoaded() && !song.isPlaying()) {
        song.play();
    }
}

function windowResized() {
    resizeCanvas(windowWidth, windowHeight);
} 