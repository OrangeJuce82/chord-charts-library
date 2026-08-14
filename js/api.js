/**
 * @file api.js
 * @description Local database access layer backed by IndexedDB.
 */

import { DATA_URL, PAGE_SIZE } from './config.js?v=20260814.2';

const DB_NAME = 'chord-charts-library';
const DB_VERSION = 4;
const STORE_NAME = 'charts';

const DATA_PROMISE_KEY = '__chordChartsDataPromise__';

const normalize = (value) => String(value ?? '').trim();
const normalizeLower = (value) => normalize(value).toLowerCase();

const csvUrl = () => new URL(DATA_URL, window.location.href).toString();

const parseCsvText = (text) => {
  const rows = [];
  let row = [];
  let value = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];

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
      row.push(value);
      value = '';
      continue;
    }

    if (char === '\n') {
      row.push(value);
      rows.push(row);
      row = [];
      value = '';
      continue;
    }

    if (char === '\r') {
      continue;
    }

    value += char;
  }

  if (value.length || row.length) {
    row.push(value);
    rows.push(row);
  }

  return rows;
};

const openDb = () => new Promise((resolve, reject) => {
  const request = indexedDB.open(DB_NAME, DB_VERSION);

  request.onupgradeneeded = () => {
    const db = request.result;
    if (db.objectStoreNames.contains(STORE_NAME)) {
      db.deleteObjectStore(STORE_NAME);
    }
    const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
    store.createIndex('title', 'title', { unique: false });
    store.createIndex('composer', 'composer', { unique: false });
    store.createIndex('style', 'style', { unique: false });
    store.createIndex('groove', 'groove', { unique: false });
    store.createIndex('key', 'key', { unique: false });
    store.createIndex('bpm', 'bpm', { unique: false });
  };

  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error);
});

const idbRequest = (request) => new Promise((resolve, reject) => {
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error);
});

const getAllRowsFromDb = async (db) => {
  const tx = db.transaction(STORE_NAME, 'readonly');
  const store = tx.objectStore(STORE_NAME);
  const rows = await idbRequest(store.getAll());
  return rows.map((row) => ({
    ...row,
    _search: {
      title: normalizeLower(row.title),
      composer: normalizeLower(row.composer),
      groove: normalizeLower(row.groove),
      style: normalizeLower(row.style),
    },
  }));
};

const importCsvToDb = async (db) => {
  const response = await fetch(csvUrl(), { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`CSV load failed: ${response.status}`);
  }

  const text = await response.text();
  const records = parseCsvText(text.replace(/^\uFEFF/, ''));
  if (!records.length) return [];

  const headers = records[0];
  const rows = [];

  for (let i = 1; i < records.length; i += 1) {
    const raw = records[i];
    if (!raw.length) continue;

    const row = {};
    headers.forEach((header, index) => {
      row[header] = raw[index] ?? '';
    });

    rows.push(row);
  }

  const tx = db.transaction(STORE_NAME, 'readwrite');
  const store = tx.objectStore(STORE_NAME);
  for (const row of rows) {
    store.put(row);
  }
  await new Promise((resolve, reject) => {
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });

  return rows.map((row) => ({
    ...row,
    _search: {
      title: normalizeLower(row.title),
      composer: normalizeLower(row.composer),
      groove: normalizeLower(row.groove),
      style: normalizeLower(row.style),
    },
  }));
};

const loadData = async () => {
  if (!window[DATA_PROMISE_KEY]) {
    window[DATA_PROMISE_KEY] = (async () => {
      const db = await openDb();
      try {
        const existing = await getAllRowsFromDb(db);
        if (existing.length) return { rows: existing };

        const imported = await importCsvToDb(db);
        return { rows: imported };
      } finally {
        db.close();
      }
    })().catch((error) => {
      window[DATA_PROMISE_KEY] = null;
      throw error;
    });
  }

  return window[DATA_PROMISE_KEY];
};

const matchesWords = (haystack, query) => {
  const words = normalize(query).toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return true;
  return words.every((word) => haystack.includes(word));
};

const compareRows = (a, b, sortCol, sortDir) => {
  const av = a[sortCol];
  const bv = b[sortCol];

  let result = 0;
  const an = Number(av);
  const bn = Number(bv);
  if (Number.isFinite(an) && Number.isFinite(bn)) {
    result = an - bn;
  } else {
    result = normalizeLower(av).localeCompare(normalizeLower(bv), undefined, { sensitivity: 'base' });
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
  const data = sorted.slice(from, from + pageSize);
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
