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
