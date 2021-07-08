var dot;
var origin;
var dnotConst;
var d;
var angleV;
var scale;
var player1Pos;
var currentPos;
var negVel = false;
var isFired = false;
var bounce = true;
var globalVel;
var GlobalCurrentBallPos;
var GlobalBallMass = 10;
var time = 0;
var clock;
var twoCounter = 0;
var kick = false;
var kickTick = 0;
var tempoTimer;
var tempoTimerDScale;
var fireXPos = 100;
var fireYPos = 100;
var playerAlt;
var newAngleMethod;

//fft
var fftSize = 1024;
var numBins = fftSize / 2;
var fft = new maximJs.maxiFFT();
var samplePlayer = new maximJs.maxiSample();

//audio
var audioContext;
var isAudioInit;


//SPRING class for collision simulation of spaceship
class Spring {
    //Here are arguments to be implemented
    constructor(M, K, D, R, springHeight, xpos, mywidth, maxHeight, minHeight)
    {
        this.mywidth = mywidth;
        this.xpos = xpos;
        this.left = xpos - mywidth;
        this.right = xpos + mywidth;
        this.M = M;
        this.K = K;
        this.D = D;
        this.R = R;

        this.ps = this.R; // Position
        this.cp; //current position for movement
        this.vs = 0.0; // Velocity
        this.as = 0; // Acceleration
        this.f = 0; // Force
        this.springHeight = springHeight;
        this.over = false;
        this.move = false;
        this.maxHeight = maxHeight;
        this.minHeight = minHeight;
    }

    updateSpring() {
        // Update the spring position
        if (!this.move) {
            this.f = -this.K * (this.ps - this.R); // f=-ky
            this.as = this.f / this.M; // Set the acceleration, f=ma == a=f/m
            this.vs = this.D * (this.vs + this.as); // Set the velocity
            this.ps = this.ps + this.vs; // Updated position
            this.cp = this.R - this.ps;
        }

        if (abs(this.vs) < 0.1) {
            this.vs = 0.0;
        }

        if (mouseX > this.left && mouseX < this.right && mouseY > this.ps && mouseY < this.ps + this.springHeight) {
            this.over = true;
        } else {
            this.over = false;
        }

        // Set and constrain the position of top bar
        if (this.move) {
            this.ps = mouseY - this.springHeight / 2;
            this.ps = constrain(this.ps, this.minHeight, this.maxHeight);
            spring1.move = false;
            spring.move = false;
        }
    }
}

//particle class
//Note this particle class was made with reference to the coding train: https://www.youtube.com/watch?v=UcdigVaIYAk&t=544s 
class Fire {
    constructor() {
        this.x = fireXPos;
        this.y = fireYPos;
        this.vx = random(-1, 1);
        this.vy = random(-5, -1);
        this.transparent = 255;
    }

    show() {
        noStroke();
        fill(110, 0, 0, this.transparent);
        ellipse(this.x, this.y, 16, 16);
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.transparent -= 5;
        console.log("firePos" + this.x)
    }

    finished() {
        return this.transparent < 0;
    }
}

let particles = [];// array to spawn new fire particles

var spring1 = new Spring(0.8, 0.3, 0.92, 150, 32, 100, 100, 100, 200);
var spring = new Spring(0.8, 0.3, 0.92, 150, 32, 100, 100, 100, 200);


function setup() {
    //audio
    audioContext = new maximJs.maxiAudio();
    audioContext.play = playLoop;
    isAudioInit = false;
    tempoTimer = 0

    playerAlt = false;
    createCanvas(900, 600);
    player1Pos = createVector(100, 600);
    dot = new Dot();
    angleMode(DEGREES);
    scale = 0.05; //This is to scale down the velocity size so it isn't so fast
    GlobalCurrentBallPos = createVector(0, 0)
    tower = new Tower(100, 100, 1);
    tower1 = new Tower(500, 100, 2);
    person = new Person(tower.x_pos, tower.y_pos - 30, 100, 110); //xpos, ypos, floor x1pos, floor x2pos
    person1 = new Person(tower1.x_pos, tower1.y_pos - 30, 500, 510); //xpos, ypos, floor x1pos, floor x2pos -- blue
    
    //fft
    fft.setup(fftSize, fftSize / 2, fftSize / 4);
}

