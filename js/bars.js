// ═══════════════════════════════════════════════════════════════
//  waves.js  –  Visualizador circular de audio reactivo (p5.js)
//  Canción: Corazones – Motel
//  Las ondas se proyectan en forma de anillo desde el centro
// ═══════════════════════════════════════════════════════════════

const AUDIO_PATH = "/audio/Corazones.mp3";

let song;
let fft;
let amplitude;

const FFT_BINS  = 256;   // bins del espectro
const SMOOTHING = 0.82;

// Número de capas de onda concéntricas
const NUM_WAVES = 4;

// ── Paleta dinámica ──────────────────────────────────────────────
// t = 0..1 (energía normalizada)
// baja energía  → rojos / naranjas / amarillos
// alta energía  → rosas / magentas
function getWaveColor(t, alpha) {
    colorMode(HSB, 360, 100, 100, 255);
    const h = t < 0.5
        ? map(t, 0, 0.5, 0, 48)       // rojo → naranja → amarillo
        : map(t, 0.5, 1.0, 48, 330);  // amarillo → rosa → magenta
    const s = map(t, 0, 1, 80, 98);
    const b = map(t, 0, 1, 72, 100);
    const c = color(h, s, b, alpha);
    colorMode(RGB, 255);
    return c;
}

// ── Dibuja UNA onda circular ─────────────────────────────────────
// radiusBase : radio base del anillo
// ampScale   : cuánto puede crecer hacia afuera
// waveIdx    : índice para desfase de fase
// spectrum   : datos FFT (0-255)
// energy     : nivel global (0-1)
function drawCircularWave(radiusBase, ampScale, waveIdx, spectrum, energy) {
    const total     = spectrum.length;
    const steps     = total;                          // un punto por bin
    const phaseOff  = waveIdx * (TWO_PI / NUM_WAVES); // desfase entre capas

    const alpha = map(waveIdx, 0, NUM_WAVES - 1, 210, 70);
    const col   = getWaveColor(energy, alpha);

    const sw = map(energy, 0, 1, 1.2, 5.5);
    stroke(col);
    strokeWeight(sw);
    noFill();

    beginShape();
    for (let i = 0; i <= steps; i++) {
        const frac    = (i % steps) / steps;          // 0..1 alrededor del círculo
        const angle   = frac * TWO_PI - HALF_PI;      // empieza arriba

        // Energía de este bin
        const specIdx = floor(frac * (total - 1));
        const rawE    = spectrum[specIdx];

        // Desplazamiento radial basado en energía del bin
        let displacement = map(rawE, 0, 255, 0, height * 0.22 * ampScale);

        // Modulación sinusoidal orgánica por capa
        const sineFreq = 3 + waveIdx * 1.5;
        const sineMod  = sin(frac * TWO_PI * sineFreq + phaseOff + frameCount * 0.016);
        displacement += sineMod * map(energy, 0, 1, 8, 45);

        // Alta energía → picos más agresivos
        if (energy > 0.55) {
            const norm = map(rawE, 0, 255, 0, 1);
            displacement *= 1 + norm * energy * 1.6;
        }

        const r = radiusBase + displacement;
        curveVertex(cos(angle) * r, sin(angle) * r);
    }

    // Cerrar la curva: repetir los primeros 3 vértices para que curveVertex cierre suave
    for (let i = 0; i < 3; i++) {
        const frac    = i / steps;
        const angle   = frac * TWO_PI - HALF_PI;
        const specIdx = floor(frac * (total - 1));
        const rawE    = spectrum[specIdx];
        let displacement = map(rawE, 0, 255, 0, height * 0.22 * ampScale);
        const sineFreq = 3 + waveIdx * 1.5;
        const sineMod  = sin(frac * TWO_PI * sineFreq + phaseOff + frameCount * 0.016);
        displacement += sineMod * map(energy, 0, 1, 8, 45);
        if (energy > 0.55) {
            const norm = map(rawE, 0, 255, 0, 1);
            displacement *= 1 + norm * energy * 1.6;
        }
        curveVertex(cos(angle) * (radiusBase + displacement), sin(angle) * (radiusBase + displacement));
    }
    endShape();
}

// ── Partículas en picos de energía ──────────────────────────────
const particles = [];

function spawnParticles(energy, spectrum, cx, cy) {
    if (energy > 0.6 && frameCount % 4 === 0) {
        const count = floor(map(energy, 0.6, 1, 1, 6));
        for (let i = 0; i < count; i++) {
            const angle   = random(TWO_PI);
            const frac    = angle / TWO_PI;
            const specIdx = floor(frac * (spectrum.length - 1));
            const rawE    = spectrum[specIdx];
            const baseR   = min(width, height) * 0.22;
            const disp    = map(rawE, 0, 255, 0, height * 0.22);
            const r       = baseR + disp;
            particles.push({
                x    : cx + cos(angle) * r,
                y    : cy + sin(angle) * r,
                vx   : cos(angle) * random(1, 3.5),
                vy   : sin(angle) * random(1, 3.5),
                life : 1.0,
                size : random(2, 5.5),
                hue  : random([10, 30, 50, 320, 340])
            });
        }
    }
}

function updateParticles() {
    colorMode(HSB, 360, 100, 100, 255);
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x    += p.vx;
        p.y    += p.vy;
        p.vx   *= 0.96;
        p.vy   *= 0.96;
        p.life -= 0.024;
        if (p.life <= 0) { particles.splice(i, 1); continue; }
        noStroke();
        fill(p.hue, 88, 100, p.life * 210);
        ellipse(p.x, p.y, p.size * p.life, p.size * p.life);
    }
    colorMode(RGB, 255);
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
    amplitude.smooth(0.8);

    song.play();
}

function draw() {
    const spectrum = fft.analyze();
    const level    = amplitude.getLevel();

    // Fondo oscuro con trail
    colorMode(RGB, 255);
    background(0, 0, 0, 28);

    // Trasladar al centro para dibujar todo en coordenadas polares
    const cx = width  / 2;
    const cy = height / 2;

    push();
    translate(cx, cy);

    // Radio base del primer anillo (el más interno)
    // Capas sucesivas son más grandes y más tenues
    const baseRadius = min(width, height) * 0.20;
    const radiusStep = min(width, height) * 0.045;

    // Dibujar de la capa más externa a la más interna (orden de pintura)
    for (let i = NUM_WAVES - 1; i >= 0; i--) {
        const r         = baseRadius + i * radiusStep;
        // La onda más externa tiene menor ampScale para verse más fina
        const ampScale  = map(i, 0, NUM_WAVES - 1, 0.4, 1.0);
        drawCircularWave(r, ampScale, i, spectrum, level);
    }

    pop();

    // Partículas (en coordenadas de pantalla)
    spawnParticles(level, spectrum, cx, cy);
    updateParticles();
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