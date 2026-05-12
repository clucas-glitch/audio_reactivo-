const BARS_AUDIO_PATH = "/audio/Corazones.mp3";

let barsSong;
let barsfFt;// fast furrier transform
let barsAmplitude;

const barBins = 64;

function preload() {
    soundFormats('mp3');
    barsSong = loadSound(BARS_AUDIO_PATH);
}

function setup() {
    createCanvas(windowWidth, windowHeight);
    barsfFt = new p5.FFT(0.8, barBins);
    barsfFt.setInput(barsSong);
    barsAmplitude = new p5.Amplitude();
    barsAmplitude.setInput(barsSong);
    barsSong.play();


}

function draw() {
 const spectrum = barsfFt.analyze();
 const level = barsAmplitude.getLevel();
 background(0);

 const margin =windowWidth * 0.08;
 const availableWidth = windowWidth - margin * 2;
 const barWidth = availableWidth / spectrum.length;
 const maxBarHeight = windowHeight * 0.8;

 for (let i = 0; i < spectrum.length; i++) {
    const x = margin + i * barWidth;
    const energy = spectrum[i];
    const barHeight = map(energy, 0, 255, 10, height * 0.42);
    fill(255);
    rect(x, height /2 - barHeight,barWidth * 0.8, barHeight);
    rect (x, height/2, barWidth * 0.8, barHeight );
    }
}

function mousePressed() {
 userStartAudio();  
 if (barsSong.isLoadded()) {
    return barsSong.play();
 }
}