/**
 * @file ireal-chart.js
 * @description Shared helpers around the vendored ireal-renderer libraries.
 */

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

const decodeIRealPayload = (url) => {
  const normalized = normalizeIRealUrl(String(url ?? '').trim());
  if (!normalized.startsWith('irealb://')) return null;

  try {
    return decodeURIComponent(normalized.slice('irealb://'.length));
  } catch (error) {
    return null;
  }
};

const obfusc50 = (s) => {
  const chars = s.split('');
  for (let i = 0; i < 5; i += 1) {
    chars[49 - i] = s[i];
    chars[i] = s[49 - i];
  }
  for (let i = 10; i < 24; i += 1) {
    chars[49 - i] = s[i];
    chars[i] = s[49 - i];
  }
  return chars.join('');
};

const unscrambleMusic = (s) => {
  let text = String(s ?? '');
  let result = '';

  while (text.length > 51) {
    const chunk = text.slice(0, 50);
    text = text.slice(50);
    result += obfusc50(chunk);
  }

  result += text;
  return result.replace(/Kcl/g, '| x').replace(/LZ/g, ' |').replace(/XyQ/g, '   ');
};

const parseIRealSongData = (url) => {
  const decoded = decodeIRealPayload(url);
  if (!decoded) return null;

  const data = decoded.split('===')[0];
  if (!data) return null;

  const parts = data.split('=');
  if (parts.length < 6) return null;

  const title = parts[0] ?? '';
  const composerRaw = parts[1] ?? '';
  const composerSplit = composerRaw.split(' ');
  const composer = composerSplit.length === 2 ? `${composerSplit[1]} ${composerSplit[0]}` : composerRaw;
  const hasEmptyStyleSlot = parts[2] === '';
  const style = hasEmptyStyleSlot ? (parts[3] ?? '') : (parts[2] ?? '');
  const key = hasEmptyStyleSlot ? (parts[4] ?? '') : (parts[3] ?? '');
  const transpose = Number(hasEmptyStyleSlot ? parts[5] : parts[4]) || 0;
  const musicPart = hasEmptyStyleSlot ? (parts[6] ?? '') : (parts[5] ?? '');
  const bpm = Number(hasEmptyStyleSlot ? parts[8] : parts[7]) || 0;
  const repeats = Number(hasEmptyStyleSlot ? parts[9] : parts[8]) || 3;
  const musicPrefix = '1r34LbKcu7';
  const musicIndex = musicPart.indexOf(musicPrefix);
  const music = musicIndex >= 0
    ? unscrambleMusic(musicPart.slice(musicIndex + musicPrefix.length))
    : musicPart;

  return { title, composer, style, key, transpose, bpm, repeats, music };
};

/**
 * Parse the first song from an iReal URL.
 * @param {string} url
 * @returns {{ song: object, renderer: object }}
 */
export const parseIRealUrl = (url) => {
  if (!RENDERER_CLASS) {
    throw new Error('iReal renderer libraries are not loaded.');
  }

  if (!url || (!url.startsWith('irealb://') && !url.startsWith('irealbook://'))) {
    throw new Error('Chart URL is not a supported iReal URI.');
  }

  const song = parseIRealSongData(url);
  if (!song || !song.music) throw new Error('No song could be decoded from the iReal URI.');

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
