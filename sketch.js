// Multiplayer Push-Off Game - Sumo Style!

// Players
let player1, player2;
let PLAYER_SIZE = 40;
let PLAYER_SPEED = 3;
let PUSH_FORCE = 0.8;
let FRICTION = 0.85;
let RECOIL_FORCE = 2.5; // Force of recoil when players collide
let RECOIL_DAMPING = 0.7; // How much recoil is applied

// Sprite animation (Piskel)
// You exported each player from Piskel as a horizontal spritesheet:
//   assets/player_1.png  -> Player 1 (blue or red, 5 frames, 15x15 each)
//   assets/player_2.png  -> Player 2
let player1Sheet, player2Sheet;
const FRAME_W = 15;       // Piskel frame width in px
const FRAME_H = 15;       // Piskel frame height in px
const PLAYER_FRAMES = 5;  // you have 5 frames per animation
const ANIM_SPEED = 6;     // lower = slower animation, higher = faster

// Collision tracking
let lastCollisionFrame = 0;
let collisionCooldown = 10; // Frames before another collision can register

// Platform
let platform;
let PLATFORM_WIDTH = 400;
let PLATFORM_HEIGHT = 30;

// Game state
let gameState = "start"; // "start" | "play" | "gameover"
let winner = null;
let player1Wins = 0;
let player2Wins = 0;
let overlayDiv;

// Images
let paperImg;

function preload() {
  // Load your 5-frame, 15x15 Piskel spritesheets for each player
  player1Sheet = loadImage("assets/player_1.png", () => {}, () => { player1Sheet = null; });
  player2Sheet = loadImage("assets/player_2.png", () => {}, () => { player2Sheet = null; });
  paperImg = loadImage("assets/paper-texture.png", () => {}, () => { paperImg = null; });
}

function setup() {
  createCanvas(1200, 800);
  
  overlayDiv = document.getElementById("overlay");
  resetGame();
  updateOverlay();
}

function windowResized() {
  resizeCanvas(1200, 800);
  resetGame();
}

function draw() {
  drawBackground();
  
  if (gameState === "play") {
    updateGame();
  } else {
    // Draw static view
    drawPlatform();
    drawPlayers();
  }
  
  drawHUD();
}

// ---------------- BACKGROUND ----------------

function drawBackground() {
  if (paperImg) {
    image(paperImg, 0, 0, width, height);
  } else {
    background(240, 240, 250);
  }
  
  // Danger zone indicators (edges)
  fill(255, 100, 100, 100);
  noStroke();
  rect(0, 0, 50, height);
  rect(width - 50, 0, 50, height);
  rect(0, 0, width, 50);
  rect(0, height - 50, width, 50);
}

// ---------------- GAME SETUP ----------------

function resetGame() {
  // Platform in center
  platform = {
    x: width / 2,
    y: height / 2,
    w: PLATFORM_WIDTH,
    h: PLATFORM_HEIGHT
  };
  
  // Player 1 (left side, uses arrow keys)
  player1 = {
    x: platform.x - 100,
    y: platform.y - PLAYER_SIZE / 2,
    vx: 0,
    vy: 0,
    color: [255, 100, 100], // Red
    facing: 1, // 1 = right, -1 = left
    recoilX: 0,
    recoilY: 0,
    inRecoil: false
  };
  
  // Player 2 (right side, uses WASD)
  player2 = {
    x: platform.x + 100,
    y: platform.y - PLAYER_SIZE / 2,
    vx: 0,
    vy: 0,
    color: [100, 150, 255], // Blue
    facing: -1,
    recoilX: 0,
    recoilY: 0,
    inRecoil: false
  };
  
  winner = null;
}

function startGame() {
  resetGame();
  gameState = "play";
  updateOverlay();
}

function endGame(winningPlayer) {
  gameState = "gameover";
  winner = winningPlayer;
  if (winningPlayer === 1) {
    player1Wins++;
  } else {
    player2Wins++;
  }
  updateOverlay();
}

// ---------------- GAME UPDATE ----------------

function updateGame() {
  updatePlayers();
  checkCollisions();
  checkBoundaries();
  drawPlatform();
  drawPlayers();
}

// ---------------- PLATFORM ----------------

