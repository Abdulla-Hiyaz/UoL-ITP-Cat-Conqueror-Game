// canvas size
let canvasWidth = 1132;
let canvasHeight = 614;

// ground level
let floorY = 430;

// cat position
let cat_world_x = 200;
let cat_y = floorY;

// cat movement
let cat_vy = 0;
let isOnGround = true;
let isPlummeting = false;
let jumpPressed = false;

// movement state
let moveLeft = false;
let moveRight = false;

// camera
let cameraPosX = 0;

// counters and states
let score = 0;
let lives = 3;
let gameOver = false;
let levelComplete = false;
let gameStarted = false;

// world data
let canyons = [];
let orbs = [];
let stars = [];
let mountains = [];
let trees_x = [];
let platforms = [];
let enemies = [];

// text
let gameFont;

// sound
let jumpOsc;
let jumpEnv;
let orbOsc;
let orbEnv;
let loseOsc;
let loseEnv;
let endOsc;
let endEnv;
let squashOsc;
let squashEnv;
let audioStarted = false;
let playedEndSound = false;

function preload() {
    gameFont = "monospace";
}

function setup() {
    createCanvas(canvasWidth, canvasHeight);
    textFont(gameFont);

    // stars
    for (let i = 0; i < 100; i++) {
        stars.push({
            x: random(0, 3000),
            y: random(30, 240),
            size: random(2, 5)
        });
    }

    // mountains
    mountains = [
        { x: 150, width: 220, heightScale: 0.95 },
        { x: 500, width: 320, heightScale: 1.2 },
        { x: 980, width: 240, heightScale: 1.0 },
        { x: 1370, width: 300, heightScale: 1.25 },
        { x: 1860, width: 260, heightScale: 1.05 },
        { x: 2280, width: 340, heightScale: 1.3 },
        { x: 2720, width: 280, heightScale: 1.1 }
    ];

    // tree positions
    trees_x = [120, 270, 420, 620, 820, 1020, 1180, 1360, 1560, 1760, 1980, 2220, 2440, 2640, 2860];

    // canyons
    canyons = [
        { x: 700, width: 95 },
        { x: 1260, width: 90 },
        { x: 1840, width: 110 }
    ];

    // collectables
    orbs = [
        { x: 470, y: floorY - 80, size: 30, isFound: false, pulse: 0 },
        { x: 905, y: 320, size: 28, isFound: false, pulse: 25 },
        { x: 1120, y: floorY - 90, size: 26, isFound: false, pulse: 40 },
        { x: 1485, y: floorY - 100, size: 34, isFound: false, pulse: 55 },
        { x: 1600, y: floorY - 75, size: 27, isFound: false, pulse: 70 },
        { x: 2060, y: 300, size: 30, isFound: false, pulse: 80 },
        { x: 2190, y: floorY - 85, size: 29, isFound: false, pulse: 95 },
        { x: 2460, y: floorY - 105, size: 31, isFound: false, pulse: 110 },
        { x: 2580, y: floorY - 78, size: 26, isFound: false, pulse: 125 },
        { x: 2740, y: floorY - 95, size: 32, isFound: false, pulse: 140 }
    ];

    // platforms
    platforms.push(createPlatform(840, 350, 110));
    platforms.push(createPlatform(1170, 305, 90));
    platforms.push(createPlatform(1410, 330, 120));
    platforms.push(createPlatform(1980, 290, 110));
    platforms.push(createPlatform(2380, 320, 120));

    // enemies
    enemies.push(new Enemy(1080, floorY, 130));
    enemies.push(new Enemy(1670, floorY, 120));
    enemies.push(new Enemy(2360, floorY, 140));

    setupSounds();
}

