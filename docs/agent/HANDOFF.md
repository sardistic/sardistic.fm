# Agent Handoff

## Active objective

The automatic queue-advance fix is deployed; end-of-song behavior awaits a manual browser playback check.

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
- Subscribed the raw YouTube iframe to player-state delivery and de-duplicated repeated `ENDED` snapshots so a completed track advances the queue exactly once.

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
- Next-control production check: both containers remained up with clean startup logs; the public frontend, new JavaScript bundle, and live Jukebox API returned HTTP 200.
- Automatic-advance fix: `npm run lint`, `npm run build`, and `git diff --check` — passed.
- Automatic-advance production check: both containers remained up with clean startup logs; the public frontend, new fix bundle, and live Jukebox API returned HTTP 200.

## Uncommitted implementation details

- None after the successful automatic-advance deployment handoff commit.
- Dependencies were installed with `npm ci`; `node_modules` and build output are ignored and are not implementation changes.

## Unresolved risks

- The current YouTube resolver selects the first non-live `yt-dlp` search result for each track; ambiguous titles can still resolve to an unintended upload.
- Jukebox results depend on the deployed backend having the complete SQLite scrobble database.
- Vite reports that local Node 20.16.0 is below its preferred 20.19+ version, though the production build completes successfully.
- The production JavaScript bundle remains large enough to trigger Vite's chunk-size warning.
- Saving a generated queue as a playlist in the user's YouTube account is not implemented; that requires YouTube OAuth and write API integration.
- The production deploy user's global Git config rewrites this repository's HTTPS GitHub URL to SSH, but that user has no working GitHub SSH key. Pulls must bypass that global rewrite or the host configuration must be repaired deliberately.

## Next concrete action

Let a non-final Jukebox track finish naturally in a real browser and confirm the next track starts. This environment has no browser automation capable of exercising the YouTube iframe lifecycle.

## Deployment/status impact

Commit `8c73247` was deployed on 2026-07-19. Both services were rebuilt and restarted, the corrected public asset and API were verified, and the deployment event was reported.
