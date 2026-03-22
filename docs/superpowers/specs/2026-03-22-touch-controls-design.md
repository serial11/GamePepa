# Touch Controls Design

**Date:** 2026-03-22
**Goal:** Add mobile touch controls for iOS (via Capacitor) while keeping the web/desktop version completely unchanged.

---

## Summary

A new `touch.js` module translates touch events into the existing `keys` object that `game.js` already reads. No changes to `player.js`, `bullet.js`, or the game loop. Touch controls activate only on touch-capable devices.

---

## Controls

| Gesture | Action |
|---------|--------|
| Swipe left/right | Move player (populates `keys.ArrowLeft` / `keys.ArrowRight`) |
| Tap | Fire bullet (calls `fireBullet()` directly) |
| HUD ⏸ button | Pause / resume (calls `pauseGame()` / `resumeGame()`) |

---

## Architecture

### `touch.js` (new file)

- Imported once in `game.js`: `import { initTouchControls } from './touch.js'`
- Called after `init()`: `initTouchControls(canvas, keys, /* fire callback */, /* pause callback */)`
- **Activation guard:** only attaches listeners if `'ontouchstart' in window`. On desktop the module is a no-op.

**Swipe detection:**
- `touchstart` — record `startX`
- `touchmove` — if `Math.abs(deltaX) > 10px`, set `keys.ArrowLeft` or `keys.ArrowRight` based on direction; call `preventDefault()` to block page scroll
- `touchend` — clear `keys.ArrowLeft` and `keys.ArrowRight`

**Tap detection:**
- On `touchend`, if total movement was `< 10px` (i.e. no swipe), call the fire callback — equivalent to spacebar press

### HUD Bar (new HTML element)

A `<div id="hud-bar">` added to `index.html` above the canvas:

```
[ score ]  [ player name ]  [ ⏸ ]
```

- Default: `display: none` (invisible on desktop)
- Shown on touch devices: `initTouchControls()` sets `hud-bar` to `display: flex` when touch is detected
- Score and player name updated each frame from `draw()` via `document.getElementById`
- Canvas `fillText` HUD (score + name) suppressed on touch devices via a boolean flag set by `touch.js`

**Pause button:**
- Calls `pauseGame()` when `state === "playing"`, `resumeGame()` when `state === "paused"`
- Wired in `init()` alongside existing button listeners

---

## Web Version Isolation

- Touch listeners never attach on non-touch devices — zero risk of regression
- Viewport meta tag added: `<meta name="viewport" content="width=device-width, initial-scale=1, user-scalable=no">` — prevents iOS pinch-zoom; no effect on desktop
- Keyboard and touch inputs can coexist (both write to the same `keys` object) — safe for touch-screen laptops
- Canvas HUD rendering path unchanged on desktop; suppressed only when `touch.js` sets the flag

---

## Files Changed

| File | Change |
|------|--------|
| `touch.js` | New module — touch event listeners, swipe/tap detection |
| `game.js` | Import `touch.js`; call `initTouchControls()` after init; pass score/name to HUD bar in `draw()` |
| `index.html` | Add `<meta viewport>`; add `<div id="hud-bar">` with score, name, pause button; add HUD bar CSS |

---

## Edge Cases

- **Scroll prevention:** `preventDefault()` on `touchmove` stops page scroll during swipes
- **Multi-touch:** Only the first touch point (`touches[0]`) is tracked — additional fingers ignored
- **Touch during overlays:** Listeners are on the canvas; when overlays are visible the canvas is behind them so touch events go to the overlay HTML buttons naturally
- **State guard on fire:** Tap-to-fire callback checks `state === "playing"` before calling `fireBullet()` — same guard as spacebar