function draw() {
    moveLeft = keyIsDown(LEFT_ARROW);
    moveRight = keyIsDown(RIGHT_ARROW);

    if (!keyIsDown(UP_ARROW)) {
        jumpPressed = false;
    }

    if (gameStarted && !gameOver && !levelComplete) {
        // jump once per key press
        if (keyIsDown(UP_ARROW) && !jumpPressed && isOnGround && !isPlummeting) {
            cat_vy = -16.5;
            isOnGround = false;
            jumpPressed = true;
            playJumpSound();
        }

        // horizontal movement
        if (!isPlummeting) {
            if (moveLeft) {
                cat_world_x -= 4;
            }

            if (moveRight) {
                cat_world_x += 4;
            }
        }

        // gravity
        cat_vy += 0.9;
        cat_y += cat_vy;

        // platform contact
        let onPlatform = false;
        let platformTopY = 0;

        for (let i = 0; i < platforms.length; i++) {
            if (platforms[i].checkContact(cat_world_x, cat_y, cat_vy)) {
                onPlatform = true;
                platformTopY = platforms[i].y;
            }
        }

        if (onPlatform) {
            cat_vy = 0;
            cat_y = platformTopY;
            isOnGround = true;
            isPlummeting = false;
        }

        // canyon overlap
        let catLeft = cat_world_x - 12;
        let catRight = cat_world_x + 12;
        let overAnyCanyon = false;

        for (let i = 0; i < canyons.length; i++) {
            let c = canyons[i];
            if (catRight > c.x && catLeft < c.x + c.width) {
                overAnyCanyon = true;
            }
        }

        // ground and canyon logic
        if (!onPlatform) {
            if (overAnyCanyon && cat_y >= floorY) {
                isPlummeting = true;
                isOnGround = false;
            } else if (!overAnyCanyon && cat_y >= floorY) {
                cat_y = floorY;
                cat_vy = 0;
                isOnGround = true;
                isPlummeting = false;
            } else {
                isOnGround = false;
            }
        }

        // orb collection
        for (let i = 0; i < orbs.length; i++) {
            let o = orbs[i];

            if (!o.isFound) {
                let pulseSize = o.size * (1 + 0.12 * sin(frameCount * 0.08 + o.pulse));
                let d = dist(cat_world_x, cat_y - 36, o.x, o.y);

                if (d < pulseSize / 2 + 20) {
                    o.isFound = true;
                    score += 1;
                    playOrbSound();
                }
            }
        }

        // enemy contact and stomp
        for (let i = 0; i < enemies.length; i++) {
            if (!enemies[i].isDead) {
                let result = enemies[i].checkContact(cat_world_x, cat_y, cat_vy);

                if (result === "stomp") {
                    enemies[i].isDead = true;
                    cat_vy = -10;
                    isOnGround = false;
                    playSquashSound();
                } else if (result === "hurt") {
                    loseLife();
                    break;
                }
            }
        }

        // fall off screen
        if (cat_y > height + 200) {
            loseLife();
        }

        if (score >= 10) {
            levelComplete = true;
        }
    }

    if ((gameOver || levelComplete) && !playedEndSound) {
        playEndSound();
        playedEndSound = true;
    }

    cameraPosX = cat_world_x - width / 2;

    // background
    background(35, 40, 95);

    noStroke();
    fill(235, 240, 180, 220);
    ellipse(940, 90, 90, 90);

    fill(80, 0, 120);
    rect(0, 250, width, floorY - 250);

    fill(18, 145, 60);
    rect(0, floorY, width, height - floorY);

    // scrolling world
    push();
    translate(-cameraPosX, 0);

    // stars
    for (let i = 0; i < stars.length; i++) {
        fill(255, 250, 210);
        ellipse(stars[i].x, stars[i].y, stars[i].size);
    }

    // mountains
    for (let i = 0; i < mountains.length; i++) {
        let m = mountains[i];
        let baseY = floorY;
        let h = m.width * m.heightScale;

        fill(95, 180, 245);
        quad(
            m.x, baseY,
            m.x + m.width * 0.18, baseY - h * 0.72,
            m.x + m.width * 0.56, baseY - h,
            m.x + m.width * 0.82, baseY
        );

        fill(60, 130, 215);
        triangle(
            m.x + m.width * 0.56, baseY - h,
            m.x + m.width * 0.82, baseY,
            m.x + m.width * 0.42, baseY
        );

        stroke(210, 245, 255);
        line(
            m.x + m.width * 0.56, baseY - h,
            m.x + m.width * 0.12, baseY - h * 0.46
        );
        noStroke();

        fill(180, 225, 255, 90);
        triangle(
            m.x + m.width * 0.18, baseY - h * 0.72,
            m.x + m.width * 0.28, baseY - h * 0.55,
            m.x + m.width * 0.40, baseY - h * 0.74
        );
    }

    // canyons
    for (let i = 0; i < canyons.length; i++) {
        let c = canyons[i];

        fill(75, 42, 30);
        rect(c.x, floorY, c.width, height - floorY);

        fill(0, 205, 255);
        rect(c.x + 7, floorY + 10, c.width - 14, height - floorY - 20);

        fill(170, 255, 255, 80);
        rect(c.x + 14, floorY + 16, c.width - 28, 10);
    }

    // platforms
    for (let i = 0; i < platforms.length; i++) {
        platforms[i].draw();
    }

    // trees
    for (let i = 0; i < trees_x.length; i++) {
        let tx = trees_x[i];
        let trunkH = 55 + (i % 3) * 14;
        let trunkW = 18 + (i % 2) * 2;
        let crownW = 70 + (i % 4) * 10;
        let crownH = 36 + (i % 3) * 8;
        let topY = floorY - trunkH;

        fill(205, 175, 225);
        rect(tx - trunkW / 2, topY, trunkW, trunkH, 10);

        fill(0, 215, 120);
        ellipse(tx, topY, crownW, crownH);
        ellipse(tx - crownW * 0.22, topY + 2, crownW * 0.45, crownH * 0.65);
        ellipse(tx + crownW * 0.22, topY + 1, crownW * 0.42, crownH * 0.6);

        fill(250, 255, 210);
        ellipse(tx - crownW * 0.18, topY - 5, 9);
        ellipse(tx + crownW * 0.04, topY - 10, 7);
        ellipse(tx + crownW * 0.2, topY + 3, 6);

        fill(0, 180, 100, 140);
        ellipse(tx, topY + 6, crownW * 0.65, crownH * 0.35);
    }

    // ground detail
    for (let i = 0; i < trees_x.length - 1; i++) {
        let rockX = trees_x[i] + 55;
        let rockW = 18 + (i % 3) * 7;
        let rockH = 10 + (i % 2) * 5;

        fill(120, 145, 160);
        ellipse(rockX, floorY - 3, rockW, rockH);
    }

    // orbs
    for (let i = 0; i < orbs.length; i++) {
        let o = orbs[i];

        if (!o.isFound) {
            let pulseSize = o.size * (1 + 0.12 * sin(frameCount * 0.08 + o.pulse));

            fill(120, 255, 240, 120);
            ellipse(o.x, o.y, pulseSize * 2.1);

            fill(120, 210, 255, 140);
            ellipse(o.x, o.y, pulseSize * 1.5);

            fill(255, 255, 190);
            ellipse(o.x, o.y, pulseSize);

            fill(255, 255, 255, 180);
            ellipse(o.x - pulseSize * 0.15, o.y - pulseSize * 0.15, pulseSize * 0.28);
        }
    }

    // enemies
    for (let i = 0; i < enemies.length; i++) {
        if (!enemies[i].isDead) {
            enemies[i].update();
            enemies[i].draw();
        }
    }

    // cat body
    fill(150, 210, 230);
    rect(cat_world_x - 16, cat_y - 40, 32, 40, 6);

    // chest
    fill(255, 170, 80);
    rect(cat_world_x - 10, cat_y - 26, 20, 12, 3);

    // head
    fill(220, 235, 245);
    rect(cat_world_x - 14, cat_y - 68, 28, 24, 6);

    // ears
    fill(180, 210, 235);
    triangle(
        cat_world_x - 12, cat_y - 68,
        cat_world_x - 4, cat_y - 80,
        cat_world_x, cat_y - 68
    );
    triangle(
        cat_world_x + 12, cat_y - 68,
        cat_world_x + 4, cat_y - 80,
        cat_world_x, cat_y - 68
    );

    // eyes
    fill(30, 50, 80);
    ellipse(cat_world_x - 6, cat_y - 58, 6);
    ellipse(cat_world_x + 6, cat_y - 58, 6);

    // eye detail
    fill(120, 230, 255);
    ellipse(cat_world_x - 6, cat_y - 59, 3);
    ellipse(cat_world_x + 6, cat_y - 59, 3);

    // cat states
    stroke(255, 220, 150);

    if (isPlummeting) {
        line(cat_world_x - 8, cat_y - 24, cat_world_x - 22, cat_y - 6);
        line(cat_world_x + 8, cat_y - 24, cat_world_x + 22, cat_y - 6);
        line(cat_world_x - 9, cat_y, cat_world_x - 16, cat_y + 12);
        line(cat_world_x + 9, cat_y, cat_world_x + 16, cat_y + 12);
    } else if (!isOnGround) {
        line(cat_world_x - 8, cat_y - 22, cat_world_x - 20, cat_y - 10);
        line(cat_world_x + 8, cat_y - 22, cat_world_x + 20, cat_y - 10);
        line(cat_world_x - 8, cat_y, cat_world_x - 2, cat_y - 10);
        line(cat_world_x + 8, cat_y, cat_world_x + 2, cat_y - 10);
    } else if (moveLeft) {
        line(cat_world_x - 8, cat_y - 22, cat_world_x - 18, cat_y - 12);
        line(cat_world_x + 8, cat_y - 22, cat_world_x + 14, cat_y - 18);
        line(cat_world_x - 8, cat_y, cat_world_x - 16, cat_y + 2);
        line(cat_world_x + 8, cat_y, cat_world_x + 2, cat_y - 10);
    } else if (moveRight) {
        line(cat_world_x - 8, cat_y - 22, cat_world_x - 14, cat_y - 18);
        line(cat_world_x + 8, cat_y - 22, cat_world_x + 18, cat_y - 12);
        line(cat_world_x - 8, cat_y, cat_world_x - 2, cat_y - 10);
        line(cat_world_x + 8, cat_y, cat_world_x + 16, cat_y + 2);
    } else {
        line(cat_world_x - 8, cat_y - 22, cat_world_x - 18, cat_y - 18);
        line(cat_world_x + 8, cat_y - 22, cat_world_x + 18, cat_y - 18);
        line(cat_world_x - 6, cat_y, cat_world_x - 6, cat_y + 12);
        line(cat_world_x + 6, cat_y, cat_world_x + 6, cat_y + 12);
    }

    // whiskers
    line(cat_world_x - 6, cat_y - 52, cat_world_x - 18, cat_y - 50);
    line(cat_world_x + 6, cat_y - 52, cat_world_x + 18, cat_y - 50);
    noStroke();

    // tail state
    fill(150, 210, 230);
    if (moveLeft && isOnGround && !isPlummeting) {
        rect(cat_world_x + 14, cat_y - 28, 4, 14, 4);
    } else if (moveRight && isOnGround && !isPlummeting) {
        rect(cat_world_x + 16, cat_y - 22, 4, 14, 4);
    } else if (!isOnGround) {
        rect(cat_world_x + 14, cat_y - 30, 4, 10, 4);
    } else {
        rect(cat_world_x + 14, cat_y - 26, 4, 16, 4);
    }

    // mouth
    if (isPlummeting) {
        fill(255, 120, 120);
        ellipse(cat_world_x, cat_y - 48, 8, 4);
    } else if (!isOnGround) {
        fill(255, 200, 200);
        ellipse(cat_world_x, cat_y - 49, 6, 3);
    } else {
        fill(255, 200, 200);
        ellipse(cat_world_x, cat_y - 49, 5, 2);
    }

    pop();

    // ui
    noStroke();
    fill(255);
    textFont(gameFont);
    textStyle(BOLD);
    textSize(26);
    text("SCORE: " + score + "/10", 30, 40);
    text("LIVES: " + lives, 30, 75);
    textStyle(NORMAL);

    if (!gameStarted) {
        fill(0, 0, 0, 180);
        rect(0, 0, width, height);

        fill(255);
        textFont(gameFont);
        textStyle(BOLD);
        textAlign(CENTER);
        textSize(40);
        text("PRESS ANY KEY TO START", width / 2, height / 2 - 55);

        textSize(20);
        text("ARROW KEYS TO MOVE AND JUMP", width / 2, height / 2 - 10);
        text("JUMP ON TOP OF ENEMIES TO SQUASH THEM", width / 2, height / 2 + 25);
        text("COLLECT ALL ORBS TO COMPLETE", width / 2, height / 2 + 60);

        textStyle(NORMAL);
        textAlign(LEFT);
    }

    if (gameOver) {
        fill(0, 0, 0, 160);
        rect(0, 0, width, height);

        fill(255);
        textFont(gameFont);
        textStyle(BOLD);
        textAlign(CENTER);
        textSize(42);
        text("GAME OVER", width / 2, height / 2 - 20);
        textSize(22);
        text("PRESS SPACE TO RESTART", width / 2, height / 2 + 25);
        textStyle(NORMAL);
        textAlign(LEFT);
    }

    if (levelComplete) {
        fill(0, 0, 0, 120);
        rect(0, 0, width, height);

        fill(255);
        textFont(gameFont);
        textStyle(BOLD);
        textAlign(CENTER);
        textSize(42);
        text("LEVEL COMPLETE", width / 2, height / 2 - 20);
        textSize(22);
        text("YOU COLLECTED 10 ORBS", width / 2, height / 2 + 20);
        text("PRESS SPACE TO PLAY AGAIN", width / 2, height / 2 + 55);
        textStyle(NORMAL);
        textAlign(LEFT);
    }
}

