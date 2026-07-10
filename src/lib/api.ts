/**
 * Thin accessor for the preload bridge. Everything the renderer knows about the
 * database goes through `window.api` — this module just gives it a tidy import
 * and a friendly error if the preload script somehow failed to load.
 */
export const api = window.api

if (!api) {
  // This should never happen in the packaged app; it only helps during dev if the
  // preload path is misconfigured.
  // eslint-disable-next-line no-console
  console.error('window.api is unavailable — the Electron preload bridge did not load.')
}
