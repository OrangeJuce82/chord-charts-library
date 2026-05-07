/**
 * @file ireal-chart.js
 * @description Shared helpers around the vendored ireal-renderer libraries.
 */

const PLAYLIST_CLASS = window.IRealPlaylist;
const RENDERER_CLASS = window.iRealRenderer;

/**
 * Return a finite number, falling back when the value is empty or invalid.
 * @param {unknown} value
 * @param {number} fallback
 * @returns {number}
 */
export const toNumber = (value, fallback = 0) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
};

/**
 * Escape user/database text before inserting it into an HTML template.
 * @param {unknown} value
 * @returns {string}
 */
export const esc = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

/**
 * Create a deep plain-object clone of a parsed song.
 * @param {object} song
 * @returns {object}
 */
const cloneSong = (song) => {
  if (typeof structuredClone === 'function') return structuredClone(song);
  return JSON.parse(JSON.stringify(song));
};

/**
 * Normalize iReal URI schemes accepted by the tiny reader.
 * @param {string} url
 * @returns {string}
 */
const normalizeIRealUrl = (url) => {
  if (url?.startsWith('irealbook://')) return `irealb://${url.slice('irealbook://'.length)}`;
  return url ?? '';
};

/**
 * Parse the first song from an iReal URL.
 * @param {string} url
 * @returns {{ song: object, renderer: object }}
 */
export const parseIRealUrl = (url) => {
  if (!PLAYLIST_CLASS || !RENDERER_CLASS) {
    throw new Error('iReal renderer libraries are not loaded.');
  }

  if (!url || (!url.startsWith('irealb://') && !url.startsWith('irealbook://'))) {
    throw new Error('Chart URL is not a supported iReal URI.');
  }

  const playlist = new PLAYLIST_CLASS(normalizeIRealUrl(url));
  const song = playlist.songs?.[0];
  if (!song) throw new Error('No song could be decoded from the iReal URI.');

  const renderer = new RENDERER_CLASS();
  renderer.parse(song);
  return { song, renderer };
};

/**
 * Render a parsed song into a container using display options.
 * @param {object} params
 * @param {object} params.song
 * @param {object} params.renderer
 * @param {HTMLElement} params.container
 * @param {number} params.transpose
 * @param {'minus'|'m'|'small'} params.minor
 * @param {boolean} params.useH
 * @param {boolean} params.hilite
 * @returns {object}
 */
export const renderIRealSong = ({
  song,
  renderer,
  container,
  transpose = 0,
  minor = 'minus',
  useH = false,
  hilite = false,
}) => {
  const displaySong = cloneSong(song);

  // The database value is the display default, so prevent the vendored
  // renderer from applying the URI transpose field a second time.
  displaySong.transpose = 0;

  const transposed = renderer.transpose(displaySong, { transpose, minor, useH });
  container.innerHTML = '';
  renderer.render(transposed, container, { hilite });
  return transposed;
};

/**
 * Derive a human-readable iReal scheme.
 * @param {string} url
 * @returns {'IREALB'|'IREALBOOK'|'UNKNOWN'}
 */
export const getIRealSchemeLabel = (url = '') => {
  if (url.startsWith('irealbook://')) return 'IREALBOOK';
  if (url.startsWith('irealb://')) return 'IREALB';
  return 'UNKNOWN';
};

