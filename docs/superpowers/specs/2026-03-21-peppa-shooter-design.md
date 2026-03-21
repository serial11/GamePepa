# Peppa Pig Shooter — Design Spec

**Date:** 2026-03-21
**Status:** Approved

---

## Overview

A simple browser-based Space Invaders-style game with a Peppa Pig theme. The player moves left and right at the bottom of the screen and shoots upward at enemies falling from the top. Difficulty increases over time. The theme is designed to be swappable in the future.

---

## Architecture

```text
GamePepa/
├── index.html          # Entry point, canvas element
├── game.js             # Game loop, state machine (playing / game-over)
├── player.js           # Player movement, shooting
├── enemy.js            # Enemy spawning, falling, difficulty scaling
├── bullet.js           # Bullet movement, collision detection
├── theme.js            # Active theme config (re-exports selected theme)
├── themes/
│   └── peppa.js        # Peppa Pig theme definition
└── assets/
    └── peppa/          # Images for Peppa theme (placeholders ship with repo)
```

### Canvas Dimensions

Base design resolution: **480 × 640 px**, defined as constants `CANVAS_WIDTH` and `CANVAS_HEIGHT` in `game.js`. On window resize the canvas scales visually (CSS transform) to fit while preserving aspect ratio; all gameplay coordinates remain in the 480×640 space. Click events on the canvas are transformed from screen coordinates back to 480×640 space using the current scale factor before any hit-testing.

### Game States

`playing → game-over`

No menu screen in v1 — the game starts immediately on page load. `game.js` owns the game loop and state machine, wiring all modules together. Each module is pure logic with no direct DOM coupling.

### Game Loop

`requestAnimationFrame` is used without delta-time correction. The game assumes **60 Hz**; all speeds and timers are expressed in frames at 60 fps. On higher-refresh displays the game will run faster — delta-time correction is deferred to a future iteration.

---

## Components

### Player

- Fixed Y position at bottom: `y = CANVAS_HEIGHT - 48 - 16` (16 px bottom margin)
- Moves left/right with arrow keys, clamped to `[0, CANVAS_WIDTH - player.width]`
- Fires bullets upward with spacebar (unlimited ammo, max 5 on screen)
- State: `{ x, y, width: 48, height: 48, speed: 4 }`

### Bullets

- Array of `{ x, y, width: 6, height: 14 }` objects moving upward at 8 px/frame
- Spawn position: `x = player.x + player.width / 2 - bullet.width / 2`, `y = player.y`
- Capped at 5 on screen at once; spacebar ignored if cap is reached
- Removed when `y + height < 0` or on collision

### Enemies

- Spawned at random X, `y = 24` (below top edge, leaving room for score label)
- Fall straight down each frame at `speed` px/frame
- State: `{ x, y, width: 48, height: 48, speed }`
- On spawn, X is chosen randomly. If the candidate position overlaps any enemy whose `y < 48` (same top band), retry up to 10 times. If no clear X is found after 10 attempts, skip the spawn for that tick
- Removed on hit or when `y + height >= CANVAS_HEIGHT`

### Collision Detection

- AABB (axis-aligned bounding box) rectangle overlap check each frame
- Bullet vs enemy: on hit → bullet removed immediately, enemy removed immediately, explosion effect spawned at enemy center, score +1

### Explosion Effect

- Purely visual — entity is removed immediately on hit
- Stored in a separate `explosions` array in `game.js`; does not block the game loop
- Animation: radius grows linearly from 0 to 32 px over 20 frames: `radius = 32 * (frame / 20)`
- Rendered as a filled circle in `theme.explosionColor`; removed after frame 20

**Fallback shapes per entity:**

| Entity | Fallback |
| --- | --- |
| Player | Filled rectangle, color `#FF69B4` |
| Enemy | Filled rectangle, color `#8B4513` |
| Bullet | Filled rectangle, color `#FFFF00` |
| Explosion | Filled circle, color `theme.explosionColor` |

### Difficulty Scaling

`difficultyLevel` is a standalone variable (not derived from score at read time) to avoid accidental drift. It is updated once per frame: `difficultyLevel = Math.floor(score / 10)`.

| Level | Trigger | Enemy speed (px/frame) | Spawn interval (frames) |
| --- | --- | --- | --- |
| 0 | Start | 1.5 | 120 |
| 1 | 10 pts | 2.0 | 105 |
| 2 | 20 pts | 2.5 | 90 |
| … | +10 pts | +0.5 | -15 |
| max | — | uncapped | floor: 30 |

### Score & Game Over

- Score drawn at position `(8, 20)` in 16 px font, top-left each frame
- If any enemy reaches `y + height >= CANVAS_HEIGHT` → state switches to `game-over`
- Game over overlay: "Game Over", final score, "Restart" button
- Restart button is an HTML `<button>` element positioned over the canvas (absolute CSS), shown only in `game-over` state. Its click handler calls `resetGame()` in `game.js` which:
  - Resets `score` to 0
  - Resets `difficultyLevel` to 0
  - Clears `bullets`, `enemies`, `explosions` arrays
  - Returns player to `x = CANVAS_WIDTH / 2 - player.width / 2`
  - Hides the overlay and switches state back to `playing`

---

## Theme System

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
}
```

```js
// theme.js — change this one import to switch themes
import theme from "./themes/peppa.js";
export default theme;
```

Placeholder PNG assets (simple colored squares/circles) ship with the repo under `assets/peppa/` so the game is runnable from first checkout without custom artwork.

---

## Edge Cases & Error Handling

| Scenario | Handling |
| --- | --- |
| Player at canvas edge | Clamp `x` to `[0, CANVAS_WIDTH - player.width]` |
| Window resize | Canvas scales via CSS; click coordinates transformed by scale factor |
| Enemy spawn overlap | Retry up to 10 times against top-band enemies; skip if no clear X |
| Tab hidden | `cancelAnimationFrame` on `visibilitychange` hidden; spawn frame counter reset on resume; `requestAnimationFrame` restarted on visible |
| Bullet spam | Max 5 bullets on screen; spacebar ignored if cap reached |
| Image load failure | Fall back to solid color rectangle/circle per entity fallback table |

---

## Testing

Manual playtest checklist (acceptance gate before shipping):

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

---

## Future Considerations

- Additional themes: add `themes/<name>.js`, update one import in `theme.js` — no other files change
- Sound effects: add `sounds` key to theme config
- High score persistence: `localStorage`
- Mobile support: on-screen touch controls
- Delta-time correction for consistent speed across refresh rates
