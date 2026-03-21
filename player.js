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
