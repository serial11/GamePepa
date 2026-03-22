// game.js
import theme from "./theme.js";
import { createPlayer, movePlayer } from "./player.js";
import { fireBullet, updateBullets } from "./bullet.js";
import { createEnemy, updateEnemies, enemyReachedBottom, getEnemySpeed, getSpawnInterval } from "./enemy.js";
import { saveScore, getTopN } from "./leaderboard.js";
import { initTouchControls, isTouchDevice } from "./touch.js";

const CANVAS_WIDTH  = 480;
const CANVAS_HEIGHT = 640;

const canvas       = document.getElementById("game-canvas");
const ctx          = canvas.getContext("2d");
const overlay      = document.getElementById("overlay");
const finalScoreEl = document.getElementById("final-score");

// Image loading — resolves to null on failure (triggers fallback rendering)
function loadImage(src) {
  return new Promise(resolve => {
    const img = new Image();
    img.onload  = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function drawEntity(img, fallbackColor, x, y, w, h) {
  if (img instanceof HTMLImageElement) {
    ctx.drawImage(img, x, y, w, h);
  } else {
    ctx.fillStyle = fallbackColor;
    ctx.fillRect(x, y, w, h);
  }
}

// Game state
let state             = "playing";
let score             = 0;
let difficultyLevel   = 0;
let spawnFrameCounter = 0;
let animFrameId       = null;
let player     = null;
let bullets    = [];
let enemies    = [];
let explosions = [];
const keys = {};
const images = {};

let currentPlayerName = "";
let lastSavedIndex    = -1;

// Wire restart button only after images are loaded to avoid race condition
async function init() {
  [images.player, images.enemy, images.bullet] = await Promise.all([
    loadImage(theme.playerImage),
    loadImage(theme.enemyImage),
    loadImage(theme.bulletImage),
  ]);

  const nameInput   = document.getElementById("name-input");
  const playBtn     = document.getElementById("play-btn");

  nameInput.addEventListener("input", () => {
    playBtn.disabled = nameInput.value.trim() === "";
  });
  document.getElementById("play-btn").addEventListener("click", submitName);
  nameInput.addEventListener("keydown", e => {
    if (e.key === "Enter") submitName();
  });
  document.getElementById("restart-btn").addEventListener("click", resetGame);
  document.getElementById("leaderboard-btn").addEventListener("click", showLeaderboard);
  document.getElementById("leaderboard-close-btn").addEventListener("click", hideLeaderboard);
  document.getElementById("resume-btn").addEventListener("click", resumeGame);
  document.getElementById("quit-btn").addEventListener("click", quitToMenu);
  document.getElementById("change-name-btn").addEventListener("click", showNameEntry);

  state = "name-entry";
  document.getElementById("name-overlay").classList.add("visible");

  initTouchControls(
    canvas,
    keys,
    () => { if (state === "playing" && player) fireBullet(bullets, player); }, // player/bullets are module-level vars in game.js
    () => { if (state === "playing") pauseGame(); else if (state === "paused") resumeGame(); }
  );
}

function resetGame() {
  score             = 0;
  difficultyLevel   = 0;
  spawnFrameCounter = 0;
  player     = createPlayer();
  bullets    = [];
  enemies    = [];
  explosions = [];
  state      = "playing";
  overlay.classList.remove("visible");
  document.getElementById("leaderboard-overlay").classList.remove("visible");
  if (animFrameId) cancelAnimationFrame(animFrameId);
  animFrameId = requestAnimationFrame(loop);
}

function renderTop3(savedIndex) {
  const list    = document.getElementById("top3-list");
  const entries = getTopN(3);
  list.innerHTML = entries.map((e, i) => {
    const cls = i === savedIndex ? " class=\"current-player\"" : "";
    return `<li${cls}>${e.name} — ${e.score}</li>`;
  }).join("");
}

function showLeaderboard() {
  const entries  = getTopN(10);
  const list     = document.getElementById("leaderboard-list");
  const yourScore = document.getElementById("your-score");

  list.innerHTML = entries.map((e, i) => {
    const cls = i === lastSavedIndex ? " class=\"current-player\"" : "";
    return `<li${cls}>${e.name} — ${e.score}</li>`;
  }).join("");

  if (lastSavedIndex === -1) {
    yourScore.textContent = `Your score: ${score}`;
    yourScore.classList.remove("hidden");
  } else {
    yourScore.classList.add("hidden");
  }

  document.getElementById("leaderboard-overlay").classList.add("visible");
}

function hideLeaderboard() {
  document.getElementById("leaderboard-overlay").classList.remove("visible");
}

function showNameEntry() {
  const input = document.getElementById("name-input");
  input.value = currentPlayerName;
  input.dispatchEvent(new Event("input")); // re-evaluate play-btn disabled state
  document.getElementById("overlay").classList.remove("visible");
  document.getElementById("name-overlay").classList.add("visible");
}

function pauseGame() {
  state = "paused";
  document.getElementById("pause-overlay").classList.add("visible");
}

function resumeGame() {
  state = "playing";
  document.getElementById("pause-overlay").classList.remove("visible");
  animFrameId = requestAnimationFrame(loop);
}

function quitToMenu() {
  if (animFrameId) cancelAnimationFrame(animFrameId); // guard against RAF already queued
  state             = "name-entry";
  score             = 0;
  difficultyLevel   = 0;
  spawnFrameCounter = 0;
  player     = null;
  bullets    = [];
  enemies    = [];
  explosions = [];
  document.getElementById("pause-overlay").classList.remove("visible");
  document.getElementById("leaderboard-overlay").classList.remove("visible");
  showNameEntry();
}

function submitName() {
  const name = document.getElementById("name-input").value.trim();
  if (!name) return;
  currentPlayerName = name;
  document.getElementById("name-overlay").classList.remove("visible");
  resetGame();
}

// Input
document.addEventListener("keydown", e => {
  keys[e.code] = true;
  if (e.code === "Space" && state === "playing" && player) {
    e.preventDefault();
    fireBullet(bullets, player);
  }
  if (e.code === "Escape") {
    e.preventDefault();
    if (state === "playing") pauseGame();
    else if (state === "paused") resumeGame();
  }
});
document.addEventListener("keyup", e => { keys[e.code] = false; });

// Game loop
function loop() {
  if (state === "playing") update();
  draw();
  if (state === "playing") {
    animFrameId = requestAnimationFrame(loop);
  }
}

function update() {
  difficultyLevel = Math.floor(score / 10);
  movePlayer(player, keys);
  bullets = updateBullets(bullets);

  // Spawn enemies
  spawnFrameCounter++;
  if (spawnFrameCounter >= getSpawnInterval(difficultyLevel)) {
    spawnFrameCounter = 0;
    const enemy = createEnemy(getEnemySpeed(difficultyLevel), enemies);
    if (enemy) enemies.push(enemy);
  }

  updateEnemies(enemies);

  // Collision: bullet vs enemy (guard both hit sets to prevent double-counting)
  const hitBullets = new Set();
  const hitEnemies = new Set();
  for (let bi = 0; bi < bullets.length; bi++) {
    if (hitBullets.has(bi)) continue;
    for (let ei = 0; ei < enemies.length; ei++) {
      if (hitEnemies.has(ei)) continue;
      if (aabb(bullets[bi], enemies[ei])) {
        hitBullets.add(bi);
        hitEnemies.add(ei);
        score++;
        explosions.push({ x: enemies[ei].x + enemies[ei].width / 2, y: enemies[ei].y + enemies[ei].height / 2, frame: 0 });
      }
    }
  }
  bullets  = bullets.filter((_, i) => !hitBullets.has(i));
  enemies  = enemies.filter((_, i) => !hitEnemies.has(i));

  // Update explosions
  for (const ex of explosions) ex.frame++;
  explosions = explosions.filter(ex => ex.frame <= 20);

  // Game over
  if (enemyReachedBottom(enemies, CANVAS_HEIGHT)) {
    state = "game-over";
    lastSavedIndex = saveScore(currentPlayerName, score);
    finalScoreEl.textContent = `${theme.scoreLabel}: ${score}`;
    renderTop3(lastSavedIndex);
    overlay.classList.add("visible");
  }
}

function aabb(a, b) {
  return a.x < b.x + b.width  &&
         a.x + a.width  > b.x &&
         a.y < b.y + b.height &&
         a.y + a.height > b.y;
}

function draw() {
  ctx.fillStyle = theme.backgroundColor;
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  drawEntity(images.player, "#FF69B4", player.x, player.y, player.width, player.height);

  for (const b of bullets) {
    drawEntity(images.bullet, "#FFFF00", b.x, b.y, b.width, b.height);
  }

  for (const e of enemies) {
    drawEntity(images.enemy, "#8B4513", e.x, e.y, e.width, e.height);
  }

  ctx.save();
  for (const ex of explosions) {
    const radius = 32 * (ex.frame / 20);
    ctx.beginPath();
    ctx.arc(ex.x, ex.y, radius, 0, Math.PI * 2);
    ctx.fillStyle = theme.explosionColor;
    ctx.fill();
  }
  ctx.restore();

  if (isTouchDevice) {
    document.getElementById("hud-score").textContent = `${theme.scoreLabel}: ${score}`;
    document.getElementById("hud-name").textContent = currentPlayerName;
  } else {
    ctx.save();
    ctx.fillStyle = "#fff";
    ctx.font = "bold 16px sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(`${theme.scoreLabel}: ${score}`, 8, 20);
    ctx.restore();

    if (currentPlayerName) {
      ctx.save();
      ctx.fillStyle = "#fff";
      ctx.font = "bold 16px sans-serif";
      ctx.textAlign = "right";
      ctx.fillText(currentPlayerName, CANVAS_WIDTH - 8, 20);
      ctx.restore();
    }
  }
}

// Canvas scaling — gameplay stays in 480×640; canvas scales visually via CSS.
// The restart button is an HTML element inside the scaled wrapper, so its
// click events work without coordinate transformation.
function applyScale() {
  const scale   = Math.min(window.innerWidth / CANVAS_WIDTH, window.innerHeight / CANVAS_HEIGHT);
  const wrapper = canvas.parentElement;
  wrapper.style.transform       = `scale(${scale})`;
  wrapper.style.transformOrigin = "top left";
  wrapper.style.left            = `${(window.innerWidth  - CANVAS_WIDTH  * scale) / 2}px`;
  wrapper.style.top             = `${(window.innerHeight - CANVAS_HEIGHT * scale) / 2}px`;
}
window.addEventListener("resize", applyScale);
applyScale();

// Tab visibility — only resume loop if still in playing state
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    cancelAnimationFrame(animFrameId);
  } else if (state === "playing") {
    spawnFrameCounter = 0;
    animFrameId = requestAnimationFrame(loop);
  }
});

init();
