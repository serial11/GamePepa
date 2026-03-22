# Pause & Name Change — Design Spec

**Date:** 2026-03-22
**Status:** Approved

---

## Overview

Two quality-of-life improvements to the Peppa Pig Shooter:

1. **Pause** — ESC key pauses and resumes the game. The pause screen has a "Quit" button that returns to the name-entry screen.
2. **Change name** — A "Change name" button on the game-over screen lets the player update their name before starting a new game.

---

## State Machine

```text
name-entry → playing ↔ paused
                ↑           ↓ (Quit)
                └── restart  ↓
             playing → game-over
                          ↓ (Change name)
                       name-entry
```

Full set of transitions:

| From | To | Trigger |
| --- | --- | --- |
| `name-entry` | `playing` | Submit name |
| `playing` | `paused` | ESC key |
| `paused` | `playing` | ESC key or Resume button |
| `paused` | `name-entry` | Quit button |
| `playing` | `game-over` | Enemy reaches bottom |
| `game-over` | `playing` | Restart button |
| `game-over` | `name-entry` | Change name button |

---

## Architecture

**Modified files:**

| File | Changes |
| --- | --- |
| `index.html` | Add `#pause-overlay` HTML + CSS; add "Change name" button to `#overlay` |
| `game.js` | Add `paused` state handling, ESC key listener, `quitToMenu()`, `showNameEntry()` |

No new files required.

---

## Pause Feature

### Overlay — `#pause-overlay`

Same pattern as existing overlays: `display: none` default, `display: flex` when `.visible`.

Contents:
- `<h1>Paused</h1>`
- `<button id="resume-btn">Resume</button>`
- `<button id="quit-btn">Quit</button>`

### ESC Key

Added to the existing `keydown` listener:

```js
if (e.code === "Escape") {
  if (state === "playing") pauseGame();
  else if (state === "paused") resumeGame();
}
```

### `pauseGame()`

```js
function pauseGame() {
  state = "paused";
  document.getElementById("pause-overlay").classList.add("visible");
}
```

The game loop (`loop()`) already self-terminates when `state !== "playing"` (RAF is only re-queued when `state === "playing"`), so no explicit `cancelAnimationFrame` is needed.

### `resumeGame()`

```js
function resumeGame() {
  state = "playing";
  document.getElementById("pause-overlay").classList.remove("visible");
  animFrameId = requestAnimationFrame(loop);
}
```

### `quitToMenu()`

Resets all game state, pre-fills the name input with the current name, and returns to `name-entry`:

```js
function quitToMenu() {
  if (animFrameId) cancelAnimationFrame(animFrameId); // guard against RAF already queued
  state = "name-entry";
  score             = 0;
  difficultyLevel   = 0;
  spawnFrameCounter = 0;
  player     = null;
  bullets    = [];
  enemies    = [];
  explosions = [];
  document.getElementById("pause-overlay").classList.remove("visible");
  document.getElementById("leaderboard-overlay").classList.remove("visible");
  showNameEntry();
}
```

### `init()` additions

Wire Resume and Quit buttons (added alongside existing button wiring):

```js
document.getElementById("resume-btn").addEventListener("click", resumeGame);
document.getElementById("quit-btn").addEventListener("click", quitToMenu);
```

---

## Change Name Feature

### "Change name" button on `#overlay`

Added between the existing `#leaderboard-btn` and `#restart-btn`:

```html
<button id="change-name-btn">Change name</button>
```

### `showNameEntry()`

Shared helper used by both "Change name" and `quitToMenu()`. Pre-fills the name input with the current name so the player can edit rather than retype:

```js
function showNameEntry() {
  const input = document.getElementById("name-input");
  input.value = currentPlayerName;
  input.dispatchEvent(new Event("input")); // re-evaluate play-btn disabled state
  document.getElementById("overlay").classList.remove("visible");
  document.getElementById("name-overlay").classList.add("visible");
}
```

### Wiring in `init()`

```js
document.getElementById("change-name-btn").addEventListener("click", showNameEntry);
```

### `submitName()` — unchanged

The existing `submitName()` already handles the rest: it trims the input, sets `currentPlayerName`, hides `#name-overlay`, and calls `resetGame()`. No changes needed.

### `resetGame()` — unchanged

Already hides `#overlay` and `#leaderboard-overlay`. No changes needed.

---

## Edge Cases

| Scenario | Handling |
| --- | --- |
| ESC during `name-entry` | Ignored (only fires when `state === "playing"` or `"paused"`) |
| ESC during `game-over` | Ignored |
| Quit with empty name in input | `submitName()` guards against it — Play button stays disabled |
| Leaderboard open when Quit pressed | `quitToMenu()` hides `#leaderboard-overlay` explicitly (see `quitToMenu()` code above) |
| Change name then immediately Restart (no name entered) | Not possible — Play button is disabled until input is non-empty |
| Tab hidden while paused | Already handled: `visibilitychange` only restarts RAF when `state === "playing"` |

---

## CSS Additions

`#pause-overlay` follows the same pattern as `#name-overlay`:

```css
#pause-overlay {
  display: none;
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.75);
  flex-direction: column;
  justify-content: center;
  align-items: center;
  color: #fff;
  font-family: sans-serif;
  text-align: center;
  gap: 16px;
}
#pause-overlay.visible { display: flex; }
#pause-overlay h1 { font-size: 48px; }
#resume-btn {
  padding: 12px 32px;
  font-size: 20px;
  background: #FF69B4;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  color: #fff;
  font-weight: bold;
}
#resume-btn:hover { background: #ff4da6; }
#quit-btn {
  padding: 10px 24px;
  font-size: 18px;
  background: #555;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  color: #fff;
}
#quit-btn:hover { background: #777; }
#change-name-btn {
  padding: 10px 24px;
  font-size: 18px;
  background: #87CEEB;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  color: #222;
  font-weight: bold;
}
#change-name-btn:hover { background: #5bb8d4; }
```

---

## Testing

Manual playtest checklist:

- [ ] ESC during play shows pause overlay
- [ ] ESC again (or Resume) resumes game exactly where it left off
- [ ] Quit button from pause returns to name-entry screen
- [ ] Name input pre-filled with previous name on Quit
- [ ] Submitting name from post-Quit name screen starts a new game
- [ ] "Change name" button appears on game-over screen
- [ ] Clicking it shows name-entry overlay with current name pre-filled
- [ ] Submitting new name starts a new game with updated name in HUD
- [ ] ESC during `name-entry` and `game-over` does nothing
- [ ] Tab hidden while paused — on return, game stays paused (no phantom restart)
- [ ] Leaderboard open + Quit: leaderboard overlay is hidden correctly
