/**
 * @file viewer.js
 * @description Chart detail page controller.
 */

import { fetchChartById, fetchRandomChart } from './api.js';
import {
  esc,
  getIRealSchemeLabel,
  parseIRealUrl,
  renderIRealSong,
  toNumber,
} from './ireal-chart.js';

const page = document.getElementById('page-container');
const btnRandomViewer = document.getElementById('btn-random-viewer');

const state = {
  chart: null,
  parsedSong: null,
  renderer: null,
  renderedSong: null,
  transpose: 0,
  fontScale: 100,
  minor: 'minus',
  useH: false,
  hilite: false,
  showDecoded: false,
};

const setPageTitle = (title = 'Chart Detail') => {
  document.title = `${title} - Chord Charts Library`;
};

const formatTranspose = (value) => {
  if (value > 0) return `+${value}`;
  return String(value);
};

const makeMetaItems = (chart, renderedSong) => [
  chart.key || renderedSong?.key
    ? `<span class="viewer-pill viewer-pill--key"><strong>${esc(renderedSong?.key || chart.key)}</strong></span>`
    : '',
  chart.composer
    ? `<span class="viewer-pill"><i class="fa-solid fa-user-pen" aria-hidden="true"></i>${esc(chart.composer)}</span>`
    : '',
  chart.groove
    ? `<span class="viewer-pill"><i class="fa-solid fa-drum" aria-hidden="true"></i>${esc(chart.groove)}</span>`
    : '',
  chart.style
    ? `<span class="viewer-pill"><i class="fa-solid fa-music" aria-hidden="true"></i>${esc(chart.style)}</span>`
    : '',
  chart.bpm
    ? `<span class="viewer-pill"><i class="fa-solid fa-gauge-high" aria-hidden="true"></i>${esc(chart.bpm)} bpm</span>`
    : '',
  chart.repeats
    ? `<span class="viewer-pill"><i class="fa-solid fa-repeat" aria-hidden="true"></i>${esc(chart.repeats)}x</span>`
    : '',
].filter(Boolean).join('');

const renderLoading = () => {
  page.innerHTML = `
    <main class="viewer-shell">
      <section class="viewer-state" aria-live="polite">
        <div class="loader" aria-label="Loading chart">
          <span></span><span></span><span></span>
        </div>
        <p>Loading chart...</p>
      </section>
    </main>`;
};

const renderError = (message) => {
  setPageTitle('Chart unavailable');
  page.innerHTML = `
    <main class="viewer-shell">
      <section class="viewer-state viewer-state--error">
        <i class="fa-solid fa-triangle-exclamation" aria-hidden="true"></i>
        <h1>Chart unavailable</h1>
        <p>${esc(message)}</p>
        <a href="index.html" class="viewer-action viewer-action--secondary">
          <i class="fa-solid fa-arrow-left" aria-hidden="true"></i>
          Back to library
        </a>
      </section>
    </main>`;
};

