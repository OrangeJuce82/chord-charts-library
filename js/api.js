/**
 * @file api.js
 * @description Local data access layer backed by the static CSV export.
 */

import { DATA_URL, PAGE_SIZE } from './config.js';

const DATA_PROMISE_KEY = '__chordChartsDataPromise__';

const normalize = (value) => String(value ?? '').trim();
const normalizeLower = (value) => normalize(value).toLowerCase();

const csvUrl = () => new URL(DATA_URL, window.location.href).toString();

const parseCsvLine = (line) => {
  const values = [];
  let value = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const next = line[i + 1];

    if (inQuotes) {
      if (char === '"') {
        if (next === '"') {
          value += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        value += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
      continue;
    }

    if (char === ',') {
      values.push(value);
      value = '';
      continue;
    }

    value += char;
  }

  values.push(value);
  return values;
};

const loadData = async () => {
  if (!window[DATA_PROMISE_KEY]) {
    window[DATA_PROMISE_KEY] = (async () => {
      const response = await fetch(csvUrl(), { cache: 'force-cache' });
      if (!response.ok) {
        throw new Error(`CSV load failed: ${response.status}`);
      }

      const text = await response.text();
      const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/).filter(Boolean);
      if (!lines.length) return { rows: [], counts: new Map(), distinct: {} };

      const headers = parseCsvLine(lines[0]);
      const rows = [];
      const counts = new Map();
      const distinct = {
        composer: new Set(),
        groove: new Set(),
        style: new Set(),
      };

      for (let i = 1; i < lines.length; i += 1) {
        const raw = parseCsvLine(lines[i]);
        if (!raw.length) continue;

        const row = {};
        headers.forEach((header, index) => {
          row[header] = raw[index] ?? '';
        });
        row._search = {
          title: normalizeLower(row.title),
          composer: normalizeLower(row.composer),
          groove: normalizeLower(row.groove),
          style: normalizeLower(row.style),
        };

        rows.push(row);
        counts.set('total', (counts.get('total') ?? 0) + 1);

        ['composer', 'groove', 'style'].forEach((column) => {
          const value = normalize(row[column]);
          if (value) distinct[column].add(value);
        });
      }

      return { rows, counts, distinct };
    })();
  }

  return window[DATA_PROMISE_KEY];
};

const matchesWords = (haystack, query) => {
  const words = normalize(query).toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return true;
  return words.every((word) => haystack.includes(word));
};

const getComparable = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : normalizeLower(value);
};

const compareRows = (a, b, sortCol, sortDir) => {
  const av = getComparable(a[sortCol]);
  const bv = getComparable(b[sortCol]);

  let result = 0;
  if (typeof av === 'number' && typeof bv === 'number') {
    result = av - bv;
  } else {
    result = String(av).localeCompare(String(bv), undefined, { sensitivity: 'base' });
  }

  if (result === 0) {
    result = normalizeLower(a.title).localeCompare(normalizeLower(b.title));
  }

  return sortDir === 'desc' ? -result : result;
};

const applyExactFilter = (values) => new Set(values.map(normalize).filter(Boolean));

const filterRows = (rows, params = {}) => {
  const {
    title = '',
    composers = [],
    grooves = [],
    styles = [],
    composerText = '',
  } = params;

  const composerSet = applyExactFilter(composers);
  const grooveSet = applyExactFilter(grooves);
  const styleSet = applyExactFilter(styles);

  return rows.filter((row) => {
    if (title && !matchesWords(row._search.title, title)) return false;
    if (composerSet.size) {
      const composer = row._search.composer;
      const matchesComposer = [...composerSet].every((needle) => composer.includes(normalizeLower(needle)));
      if (!matchesComposer) return false;
    }
    if (grooveSet.size && !grooveSet.has(normalize(row.groove))) return false;
    if (styleSet.size && !styleSet.has(normalize(row.style))) return false;
    if (composerText && !matchesWords(row._search.composer, composerText)) return false;
    return true;
  });
};

export const fetchTotalCount = async () => {
  const { rows } = await loadData();
  return rows.length;
};

export const fetchTopCategoricalStats = async ({ limit = 10 } = {}) => {
  const { rows } = await loadData();
  const makeCounts = (column) => {
    const counts = new Map();
    rows.forEach((row) => {
      const label = normalize(row[column]);
      if (!label) return;
      counts.set(label, (counts.get(label) ?? 0) + 1);
    });
    return [...counts.entries()]
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
      .slice(0, limit);
  };

  return {
    styles: makeCounts('style'),
    grooves: makeCounts('groove'),
  };
};

export const fetchCharts = async ({
  title = '',
  composers = [],
  grooves = [],
  styles = [],
  composerText = '',
  sortCol = 'title',
  sortDir = 'asc',
  page = 0,
  pageSize = PAGE_SIZE,
} = {}) => {
  const { rows } = await loadData();
  const filtered = filterRows(rows, { title, composers, grooves, styles, composerText });
  const sorted = filtered.slice().sort((a, b) => compareRows(a, b, sortCol, sortDir));
  const from = page * pageSize;
  const data = sorted.slice(from, from + pageSize).map(({ _search, ...row }) => row);
  return { data, total: filtered.length };
};

export const fetchSuggestions = async (column, query, limit = 10) => {
  if (!query.trim()) return [];
  if (!['composer', 'groove', 'style'].includes(column)) {
    throw new Error(`Unsupported suggestion column: ${column}`);
  }

  const { rows } = await loadData();
  const q = normalizeLower(query);
  const words = q.split(/\s+/).filter(Boolean);
  const seen = new Set();
  const distinct = [];

  rows.forEach((row) => {
    const value = normalize(row[column]);
    if (!value || seen.has(value)) return;
    const haystack = row._search[column];
    if (!words.every((word) => haystack.includes(word))) return;
    seen.add(value);
    distinct.push(value);
  });

  const rank = (s) => {
    const sl = s.toLowerCase();
    if (sl.startsWith(q)) return 0;
    if (sl.split(/[\s,/()+-]+/).some((word) => word.startsWith(q))) return 1;
    return 2;
  };

  distinct.sort((a, b) => {
    const diff = rank(a) - rank(b);
    return diff !== 0 ? diff : a.toLowerCase().localeCompare(b.toLowerCase());
  });

  return distinct.slice(0, limit);
};

export const fetchRandomChart = async () => {
  const { rows } = await loadData();
  if (!rows.length) throw new Error('No charts available.');
  const chart = rows[Math.floor(Math.random() * rows.length)];
  return { ...chart };
};

export const fetchChartById = async (id) => {
  const { rows } = await loadData();
  const chart = rows.find((row) => row.id === id);
  return chart ? { ...chart } : null;
};
