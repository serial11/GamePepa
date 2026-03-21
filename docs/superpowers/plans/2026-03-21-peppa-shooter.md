# Peppa Pig Shooter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a playable browser-based Space Invaders-style game with a Peppa Pig theme, running on a 480×640 HTML5 Canvas with vanilla JS and no build tools.

**Architecture:** ES modules loaded via `<script type="module">` in `index.html`. Pure-logic modules (`player.js`, `bullet.js`, `enemy.js`) export factory/update functions with no DOM coupling. `game.js` owns the `requestAnimationFrame` loop, state machine, rendering, and wires all modules together.

**Tech Stack:** HTML5, CSS3, vanilla JavaScript (ES modules), HTML5 Canvas API — zero dependencies, no build step.

---

## File Map

| File | Responsibility |
| --- | --- |
| `index.html` | Canvas element, game-over overlay, restart button, CSS, module entry point |
| `game.js` | Game loop, state machine (`playing`/`game-over`), rendering, collision, input, difficulty, score |
| `player.js` | Player state factory, move/clamp logic |
| `bullet.js` | Bullet state factory, per-frame update, fire logic |
| `enemy.js` | Enemy state factory, per-frame update, spawn logic |
| `theme.js` | Re-exports active theme (one import to change for theme swap) |
| `themes/peppa.js` | Peppa Pig theme config object |
| `scripts/create-placeholders.js` | Node script to generate 48×48 placeholder PNGs under `assets/peppa/` |

---

## Task 1: Project Scaffold and Theme System

**Files:**

- Create: `index.html`
- Create: `theme.js`
- Create: `themes/peppa.js`
- Create: `scripts/create-placeholders.js`

- [ ] **Step 1: Create directory structure**

```bash
mkdir -p themes assets/peppa scripts
```

- [ ] **Step 2: Create `themes/peppa.js`**

```js
// themes/peppa.js
export default {
  name: "peppa",
  playerImage: "assets/peppa/player.png",
  enemyImage: "assets/peppa/enemy.png",
  bulletImage: "assets/peppa/bullet.png",
  explosionColor: "#FF69B4",
  backgroundColor: "#87CEEB",
  scoreLabel: "Muddy Points",
};
```

- [ ] **Step 3: Create `theme.js`**

```js
// theme.js — change this one import to switch themes
import theme from "./themes/peppa.js";
export default theme;
```

- [ ] **Step 4: Create `scripts/create-placeholders.js`**

This script generates minimal 48×48 solid-color PNGs using raw PNG bytes (no npm packages — just Node built-ins).

```js
// scripts/create-placeholders.js
// Run with: node scripts/create-placeholders.js
import { writeFileSync } from "fs";
import { deflateSync } from "zlib";

function makePNG(filename, r, g, b) {
  const W = 48, H = 48;
  const raw = Buffer.alloc(H * (1 + W * 3));
  for (let y = 0; y < H; y++) {
    raw[y * (1 + W * 3)] = 0;
    for (let x = 0; x < W; x++) {
      const i = y * (1 + W * 3) + 1 + x * 3;
      raw[i] = r; raw[i + 1] = g; raw[i + 2] = b;
    }
  }
  const compressed = deflateSync(raw);

  function crc32(buf) {
    let c = 0xFFFFFFFF;
    for (const b of buf) {
      c ^= b;
      for (let i = 0; i < 8; i++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    }
    return (c ^ 0xFFFFFFFF) >>> 0;
  }

  function chunk(type, data) {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const t = Buffer.from(type);
    const crc = crc32(Buffer.concat([t, data]));
    const c = Buffer.alloc(4); c.writeUInt32BE(crc >>> 0);
    return Buffer.concat([len, t, data, c]);
  }

  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8; ihdr[9] = 2;
  const png = Buffer.concat([sig, chunk("IHDR", ihdr), chunk("IDAT", compressed), chunk("IEND", Buffer.alloc(0))]);
  writeFileSync(filename, png);
  console.log("Created", filename);
}

makePNG("assets/peppa/player.png", 255, 105, 180);
makePNG("assets/peppa/enemy.png",  139,  69,  19);
makePNG("assets/peppa/bullet.png", 255, 255,   0);
```

- [ ] **Step 5: Run the placeholder generator**