const renderShell = () => {
  const { chart } = state;
  const schemeLabel = getIRealSchemeLabel(chart.url);

  page.innerHTML = `
    <main class="viewer-shell">
      <section class="viewer-topbar" aria-label="Chart navigation">
        <a href="index.html" class="viewer-back">
          <i class="fa-solid fa-arrow-left" aria-hidden="true"></i>
          Library
        </a>
        <div class="viewer-topbar__actions">
          <button id="btn-copy-url" class="icon-btn" type="button" title="Copy iReal URL" aria-label="Copy iReal URL">
            <i class="fa-regular fa-copy" aria-hidden="true"></i>
          </button>
          <button id="btn-print" class="icon-btn" type="button" title="Print chart" aria-label="Print chart">
            <i class="fa-solid fa-print" aria-hidden="true"></i>
          </button>
          ${chart.url ? `
            <a href="${esc(chart.url)}" class="viewer-action" title="Open in iReal Pro">
              <i class="fa-solid fa-arrow-up-right-from-square" aria-hidden="true"></i>
              ${schemeLabel}
            </a>` : ''}
        </div>
      </section>

      <section class="viewer-layout">
        <aside class="viewer-sidebar" aria-label="Chart controls">
          <div class="viewer-titleblock">
            <span class="viewer-kicker">Chart Viewer</span>
            <h1>${esc(chart.title || state.parsedSong?.title || 'Untitled chart')}</h1>
            <p>${esc(chart.composer || state.parsedSong?.composer || 'Unknown composer')}</p>
          </div>

          <div id="viewer-meta" class="viewer-meta"></div>

          <div class="viewer-controls">
            <div class="control-field">
              <label for="transpose-range">Transpose</label>
              <div class="control-stepper">
                <button id="transpose-down" type="button" aria-label="Transpose down">
                  <i class="fa-solid fa-minus" aria-hidden="true"></i>
                </button>
                <output id="transpose-value" for="transpose-range">${formatTranspose(state.transpose)}</output>
                <button id="transpose-up" type="button" aria-label="Transpose up">
                  <i class="fa-solid fa-plus" aria-hidden="true"></i>
                </button>
              </div>
              <input id="transpose-range" type="range" min="-12" max="12" step="1" value="${state.transpose}" />
            </div>

            <div class="control-field">
              <label for="font-scale">Chart size</label>
              <div class="control-inline">
                <input id="font-scale" type="range" min="80" max="140" step="5" value="${state.fontScale}" />
                <output id="font-scale-value" for="font-scale">${state.fontScale}%</output>
              </div>
            </div>

            <fieldset class="control-field">
              <legend>Minor chords</legend>
              <label class="segmented-option">
                <input type="radio" name="minor-mode" value="minus" checked />
                <span>C-</span>
              </label>
              <label class="segmented-option">
                <input type="radio" name="minor-mode" value="m" />
                <span>Cm</span>
              </label>
              <label class="segmented-option">
                <input type="radio" name="minor-mode" value="small" />
                <span>c</span>
              </label>
            </fieldset>

            <label class="switch-row">
              <input id="use-h" type="checkbox" />
              <span>B/H notation</span>
            </label>

            <label class="switch-row">
              <input id="hilite" type="checkbox" />
              <span>Highlight signs and comments</span>
            </label>

            <label class="switch-row">
              <input id="show-decoded" type="checkbox" />
              <span>Show decoded iReal data</span>
            </label>

            <button id="reset-controls" type="button" class="viewer-action viewer-action--secondary">
              <i class="fa-solid fa-rotate-left" aria-hidden="true"></i>
              Reset defaults
            </button>
          </div>
        </aside>

        <section class="viewer-stage" aria-label="Rendered chord chart">
          <div class="chart-panel">
            <div class="chart-panel__header">
              <span>Grid</span>
              <span id="chart-key-label"></span>
            </div>
            <div class="lead-sheet-paper">
              <header class="lead-sheet-header">
                <div id="lead-sheet-style" class="lead-sheet-style"></div>
                <h2 id="lead-sheet-title"></h2>
                <div id="lead-sheet-composer" class="lead-sheet-composer"></div>
              </header>
              <div id="chart-render-target" class="ireal-render-target"></div>
            </div>
          </div>

          <details id="decoded-panel" class="decoded-panel">
            <summary>Decoded iReal data</summary>
            <pre id="decoded-output"></pre>
          </details>
        </section>
      </section>
    </main>`;
};

const updateControls = () => {
  document.getElementById('transpose-value').textContent = formatTranspose(state.transpose);
  document.getElementById('transpose-range').value = String(state.transpose);
  document.getElementById('font-scale').value = String(state.fontScale);
  document.getElementById('font-scale-value').textContent = `${state.fontScale}%`;
  document.getElementById('use-h').checked = state.useH;
  document.getElementById('hilite').checked = state.hilite;
  document.getElementById('show-decoded').checked = state.showDecoded;
  document.querySelectorAll('input[name="minor-mode"]').forEach((input) => {
    input.checked = input.value === state.minor;
  });
};

