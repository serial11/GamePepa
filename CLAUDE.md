# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Running the Game

No build tools exist. Open `index.html` directly in any modern browser — it runs as-is via ES6 modules.

To regenerate placeholder PNG assets:
```bash
node scripts/create-placeholders.js
```

## Architecture

**Peppa Pig–themed Space Invaders clone.** Vanilla JS, HTML5 Canvas, zero dependencies.

### State Machine

`game.js` drives a state machine with these states:
- `"name-entry"` → `"playing"` ↔ `"paused"` → `"game-over"` → `"name-entry"`

State is stored in a plain object; transitions are explicit function calls (`pauseGame`, `resumeGame`, `quitToMenu`, `showNameEntry`).

### Module Responsibilities

- **`game.js`** — RAF loop, input handling, collision detection, rendering, state machine, image loading
- **`player.js`** — Factory and movement functions, no DOM coupling
- **`bullet.js`** — Fire/update/cull operations on a bullets array (max 5 on screen)
- **`enemy.js`** — Spawning with overlap-avoidance, difficulty scaling (`getEnemySpeed`, `getSpawnInterval`)
- **`leaderboard.js`** — Pure `localStorage` API: `saveScore(name, score)` and `getTopN(n)`
- **`theme.js`** — Single import point to swap themes; re-exports from `themes/peppa.js`

### Canvas & Scaling

Fixed gameplay resolution: **480 × 640 px**. Scales responsively via CSS `transform: scale()` — gameplay coordinates are always in the 480×640 space. HTML overlay modals (name-entry, pause, game-over, leaderboard) are positioned over the canvas.

### Theme System

Create `themes/<name>.js` exporting `{ name, playerImage, enemyImage, bulletImage, explosionColor, backgroundColor, scoreLabel }`, then update the single import in `theme.js`. No other files need changes.

### Difficulty Scaling

Every 10 points increments `difficultyLevel`. Speed: `1.5 + 0.5 × level`. Spawn interval: `max(30, 120 − 15 × level)` frames.

## Design Specs

Feature specs live in `docs/superpowers/specs/` — read these before modifying any major feature, as they document edge cases and testing checklists.