function draw() {
    if (!isAudioInit) {
        background(0);
        push();
        fill(255);
        textAlign(CENTER);
        textSize(32);
        text("Press any key to start ...", 300, 200);
        text("Wait For Music To Commence Battle", 300, 400);

        textSize(14);
        text("Player 1 Controls: A W D S (Left, Up, Right, Down)", 200, 50);
        text("Player 2 Controls: Arrow Keys: Left, Up, Right, Down", 210, 100);
        pop();
        return;
    }

    background(20 * pow((tempoTimerDScale), 2), 30 * pow((tempoTimerDScale), 2), 40 * pow((tempoTimerDScale), 2));
    //time and tempo time are to effect the movement of the ball and crafts so they move with the music
    time = ((frameCount % 100) / 100);
    tempoTime();
    
    //purely a function to calulate the angle you are shooting in real time
    newAngleCalc();

    //this updates movement of sring
    spring1.updateSpring();
    spring.updateSpring();

    dot.run();
    keyMovement();

    //this gives the ship a platfor and gravity everywhere else
    gravity(person1.persLoc.x, tower1.x_pos, person1);
    gravity(person.persLoc.x, tower.x_pos, person);

    //this updates the ball position dependent on player 1/2
    if (!playerAlt) {
        dot.updatePos(tower.x_pos, tower.y_pos + 30);
    } else if (playerAlt) {
        dot.updatePos(tower1.x_pos, tower1.y_pos + 30);
    }
    
    //this runs person display, movment and forces
    person.run();
    person1.run();

    //this runs the spaceships display, movement and forces
    tower.run();
    tower1.run();
    
    //here is the object interaction functions being called
    personBallCollision(person1);
    personBallCollision(person);
    towerBallCollision(tower, false);
    towerBallCollision(tower1, true);
    //decreases health on collisions
    healthDec(tower, person, tower1, person1);
    console.log(spring.move);
    stroke(255);
    text('Press Space to fire', 10, 10);

    stroke(255);
    line(player1Pos.x, player1Pos.y, mouseX, mouseY);

    line(700, 100, 700, 500);

    translate(player1Pos.x, player1Pos.y);
    rotate(-1 * newAngleMethod);
    fill(255);
    rect(0, 0, 80, 20)
    
    kickMean(); //this function is to make the tempo time respond to the music kick by setting a max and minimum with fft's
}




function momentum() {

}

function keyPressed() {
    //if space bar is pressed then it triggers circle with velocity of line size. d is the vector/velocity size
    if (key == ' ') { //these are various functions to trigger and reset the ball isfired movements and to re initialise the cannon ball
        tower.ballHit = false;
        tower1.ballHit = false;
        console.log("bang");
        bounce = true;
        isFired = true;
        negVel = false;
        dnotConstrain = int(dist(player1Pos.x, player1Pos.y, mouseX, mouseY));
        d = constrain(dnotConstrain, 0, 60);
        dot = new Dot();
        cannonAlternate();
    }
}

function keyReleased() {
    if (isAudioInit == false) {
        //start the audio loop running
        audioContext.init();
        isAudioInit = true;
        //        audioContext.loadSample("assets/punisher.mp3", samplePlayer);  
        audioContext.loadSample("assets/Dancy_house.mp3", samplePlayer);
    }
}




//Contructor object for cannon ball
function Dot(_xPos, _yPos) {
    this.velocity = createVector(d * cos(newAngleMethod) * scale, d * -1 * sin(newAngleMethod) * scale);
    this.loc = createVector(player1Pos.x, player1Pos.y);

    globalVel = this.velocity; //setting the velocity of this object to make it global for object interaction.

    this.acceleration = createVector(0, 0.02);
    this.diam = createVector(40, 20);
    this.scaleVel = 1;

    //called in draw loop to update various functions
    this.run = function() {
        this.negV();
        this.draw();
        this.update();
        this.move();
    }

    //function for when ball reverses velocity
    this.negV = function() {
        if (negVel == true && bounce == true) {
            this.acceleration.x *= -1;
            this.velocity.x *= -1;
            bounce = false;
        }
    }

    //this makes a negative drag force if going forwards and a positive drag force if going backwards
    this.drag = function() {
        if (isFired && negVel == false) {
            if (this.velocity.x > 0) {
                this.acceleration.x = -0.005;
            } else if (this.velocity.x < 0) {
                this.acceleration.x = 0;
            }
        } else if (isFired && negVel == true) {
            if (this.velocity.x < 0) {
                this.acceleration.x = 0.005
            } else if (this.velocity.x > 0) {
                this.acceleration.x = 0;
            }
        }
    }

    this.draw = function() {
        fill(125);
        ellipse(this.loc.x, this.loc.y, this.diam.x, this.diam.x);
    }


    this.move = function() {
        this.velocity.add(this.acceleration);
        this.scaleVel = createVector(pow(tempoTimerDScale, 4) * this.velocity.x, pow(tempoTimerDScale, 4) * tempoTimerDScale * this.velocity.y); //this scales the velocity to make the ball move with the music.
        this.loc.add(this.scaleVel);
        GlobalCurrentBallPos = this.loc; //makes velocity global
    }

    this.update = function() {
        currentPos = this.loc.add(this.velocity);
        if ((currentPos.x - 680) > 0) {
            negVel = true; //negvel = true means ball going left   
        }
    }

    this.updatePos = function(input_x, input_y) {
        player1Pos.x = input_x;
        player1Pos.y = input_y;
    }

}

