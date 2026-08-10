/**
 * Lite mode ("Back Print") — a low-CPU rendering mode for the dashboard.
 *
 * Two halves, and both are needed:
 *   - lite.css restyles the app under `html.lite` (flat ink on paper, no
 *     backdrop-filter, no blur, no CSS animation).
 *   - this store lets components skip the expensive work outright. CSS can
 *     hide a canvas but it cannot stop a requestAnimationFrame loop, so the
 *     WebGL/canvas backgrounds and the particle swarm unmount instead.
 *
 * Kept as a tiny external store rather than context so a component can read it
 * without another provider in the tree, following the `page-unfocused`
 * precedent of driving global rendering from a class on <html>.
 */
import { useSyncExternalStore } from 'react';

const KEY = 'sardistic.lite';

let enabled = false;
try {
  enabled = localStorage.getItem(KEY) === '1';
} catch {
  // private mode / storage disabled — fall back to the full experience
}

const listeners = new Set();

function apply() {
  if (typeof document !== 'undefined') {
    document.documentElement.classList.toggle('lite', enabled);
  }
}

// Apply before first paint so a reload in lite mode never flashes the heavy theme.
apply();

export function isLite() {
  return enabled;
}

export function setLite(next) {
  if (next === enabled) return;
  enabled = next;
  try {
    localStorage.setItem(KEY, enabled ? '1' : '0');
  } catch {
    // not fatal — the mode still applies for this session
  }
  apply();
  listeners.forEach((fn) => fn());
}

export function toggleLite() {
  setLite(!enabled);
}

function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function useLite() {
  return useSyncExternalStore(subscribe, isLite, () => false);
}
