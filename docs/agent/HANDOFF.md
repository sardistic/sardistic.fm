# Agent Handoff

## Active objective

Deploy a persistent-player Next control for manual Jukebox queues.

## Completed work

- Added `server/jukebox.js`, which builds a reusable catalog from raw scrobbles and generates 14 playlist recipes.
- Added `GET /api/jukebox` with validated preset, year, month, and limit parameters plus a five-minute catalog cache.
- Added the responsive `src/components/Jukebox.jsx` page with recipe selection, year/month controls, 25/50/100/200-track limits, ordered playback, shuffled playback, per-track starting points, loading states, and error/empty states.
- Added Jukebox navigation to the global header and connected generated tracks to the existing `playContext` queue.
- Documented the data-source and playback-lifecycle decision in `docs/agent/DECISIONS.md`.
- Split ESLint configuration between browser ESM, Node CommonJS, and root Node ESM files.
- Cleared the repository's full lint backlog: duplicate object keys, conditional hooks, undefined chart data, stale imports/variables, effect dependencies, ref cleanup safety, and empty error handling.
- Rebased the release onto the newer live-read blocklist fix and applied that shared blocklist to Jukebox catalog generation.
- Committed and pushed the validated release to `main` as `c9322b0`.
- Repaired production checkout ownership for the `sardistic` deployment user while explicitly preserving ownership of the persistent `data/` directory.
- Fast-forwarded production to `9b02fc3` and rebuilt/restarted the frontend and backend together with Docker Compose.
- Reported the successful deployment to the agent control plane.
- Added a Next button to the persistent header player, backed by the existing manual queue advancement logic and disabled at the end of the queue.
- Added cancellation for superseded YouTube searches so rapid skips cannot restore an earlier track after its lookup completes.

## Current behavior

- Available recipes: Yearly Top, All-Time Heavy Rotation, Forgotten Favorites, Peak Obsessions, Long-Term Companions, Recent Rediscoveries, Deep Catalog, Year Time Capsule, Fresh Finds, One Per Artist, Steady Rotation, Seasonal Returns, Album Sampler, and Recent Rotation.
- Playing or shuffling a generated mix activates the existing YouTube-backed header player.
- Navigation between dashboard views leaves the player and queue mounted, and playback advances through the generated queue.
- Queue generation uses the complete runtime SQLite database rather than the truncated static dashboard payload.

## Validation performed

- `npm run lint` — passed with zero errors and zero warnings (previously 246 errors and 17 warnings).
- `npm run build` — passed. Earlier duplicate-key build warnings are resolved; bundle-size, browser-data, and Node-version warnings remain.
- `npx eslint src/components/Jukebox.jsx` — passed.
- `node --check server/jukebox.js` and `node --check server/server.js` — passed.
- Temporary backend smoke test exercised all 14 presets and asserted yearly ranking, forgotten-favorite, and rediscovery behavior — passed.
- `git diff --check` — passed.
- Production `docker compose ps` — both rebuilt containers remained up after replacement.
- Production startup logs — backend loaded the SQLite payload, applied its schema, and listened on port 3001; nginx started without errors.
- `https://audio.sardistic.com/` — returned HTTP 200.
- `https://audio-api.sardistic.com/api/jukebox?type=yearly-top&year=2025&limit=3` — returned HTTP 200 with a populated queue from the live database.
- Next-control change: `npm run lint`, `npm run build`, and `git diff --check` — passed.

## Uncommitted implementation details

- Modified: `src/App.jsx` and `src/components/PersistentPlayer.jsx` for manual queue skipping.
- Dependencies were installed with `npm ci`; `node_modules` and build output are ignored and are not implementation changes.

## Unresolved risks

- The current YouTube resolver selects the first non-live `yt-dlp` search result for each track; ambiguous titles can still resolve to an unintended upload.
- Jukebox results depend on the deployed backend having the complete SQLite scrobble database.
- Vite reports that local Node 20.16.0 is below its preferred 20.19+ version, though the production build completes successfully.
- The production JavaScript bundle remains large enough to trigger Vite's chunk-size warning.
- Saving a generated queue as a playlist in the user's YouTube account is not implemented; that requires YouTube OAuth and write API integration.

## Next concrete action

Commit and deploy the Next-control change, then verify the rebuilt frontend and live Jukebox API.

## Deployment/status impact

The prior Jukebox release is live. The Next-control change is validated locally but not yet deployed.
