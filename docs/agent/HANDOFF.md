# Agent Handoff

## Active objective

A low-visual-impact animation performance pass is implemented locally and validated; it still needs a manual Twitch/YouTube coexistence check before commit and deployment.

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
- Removed the oversized Jukebox hero and moved all recipe choices into a compact sidebar directly left of the playlist, with a stacked mobile fallback.
- Moved year/month, queue length, Play, and Shuffle controls from the recipe sidebar into a responsive control row at the top of the playlist.
- Stopped idle year-card swarm canvases once their visible particle trails finish and replaced per-frame layout reads with `ResizeObserver` sizing.
- Replaced the Now Playing particle swarm's per-frame layout measurement with cached dimensions maintained by `ResizeObserver`.
- Prevented the CSS-hidden mobile or desktop audio-visualizer control from continuing to draw, and cached its canvas contexts instead of resolving them every frame.
- Moved persistent-player playback time to a ref and gated top-level lyrics timing updates so closed lyrics no longer trigger dashboard renders every 100 ms.
- Reduced the fluid background from 200 to 120 interpolated points per string and made both backgrounds run at 30 fps for ambient motion while returning to 60 fps during pointer or captured-audio interaction.
- Removed unnecessary antialiasing, transparency, blending, and depth work from the opaque full-screen GLSL pass, and explicitly dispose its geometry and WebGL context when switching backgrounds.

## Current behavior

- Available recipes: Yearly Top, All-Time Heavy Rotation, Forgotten Favorites, Peak Obsessions, Long-Term Companions, Recent Rediscoveries, Deep Catalog, Year Time Capsule, Fresh Finds, One Per Artist, Steady Rotation, Seasonal Returns, Album Sampler, and Recent Rotation.
- Playing or shuffling a generated mix activates the existing YouTube-backed header player.
- Navigation between dashboard views leaves the player and queue mounted, and playback advances through the generated queue.
- Queue generation uses the complete runtime SQLite database rather than the truncated static dashboard payload.
- Canvas and GLSL backgrounds preserve their existing appearance, motion rate, mouse response, and audio response while doing less idle work.
- Year-card particle effects still activate on hover; cards with no visible particles no longer retain their own animation loops.

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
- Jukebox sidebar layout: `npm run lint`, `npm run build`, and `git diff --check` — passed.
- Sidebar production check: both containers remained up with clean startup logs; the public frontend, new CSS/JavaScript assets, and live Jukebox API returned HTTP 200.
- List-header controls: `npm run lint`, `npm run build`, and `git diff --check` — passed.
- List-header production check: both containers remained up with clean startup logs; the public frontend, new CSS/JavaScript assets, and live Jukebox API returned HTTP 200.
- Animation performance pass: `npm run lint` — passed.
- Animation performance pass: `npm run build` — passed; the existing Node-version, stale browser-data, and large-chunk warnings remain.
- Headless Chrome visual check at 1440×1000 — Canvas and GLSL overview screenshots rendered correctly with the expected composition and controls.
- Headless Chrome CPU sampling — the previous per-year `getBoundingClientRect`/`LocalizedSwarm` hotspot disappeared; the overview's sampled idle share improved from roughly 59–60% before the pass to roughly 64–69% across repeated post-change samples.
- `git diff --check` — passed.

## Uncommitted implementation details

- Modified `src/App.jsx`, `src/components/FluidBackground.jsx`, `src/components/LocalizedSwarm.jsx`, `src/components/NowPlaying.jsx`, `src/components/PersistentPlayer.jsx`, and `src/components/ShaderBackground.jsx` for the animation performance pass.
- Updated this handoff with the implementation and validation state.
- Dependencies remain installed locally; `node_modules` and build output are ignored and are not implementation changes.

## Unresolved risks

- The current YouTube resolver selects the first non-live `yt-dlp` search result for each track; ambiguous titles can still resolve to an unintended upload.
- Jukebox results depend on the deployed backend having the complete SQLite scrobble database.
- Vite reports that local Node 20.16.0 is below its preferred 20.19+ version, though the production build completes successfully.
- The production JavaScript bundle remains large enough to trigger Vite's chunk-size warning.
- The performance profile used headless Chrome without a live Twitch/YouTube playback workload; a manual media coexistence check is still required.
- The Now Playing card intentionally retains its visible 60-particle effect; this pass removes its forced layout read but does not redesign the effect.
- Saving a generated queue as a playlist in the user's YouTube account is not implemented; that requires YouTube OAuth and write API integration.
- The production deploy user's global Git config rewrites this repository's HTTPS GitHub URL to SSH, but that user has no working GitHub SSH key. Pulls must bypass that global rewrite or the host configuration must be repaired deliberately.

## Next concrete action

Manually play Twitch or YouTube alongside the overview with both background modes, verify hover/audio responsiveness, then commit and deploy the performance pass if playback remains stable.

## Deployment/status impact

Production remains on the previously documented deployment. The animation performance pass is local and uncommitted; no production service was changed or restarted.
