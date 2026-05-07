/**
 * @file app.js
 * @description Main application entry point.
 * Wires together: filter state, API calls, table rendering, pagination,
 * autocomplete tag inputs, sort, and the random-chart button.
 *
 * State lives here; child modules are stateless and receive their data.
 */

import { fetchCharts, fetchTotalCount, fetchRandomChart } from './api.js';
import { TagInput, debounce }                             from './filters.js';
import {
  renderRows,
  showLoading,
  updateSortHeaders,
  renderPagination,
}                                                         from './table.js';
import { PAGE_SIZE, DEBOUNCE_MS }                         from './config.js';

// ─── State ───────────────────────────────────────────────────────────────────

/** @type {{ title: string, composers: string[], grooves: string[], styles: string[], sortCol: string, sortDir: string, page: number }} */
let state = {
  title:        '',
  composers:    [],   // confirmed tags
  composerText: '',   // live typed text (partial search)
  grooves:      [],
  styles:       [],
  sortCol:      'title',
  sortDir:      'asc',
  page:         0,
};

// ─── DOM references ───────────────────────────────────────────────────────────

const totalCountEl   = document.getElementById('total-count');
const resultsCountEl = document.getElementById('results-count');
const tbody          = document.getElementById('charts-tbody');
const table          = document.getElementById('charts-table');
const paginationEl   = document.getElementById('pagination');
const titleInput     = document.getElementById('filter-title');
const btnRandom      = document.getElementById('btn-random');
const btnReset       = document.getElementById('btn-reset');

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

// ─── Search ───────────────────────────────────────────────────────────────────

/**
 * Main search function — reads state, fetches from API, renders results.
 */
const search = async () => {
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
  composerInput.clear();
  grooveInput.clear();
  styleInput.clear();
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
};

// ─── Init ─────────────────────────────────────────────────────────────────────

/**
 * Bootstrap the application.
 */
const init = async () => {
  // Fetch and display total chart count in the hero
  fetchTotalCount()
    .then((count) => {
      totalCountEl.textContent = count.toLocaleString();
    })
    .catch((err) => {
      console.error('[app] count error', err);
      totalCountEl.textContent = '?';
    });

  initTagInputs();
  bindEvents();

  // Initial data load
  await search();
};

// Wait for DOM
document.addEventListener('DOMContentLoaded', init);
