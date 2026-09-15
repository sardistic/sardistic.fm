# Architectural Decisions

## 2026-09-14 — Load the music archive after the application shell

- Do not compile the multi-megabyte historical dashboard snapshot into the initial JavaScript bundle.
- Load current dashboard data from the existing production API; dynamically download the checked-in snapshot only when the first API request fails.
- Keep the initial document and loading shell descriptive and height-stable so people and crawlers receive useful content before the interactive archive is ready.
- Lazy-load non-default dashboard views and the optional WebGL background so the overview does not pay their startup cost.

## 2026-07-19 — Generate Jukebox queues from raw scrobbles

- The Jukebox ranking engine runs on the backend against the complete SQLite `scrobbles` history.
- The dashboard payload remains unchanged because its yearly and monthly track lists are intentionally truncated for frontend payload size.
- A five-minute in-memory catalog cache avoids rebuilding track, artist, album, year, month, and listening-gap aggregates for every recipe selection.
- The Jukebox feeds `MainDashboard`'s existing global playback queue. The YouTube player remains owned by the header, so changing dashboard views does not interrupt playback.
- This iteration creates in-app YouTube-backed queues. Saving playlists into a user's YouTube account remains a separate OAuth-enabled feature.

## 2026-07-19 — Split lint environments and retain runtime hook rules

- ESLint now treats `src/` as browser ESM/JSX, `server/` as Node CommonJS, and root build configuration as Node ESM.
- React Compiler optimization diagnostics are disabled because this project does not use React Compiler. Runtime correctness checks such as the Rules of Hooks and exhaustive dependencies remain enabled.
- Fast Refresh's single-export recommendation is disabled so the existing context-provider modules can continue exporting their hooks alongside providers.
