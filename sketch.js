// Sketchbook Memories - starter game

let player;
let memories = [];
let enemies = [];

let score = 0;
let bestScore = 0;
let gameState = "start"; // "start" | "play" | "gameover"

let overlayDiv;

// optional images (your art)
let playerImg, memoryImg, enemyImg, paperImg;

// spawn timing
const MEMORY_SPAWN_RATE = 90; // frames
const ENEMY_SPAWN_RATE = 80;  // frames
const PLAYER_SPEED = 3.5;
const PLAYER_RADIUS = 16;

function preload() {
  // drop your art into /assets and uncomment these
  // if you don't have the files yet, you can leave them as-is
  playerImg = loadImage("assets/player.png", () => {}, () => { playerImg = null; });
  memoryImg = loadImage("assets/memory.png", () => {}, () => { memoryImg = null; });
  enemyImg  = loadImage("assets/enemy.png", () => {}, () => { enemyImg = null; });
  paperImg  = loadImage("assets/paper-texture.png", () => {}, () => { paperImg = null; });
}

function setup() {
  createCanvas(windowWidth, windowHeight);

  overlayDiv = document.getElementById("overlay");
  loadBestScore();
  resetGame();
  updateOverlay();
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

function draw() {
  drawBackground();

  if (gameState === "play") {
    updateGame();
  } else if (gameState === "start" || gameState === "gameover") {
    // draw static snapshot
    drawMemories();
    drawEnemies();
    drawPlayer();
  }

  drawHUD();
}

// ---------------- BACKGROUND ----------------

function drawBackground() {
  if (paperImg) {
    image(paperImg, 0, 0, width, height);
  } else {
    background(244, 240, 232);
  }

  // subtle vignette / edge darkening
  noStroke();
  for (let i = 0; i < 200; i++) {
    const x = random(width);
    const y = random(height);
    const alpha = map(dist(x, y, width / 2, height / 2), 0, width / 1.5, 0, 40);
    fill(220, 210, 200, alpha);
    ellipse(x, y, 2, 2);
  }

  // faint notebook lines
  stroke(220, 210, 200, 80);
  strokeWeight(1);
  for (let y = 0; y < height; y += 28) {
    line(0, y, width, y);
  }
}

// ---------------- GAME FLOW ----------------

function resetGame() {
  player = {
    x: width / 2,
    y: height / 2,
    r: PLAYER_RADIUS
  };
  memories = [];
  enemies = [];
  score = 0;
}

function startGame() {
  resetGame();
  gameState = "play";
  updateOverlay();
}

function endGame() {
  gameState = "gameover";
  if (score > bestScore) {
    bestScore = score;
    saveBestScore();
  }
  updateOverlay();
}

function updateGame() {
  updatePlayer();

  if (frameCount % MEMORY_SPAWN_RATE === 0) spawnMemory();
  if (frameCount % ENEMY_SPAWN_RATE === 0) spawnEnemy();

  updateMemories();
  updateEnemies();

  drawMemories();
  drawEnemies();
  drawPlayer();

  checkCollisions();
}

// ---------------- PLAYER ----------------

function updatePlayer() {
  let dx = 0;
  let dy = 0;

  if (keyIsDown(LEFT_ARROW) || keyIsDown(65)) dx -= 1;
  if (keyIsDown(RIGHT_ARROW) || keyIsDown(68)) dx += 1;
  if (keyIsDown(UP_ARROW) || keyIsDown(87)) dy -= 1;
  if (keyIsDown(DOWN_ARROW) || keyIsDown(83)) dy += 1;

  if (dx !== 0 || dy !== 0) {
    const len = sqrt(dx * dx + dy * dy);
    dx /= len;
    dy /= len;
  }

  player.x += dx * PLAYER_SPEED;
  player.y += dy * PLAYER_SPEED;

  player.x = constrain(player.x, player.r, width - player.r);
  player.y = constrain(player.y, player.r, height - player.r);
}

function drawPlayer() {
  push();
  translate(player.x, player.y);

  if (playerImg) {
    // glow behind your art
    drawingContext.shadowBlur = player.r * 2.8;
    drawingContext.shadowColor = "rgba(255,180,140,0.9)";
    noStroke();
    fill(255, 210, 170, 60);
    ellipse(0, 0, player.r * 2.5);
    drawingContext.shadowBlur = 0;

    imageMode(CENTER);
    const size = player.r * 3;
    image(playerImg, 0, 0, size, size);
  } else {
    // fallback: simple doodle-like circle
    noStroke();
    fill(255, 220, 200);
    ellipse(0, 0, player.r * 2.4);
    fill(150, 80, 60);
    ellipse(-3, -3, 4, 4);
    ellipse(3, -3, 4, 4);
    noFill();
    stroke(150, 80, 60);
    strokeWeight(1.5);
    arc(0, 3, 10, 8, 0, PI);
  }

  pop();
}

// ---------------- MEMORIES (COLLECTIBLES) ----------------

function spawnMemory() {
  const margin = 40;
  const m = {
    x: random(margin, width - margin),
    y: random(margin, height - margin),
    r: random(10, 18),
    life: random(600, 1200),
    phase: random(1000),
    // later you can add: text snippet or index of artwork
  };
  memories.push(m);
}

function updateMemories() {
  for (let m of memories) {
    m.life--;
  }
  memories = memories.filter(m => m.life > 0);
}

function drawMemories() {
  for (let m of memories) {
    push();
    translate(m.x, m.y);
    const t = frameCount * 0.05 + m.phase;
    const pulse = 1 + 0.1 * sin(t);

    if (memoryImg) {
      drawingContext.shadowBlur = m.r * 2;
      drawingContext.shadowColor = "rgba(255,190,150,0.9)";
      noStroke();
      fill(255, 210, 170, 60);
      ellipse(0, 0, m.r * 2.3 * pulse);
      drawingContext.shadowBlur = 0;

      imageMode(CENTER);
      const size = m.r * 2.2 * pulse;
      image(memoryImg, 0, 0, size, size);
    } else {
      noStroke();
      fill(255, 240, 210);
      rectMode(CENTER);
      rotate(0.1 * sin(t * 0.5));
      rect(0, 0, m.r * 2.1 * pulse, m.r * 1.6 * pulse, 3);
      stroke(160, 100, 80);
      strokeWeight(1);
      line(-m.r * 0.8, -2, m.r * 0.8, -2);
      line(-m.r * 0.8, 2, m.r * 0.4, 2);
    }

    pop();
  }
}

// ---------------- ENEMIES (SCRIBBLES) ----------------

function spawnEnemy() {
  // spawn from random edge
  const edge = floor(random(4));
  let x, y;
  if (edge === 0) {
    x = 0; y = random(height);
  } else if (edge === 1) {
    x = width; y = random(height);
  } else if (edge === 2) {
    x = random(width); y = 0;
  } else {
    x = random(width); y = height;
  }

  const angle = atan2(player.y - y, player.x - x);
  const speed = random(1.8, 2.8);
  enemies.push({
    x, y,
    vx: cos(angle) * speed,
    vy: sin(angle) * speed,
    r: random(14, 22),
    life: 800
  });
}

function updateEnemies() {
  for (let e of enemies) {
    e.x += e.vx;
    e.y += e.vy;
    e.life--;
  }
  enemies = enemies.filter(e =>
    e.life > 0 &&
    e.x > -60 && e.x < width + 60 &&
    e.y > -60 && e.y < height + 60
  );
}

function drawEnemies() {
  for (let e of enemies) {
    push();
    translate(e.x, e.y);

    if (enemyImg) {
      drawingContext.shadowBlur = e.r * 2;
      drawingContext.shadowColor = "rgba(180,80,80,0.9)";
      noStroke();
      fill(255, 200, 190, 70);
      ellipse(0, 0, e.r * 2.4);
      drawingContext.shadowBlur = 0;

      imageMode(CENTER);
      const size = e.r * 2.4;
      image(enemyImg, 0, 0, size, size);
    } else {
      noFill();
      stroke(130, 60, 60, 190);
      strokeWeight(2.2);
      for (let i = 0; i < 6; i++) {
        const angle = (TWO_PI / 6) * i;
        const len = e.r * 1.4;
        const x2 = cos(angle) * len;
        const y2 = sin(angle) * len;
        line(-x2 * 0.2, -y2 * 0.2, x2, y2);
      }
    }

    pop();
  }
}

// ---------------- COLLISIONS ----------------

function checkCollisions() {
  // enemies
  for (let e of enemies) {
    const d = dist(player.x, player.y, e.x, e.y);
    if (d < player.r + e.r * 0.7) {
      endGame();
      return;
    }
  }

  // memories
  for (let i = memories.length - 1; i >= 0; i--) {
    const m = memories[i];
    const d = dist(player.x, player.y, m.x, m.y);
    if (d < player.r + m.r) {
      score += 10;
      memories.splice(i, 1);
      // here you can trigger a "memory popup" later
    }
  }

  // passive score
  score += 0.03;
}

// ---------------- HUD / OVERLAY ----------------

function drawHUD() {
  noStroke();
  fill(60);
  textAlign(RIGHT, TOP);
  textSize(14);
  text(`score: ${floor(score)}`, width - 16, 12);
  textSize(12);
  fill(120);
  text(`best: ${floor(bestScore)}`, width - 16, 30);
}

function keyPressed() {
  if (keyCode === 32) { // space
    if (gameState === "start" || gameState === "gameover") {
      startGame();
    }
  }
}

function updateOverlay() {
  if (gameState === "play") {
    overlayDiv.classList.add("hidden");
    return;
  }

  const container = document.createElement("div");
  container.className = "overlay-content";

  if (gameState === "start") {
    container.innerHTML = `
      <h2>Sketchbook Memories</h2>
      <p>Drift through a page full of old thoughts.</p>
      <p>Collect gentle memories, avoid scribbles.</p>
      <p style="margin-top:0.4rem;opacity:0.8;"><strong>Press SPACE to begin.</strong></p>
    `;
  } else if (gameState === "gameover") {
    container.innerHTML = `
      <h2>Page Full</h2>
      <p>memories found: ${floor(score / 10)}</p>
      <p>best page: ${floor(bestScore / 10)} memories</p>
      <p style="margin-top:0.4rem;opacity:0.8;"><strong>Press SPACE to try another page.</strong></p>
    `;
  }

  overlayDiv.innerHTML = "";
  overlayDiv.appendChild(container);
  overlayDiv.classList.remove("hidden");
}

// ---------------- LOCAL STORAGE ----------------

function saveBestScore() {
  try {
    localStorage.setItem("sketchbookBest", String(bestScore));
  } catch (e) {}
}

function loadBestScore() {
  try {
    const val = localStorage.getItem("sketchbookBest");
    bestScore = val ? parseFloat(val) || 0 : 0;
  } catch (e) {
    bestScore = 0;
  }
}

