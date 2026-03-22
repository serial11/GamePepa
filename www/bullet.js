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
