/**
 * @file app.js
 * @description Main application entry point.
 * Wires together: filter state, API calls, table rendering, pagination,
 * autocomplete tag inputs, sort, and the random-chart button.
 *
 * State lives here; child modules are stateless and receive their data.
 */

import { fetchCharts, fetchTotalCount, fetchRandomChart, fetchTopCategoricalStats } from './api.js';
import { TagInput, debounce }                             from './filters.js';
import {
  renderRows,
  showLoading,
  updateSortHeaders,
  renderPagination,
}                                                         from './table.js';
import { PAGE_SIZE, DEBOUNCE_MS }                         from './config.js';
import { TOP_GROOVE_STATS, TOP_STYLE_STATS }              from './stats.js';

// ─── State ───────────────────────────────────────────────────────────────────

const DEFAULT_STATE = {
  title:        '',
  composers:    [],   // confirmed tags
  composerText: '',   // live typed text (partial search)
  grooves:      [],
  styles:       [],
  sortCol:      'title',
  sortDir:      'asc',
  page:         0,
};

const SORT_COLUMNS = ['title', 'composer', 'groove', 'style', 'key', 'bpm'];
const SORT_DIRECTIONS = ['asc', 'desc'];

/** @type {{ title: string, composers: string[], composerText: string, grooves: string[], styles: string[], sortCol: string, sortDir: string, page: number }} */
let state = { ...DEFAULT_STATE };
let isApplyingUrlState = false;
let lastSearchUrl = '';
let topStyleStats = TOP_STYLE_STATS;
let topGrooveStats = TOP_GROOVE_STATS;

const TOP_STATS_CACHE_KEY = 'chordCharts.topStats.v1';
const TOP_STATS_CACHE_TTL = 6 * 60 * 60 * 1000;

// ─── DOM references ───────────────────────────────────────────────────────────

const totalCountEl   = document.getElementById('total-count');
const resultsCountEl = document.getElementById('results-count');
const tbody          = document.getElementById('charts-tbody');
const table          = document.getElementById('charts-table');
const paginationEl   = document.getElementById('pagination');
const titleInput     = document.getElementById('filter-title');
const btnRandom      = document.getElementById('btn-random');
const btnReset       = document.getElementById('btn-reset');
const topStylesEl    = document.getElementById('top-styles');
const topGroovesEl   = document.getElementById('top-grooves');

// ─── Tag inputs ───────────────────────────────────────────────────────────────

let composerInput, grooveInput, styleInput;

const initTagInputs = () => {
  composerInput = new TagInput({
    wrapper:       document.getElementById('composer-wrapper'),
    tagsContainer: document.getElementById('composer-tags'),
    input:         document.getElementById('filter-composer'),
    suggestions:   document.getElementById('composer-suggestions'),
    column:        'composer',
    tagClass:      'composer',
    onInputChange: (text) => {
      // Live partial text typed — update composerText but keep tags
      state.composerText = text;
      state.page = 0;
      debouncedSearch();
    },
    onChange: (tags) => {
      state.composers    = tags;
      state.composerText = ''; // tags confirmed, clear free-text
      state.page         = 0;
      search();
    },
  });

  grooveInput = new TagInput({
    wrapper:       document.getElementById('groove-wrapper'),
    tagsContainer: document.getElementById('groove-tags'),
    input:         document.getElementById('filter-groove'),
    suggestions:   document.getElementById('groove-suggestions'),
    column:        'groove',
    tagClass:      'groove',
    onChange: (tags) => { state.grooves = tags; state.page = 0; search(); },
  });

  styleInput = new TagInput({
    wrapper:       document.getElementById('style-wrapper'),
    tagsContainer: document.getElementById('style-tags'),
    input:         document.getElementById('filter-style'),
    suggestions:   document.getElementById('style-suggestions'),
    column:        'style',
    tagClass:      'style',
    onChange: (tags) => { state.styles = tags; state.page = 0; search(); },
  });
};

// ─── URL state ───────────────────────────────────────────────────────────────

const uniqueValues = (values) => [...new Set(values.map(v => v.trim()).filter(Boolean))];

const parsePage = (value) => {
  const page = Number.parseInt(value ?? '', 10);
  return Number.isFinite(page) && page > 1 ? page - 1 : 0;
};

const readStateFromUrl = () => {
  const params = new URLSearchParams(window.location.search);
  const sortCol = params.get('sort') || DEFAULT_STATE.sortCol;
  const sortDir = params.get('dir') || DEFAULT_STATE.sortDir;

  return {
    ...DEFAULT_STATE,
    title:        params.get('title') || '',
    composers:    uniqueValues(params.getAll('composer')),
    composerText: params.get('composerText') || '',
    grooves:      uniqueValues(params.getAll('groove')),
    styles:       uniqueValues(params.getAll('style')),
    sortCol:      SORT_COLUMNS.includes(sortCol) ? sortCol : DEFAULT_STATE.sortCol,
    sortDir:      SORT_DIRECTIONS.includes(sortDir) ? sortDir : DEFAULT_STATE.sortDir,
    page:         parsePage(params.get('page')),
  };
};

