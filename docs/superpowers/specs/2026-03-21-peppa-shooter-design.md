# Peppa Pig Shooter — Design Spec

**Date:** 2026-03-21
**Status:** Approved

---

## Overview

A simple browser-based Space Invaders-style game with a Peppa Pig theme. The player moves left and right at the bottom of the screen and shoots upward at enemies falling from the top. Difficulty increases over time. The theme is designed to be swappable in the future.

---

## Architecture

```
GamePepa/
├── index.html          # Entry point, canvas element
├── game.js             # Game loop, state machine (menu / playing / game-over)
├── player.js           # Player movement, shooting
├── enemy.js            # Enemy spawning, falling, difficulty scaling
├── bullet.js           # Bullet movement, collision detection
├── theme.js            # Active theme config (re-exports selected theme)
├── themes/
│   └── peppa.js        # Peppa Pig theme definition
└── assets/
    └── peppa/          # Images for Peppa theme
```

### Game States

`menu → playing → game-over`

`game.js` owns the game loop and state machine, wiring all modules together. Each module is pure logic with no direct DOM coupling.

---

## Components

### Player
- Fixed Y position at bottom of canvas
- Moves left/right with arrow keys, clamped to canvas bounds
- Fires bullets upward with spacebar (unlimited ammo)
- State: `{ x, speed, width }`

### Bullets
- Array of `{ x, y }` objects moving upward each frame
- Spawned at player center on spacebar press
- Capped at 5 on screen at once to prevent spam
- Removed when off-screen or on collision

### Enemies
- Spawned at random X at the top of the canvas on a timer
- Fall straight down at a fixed speed
- State: `{ x, y, speed }`
- Spawn positions checked to avoid overlap
- Removed on hit or when reaching the bottom

### Collision Detection
- AABB (axis-aligned bounding box) rectangle overlap check each frame
- Bullet vs enemy: on hit → brief explosion animation, both removed, score +1

### Difficulty Scaling
- `difficultyLevel` increments every 10 points
- Enemy fall speed and spawn frequency increase with each level
- No upper cap — game gets progressively harder indefinitely

### Score & Game Over
- Score drawn on canvas each frame
- If any enemy reaches the bottom → state switches to `game-over`
- Game over overlay: final score + restart button
- No lives system — one strike ends the game

---

## Theme System

Each theme is a plain config object:

```js
// themes/peppa.js
export default {
  name: "peppa",
  playerImage: "assets/peppa/player.png",   // Peppa character
  enemyImage: "assets/peppa/enemy.png",      // George / muddy puddles
  bulletImage: "assets/peppa/bullet.png",    // Bubble / ball
  explosionColor: "#FF69B4",                 // Pink burst
  backgroundColor: "#87CEEB",               // Sky blue
  scoreLabel: "Muddy Points",
}
```

`theme.js` re-exports the active theme. To add a new theme: create `themes/<name>.js` and update the import in `theme.js`. No other files change.

**Fallback:** If images are not available, all entities render as colored rectangles/circles so the game is fully playable with placeholder graphics from day one.

---

## Edge Cases & Error Handling

| Scenario | Handling |
|---|---|
| Player at canvas edge | Clamp position to canvas bounds |
| Window resize | Canvas scales to fit, aspect ratio preserved |
| Enemy spawn overlap | New enemy X checked against existing enemies before spawning |
| Tab hidden | Game loop pauses via `visibilitychange` event |
| Bullet spam | Max 5 bullets on screen at once |

---

## Testing

No test framework. Testing approach:
- Manual playtest checklist: movement, shooting, collision, score increment, difficulty ramp, game over trigger, restart
- Pure logic modules (`player.js`, `enemy.js`, `bullet.js`) can be exercised in the browser console independently

---

## Future Considerations

- Additional themes: add `themes/<name>.js`, update one import — no other changes required
- Sound effects: add `sounds` key to theme config
- High score persistence: `localStorage`
- Mobile support: on-screen touch controls
