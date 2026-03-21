# Name Entry & Leaderboard — Design Spec

**Date:** 2026-03-21
**Status:** Approved

---

## Overview

Add a name-entry screen before gameplay, display the player's name in the HUD during play, save scores to `localStorage`, show the top 3 on the game-over screen, and provide a full top-10 leaderboard accessible via button.

---

## State Machine

```text
name-entry → playing → game-over
                ↑           ↓
                └── restart  ↓
                       leaderboard (modal over game-over)
```

- `name-entry` — shown on first page load only; skipped on restart
- `playing` — game loop active
- `game-over` — loop stopped, overlay shown, score saved
- `leaderboard` — full top-10 overlay, shown on demand over game-over

---

## Architecture

**New file:**

| File | Responsibility |
| --- | --- |
| `leaderboard.js` | Pure storage module — save/load/rank entries in `localStorage` |

**Modified files:**

| File | Changes |
| --- | --- |
| `index.html` | Add `#name-overlay` and `#leaderboard-overlay` panels |
| `game.js` | Add `name-entry` state, `currentPlayerName`, HUD name display, wire leaderboard on game-over |

---

## leaderboard.js

```js
const KEY = "peppa-leaderboard";
const MAX_ENTRIES = 10;

// Save a new score. Keeps only top MAX_ENTRIES by score.
// Returns the 0-based index of the saved entry in the sorted array,
// or -1 if localStorage is unavailable or the entry didn't make the top 10.
export function saveScore(name, score) { ... }

// Return top N entries sorted by score descending.
// Each entry: { name, score, date }
// Returns [] if localStorage unavailable or empty.
export function getTopN(n) { ... }
```

- Entries stored as JSON array in `localStorage` under key `"peppa-leaderboard"`
- `saveScore` appends, re-sorts by score descending, trims to top 10, saves back, then returns the index of the saved entry (0–9), or -1 if it was trimmed off or storage failed
- `date` stored as ISO string (`new Date().toISOString()`)
- Both functions wrapped in try/catch — `saveScore` returns -1 / `getTopN` returns `[]` on failure
- Multiple entries with the same name are allowed — name is display-only, not a unique key
- Highlighting in the UI is done by the **index returned by `saveScore`** — not by name equality, to avoid ambiguity when the same name appears multiple times
- A player is considered "in the top 10" when `saveScore` returns 0–9; otherwise `#your-score` is shown

---

## `init()` Changes

`init()` no longer calls `resetGame()` directly. After loading images it:

1. Sets `state = "name-entry"`
2. Shows `#name-overlay`
3. Does NOT start the game loop

The game loop starts only when the player submits their name.

```js
async function init() {
  // load images ...
  document.getElementById("play-btn").addEventListener("click", submitName);
  document.getElementById("name-input").addEventListener("keydown", e => {
    if (e.key === "Enter") submitName();
  });
  document.getElementById("restart-btn").addEventListener("click", resetGame);
  document.getElementById("leaderboard-btn").addEventListener("click", showLeaderboard);
  document.getElementById("leaderboard-close-btn").addEventListener("click", hideLeaderboard);
  state = "name-entry";
  document.getElementById("name-overlay").classList.add("visible");
}
```

---

## Name Entry Screen (`#name-overlay`)

- Shown when `state === "name-entry"` (on first page load only)
- Canvas loop does NOT run during name entry
- Contains:
  - Heading: "What's your name?"
  - `<input type="text" id="name-input" maxlength="20">`
  - `<button id="play-btn" disabled>Play</button>`
- Input event listener enables/disables "Play" based on `input.value.trim() !== ""`
- Submitting (button click or Enter key) calls `submitName()`:
  ```js
  function submitName() {
    const name = document.getElementById("name-input").value.trim();
    if (!name) return;                          // guard: ignore empty/whitespace
    currentPlayerName = name;
    document.getElementById("name-overlay").classList.remove("visible");
    resetGame();
  }
  ```
- `currentPlayerName` initialised as `""` (empty string) at module level
- On restart (after game-over): name-entry skipped — `resetGame()` reuses existing `currentPlayerName`

---

## `resetGame()` Changes