const buildSearchUrl = () => {
  const params = new URLSearchParams();

  if (state.title) params.set('title', state.title);
  state.composers.forEach(composer => params.append('composer', composer));
  if (state.composerText) params.set('composerText', state.composerText);
  state.grooves.forEach(groove => params.append('groove', groove));
  state.styles.forEach(style => params.append('style', style));
  if (state.sortCol !== DEFAULT_STATE.sortCol) params.set('sort', state.sortCol);
  if (state.sortDir !== DEFAULT_STATE.sortDir) params.set('dir', state.sortDir);
  if (state.page > 0) params.set('page', String(state.page + 1));

  const query = params.toString();
  return `${window.location.pathname}${query ? `?${query}` : ''}${window.location.hash}`;
};

const syncUrlFromState = () => {
  if (isApplyingUrlState) return;

  const nextUrl = buildSearchUrl();
  if (nextUrl === lastSearchUrl) return;

  if (!lastSearchUrl) {
    window.history.replaceState(null, '', nextUrl);
  } else {
    window.history.pushState(null, '', nextUrl);
  }

  lastSearchUrl = nextUrl;
};

const applyStateToControls = () => {
  titleInput.value = state.title;
  composerInput.setTags(state.composers, { notify: false });
  composerInput.setText(state.composerText, { notify: false });
  grooveInput.setTags(state.grooves, { notify: false });
  styleInput.setTags(state.styles, { notify: false });
};

// ─── Top stats charts ────────────────────────────────────────────────────────

const escapeHtml = (str) =>
  str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const renderTopStats = () => {
  const renderChart = (container, items, type, activeValues) => {
    const max = Math.max(...items.map(item => item.count));
    container.innerHTML = items.map((item, index) => {
      const label = escapeHtml(item.label);
      const isActive = activeValues.includes(item.label);
      return `
        <button
          class="top-stat-row top-stat-row--${type}${isActive ? ' active' : ''}"
          type="button"
          data-value="${label}"
          title="Filter by ${type}: ${label}"
          aria-pressed="${isActive ? 'true' : 'false'}"
        >
          <span class="top-stat-row__rank">${index + 1}</span>
          <span class="top-stat-row__label">${label}</span>
          <span class="top-stat-row__bar" aria-hidden="true">
            <span style="width: ${(item.count / max) * 100}%"></span>
          </span>
          <span class="top-stat-row__count">${item.count.toLocaleString()}</span>
        </button>
      `;
    }).join('');

    container.querySelectorAll('.top-stat-row').forEach((button) => {
      button.addEventListener('click', () => {
        state.page = 0;
        if (type === 'style') {
          styleInput.setTags([button.dataset.value]);
        } else {
          grooveInput.setTags([button.dataset.value]);
        }
      });
    });
  };

  renderChart(topStylesEl, topStyleStats, 'style', state.styles);
  renderChart(topGroovesEl, topGrooveStats, 'groove', state.grooves);
};

const readTopStatsCache = (total) => {
  try {
    const cached = JSON.parse(localStorage.getItem(TOP_STATS_CACHE_KEY) || 'null');
    if (
      cached &&
      cached.total === total &&
      Date.now() - cached.savedAt < TOP_STATS_CACHE_TTL &&
      Array.isArray(cached.styles) &&
      Array.isArray(cached.grooves)
    ) {
      return cached;
    }
  } catch (err) {
    console.warn('[app] top stats cache ignored', err);
  }
  return null;
};

const writeTopStatsCache = (total, styles, grooves) => {
  try {
    localStorage.setItem(TOP_STATS_CACHE_KEY, JSON.stringify({
      total,
      styles,
      grooves,
      savedAt: Date.now(),
    }));
  } catch (err) {
    console.warn('[app] top stats cache write failed', err);
  }
};

const loadTopStats = async (total) => {
  renderTopStats();

  const cached = readTopStatsCache(total);
  if (cached) {
    topStyleStats = cached.styles;
    topGrooveStats = cached.grooves;
    renderTopStats();
    return;
  }

  try {
    const { styles, grooves } = await fetchTopCategoricalStats({ limit: 10, total });

    if (styles.length) topStyleStats = styles;
    if (grooves.length) topGrooveStats = grooves;
    writeTopStatsCache(total, topStyleStats, topGrooveStats);
    renderTopStats();
  } catch (err) {
    console.warn('[app] top stats fallback used', err);
  }
};

