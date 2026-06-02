let wave = []; // arreglo vacío
let samples = 50;
function setup() {
  createCanvas(windowWidth, windowHeight);
  // llenamos arreglo
  console.log("wave.length", wave.length)
  for (let i = 0; i < samples; i++) {
    let value = random(-1, 1); // valores aleatorios
    wave.push(value); // agregamos sample
  }
  console.log(wave.length, wave);
}
function draw() {
  background(10);
  stroke(167, 175, 150);
  noFill();
  beginShape();
  // recorremos samples
  for (let i = 0; i < wave.length; i++) {
    let x = map(i,0,wave.length,0,width); // posición horizontal
    let y = map(wave[i],-1,1,height,0);  // amplitud → pantalla
    curveVertex(x, y);
  }
  endShape();
}