//person object
function Person(_xPos, _yPos, gravityx1, gravityx2) {
    this.mass = 2;
    this.velocity = createVector(0, 0);
    this.height = 10;
    this.width = 20;
    this.persLoc = createVector(_xPos, _yPos);
    this.momentum = createVector(0, 0); //this is calculated in the collision functions
    this.acceleration = createVector(0, 0);
    this.isHit = false;
    this.negVel = false;
    this.posVel = false;
    this.drag = -0.1;
    this.health = 100;

    this.run = function() {
        this.display();
        this.move();
        this.healthDec();
        this.friction();
    }

    this.display = function() {
        if (this.health > 5) {
            ellipse(this.persLoc.x, this.persLoc.y, 20, 20);
        }
        fill(0, 0, 255, 190);
        rect(this.persLoc.x - 15, this.persLoc.y - 25, this.health * 0.3, 8);
    }

    //calculates acceleration and velocity
    this.move = function() {
        this.velocity.add(this.acceleration);
        this.persLoc.add(this.velocity);
    }

    this.friction = function() {
        if (this.velocity.x > 0) {
            this.acceleration.x = this.drag;
        } else if (this.velocity.x <= 0) {
            this.acceleration.x = 0;
            this.velocity.x = 0;
        }

    }

    //this is so the player moves with the spaceship
    this.updatePos = function(input_x, input_y) {
        this.persLoc.x = input_x;
        this.persLoc.y = input_y;
    }

    this.healthDec = function() {
        if (this.isHit == true && negVel == false && this.health > 0) {
            this.health -= globalVel.x;
            this.isHit = false;
        }
    }
}

//spaceship object
function Tower(_xpos, _ypos, _towerNum) {
    this.x_pos = _xpos;
    this.y_pos = _ypos;
    this.width = 100;
    this.height = 50;
    this.health = 100;
    this.ballHit = false;
    this.dissapear = 190;

    this.run = function() {
        this.display();
    }


    this.teleport = function() {
        this.x_pos = random(0, 500);
        this.y_pos = random(0, 500);
    }

    this.display = function() {
        fill(0);
        if (this.health > 0 && this.ballHit) {
            noStroke();
            fill(0, 255, 0);
            ellipse(this.x_pos + spring.cp, this.y_pos, this.width, this.height);
        } else {
            noStroke();
            fill(0, 255, 0);
            ellipse(this.x_pos, this.y_pos, this.width, this.height);
        }
        fill(255, 0, 0, this.dissapear);
        rect(this.x_pos - 10, this.y_pos + 200, this.health * 0.8, 8);
    }

}

//gives gravity acceleration when not on spaceship platfor
function gravity(persx, towerx, persAcc) {

    if (persx < towerx - 1 || persx > towerx + 1) {
        persAcc.acceleration.y = 0.5;
    }
}

function keyMovement() {
    //player 1 keys
    var moveScale = -0.4;

    if (keyIsDown(LEFT_ARROW)) {
        tower1.x_pos -= 4 * pow(tempoTimerDScale + moveScale, 2);
        person1.persLoc.x -= 4 * pow(tempoTimerDScale + moveScale, 2);
    }
    if (keyIsDown(RIGHT_ARROW)) {
        tower1.x_pos += 4 * pow(tempoTimerDScale + moveScale, 2);
        person1.persLoc.x += 4 * pow(tempoTimerDScale + moveScale, 2);
    }

    if (keyIsDown(UP_ARROW)) {
        tower1.y_pos -= 4 * pow(tempoTimerDScale + moveScale, 2);
        person1.persLoc.y -= 4 * pow(tempoTimerDScale + moveScale, 2);
    }
    if (keyIsDown(DOWN_ARROW)) {
        tower1.y_pos += 4 * pow(tempoTimerDScale + moveScale, 2);
        person1.persLoc.y += 4 * pow(tempoTimerDScale + moveScale, 2);
    }

    //player 2 keys

    if (keyIsDown(65)) {
        tower.x_pos -= 4;
        person.persLoc.x -= 4
    }
    if (keyIsDown(68)) {
        tower.x_pos += 4;
        person.persLoc.x += 4;

    }

    if (keyIsDown(87)) {
        tower.y_pos -= 4;
        person.persLoc.y -= 4;

    }
    if (keyIsDown(83)) {
        tower.y_pos += 4;
        person.persLoc.y += 4;
    }
}

//fft
function playLoop() {

    if (samplePlayer.isReady()) {
        var sig = samplePlayer.play();
        this.output = sig;
        fft.process(sig);

    } else {
        this.output = 0;
    }
}