function createPlatform(x, y, length) {
    return {
        x: x,
        y: y,
        length: length,

        draw: function () {
            noStroke();

            fill(255, 140, 80);
            rect(this.x, this.y, this.length, 12, 5);

            fill(255, 210, 150);
            rect(this.x + 8, this.y + 2, this.length - 16, 4, 3);

            fill(170, 80, 50);
            rect(this.x + 10, this.y + 12, this.length - 20, 6, 3);
        },

        checkContact: function (catX, catY, catVY) {
            let catBottom = catY;
            let catPrevBottom = catY - catVY;

            if (catX > this.x + 4 && catX < this.x + this.length - 4) {
                if (catVY >= 0 && catPrevBottom <= this.y && catBottom >= this.y && catBottom <= this.y + 12) {
                    return true;
                }
            }

            return false;
        }
    };
}

function Enemy(x, y, range) {
    this.x = x;
    this.y = y;
    this.range = range;
    this.currentX = x;
    this.inc = 1.2;
    this.isDead = false;

    this.update = function () {
        this.currentX += this.inc;

        if (this.currentX < this.x) {
            this.inc = 1.2;
        } else if (this.currentX > this.x + this.range) {
            this.inc = -1.2;
        }
    };

    this.draw = function () {
        noStroke();

        fill(255, 110, 110);
        ellipse(this.currentX, this.y - 18, 26, 18);

        fill(255, 170, 170);
        ellipse(this.currentX, this.y - 20, 14, 10);

        fill(70);
        rect(this.currentX - 12, this.y - 10, 24, 10, 4);

        fill(255, 220, 120);
        ellipse(this.currentX - 5, this.y - 18, 4);
        ellipse(this.currentX + 5, this.y - 18, 4);

        stroke(255, 120, 120);
        line(this.currentX - 6, this.y, this.currentX - 12, this.y + 8);
        line(this.currentX + 6, this.y, this.currentX + 12, this.y + 8);
        noStroke();
    };

    this.checkContact = function (catX, catY, catVY) {
        let enemyTop = this.y - 27;
        let enemyBottom = this.y;
        let enemyLeft = this.currentX - 13;
        let enemyRight = this.currentX + 13;

        let catLeft = catX - 12;
        let catRight = catX + 12;
        let catTop = catY - 68;
        let catBottom = catY;

        let overlaps =
            catRight > enemyLeft &&
            catLeft < enemyRight &&
            catBottom > enemyTop &&
            catTop < enemyBottom;

        if (overlaps) {
            if (catVY > 0 && catBottom <= enemyTop + 10) {
                return "stomp";
            }
            return "hurt";
        }

        return "none";
    };
}

