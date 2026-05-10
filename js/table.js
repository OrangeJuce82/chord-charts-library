/**
 * @file table.js
 * @description Renders the sortable charts table and pagination controls.
 * All rendering is done via DOM APIs (no framework).
 */

import { PAGE_SIZE } from './config.js';

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Derive the URL scheme badge type.
 * @param {string} url
 * @returns {'irealb'|'irealbook'|'unknown'}\
 */
const getScheme = (url = '') => {
  if (url.startsWith('irealbook://')) return 'irealbook';
  if (url.startsWith('irealb://'))    return 'irealb';
  return 'unknown';
};

/**
 * Return the label text for the scheme badge.
 * @param {'irealb'|'irealbook'|'unknown'} scheme
 * @returns {string}
 */
const schemeLabel = (scheme) => (scheme === 'irealbook' ? 'IREALBOOK' : 'IREALB');

/**
 * Escape a string for safe insertion as text content.
 * @param {string|null|undefined} val
 * @returns {string}
 */
const esc = (val) => {
  if (val == null) return '';
  return String(val)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
};

// ─── ireal-musicxml lazy loader ─────────────────────────────────────────────

let iReal2MusicXML = null;

/**
 * Lazy-load the ireal-musicxml library via esm.sh.
 * @returns {Promise<object>}
 */
async function loadIRealLib() {
  if (iReal2MusicXML) return iReal2MusicXML;
  const mod = await import('https://esm.sh/ireal-musicxml@2');
  iReal2MusicXML = mod;
  return iReal2MusicXML;
}

/**
 * Convert an iReal Pro URL to MusicXML and trigger a download.
 * @param {string} url   - irealb:// or irealbook:// URI
 * @param {string} title - Song title (used as filename)
 * @param {HTMLButtonElement} btn
 */
async function convertToMusicXML(url, title, btn) {
  btn.disabled = true;
  btn.classList.add('musicxml-btn--loading');
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';

  try {
    const lib = await loadIRealLib();
    const playlist = lib.convertSync ? lib.convertSync(url) : new lib.Playlist(url);

    // Find the first song in the parsed playlist
    const songs = playlist.songs || [];
    if (!songs.length) throw new Error('No song found in URI');

    // Generate MusicXML
    const musicXml = lib.MusicXML
      ? lib.MusicXML.convert(songs[0])
      : songs[0].musicXml;

    if (!musicXml) throw new Error('MusicXML generation returned empty result');

    // Download
    const blob = new Blob([musicXml], { type: 'application/vnd.recordare.musicxml+xml' });
    const a    = document.createElement('a');
    a.href     = URL.createObjectURL(blob);
    a.download = `${title.replace(/[/\\?%*:|"<>]/g, '_')}.xml`;
    a.click();
    URL.revokeObjectURL(a.href);

    btn.innerHTML = '<i class="fa-solid fa-check"></i>';
    btn.classList.remove('musicxml-btn--loading');
    setTimeout(() => {
      btn.disabled = false;
      btn.innerHTML = '<i class="fa-solid fa-file-code"></i> XML';
    }, 2000);
  } catch (err) {
    console.error('[MusicXML]', err);
    btn.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i>';
    btn.classList.remove('musicxml-btn--loading');
    btn.title = `Error: ${err.message}`;
    setTimeout(() => {
      btn.disabled = false;
      btn.innerHTML = '<i class="fa-solid fa-file-code"></i> XML';
      btn.title = 'Download as MusicXML';
    }, 3000);
  }
}

// ─── Table ───────────────────────────────────────────────────────────────────

/**
 * Render one table row for the given chart data object.
 *
 * @param {object} chart
 * @param {object} callbacks
 * @param {Function} callbacks.onTitleClick    - (title: string) => void
 * @param {Function} callbacks.onComposerClick - (composer: string) => void
 * @param {Function} callbacks.onGrooveClick   - (groove: string) => void
 * @param {Function} callbacks.onStyleClick    - (style: string) => void
 * @returns {HTMLTableRowElement}
 */