function drawPlatform() {
  // Platform shadow
  fill(0, 0, 0, 30);
  noStroke();
  ellipse(platform.x, platform.y + platform.h/2 + 5, platform.w * 0.9, 20);
  
  // Platform
  fill(150, 150, 160);
  stroke(120, 120, 130);
  strokeWeight(3);
  rectMode(CENTER);
  rect(platform.x, platform.y, platform.w, platform.h, 5);
  
  // Platform center line
  stroke(200, 200, 200);
  strokeWeight(2);
  line(platform.x, platform.y - platform.h/2, platform.x, platform.y + platform.h/2);
  
  // Platform edges (danger zones)
  fill(255, 200, 200, 150);
  noStroke();
  rect(platform.x - platform.w/2, platform.y, 10, platform.h);
  rect(platform.x + platform.w/2, platform.y, 10, platform.h);
}

function isOnPlatform(player) {
  return player.x > platform.x - platform.w/2 &&
         player.x < platform.x + platform.w/2 &&
         player.y > platform.y - platform.h/2 - PLAYER_SIZE/2 &&
         player.y < platform.y + platform.h/2 + PLAYER_SIZE/2;
}

// ---------------- PLAYERS ----------------

function updatePlayers() {
  // Player 1 controls (Arrow keys)
  updatePlayer(player1,
    keyIsDown(LEFT_ARROW),
    keyIsDown(RIGHT_ARROW),
    keyIsDown(UP_ARROW),
    keyIsDown(DOWN_ARROW)
  );
  
  // Player 2 controls (WASD)
  updatePlayer(player2,
    keyIsDown(65), // A
    keyIsDown(68), // D
    keyIsDown(87), // W
    keyIsDown(83)  // S
  );
}

function updatePlayer(p, left, right, up, down) {
  // Apply recoil first (reduces over time)
  p.recoilX *= 0.85;
  p.recoilY *= 0.85;
  
  // Movement input (reduced during recoil)
  let dx = 0;
  let dy = 0;
  const movementMultiplier = p.inRecoil ? 0.5 : 1.0; // Reduced control during recoil
  
  if (left) {
    dx -= 1;
    p.facing = -1;
  }
  if (right) {
    dx += 1;
    p.facing = 1;
  }
  if (up) dy -= 1;
  if (down) dy += 1;
  
  // Normalize diagonal movement
  if (dx !== 0 && dy !== 0) {
    dx *= 0.707;
    dy *= 0.707;
  }
  
  // Apply movement (reduced during recoil)
  p.vx += dx * PLAYER_SPEED * 0.3 * movementMultiplier;
  p.vy += dy * PLAYER_SPEED * 0.3 * movementMultiplier;
  
  // Apply recoil velocity
  p.vx += p.recoilX;
  p.vy += p.recoilY;
  
  // Apply friction
  p.vx *= FRICTION;
  p.vy *= FRICTION;
  
  // Update position
  p.x += p.vx;
  p.y += p.vy;
  
  // Check if recoil has worn off
  if (abs(p.recoilX) < 0.1 && abs(p.recoilY) < 0.1) {
    p.inRecoil = false;
  }
  
  // Keep player on platform (if on platform)
  if (isOnPlatform(p)) {
    // Constrain to platform bounds
    p.x = constrain(p.x, platform.x - platform.w/2 + PLAYER_SIZE/2, 
                           platform.x + platform.w/2 - PLAYER_SIZE/2);
    p.y = constrain(p.y, platform.y - platform.h/2 - PLAYER_SIZE/2 + 5,
                           platform.y + platform.h/2 - PLAYER_SIZE/2 - 5);
  }
}

function drawPlayers() {
  drawPlayer(player1, 1);
  drawPlayer(player2, 2);
}