function setupSounds() {
    jumpOsc = new p5.Oscillator("triangle");
    jumpEnv = new p5.Envelope();
    jumpEnv.setADSR(0.01, 0.08, 0.0, 0.1);
    jumpEnv.setRange(0.18, 0);
    jumpOsc.start();
    jumpOsc.amp(0);

    orbOsc = new p5.Oscillator("sine");
    orbEnv = new p5.Envelope();
    orbEnv.setADSR(0.01, 0.12, 0.0, 0.08);
    orbEnv.setRange(0.16, 0);
    orbOsc.start();
    orbOsc.amp(0);

    loseOsc = new p5.Oscillator("square");
    loseEnv = new p5.Envelope();
    loseEnv.setADSR(0.01, 0.12, 0.0, 0.16);
    loseEnv.setRange(0.15, 0);
    loseOsc.start();
    loseOsc.amp(0);

    endOsc = new p5.Oscillator("sine");
    endEnv = new p5.Envelope();
    endEnv.setADSR(0.02, 0.2, 0.0, 0.2);
    endEnv.setRange(0.18, 0);
    endOsc.start();
    endOsc.amp(0);

    squashOsc = new p5.Oscillator("sawtooth");
    squashEnv = new p5.Envelope();
    squashEnv.setADSR(0.01, 0.06, 0.0, 0.08);
    squashEnv.setRange(0.14, 0);
    squashOsc.start();
    squashOsc.amp(0);
}

