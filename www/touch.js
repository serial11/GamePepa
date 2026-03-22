// touch.js
// Translates touch events into the keys object and fire/pause callbacks.
// Only activates on touch-capable devices — no-op on desktop.

export const isTouchDevice = "ontouchstart" in window;

export function initTouchControls(canvas, keys, fireCb, pauseCb) {
  if (!isTouchDevice) return;

  // Show the HTML HUD bar
  document.getElementById("hud-bar").style.display = "flex";

  // Wire pause button
  document.getElementById("hud-pause-btn").addEventListener("click", pauseCb);

  let startX = 0;
  let totalDelta = 0;

  canvas.addEventListener("touchstart", e => {
    e.preventDefault();
    startX = e.touches[0].clientX;
    totalDelta = 0;
  }, { passive: false });

  canvas.addEventListener("touchmove", e => {
    e.preventDefault();
    const deltaX = e.touches[0].clientX - startX;
    totalDelta = Math.abs(deltaX);
    keys.ArrowLeft  = deltaX < -10;
    keys.ArrowRight = deltaX > 10;
  }, { passive: false });

  canvas.addEventListener("touchend", e => {
    e.preventDefault();
    // Tap = finger lifted without moving more than 5px
    if (totalDelta < 5) fireCb();
    keys.ArrowLeft  = false;
    keys.ArrowRight = false;
  }, { passive: false });
}