function drawPlayer(p, playerNum) {
  push();
  translate(p.x, p.y);
  
  // Shadow
  fill(0, 0, 0, 40);
  noStroke();
  ellipse(0, PLAYER_SIZE/2 + 3, PLAYER_SIZE * 0.8, PLAYER_SIZE * 0.3);
  
  // Player glow effect when moving
  if (abs(p.vx) > 0.5 || abs(p.vy) > 0.5) {
    drawingContext.shadowBlur = 15;
    drawingContext.shadowColor = `rgba(${p.color[0]}, ${p.color[1]}, ${p.color[2]}, 0.6)`;
  }
  
  // Recoil visual effect - red flash when in recoil
  if (p.inRecoil) {
    fill(255, 100, 100, 100);
    noStroke();
    ellipse(0, 0, PLAYER_SIZE * 1.3, PLAYER_SIZE * 1.3);
  }
  
  // Player body (Piskel sprite animation)
  const sheet = playerNum === 1 ? player1Sheet : player2Sheet;
  if (sheet) {
    // Decide whether we're moving or idle
    const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
    let frameIndex;
    if (speed < 0.3) {
      // Idle: show first frame
      frameIndex = 0;
    } else {
      // Moving: cycle through all frames
      frameIndex = Math.floor(frameCount / ANIM_SPEED) % PLAYER_FRAMES;
    }
    const sx = frameIndex * FRAME_W;
    const sy = 0; // all frames on first row

    // Flip horizontally when facing left
    if (p.facing === -1) {
      scale(-1, 1);
    }

    imageMode(CENTER);
    // Draw the frame scaled up from 15x15 to PLAYER_SIZE
    image(
      sheet,
      0,
      0,
      PLAYER_SIZE,
      PLAYER_SIZE,
      sx,
      sy,
      FRAME_W,
      FRAME_H
    );
  } else {
    // Fallback: simple circle with color
    fill(p.color[0], p.color[1], p.color[2]);
    stroke(255, 255, 255, 200);
    strokeWeight(2);
    ellipse(0, 0, PLAYER_SIZE, PLAYER_SIZE);
    
    // Player number indicator
    fill(255);
    textAlign(CENTER, CENTER);
    textSize(16);
    text(playerNum, 0, 0);
  }
  
  drawingContext.shadowBlur = 0;
  
  // Direction indicator (small arrow)
  fill(p.color[0], p.color[1], p.color[2], 200);
  noStroke();
  if (p.facing === 1) {
    triangle(PLAYER_SIZE/2 - 5, 0, PLAYER_SIZE/2 - 15, -8, PLAYER_SIZE/2 - 15, 8);
  } else {
    triangle(-PLAYER_SIZE/2 + 5, 0, -PLAYER_SIZE/2 + 15, -8, -PLAYER_SIZE/2 + 15, 8);
  }
  
  pop();
}

// ---------------- COLLISIONS ----------------

function checkCollisions() {
  // Distance between players
  const dx = player2.x - player1.x;
  const dy = player2.y - player1.y;
  const dist = sqrt(dx * dx + dy * dy);
  const minDist = PLAYER_SIZE;
  
  // Check collision cooldown to prevent rapid-fire collisions
  const canCollide = (frameCount - lastCollisionFrame) > collisionCooldown;
  
  if (dist < minDist && canCollide) {
    // Players are colliding - push each other apart
    const angle = atan2(dy, dx);
    const overlap = minDist - dist;
    const pushX = cos(angle) * overlap * 0.5;
    const pushY = sin(angle) * overlap * 0.5;
    
    // Separate players
    player1.x -= pushX;
    player1.y -= pushY;
    player2.x += pushX;
    player2.y += pushY;
    
    // Calculate relative velocity (how fast they're moving toward each other)
    const relativeVelX = player2.vx - player1.vx;
    const relativeVelY = player2.vy - player1.vy;
    const relativeSpeed = sqrt(relativeVelX * relativeVelX + relativeVelY * relativeVelY);
    
    // Calculate collision force based on relative velocity and current velocities
    const player1Speed = sqrt(player1.vx * player1.vx + player1.vy * player1.vy);
    const player2Speed = sqrt(player2.vx * player2.vx + player2.vy * player2.vy);
    
    // Recoil force is based on both players' momentum
    const recoil1 = RECOIL_FORCE * (player2Speed + relativeSpeed * 0.5) * RECOIL_DAMPING;
    const recoil2 = RECOIL_FORCE * (player1Speed + relativeSpeed * 0.5) * RECOIL_DAMPING;
    
    // Apply strong recoil in opposite directions
    // Player 1 gets pushed back (negative angle direction)
    player1.recoilX = -cos(angle) * recoil1;
    player1.recoilY = -sin(angle) * recoil1;
    player1.inRecoil = true;
    
    // Player 2 gets pushed back (positive angle direction)
    player2.recoilX = cos(angle) * recoil2;
    player2.recoilY = sin(angle) * recoil2;
    player2.inRecoil = true;
    
    // Also apply immediate velocity change
    player1.vx = -cos(angle) * recoil1 * 0.5;
    player1.vy = -sin(angle) * recoil1 * 0.5;
    player2.vx = cos(angle) * recoil2 * 0.5;
    player2.vy = sin(angle) * recoil2 * 0.5;
    
    // Update collision frame
    lastCollisionFrame = frameCount;
    
    // Visual feedback - collision flash with size based on impact
    const impactSize = map(relativeSpeed, 0, 10, 40, 100);
    fill(255, 200, 0, 200);
    noStroke();
    ellipse((player1.x + player2.x) / 2, (player1.y + player2.y) / 2, impactSize, impactSize);
    
    // Impact particles
    for (let i = 0; i < 8; i++) {
      const particleAngle = angle + (TWO_PI / 8) * i;
      const particleDist = impactSize * 0.6;
      fill(255, 150, 0, 180);
      ellipse(
        (player1.x + player2.x) / 2 + cos(particleAngle) * particleDist,
        (player1.y + player2.y) / 2 + sin(particleAngle) * particleDist,
        8, 8
      );
    }
  }
}