function playJumpSound() {
    if (audioStarted) {
        jumpOsc.freq(440);
        jumpEnv.play(jumpOsc);
    }
}

function playOrbSound() {
    if (audioStarted) {
        orbOsc.freq(760);
        orbEnv.play(orbOsc);
    }
}

function playLoseLifeSound() {
    if (audioStarted) {
        loseOsc.freq(180);
        loseEnv.play(loseOsc);
    }
}

function playEndSound() {
    if (audioStarted) {
        if (levelComplete) {
            endOsc.freq(620);
        } else {
            endOsc.freq(160);
        }
        endEnv.play(endOsc);
    }
}

function playSquashSound() {
    if (audioStarted) {
        squashOsc.freq(220);
        squashEnv.play(squashOsc);
    }
}

function loseLife() {
    playLoseLifeSound();
    lives -= 1;

    if (lives > 0) {
        resetCat();
    } else {
        gameOver = true;
    }
}

function resetCat() {
    cat_world_x = 200;
    cat_y = floorY;
    cat_vy = 0;
    isOnGround = true;
    isPlummeting = false;
    jumpPressed = false;
}

function resetGame() {
    cat_world_x = 200;
    cat_y = floorY;
    cat_vy = 0;
    isOnGround = true;
    isPlummeting = false;
    jumpPressed = false;

    score = 0;
    lives = 3;
    gameOver = false;
    levelComplete = false;
    gameStarted = false;
    playedEndSound = false;

    for (let i = 0; i < orbs.length; i++) {
        orbs[i].isFound = false;
    }

    for (let i = 0; i < enemies.length; i++) {
        enemies[i].isDead = false;
        enemies[i].currentX = enemies[i].x;
        enemies[i].inc = 1.2;
    }
}

function keyPressed() {
    if (!audioStarted) {
        userStartAudio();
        audioStarted = true;
    }

    if (!gameStarted) {
        gameStarted = true;
    } else if ((gameOver || levelComplete) && key === " ") {
        resetGame();
    }
}