```bash
node scripts/create-placeholders.js
```

Expected output:

```text
Created assets/peppa/player.png
Created assets/peppa/enemy.png
Created assets/peppa/bullet.png
```

- [ ] **Step 6: Create `index.html`**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Peppa Shooter</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      background: #222;
      height: 100vh;
      overflow: hidden;
    }
    #canvas-wrapper {
      position: absolute;
      width: 480px;
      height: 640px;
    }
    canvas {
      display: block;
      width: 480px;
      height: 640px;
    }
    #overlay {
      display: none;
      position: absolute;
      inset: 0;
      background: rgba(0, 0, 0, 0.6);
      flex-direction: column;
      justify-content: center;
      align-items: center;
      color: #fff;
      font-family: sans-serif;
      text-align: center;
      gap: 16px;
    }
    #overlay.visible { display: flex; }
    #overlay h1 { font-size: 48px; }
    #overlay p  { font-size: 24px; }
    #restart-btn {
      padding: 12px 32px;
      font-size: 20px;
      background: #FF69B4;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      color: #fff;
      font-weight: bold;
    }
    #restart-btn:hover { background: #ff4da6; }
  </style>
</head>
<body>
  <div id="canvas-wrapper">
    <canvas id="game-canvas" width="480" height="640"></canvas>
    <div id="overlay">
      <h1>Game Over!</h1>
      <p id="final-score"></p>
      <button id="restart-btn">Restart</button>
    </div>
  </div>
  <script type="module" src="game.js"></script>
</body>
</html>
```

Note: `#canvas-wrapper` uses `position: absolute` from the start. `game.js` sets its `left`/`top` via `applyScale()` to center it.

- [ ] **Step 7: Open `index.html` in browser — confirm no console errors**

- [ ] **Step 8: Commit**

```bash
git add index.html theme.js themes/peppa.js scripts/create-placeholders.js assets/peppa/
git commit -m "feat: scaffold project — theme system and index.html"
```

---

## Task 2: Player Module

**Files:**

- Create: `player.js`

- [ ] **Step 1: Create `player.js`**

```js
// player.js
const CANVAS_WIDTH = 480;
const CANVAS_HEIGHT = 640;

export function createPlayer() {
  return {
    x: CANVAS_WIDTH / 2 - 24,
    y: CANVAS_HEIGHT - 48 - 16,
    width: 48,
    height: 48,
    speed: 4,
  };
}

export function movePlayer(player, keys) {
  if (keys.ArrowLeft)  player.x -= player.speed;
  if (keys.ArrowRight) player.x += player.speed;
  player.x = Math.max(0, Math.min(CANVAS_WIDTH - player.width, player.x));
}
```

- [ ] **Step 2: Verify in browser console**

Add a temporary script block to the bottom of `<body>` in `index.html`:

```html
<script type="module">
  import { createPlayer, movePlayer } from "./player.js";
  const p = createPlayer();
  console.assert(p.x === 216, "player x center");
  console.assert(p.y === 576, "player y bottom");
  movePlayer(p, { ArrowLeft: true });
  console.assert(p.x === 212, "moved left");
  p.x = 0; movePlayer(p, { ArrowLeft: true });
  console.assert(p.x === 0, "clamped left");
  p.x = 432; movePlayer(p, { ArrowRight: true });
  console.assert(p.x === 432, "clamped right");
  console.log("player.js: all assertions passed");
</script>
```

Expected: `player.js: all assertions passed`

- [ ] **Step 3: Remove the temporary test script from `index.html`**

- [ ] **Step 4: Commit**

```bash
git add player.js
git commit -m "feat: add player module with movement and clamping"
```

---

## Task 3: Bullet Module

**Files:**

- Create: `bullet.js`

- [ ] **Step 1: Create `bullet.js`**

```js
// bullet.js
const MAX_BULLETS = 5;
const BULLET_SPEED = 8;

export function fireBullet(bullets, player) {
  if (bullets.length >= MAX_BULLETS) return;
  bullets.push({
    x: player.x + player.width / 2 - 3,
    y: player.y,
    width: 6,
    height: 14,
  });
}

export function updateBullets(bullets) {
  for (const b of bullets) b.y -= BULLET_SPEED;
  return bullets.filter(b => b.y + b.height >= 0);
}
```