// ---------------- BOUNDARIES & WIN CONDITION ----------------

function checkBoundaries() {
  // Check if players fell off the screen
  const margin = 100;
  
  if (player1.x < -margin || player1.x > width + margin ||
      player1.y < -margin || player1.y > height + margin) {
    endGame(2); // Player 2 wins
    return;
  }
  
  if (player2.x < -margin || player2.x > width + margin ||
      player2.y < -margin || player2.y > height + margin) {
    endGame(1); // Player 1 wins
    return;
  }
}

// ---------------- HUD ----------------

function drawHUD() {
  // Score display
  fill(60);
  textAlign(LEFT, TOP);
  textSize(20);
  noStroke();
  
  // Player 1 score
  fill(player1.color[0], player1.color[1], player1.color[2]);
  text(`Player 1: ${player1Wins}`, 20, 20);
  
  // Player 2 score
  fill(player2.color[0], player2.color[1], player2.color[2]);
  text(`Player 2: ${player2Wins}`, width - 150, 20);
  
  // Controls hint
  if (gameState === "play") {
    fill(100, 100, 100, 180);
    textSize(14);
    textAlign(CENTER, BOTTOM);
    text("Push your opponent off the platform!", width/2, height - 20);
    
    // Control indicators
    fill(60, 60, 60, 150);
    textAlign(LEFT, BOTTOM);
    textSize(12);
    text("P1: Arrow Keys", 20, height - 20);
    textAlign(RIGHT, BOTTOM);
    text("P2: WASD", width - 20, height - 20);
  }
}

// ---------------- INPUT ----------------

function keyPressed() {
  if (keyCode === 32) { // Space
    if (gameState === "start" || gameState === "gameover") {
      startGame();
    }
  }
}

// ---------------- OVERLAY ----------------

function updateOverlay() {
  if (gameState === "play") {
    overlayDiv.classList.add("hidden");
    return;
  }
  
  const container = document.createElement("div");
  container.className = "overlay-content";
  
  if (gameState === "start") {
    container.innerHTML = `
      <h2>Push-Off Battle!</h2>
      <p><strong>Player 1 (Red):</strong> Arrow Keys</p>
      <p><strong>Player 2 (Blue):</strong> WASD Keys</p>
      <p>Push your opponent off the platform to win!</p>
      <p>Use movement to build momentum and push harder.</p>
      <p style="margin-top:0.4rem;opacity:0.8;"><strong>Press SPACE to start.</strong></p>
    `;
  } else if (gameState === "gameover") {
    const winnerColor = winner === 1 ? "Red" : "Blue";
    const winnerNum = winner === 1 ? "1" : "2";
    container.innerHTML = `
      <h2>${winnerColor} Player Wins!</h2>
      <p>Player ${winnerNum} pushed their opponent off!</p>
      <p>Score: Player 1 (${player1Wins}) - Player 2 (${player2Wins})</p>
      <p style="margin-top:0.4rem;opacity:0.8;"><strong>Press SPACE to play again.</strong></p>
    `;
  }
  
  overlayDiv.innerHTML = "";
  overlayDiv.appendChild(container);
  overlayDiv.classList.remove("hidden");
}