const refreshChart = () => {
  const target = document.getElementById('chart-render-target');
  document.querySelector('.lead-sheet-paper')
    .style.setProperty('--chart-scale', `${state.fontScale / 100}`);

  state.renderedSong = renderIRealSong({
    song: state.parsedSong,
    renderer: state.renderer,
    container: target,
    transpose: state.transpose,
    minor: state.minor,
    useH: state.useH,
    hilite: state.hilite,
  });

  document.getElementById('viewer-meta').innerHTML = makeMetaItems(state.chart, state.renderedSong);
  document.getElementById('lead-sheet-title').textContent =
    state.chart.title || state.renderedSong?.title || state.parsedSong?.title || '';
  document.getElementById('lead-sheet-style').textContent =
    state.chart.style ? `(${state.chart.style})` : '';
  document.getElementById('lead-sheet-composer').textContent =
    state.chart.composer || state.renderedSong?.composer || state.parsedSong?.composer || '';
  document.getElementById('chart-key-label').textContent = state.renderedSong?.key
    ? `Key ${state.renderedSong.key}`
    : '';
  document.getElementById('decoded-panel').open = state.showDecoded;
  document.getElementById('decoded-output').textContent = state.parsedSong?.music || '';
  updateControls();
};

const setTranspose = (value) => {
  state.transpose = Math.max(-12, Math.min(12, toNumber(value, state.transpose)));
  refreshChart();
};

const resetControls = () => {
  state.transpose = toNumber(state.chart?.transpose, 0);
  state.fontScale = 100;
  state.minor = 'minus';
  state.useH = false;
  state.hilite = false;
  state.showDecoded = false;
  refreshChart();
};

const bindEvents = () => {
  document.getElementById('transpose-down').addEventListener('click', () => setTranspose(state.transpose - 1));
  document.getElementById('transpose-up').addEventListener('click', () => setTranspose(state.transpose + 1));
  document.getElementById('transpose-range').addEventListener('input', (event) => setTranspose(event.target.value));

  document.getElementById('font-scale').addEventListener('input', (event) => {
    state.fontScale = toNumber(event.target.value, 100);
    refreshChart();
  });

  document.querySelectorAll('input[name="minor-mode"]').forEach((input) => {
    input.addEventListener('change', () => {
      state.minor = input.value;
      refreshChart();
    });
  });

  document.getElementById('use-h').addEventListener('change', (event) => {
    state.useH = event.target.checked;
    refreshChart();
  });

  document.getElementById('hilite').addEventListener('change', (event) => {
    state.hilite = event.target.checked;
    refreshChart();
  });

  document.getElementById('show-decoded').addEventListener('change', (event) => {
    state.showDecoded = event.target.checked;
    refreshChart();
  });

  document.getElementById('reset-controls').addEventListener('click', resetControls);
  document.getElementById('btn-print').addEventListener('click', () => window.print());
  document.getElementById('btn-copy-url').addEventListener('click', async () => {
    await navigator.clipboard.writeText(state.chart.url || '');
  });
};

const init = async () => {
  renderLoading();

  btnRandomViewer?.addEventListener('click', async () => {
    btnRandomViewer.disabled = true;
    try {
      const chart = await fetchRandomChart();
      if (chart?.id) {
        window.location.href = `view?id=${encodeURIComponent(chart.id)}`;
      } else {
        alert('Could not find a random chart. Please try again.');
      }
    } catch (error) {
      console.error('[viewer] random chart error', error);
      alert('Failed to fetch a random chart.');
    } finally {
      btnRandomViewer.disabled = false;
    }
  });

  const id = new URLSearchParams(window.location.search).get('id');
  if (!id) {
    renderError('No chart ID was provided in the URL.');
    return;
  }

  try {
    const chart = await fetchChartById(id);
    if (!chart) {
      renderError('No chart was found for this ID.');
      return;
    }

    const { song, renderer } = parseIRealUrl(chart.url);
    state.chart = chart;
    state.parsedSong = song;
    state.renderer = renderer;
    state.transpose = toNumber(chart.transpose, toNumber(song.transpose, 0));

    setPageTitle(chart.title || song.title);
    renderShell();
    bindEvents();
    refreshChart();
  } catch (error) {
    console.error('[viewer] failed to load chart', error);
    renderError(error.message);
  }
};

document.addEventListener('DOMContentLoaded', init);