//retriggers tempo time when there's a kick which is used to synch movement to music
function kickMean() {
    var drumBins = [5, 8];
    var drumMean = 0;
    var drumOnset = 0.1;
    var drumOffset = 0.9;
    for (var i = 0; i < numBins; i++) {
        var mdb = constrain(fft.getMagnitude(i), 0, 50);
        mdb /= 50;

        if (i >= drumBins[0] && i <= drumBins[1]) {
            drumMean += mdb;
        } else {
        }
        var h = mdb * height;
        var x = i * width / numBins;
    }

    drumMean /= drumBins[1] - drumBins[0];

    if (kick == false && drumMean > 0.05) {
        kick = true;
        kickTick++;
        console.log("kick" + kickTick);
        //        console.log(kick);
        resetTempoTime();
    }
    if (kick && drumMean < 0.003) {
        kick = false;
    }
}

//used scale velocity when kick is triggered
function tempoTime() {
    tempoTimer += 1;
    tempoTimerDScaleUncontraint = (tempoTimer / 100) + 1;
    tempoTimerDScale = constrain(tempoTimerDScaleUncontraint, 0, 2);
}

function resetTempoTime() {
    tempoTimer = 0;
}

//calculates angle of cannon shot with mouse x/y
function newAngleCalc() {
    var v1 = createVector(50, 0);

    var v2 = createVector(mouseX - player1Pos.x, mouseY - player1Pos.y); //  drawArrow(v0, v2, 'blue');
    newAngleMethod = v1.angleBetween(v2);
    if (mouseY > this.player1Pos.y) {
        newAngleMethod *= -1;
    }
}

//change player when spacebar triggered
function cannonAlternate() {
    playerAlt = !playerAlt;
    console.log(playerAlt);
}

// makes the tower wobble when ball meets spaceship/tower
function towerBallCollision(_tower, _playerAltTrueOrFalse) {
    if ((GlobalCurrentBallPos.x - _tower.x_pos) < _tower.width / 2 && playerAlt == _playerAltTrueOrFalse && _tower.x_pos - GlobalCurrentBallPos.x < _tower.width / 2 && _tower.y_pos - GlobalCurrentBallPos.y < _tower.height / 2 && GlobalCurrentBallPos.y - _tower.y_pos < _tower.height / 2) {
        _tower.ballHit = true;
        spring.move = true;
        if (spring.move == true) {

        }
    }
}

//makes person move with velocity decided by momentum of the ball. By adjusting perameters of person or ball if effects how they interact e.g changing mass
function personBallCollision(_person) {
    if ((_person.persLoc.x - GlobalCurrentBallPos.x) < 20 && (GlobalCurrentBallPos.y - _person.persLoc.y < 20) && (GlobalCurrentBallPos.y - _person.persLoc.y > -20) && (_person.persLoc.x - GlobalCurrentBallPos.x) > -20) {
        _person.momentum.x = globalVel.x * GlobalBallMass;
        _person.velocity.x = _person.momentum.x / _person.mass;
        _person.momentum.y = globalVel.y * GlobalBallMass;
        _person.velocity.y = _person.momentum.y / _person.mass;
        _person.isHit = true;
        console.log("hittt");
    }
}

//health decreases with collisions dependent on velocity of ball
function healthDec(_tower, _person, _tower1, _person1) {
    //player 1 health decrese
    if (spring.move && _tower.ballHit == true) {
        _tower.health -= abs(globalVel.x);
    }
    //plaer2 health decrease
    if (spring.move && _tower1.ballHit == true) {
        _tower1.health -= abs(globalVel.x);
    }

    //player 1 tower dies when player plumets
    if (_person.persLoc.y > 500) {
        _tower.health = 0;
    }

    //player 2 tower dies when player plumets
    if (_person1.persLoc.y > 500) {
        _tower1.health = 0;
    }

    if (_tower1.health <= 0) {
        stroke(3);
        fill(0, 200, 0);
        text('PLAYER 1 WINS', 250, 100);
        _tower1.dissapear = 0;
        fireXPos = tower1.x_pos;
        fireYPos = tower1.y_pos;
        particlePush();


    }
    if (_tower.health <= 0) {
        stroke(3);
        text('PLAYER 2 WINS', 250, 100);
        _tower.dissapear = 0;
        fireXPos = tower.x_pos;
        fireYPos = tower.y_pos;
        particlePush();
        console.log("firexpos" + fireXPos);
    }

}

//this is just to trigger fire simulation when person dies.
function particlePush() {
    let f = new Fire();
    particles.push(f);
    for (i = 0; i < particles.length; i++) {
        particles[i].show();
        particles[i].update();
        if (particles[i].finished()) {
            particles.splice(i, 1);
        }
    }
}