const buildRow = (chart, { onTitleClick, onComposerClick, onGrooveClick, onStyleClick }) => {
  const tr = document.createElement('tr');

  const scheme = getScheme(chart.url);

  tr.innerHTML = `
    <!-- View (sticky eye icon) -->
    <td class="col-view">
      <a href="view?id=${esc(chart.id)}"
         class="view-btn"
         title="View chart details"
         aria-label="View chart details for ${esc(chart.title)}">
        <i class="fa-regular fa-eye" aria-hidden="true"></i>
      </a>
    </td>

    <!-- Title -->
    <td class="col-title">
      <button class="cell-link js-title" title="Search: ${esc(chart.title)}">
        ${esc(chart.title) || '<span style="opacity:.4">—</span>'}
      </button>
    </td>

    <!-- Composer -->
    <td class="col-composer">
      ${chart.composer
        ? `<button class="cell-link js-composer" title="Filter by composer: ${esc(chart.composer)}">${esc(chart.composer)}</button>`
        : '<span style="opacity:.3">—</span>'}
    </td>

    <!-- Groove -->
    <td class="col-groove">
      ${chart.groove
        ? `<button class="inline-tag inline-tag--groove js-groove" title="Filter by groove: ${esc(chart.groove)}">${esc(chart.groove)}</button>`
        : '<span style="opacity:.3">—</span>'}
    </td>

    <!-- Style -->
    <td class="col-style">
      ${chart.style
        ? `<button class="inline-tag inline-tag--style js-style" title="Filter by style: ${esc(chart.style)}">${esc(chart.style)}</button>`
        : '<span style="opacity:.3">—</span>'}
    </td>

    <!-- Key -->
    <td class="col-key">
      ${chart.key ? `<span class="key-badge">${esc(chart.key)}</span>` : '<span style="opacity:.3">—</span>'}
    </td>

    <!-- BPM -->
    <td class="col-bpm">
      <span class="bpm-value">${chart.bpm || '—'}</span>
    </td>

    <!-- Open (scheme tag) -->
    <td class="col-open">
      ${chart.url
        ? `<a href="${esc(chart.url)}" class="scheme-tag scheme-tag--${scheme}" title="Open in iReal Pro (${schemeLabel(scheme)})">
             <i class="fa-solid fa-music" aria-hidden="true"></i>
             ${schemeLabel(scheme)}
           </a>`
        : '<span style="opacity:.3">—</span>'}
    </td>

    <!-- MusicXML download -->
    <td class="col-musicxml">
      ${chart.url
        ? `<button class="musicxml-btn js-musicxml" title="Download as MusicXML" aria-label="Download MusicXML for ${esc(chart.title)}">
             <i class="fa-solid fa-file-code"></i> XML
           </button>`
        : '<span style="opacity:.3">—</span>'}
    </td>
  `;

  // Attach click handlers
  const titleBtn    = tr.querySelector('.js-title');
  const composerBtn = tr.querySelector('.js-composer');
  const grooveBtn   = tr.querySelector('.js-groove');
  const styleBtn    = tr.querySelector('.js-style');
  const musicxmlBtn = tr.querySelector('.js-musicxml');

  if (titleBtn)    titleBtn.addEventListener('click',    () => onTitleClick(chart.title));
  if (composerBtn) composerBtn.addEventListener('click', () => onComposerClick(chart.composer));
  if (grooveBtn)   grooveBtn.addEventListener('click',   () => onGrooveClick(chart.groove));
  if (styleBtn)    styleBtn.addEventListener('click',    () => onStyleClick(chart.style));
  if (musicxmlBtn) musicxmlBtn.addEventListener('click', () => convertToMusicXML(chart.url, chart.title, musicxmlBtn));

  return tr;
};

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Render chart rows into the tbody.
 *
 * @param {HTMLElement} tbody
 * @param {object[]} charts
 * @param {object} callbacks - { onTitleClick, onComposerClick, onGrooveClick, onStyleClick }
 */