`resetGame()` hides **both** overlays (in case leaderboard was open when Restart was clicked):

```js
function resetGame() {
  // ... reset score, difficulty, entities ...
  overlay.classList.remove("visible");
  document.getElementById("leaderboard-overlay").classList.remove("visible");
  // start loop ...
}
```

---

## HUD

Score line updated to show name alongside score. Right-align requires saving/restoring canvas text state:

```js
// Left: score
ctx.save();
ctx.textAlign = "left";
ctx.fillStyle = "#fff";
ctx.font = "bold 16px sans-serif";
ctx.fillText(`${theme.scoreLabel}: ${score}`, 8, 20);
ctx.restore();

// Right: player name (only if name is set)
if (currentPlayerName) {
  ctx.save();
  ctx.textAlign = "right";
  ctx.fillStyle = "#fff";
  ctx.font = "bold 16px sans-serif";
  ctx.fillText(currentPlayerName, CANVAS_WIDTH - 8, 20);
  ctx.restore();
}
```

---

## Game Over

On entering `game-over` state, inside `update()` alongside `finalScoreEl` update and overlay show:

```js
// in update(), game-over block:
state = "game-over";
const savedIndex = saveScore(currentPlayerName, score); // returns 0-9 or -1
finalScoreEl.textContent = `${theme.scoreLabel}: ${score}`;
renderTop3(savedIndex);                        // populate #top3-list
overlay.classList.add("visible");
```

`renderTop3(savedIndex)` populates `#top3-list` (a `<ul>` inside `#overlay`) with the top 3 entries from `getTopN(3)`. The row at position `savedIndex` (if `savedIndex` is 0, 1, or 2) gets class `current-player` for pink highlighting.

The game-over overlay also contains:
- `<button id="leaderboard-btn">Leaderboard</button>`
- `<button id="restart-btn">Restart</button>` (existing)

---

## Leaderboard Overlay (`#leaderboard-overlay`)

- Shown when `#leaderboard-btn` clicked; `state` stays `"game-over"`
- Contains a `<ol id="leaderboard-list">` with top 10 entries: `name — score`
- The row at position `savedIndex` (0-based, stored in a module-level `lastSavedIndex` variable) gets class `current-player` (pink `#FF69B4`)
- `#your-score` (`<p id="your-score">`) is shown (removing `hidden` class) when `lastSavedIndex === -1`; hidden otherwise
- `<button id="leaderboard-close-btn">Close</button>` hides overlay, returns to game-over screen

---

## Edge Cases

| Scenario | Handling |
| --- | --- |
| Empty name submitted | "Play" button disabled; Enter key ignored |
| Whitespace-only name | Trimmed → empty → button stays disabled |
| Name > 20 characters | `maxlength="20"` on input prevents it |
| `localStorage` unavailable | `saveScore` no-ops; `getTopN` returns `[]`; game continues without leaderboard |
| Multiple same-name entries | Allowed — highlighting by index, not name equality |
| Score of 0 saved | Allowed — every completed game saved |
| Leaderboard empty (first game) | Top-3 shows only the current entry; leaderboard shows 1 entry |
| Player not in top 10 | `#your-score` shown below leaderboard list |
| Leaderboard open when Restart clicked | `resetGame()` hides `#leaderboard-overlay` before starting |

---

## Testing

Manual playtest checklist:

- [ ] Name overlay shown on page load, game does not start
- [ ] "Play" button disabled with empty input
- [ ] "Play" button disabled with whitespace-only input
- [ ] "Play" button enabled after typing a valid name
- [ ] Submitting name starts the game
- [ ] Enter key submits name
- [ ] Player name displayed top-right during play
- [ ] Score saved to localStorage on game over
- [ ] Top 3 shown on game over screen
- [ ] Current player highlighted in top 3
- [ ] "Leaderboard" button opens full top-10
- [ ] Current player highlighted in full leaderboard
- [ ] Player not in top 10 sees "Your score: N" below list
- [ ] "Close" returns to game-over screen
- [ ] Restart skips name entry, reuses name
- [ ] Leaderboard open + Restart: leaderboard closes correctly
- [ ] After 10+ games, leaderboard shows only top 10
