let mic;

function setup (){
    createCanvas (windowWidth, windowHeight);   
    mic = new p5.AudioIn();
    mic.start();
}


function draw (){
    background (0);
    let vol = mic.getLevel();
    let diameter = vol* width*5;
    //console.log (vol);
    noFill();
    stroke(vol*255, 255, 255);
    strokeWeight(vol*1000);
    ellipse(width/2, height/2, diameter, diameter);
}