- [ ] **Step 2: Verify in browser console**

```html
<script type="module">
  import { createPlayer } from "./player.js";
  import { fireBullet, updateBullets } from "./bullet.js";
  const p = createPlayer();
  const bullets = [];
  fireBullet(bullets, p);
  console.assert(bullets.length === 1, "one bullet fired");
  console.assert(bullets[0].x === p.x + 21, "bullet x centered");
  console.assert(bullets[0].y === p.y, "bullet y at player");
  for (let i = 0; i < 10; i++) fireBullet(bullets, p);
  console.assert(bullets.length === 5, "capped at 5");
  const before = bullets[0].y;
  const remaining = updateBullets(bullets);
  console.assert(remaining[0].y === before - 8, "moved up 8px");
  remaining[0].y = -20;
  const after = updateBullets(remaining);
  console.assert(after.length === remaining.length - 1, "off-screen removed");
  console.log("bullet.js: all assertions passed");
</script>
```

Expected: `bullet.js: all assertions passed`

- [ ] **Step 3: Remove the temporary test script**

- [ ] **Step 4: Commit**

```bash
git add bullet.js
git commit -m "feat: add bullet module"
```

---

## Task 4: Enemy Module

**Files:**

- Create: `enemy.js`

- [ ] **Step 1: Create `enemy.js`**

```js
// enemy.js
const CANVAS_WIDTH = 480;

export function createEnemy(speed, existingEnemies) {
  const width = 48;
  const height = 48;
  const y = 24;
  let x;
  let found = false;

  for (let attempt = 0; attempt < 10; attempt++) {
    x = Math.floor(Math.random() * (CANVAS_WIDTH - width));
    if (!overlapsTopBand(x, width, existingEnemies)) {
      found = true;
      break;
    }
  }

  if (!found) return null;
  return { x, y, width, height, speed };
}

function overlapsTopBand(x, width, enemies) {
  return enemies.some(e => e.y < 48 && x < e.x + e.width && x + width > e.x);
}

export function updateEnemies(enemies) {
  for (const e of enemies) e.y += e.speed;
}

export function enemyReachedBottom(enemies, canvasHeight) {
  return enemies.some(e => e.y + e.height >= canvasHeight);
}

export function getEnemySpeed(difficultyLevel) {
  return 1.5 + difficultyLevel * 0.5;
}

export function getSpawnInterval(difficultyLevel) {
  return Math.max(30, 120 - difficultyLevel * 15);
}
```

- [ ] **Step 2: Verify in browser console**

```html
<script type="module">
  import { createEnemy, updateEnemies, enemyReachedBottom, getEnemySpeed, getSpawnInterval } from "./enemy.js";
  const e = createEnemy(1.5, []);
  console.assert(e !== null, "enemy created");
  console.assert(e.y === 24, "spawns at y=24");
  console.assert(e.width === 48 && e.height === 48, "correct size");
  const before = e.y;
  updateEnemies([e]);
  console.assert(e.y === before + 1.5, "moved down by speed");
  e.y = 640 - 48;
  console.assert(enemyReachedBottom([e], 640), "detects bottom");
  e.y = 100;
  console.assert(!enemyReachedBottom([e], 640), "not at bottom");
  console.assert(getEnemySpeed(0) === 1.5, "speed level 0");
  console.assert(getEnemySpeed(1) === 2.0, "speed level 1");
  console.assert(getSpawnInterval(0) === 120, "interval level 0");
  console.assert(getSpawnInterval(6) === 30, "interval at floor");
  console.assert(getSpawnInterval(7) === 30, "interval stays at floor");
  // Overlap retry: pack full top band, expect null
  const packed = [];
  for (let x = 0; x < 480; x += 48) packed.push({ x, y: 0, width: 48, height: 48 });
  const blocked = createEnemy(1.5, packed);
  console.assert(blocked === null, "returns null when all positions blocked");
  console.log("enemy.js: all assertions passed");
</script>
```

Expected: `enemy.js: all assertions passed`

- [ ] **Step 3: Remove the temporary test script**

- [ ] **Step 4: Commit**

```bash
git add enemy.js
git commit -m "feat: add enemy module with spawn, update, and difficulty helpers"
```

