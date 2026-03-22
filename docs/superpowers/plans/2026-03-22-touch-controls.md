# Touch Controls Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add swipe-to-move / tap-to-fire touch controls for iOS while leaving the desktop web version completely unchanged.

**Architecture:** A new `touch.js` module translates touch events into the existing `keys` object that `player.js` already reads, plus calls fire/pause callbacks directly. It only activates on touch-capable devices. A thin HTML HUD bar (score, name, pause button) replaces the canvas `fillText` HUD on touch devices; the canvas HUD is suppressed via an exported boolean flag.

**Tech Stack:** Vanilla JS ES6 modules, HTML5 Canvas, no dependencies.

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `index.html` | Modify | Add `user-scalable=no` to viewport; add `#hud-bar` markup + CSS |
| `touch.js` | Create | Touch detection, swipe/tap → keys/callbacks, show HUD bar, wire pause button |
| `game.js` | Modify | Import + call `initTouchControls`; suppress canvas HUD; update HUD bar each frame |

No changes to `player.js`, `bullet.js`, `enemy.js`, `leaderboard.js`, or `theme.js`.

---

## Task 1: Update `index.html` — viewport + HUD bar

**Files:**
- Modify: `index.html`

The viewport tag already exists at line 5 but is missing `user-scalable=no`. The HUD bar is a `position: absolute` element inside `#canvas-wrapper`, so it scales with the game automatically. Default `display: none`; `touch.js` will switch it to `display: flex`.

- [ ] **Step 1: Update the viewport meta tag**

Find in `index.html`:
```html
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
```
Replace with:
```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no" />
```

- [ ] **Step 2: Add HUD bar CSS**

Inside the `<style>` block, after the `#change-name-btn:hover` rule (last rule, line ~190), add:

```css
    #hud-bar {
      display: none;
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 32px;
      background: rgba(0, 0, 0, 0.35);
      align-items: center;
      justify-content: space-between;
      padding: 0 10px;
      font-family: sans-serif;
      font-size: 14px;
      font-weight: bold;
      color: #fff;
      z-index: 5;
    }
    #hud-pause-btn {
      background: none;
      border: none;
      color: #fff;
      font-size: 18px;
      cursor: pointer;
      line-height: 1;
      padding: 0 4px;
    }
```

- [ ] **Step 3: Add HUD bar markup**

Inside `#canvas-wrapper`, add the HUD bar as the first child (before `<canvas>`):

```html
    <div id="hud-bar">
      <span id="hud-score"></span>
      <span id="hud-name"></span>
      <button id="hud-pause-btn">⏸</button>
    </div>
```

Result — `#canvas-wrapper` opening should look like:
```html
  <div id="canvas-wrapper">
    <div id="hud-bar">
      <span id="hud-score"></span>
      <span id="hud-name"></span>
      <button id="hud-pause-btn">⏸</button>
    </div>
    <canvas id="game-canvas" width="480" height="640"></canvas>
```

- [ ] **Step 4: Verify visually in browser**

Open `index.html` in a desktop browser. The HUD bar must be invisible (no extra strip above the canvas). Game should start and play exactly as before.

- [ ] **Step 5: Commit**

```bash
git add index.html
git commit -m "feat: add touch HUD bar markup and CSS to index.html"
```

---

## Task 2: Create `touch.js`

**Files:**
- Create: `touch.js`

This module exports two things:
- `initTouchControls(canvas, keys, fireCb, pauseCb)` — attaches listeners, shows HUD bar
- `isTouchDevice` — boolean, used by `game.js` to suppress canvas HUD

- [ ] **Step 1: Create `touch.js`**

```js
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
```

- [ ] **Step 2: Verify the file is syntactically valid**

Open `index.html` in a browser and check the console — no import errors expected yet (touch.js isn't imported yet), but the file must be parseable. You can temporarily add `import './touch.js'` to `game.js`, check console, then remove it again. Or just proceed to Task 3.

---

## Task 3: Wire `touch.js` into `game.js`

**Files:**
- Modify: `game.js`

Three changes:
1. Import `touch.js` at the top
2. Call `initTouchControls()` at the end of `init()`, after all button wiring
3. In `draw()`, conditionally suppress canvas HUD and update HUD bar elements instead

- [ ] **Step 1: Add the import**

At the top of `game.js`, after the existing imports, add:

```js
import { initTouchControls, isTouchDevice } from "./touch.js";
```

- [ ] **Step 2: Call `initTouchControls` at the end of `init()`**

`init()` currently ends with:
```js
  state = "name-entry";
  document.getElementById("name-overlay").classList.add("visible");
}
```

Change to:
```js
  state = "name-entry";
  document.getElementById("name-overlay").classList.add("visible");

  initTouchControls(
    canvas,
    keys,
    () => { if (state === "playing" && player) fireBullet(bullets, player); }, // player/bullets are module-level vars in game.js
    () => { if (state === "playing") pauseGame(); else if (state === "paused") resumeGame(); }
  );
}
```

- [ ] **Step 3: Update `draw()` to conditionally suppress canvas HUD and sync HUD bar**

`draw()` currently ends with these two blocks (lines ~272–286):

```js
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
```

Replace with:

```js
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
```

- [ ] **Step 4: Verify desktop — no regression**

Open `index.html` in a desktop browser (Chrome/Safari/Firefox). Confirm:
- Canvas HUD (score + name) still draws in top-left and top-right corners
- HUD bar is invisible
- Arrow keys move player, spacebar fires, ESC pauses

- [ ] **Step 5: Verify touch — simulate mobile in browser DevTools**

In Chrome DevTools, enable device simulation (toggle device toolbar, select an iPhone model). Reload `index.html`. Confirm:
- HUD bar appears at top with score (left), name (center), ⏸ (right)
- Canvas HUD text is gone (no double-rendering)
- Swipe left/right moves the player
- Tap fires a bullet
- ⏸ button pauses the game; tapping ⏸ again resumes (tapping the canvas while paused fires a bullet, not resume — that's correct)

- [ ] **Step 6: Commit**

```bash
git add touch.js game.js
git commit -m "feat: add touch controls — swipe to move, tap to fire, HUD pause button"
```
