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
export function saveScore(name, score) { ... }

// Return top N entries sorted by score descending.
// Each entry: { name, score, date }
export function getTopN(n) { ... }
```

- Entries stored as JSON array in `localStorage` under key `"peppa-leaderboard"`
- `saveScore` appends, re-sorts by score descending, trims to top 10, saves back
- `date` stored as ISO string (`new Date().toISOString()`)
- If `localStorage` is unavailable (e.g. private browsing), functions fail silently (try/catch)

---

## Name Entry Screen (`#name-overlay`)

- Shown when `state === "name-entry"` (on first page load only)
- Canvas loop does NOT run during name entry
- Contains:
  - Heading: "What's your name?"
  - `<input type="text" id="name-input">` — max 20 characters
  - `<button id="play-btn">Play</button>` — disabled until input is non-empty after trim
- Submitting (button click or Enter key): trim name, store in `currentPlayerName`, hide overlay, call `resetGame()` which sets `state = "playing"`
- On restart after game-over: name-entry skipped — `resetGame()` reuses existing `currentPlayerName`

---

## HUD

Score line updated to show name alongside score:

- Left: `"${theme.scoreLabel}: ${score}"` at `(8, 20)`
- Right: `currentPlayerName` right-aligned at `(CANVAS_WIDTH - 8, 20)`
- Font: `bold 16px sans-serif`, fill `#fff` (same as existing score)

---

## Game Over Screen

On entering `game-over` state:

1. `saveScore(currentPlayerName, score)` called immediately
2. Existing overlay gains:
   - Final score line (existing)
   - **Top 3 mini-leaderboard** — three rows of `rank. name — score`, current player's row highlighted in `#FF69B4`
   - "Leaderboard" button (`#leaderboard-btn`) — opens `#leaderboard-overlay`
   - "Restart" button (existing)

---

## Leaderboard Overlay (`#leaderboard-overlay`)

- Shown when `#leaderboard-btn` clicked; `state` stays `"game-over"`
- Displays top 10 entries: `rank. name — score`
- Current player's entry highlighted in `#FF69B4`
- If current player is not in top 10, their score shown below the list as "Your score: N"
- "Close" button hides overlay, returns to game-over screen
- Rendered as an HTML overlay (same pattern as `#overlay`)

---

## Edge Cases

| Scenario | Handling |
| --- | --- |
| Empty name submitted | "Play" button disabled; Enter key ignored |
| Name > 20 characters | `maxlength="20"` on input; no extra validation needed |
| `localStorage` unavailable | `saveScore`/`getTopN` wrapped in try/catch; game continues without leaderboard |
| Multiple same-name entries | Allowed — name is display only, not a unique key |
| Score of 0 saved | Allowed — every completed game is saved |
| Leaderboard empty on first game over | Top-3 section shows only the current entry |

---

## Testing

Manual playtest checklist:

- [ ] Name overlay shown on page load, game does not start
- [ ] "Play" button disabled with empty input
- [ ] "Play" button disabled with whitespace-only input
- [ ] Submitting name starts the game
- [ ] Enter key submits name
- [ ] Player name displayed top-right during play
- [ ] Score saved to localStorage on game over
- [ ] Top 3 shown on game over screen
- [ ] Current player highlighted in top 3
- [ ] "Leaderboard" button opens full top-10
- [ ] Current player highlighted in full leaderboard
- [ ] "Close" returns to game-over screen
- [ ] Restart skips name entry, reuses name
- [ ] After 10+ games, leaderboard shows only top 10