---

## Task 5: Game Loop — Canvas, Background, Player Render

**Files:**

- Create: `game.js` (initial version — player only)

- [ ] **Step 1: Create `game.js` with canvas setup, image loader, and player rendering**

```js
// game.js
import theme from "./theme.js";
import { createPlayer, movePlayer } from "./player.js";
import { fireBullet, updateBullets } from "./bullet.js";
import { createEnemy, updateEnemies, enemyReachedBottom, getEnemySpeed, getSpawnInterval } from "./enemy.js";

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
let images = {};

// Wire restart button only after images are loaded to avoid race condition
async function init() {
  [images.player, images.enemy, images.bullet] = await Promise.all([
    loadImage(theme.playerImage),
    loadImage(theme.enemyImage),
    loadImage(theme.bulletImage),
  ]);
  document.getElementById("restart-btn").addEventListener("click", resetGame);
  resetGame();
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
  if (animFrameId) cancelAnimationFrame(animFrameId);
  animFrameId = requestAnimationFrame(loop);
}

// Input
document.addEventListener("keydown", e => {
  keys[e.code] = true;
  if (e.code === "Space" && state === "playing" && player) {
    e.preventDefault();
    fireBullet(bullets, player);
  }
});
document.addEventListener("keyup", e => { keys[e.code] = false; });

// Game loop
function loop() {
  if (state === "playing") update();
  draw();
  animFrameId = requestAnimationFrame(loop);
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
        explosions.push({ x: enemies[ei].x + 24, y: enemies[ei].y + 24, frame: 0 });
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
    finalScoreEl.textContent = `${theme.scoreLabel}: ${score}`;
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

  ctx.fillStyle = "#fff";
  ctx.font = "bold 16px sans-serif";
  ctx.fillText(`${theme.scoreLabel}: ${score}`, 8, 20);
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
```

- [ ] **Step 2: Open `index.html` — confirm sky-blue background and pink player at bottom center. No console errors.**

- [ ] **Step 3: Verify player movement — arrow keys move player left/right; cannot leave canvas edges.**

- [ ] **Step 4: Verify bullets — spacebar fires yellow rectangles traveling upward; rapid pressing stops at 5.**

- [ ] **Step 5: Verify enemies — brown rectangles spawn at top and fall down.**

- [ ] **Step 6: Verify DevTools Network tab — `player.png`, `enemy.png`, `bullet.png` all return 200.**

- [ ] **Step 7: Verify collision and score — shoot an enemy; both disappear, pink burst appears, score increments.**

- [ ] **Step 8: Verify game over — let an enemy reach the bottom; "Game Over!" overlay appears with correct score.**

- [ ] **Step 9: Verify restart — click Restart; score resets to 0, game resumes immediately.**

- [ ] **Step 10: Verify resize — resize browser window; canvas scales proportionally, gameplay unaffected.**

- [ ] **Step 11: Verify tab pause — hide the browser tab for a few seconds; on return, no pile-up of enemies.**

- [ ] **Step 12: Commit**

```bash
git add game.js
git commit -m "feat: complete game loop — rendering, input, collision, score, game over, resize"
```

---

## Task 6: Manual Playtest

**Files:** None

Run through the full acceptance checklist. Open `index.html` in a browser.

- [ ] Player moves left and right with arrow keys
- [ ] Player cannot move off screen edges
- [ ] Spacebar fires a bullet from player center
- [ ] No more than 5 bullets on screen at once
- [ ] Bullets travel upward and disappear off-screen
- [ ] Enemies spawn at the top and fall downward
- [ ] Bullet hitting enemy removes both and increments score
- [ ] Explosion animation plays on hit and disappears after ~20 frames
- [ ] Score display updates correctly
- [ ] Difficulty increases (enemies faster, spawn more often) every 10 points
- [ ] Enemy reaching the bottom triggers game-over overlay
- [ ] Game-over overlay shows correct final score
- [ ] Restart button resets all state and resumes play
- [ ] Window resize scales canvas without breaking gameplay

- [ ] **Fix any failing checklist items before proceeding**

- [ ] **Final commit**

```bash
git add -A
git commit -m "feat: peppa shooter v1 complete — passes manual playtest"
```