// ─── Search ───────────────────────────────────────────────────────────────────

/**
 * Main search function — reads state, fetches from API, renders results.
 */
const search = async () => {
  syncUrlFromState();
  renderTopStats();

  showLoading(tbody);
  updateSortHeaders(table, state.sortCol, state.sortDir);
  paginationEl.innerHTML = '';

  try {
    const { data, total } = await fetchCharts({
      title:        state.title,
      composers:    state.composers,
      composerText: state.composerText,
      grooves:      state.grooves,
      styles:       state.styles,
      sortCol:      state.sortCol,
      sortDir:      state.sortDir,
      page:         state.page,
      pageSize:     PAGE_SIZE,
    });

    resultsCountEl.textContent = `${total.toLocaleString()} result${total !== 1 ? 's' : ''}`;

    renderRows(tbody, data, {
      onTitleClick:    (title)    => setTitleFilter(title),
      onComposerClick: (composer) => composerInput.addTag(composer),
      onGrooveClick:   (groove)   => grooveInput.addTag(groove),
      onStyleClick:    (style)    => styleInput.addTag(style),
    });

    renderPagination(paginationEl, state.page, total, PAGE_SIZE, (page) => {
      state.page = page;
      search();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  } catch (err) {
    console.error('[app] search error', err);
    tbody.innerHTML = `
      <tr class="row--empty">
        <td colspan="8">
          ⚠️ Failed to load charts. Check your Supabase configuration in <code>js/config.js</code>.<br/>
          <small style="opacity:.5">${err.message}</small>
        </td>
      </tr>`;
    resultsCountEl.textContent = 'Error';
  }
};

// Debounced version for text input
const debouncedSearch = debounce(search, DEBOUNCE_MS);

// ─── Filter helpers ───────────────────────────────────────────────────────────

/**
 * Set the title text filter and re-search.
 * @param {string} title
 */
const setTitleFilter = (title) => {
  titleInput.value = title;
  state.title = title;
  state.page  = 0;
  search();
};

/**
 * Reset all filters to their default state.
 */
const resetFilters = () => {
  state = { ...state, title: '', composers: [], composerText: '', grooves: [], styles: [], page: 0 };
  titleInput.value = '';
  composerInput.clear({ notify: false });
  grooveInput.clear({ notify: false });
  styleInput.clear({ notify: false });
  search();
};

// ─── Event bindings ───────────────────────────────────────────────────────────

const bindEvents = () => {
  // Title text input
  titleInput.addEventListener('input', (e) => {
    state.title = e.target.value;
    state.page  = 0;
    debouncedSearch();
  });

  // Sortable column headers
  table.querySelectorAll('th.sortable').forEach((th) => {
    const handleSort = () => {
      const col = th.dataset.sort;
      if (state.sortCol === col) {
        state.sortDir = state.sortDir === 'asc' ? 'desc' : 'asc';
      } else {
        state.sortCol = col;
        state.sortDir = 'asc';
      }
      state.page = 0;
      search();
    };

    th.addEventListener('click', handleSort);
    th.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleSort(); }
    });
  });

  // Random chart button
  btnRandom.addEventListener('click', async () => {
    btnRandom.disabled = true;
    try {
      const chart = await fetchRandomChart();
      if (chart?.id) {
        window.location.href = `view?id=${encodeURIComponent(chart.id)}`;
      } else {
        alert('Could not find a random chart. Please try again.');
      }
    } catch (err) {
      console.error('[app] random chart error', err);
      alert('Failed to fetch a random chart.');
    } finally {
      btnRandom.disabled = false;
    }
  });

  // Reset button
  btnReset.addEventListener('click', resetFilters);

  // Browser back/forward restores shared search URLs.
  window.addEventListener('popstate', async () => {
    isApplyingUrlState = true;
    state = readStateFromUrl();
    applyStateToControls();
    await search();
    lastSearchUrl = buildSearchUrl();
    isApplyingUrlState = false;
  });
};

// ─── Init ─────────────────────────────────────────────────────────────────────

/**
 * Bootstrap the application.
 */
const init = async () => {
  // Fetch and display total chart count in the hero
  const totalCountPromise = fetchTotalCount()
    .then((count) => {
      totalCountEl.textContent = count.toLocaleString();
      return count;
    })
    .catch((err) => {
      console.error('[app] count error', err);
      totalCountEl.textContent = '?';
      return null;
    });

  initTagInputs();
  state = readStateFromUrl();
  applyStateToControls();
  bindEvents();
  totalCountPromise.then(count => loadTopStats(count));

  // Initial data load
  await search();
};

// Wait for DOM
document.addEventListener('DOMContentLoaded', init);
