// leaderboard.js
const KEY = "peppa-leaderboard";
const MAX_ENTRIES = 10;

// Save a new score. Keeps only top MAX_ENTRIES by score.
// Returns 0-based index of the entry in sorted array, or -1 if not in top 10 or storage failed.
export function saveScore(name, score) {
  try {
    const entries = JSON.parse(localStorage.getItem(KEY) || "[]");
    const newEntry = { name, score, date: new Date().toISOString() };
    entries.push(newEntry);
    entries.sort((a, b) => b.score - a.score);
    if (entries.length > MAX_ENTRIES) entries.length = MAX_ENTRIES;
    localStorage.setItem(KEY, JSON.stringify(entries));
    const idx = entries.indexOf(newEntry);
    return idx;  // -1 if trimmed off (newEntry not in array after truncation)
  } catch {
    return -1;
  }
}

// Return top N entries sorted by score descending.
// Each entry: { name, score, date }. Returns [] if localStorage unavailable or empty.
export function getTopN(n) {
  try {
    const entries = JSON.parse(localStorage.getItem(KEY) || "[]");
    return entries.slice(0, n);
  } catch {
    return [];
  }
}
