let arreglo = ["Guayaba", "Mango", "Piña", "Fresa", "Melón"];
let nombre = "Cianya";
let edad = 18;  
let offset = 0;
const PALETTE = ["#FF6B6B", "#F7FFF7", "#4ECDC4", "#1A535C", "#FFE66D"];
const radio= 50;

function setup() {
    createCanvas(windowWidth, windowHeight);
    background(PALETTE[2]);
}
console.log(arreglo[0]);
console.log(PALETTE[2]);


function draw() {
    background(PALETTE[0]);
    beginShape();
    noFill();
    stroke(PALETTE[1]);
    strokeWeight(2);
    for (let i = 0; i < width; i++) {
       let angle =(i*0.02)+offset;
       let y = height/2 + sin(angle)*100;
       vertex(i, y);
       rect(i,y,1,1);
    }
    endShape();
    offset += 0.05;

}
    
// ── Visualización radial de espectro ─────────────────────────────