/**
 * Artist artwork arrives as a collection, not a single URL: the payload
 * generator keeps up to five distinct images per artist
 * (`as.img.length < 5 && as.img.push(...)` in regenerate_payload.js).
 *
 * Anything rendering one <img src> or a CSS url() needs a single URL out of
 * that array. Interpolating the array directly produces
 * "url(https://a.jpg,https://b.jpg,…)", which is not a valid URL — the browser
 * silently renders nothing, and because a non-empty array is truthy the
 * placeholder branch never runs either, leaving a blank tile.
 *
 * Takes the first entry rather than a random one so a grid keeps the same art
 * between re-renders. ArtistProfile deliberately picks at random for its
 * full-bleed backdrop and is left alone.
 */
export function artistImage(img) {
  if (Array.isArray(img)) return img.length > 0 ? img[0] : null;
  return img || null;
}