export const renderRows = (tbody, charts, callbacks) => {
  tbody.innerHTML = '';

  if (!charts.length) {
    const tr = document.createElement('tr');
    tr.className = 'row--empty';
    tr.innerHTML = '<td colspan="9">No charts found. Try adjusting your filters.</td>';
    tbody.appendChild(tr);
    return;
  }

  const fragment = document.createDocumentFragment();
  charts.forEach((chart, i) => {
    const tr = buildRow(chart, callbacks);
    tr.style.animationDelay = `${i * 12}ms`;
    fragment.appendChild(tr);
  });
  tbody.appendChild(fragment);
};

/**
 * Show a loading skeleton in the tbody.
 * @param {HTMLElement} tbody
 */
export const showLoading = (tbody) => {
  tbody.innerHTML = `
    <tr class="row--loading">
      <td colspan="9">
        <div class="loader" aria-label="Loading…">
          <span></span><span></span><span></span>
        </div>
      </td>
    </tr>`;
};

/**
 * Update sortable column headers to reflect the current sort state.
 *
 * @param {HTMLElement} table
 * @param {string} sortCol
 * @param {'asc'|'desc'} sortDir
 */
export const updateSortHeaders = (table, sortCol, sortDir) => {
  table.querySelectorAll('th.sortable').forEach((th) => {
    const col = th.dataset.sort;
    th.classList.remove('sort-asc', 'sort-desc');
    th.removeAttribute('aria-sort');

    if (col === sortCol) {
      th.classList.add(sortDir === 'asc' ? 'sort-asc' : 'sort-desc');
      th.setAttribute('aria-sort', sortDir === 'asc' ? 'ascending' : 'descending');
    }
  });
};

/**
 * Render pagination buttons.
 *
 * @param {HTMLElement} container
 * @param {number} currentPage  - 0-indexed
 * @param {number} totalItems
 * @param {number} pageSize
 * @param {Function} onPageChange - (page: number) => void
 */
export const renderPagination = (container, currentPage, totalItems, pageSize, onPageChange) => {
  const totalPages = Math.ceil(totalItems / pageSize);
  container.innerHTML = '';

  if (totalPages <= 1) return;

  const addBtn = (label, page, disabled = false, active = false) => {
    const btn = document.createElement('button');
    btn.className = 'page-btn' + (active ? ' active' : '');
    btn.textContent = label;
    btn.disabled = disabled;
    btn.setAttribute('aria-label', `Page ${label}`);
    if (!disabled && !active) btn.addEventListener('click', () => onPageChange(page));
    container.appendChild(btn);
  };

  // Prev
  addBtn('‹', currentPage - 1, currentPage === 0);

  // Page numbers (window of 7)
  const WINDOW = 3;
  let start = Math.max(0, currentPage - WINDOW);
  let end   = Math.min(totalPages - 1, currentPage + WINDOW);

  if (start > 0) {
    addBtn('1', 0);
    if (start > 1) {
      const ellipsis = document.createElement('span');
      ellipsis.className = 'page-btn';
      ellipsis.textContent = '…';
      ellipsis.style.cursor = 'default';
      container.appendChild(ellipsis);
    }
  }

  for (let p = start; p <= end; p++) {
    addBtn(String(p + 1), p, false, p === currentPage);
  }

  if (end < totalPages - 1) {
    if (end < totalPages - 2) {
      const ellipsis = document.createElement('span');
      ellipsis.className = 'page-btn';
      ellipsis.textContent = '…';
      ellipsis.style.cursor = 'default';
      container.appendChild(ellipsis);
    }
    addBtn(String(totalPages), totalPages - 1);
  }

  // Next
  addBtn('›', currentPage + 1, currentPage === totalPages - 1);
};
