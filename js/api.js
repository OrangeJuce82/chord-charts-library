/**
 * @file api.js
 * @description Thin wrapper around the Supabase REST API (no SDK required).
 * All network requests are made via fetch() against the PostgREST endpoint.
 */

import { SUPABASE_URL, SUPABASE_ANON_KEY, TABLE_NAME } from './config.js';

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Build the base URL for the given table.
 * @returns {string}
 */
const tableUrl = () => `${SUPABASE_URL}/rest/v1/${TABLE_NAME}`;

/**
 * Common headers for every Supabase request.
 * @returns {HeadersInit}
 */
const headers = () => ({
  apikey: SUPABASE_ANON_KEY,
  Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
  'Content-Type': 'application/json',
});

/**
 * Execute a fetch and throw a descriptive error on failure.
 * @param {string} url
 * @param {RequestInit} [options]
 * @returns {Promise<any>}
 */
const apiFetch = async (url, options = {}) => {
  const response = await fetch(url, { ...options, headers: { ...headers(), ...(options.headers ?? {}) } });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Supabase error ${response.status}: ${body}`);
  }

  // Some responses are empty (e.g. HEAD)
  const text = await response.text();
  return text ? JSON.parse(text) : null;
};

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Fetch the total number of charts in the table.
 * Uses a HEAD request with `Prefer: count=exact`.
 * @returns {Promise<number>}
 */
export const fetchTotalCount = async () => {
  const url = `${tableUrl()}?select=id`;
  const response = await fetch(url, {
    method: 'HEAD',
    headers: {
      ...headers(),
      Prefer: 'count=exact',
    },
  });

  if (!response.ok) throw new Error(`Count query failed: ${response.status}`);

  const range = response.headers.get('content-range'); // "0-0/12345"
  if (!range) return 0;
  const total = parseInt(range.split('/')[1], 10);
  return isNaN(total) ? 0 : total;
};

/**
 * Fetch the most frequent non-empty values for a categorical column.
 * Uses PostgREST aggregation so the browser receives only the top rows,
 * not the full songs table.
 * @param {'style'|'groove'} column
 * @param {number} [limit]
 * @returns {Promise<{ label: string, count: number }[]>}
 */
export const fetchTopColumnStats = async (column, limit = 10) => {
  if (!['style', 'groove'].includes(column)) {
    throw new Error(`Unsupported stats column: ${column}`);
  }

  const url = new URL(tableUrl());
  url.searchParams.set('select', `${column},count()`);
  url.searchParams.set(column, 'not.is.null');
  url.searchParams.append(column, 'neq.');
  url.searchParams.set('order', 'count.desc');
  url.searchParams.set('limit', String(limit));

  const data = await apiFetch(url.toString());
  return data
    .map(row => ({
      label: String(row[column] ?? '').trim(),
      count: Number(row.count ?? 0),
    }))
    .filter(item => item.label && Number.isFinite(item.count) && item.count > 0);
};

const topFromCounts = (counts, limit) =>
  [...counts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
    .slice(0, limit);

/**
 * Fetch top style and groove stats dynamically.
 * First tries server-side aggregation. If Supabase/PostgREST aggregation is
 * disabled, falls back to paginated reads of only the needed columns.
 * @param {object} [params]
 * @param {number} [params.limit]
 * @param {number} [params.total]
 * @param {number} [params.pageSize]
 * @returns {Promise<{ styles: { label: string, count: number }[], grooves: { label: string, count: number }[] }>}
 */
export const fetchTopCategoricalStats = async ({ limit = 10, total = null, pageSize = 1000 } = {}) => {
  try {
    const [styles, grooves] = await Promise.all([
      fetchTopColumnStats('style', limit),
      fetchTopColumnStats('groove', limit),
    ]);
    return { styles, grooves };
  } catch (err) {
    console.info('[api] aggregate stats unavailable, scanning style/groove columns', err.message || err);
  }

  const rowCount = Number.isFinite(total) && total > 0 ? total : await fetchTotalCount();
  const styleCounts = new Map();
  const grooveCounts = new Map();

  const countValue = (counts, value) => {
    const label = String(value ?? '').trim();
    if (!label) return;
    counts.set(label, (counts.get(label) ?? 0) + 1);
  };

  const fetchRange = async (from) => {
    const to = Math.min(from + pageSize - 1, rowCount - 1);
    const url = new URL(tableUrl());
    url.searchParams.set('select', 'style,groove');

    const response = await fetch(url.toString(), {
      headers: {
        ...headers(),
        Range: `${from}-${to}`,
        'Range-Unit': 'items',
      },
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`fetchTopCategoricalStats range ${from}-${to} failed ${response.status}: ${body}`);
    }

    return response.json();
  };

  const ranges = [];
  for (let from = 0; from < rowCount; from += pageSize) ranges.push(from);

  const concurrency = 4;
  for (let i = 0; i < ranges.length; i += concurrency) {
    const batch = await Promise.all(ranges.slice(i, i + concurrency).map(fetchRange));
    batch.flat().forEach((row) => {
      countValue(styleCounts, row.style);
      countValue(grooveCounts, row.groove);
    });
  }

  return {
    styles: topFromCounts(styleCounts, limit),
    grooves: topFromCounts(grooveCounts, limit),
  };
};

/**
 * Fetch a paginated, filtered, sorted list of charts.
 * Composer free text supports partial matching via composerText.
 * Confirmed composer/groove/style tags are exact-match filters.
 * @param {object} params
 * @param {string}   [params.title]      - Partial title search (ilike)
 * @param {string[]} [params.composers]  - Exact composer matches (OR)
 * @param {string[]} [params.grooves]    - Exact groove matches (OR)
 * @param {string[]} [params.styles]     - Exact style matches (OR)
 * @param {string}   [params.sortCol]    - Column to sort by
 * @param {'asc'|'desc'} [params.sortDir]
 * @param {number}   [params.page]       - 0-indexed page number
 * @param {number}   [params.pageSize]   - Rows per page
 * @returns {Promise<{ data: object[], total: number }>}
 */
export const fetchCharts = async ({
  title      = '',
  composers  = [],   // exact-match tags (from tag chips)
  grooves    = [],
  styles     = [],
  composerText = '', // free-text partial search (typed but not yet a tag)
  sortCol    = 'title',
  sortDir    = 'asc',
  page       = 0,
  pageSize   = 50,
} = {}) => {
  const url  = new URL(tableUrl());
  const from = page * pageSize;
  const to   = from + pageSize - 1;

  // Columns to select
  url.searchParams.set('select', 'id,title,composer,style,key,groove,bpm,url');

  // Title filter — each word must appear somewhere in the title (AND logic)
  // e.g. "vie rose" → matches "La Vie en Rose" because both "vie" and "rose" are present
  if (title.trim()) {
    const titleWords = title.trim().split(/\s+/).filter(Boolean);
    titleWords.forEach(word => {
      url.searchParams.append('title', `ilike.*${word}*`);
    });
  }

  // Build OR clauses
  // For composer: combine exact tags + optional ilike on each word of composerText
  const composerClauses = [];

  // Confirmed composer tags still use partial matching to preserve the
  // existing composer search behavior for aliases and compound credits.
  composers.forEach(v => composerClauses.push(`composer.ilike.*${v}*`));

  // Free-text: split on spaces, every word must appear (AND across words → separate ilike per word)
  // We handle this by building one ilike per word joined by AND at query level via multiple params
  // Simplest approach: treat full composerText as one ilike pattern
  if (composerText.trim()) {
    const words = composerText.trim().split(/\s+/);
    words.forEach(w => {
      if (w) url.searchParams.append('composer', `ilike.*${w}*`);
    });
  }

  if (composerClauses.length) {
    url.searchParams.append('or', `(${composerClauses.join(',')})`);
  }

  // Groove / style exact tags. This must stay exact so top-stat counts match
  // the result count when users click a style or groove.
  const quoteInValue = (value) => `"${String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;

  const buildExactFilter = (col, values) => {
    if (!values.length) return;
    url.searchParams.set(col, `in.(${values.map(quoteInValue).join(',')})`);
  };

  buildExactFilter('groove', grooves);
  buildExactFilter('style',  styles);

  // Sorting
  url.searchParams.set('order', `${sortCol}.${sortDir}`);

  const response = await fetch(url.toString(), {
    headers: {
      ...headers(),
      Prefer:       'count=exact',
      Range:        `${from}-${to}`,
      'Range-Unit': 'items',
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`fetchCharts error ${response.status}: ${body}`);
  }

  const data  = await response.json();
  const range = response.headers.get('content-range'); // "0-49/1234"
  const total = range ? parseInt(range.split('/')[1], 10) : data.length;

  return { data, total: isNaN(total) ? data.length : total };
};

/**
 * Fetch autocomplete suggestions for a given column.
 * Splits the query on spaces and requires ALL words to match (AND logic).
 * Results are deduplicated and sorted by relevance:
 *   1. Values that start with the query
 *   2. Values where a word starts with the query
 *   3. Values that merely contain the query
 * @param {string} column - 'composer' | 'groove' | 'style'
 * @param {string} query  - Partial text entered by the user
 * @param {number} limit  - Max results to return
 * @returns {Promise<string[]>} - Distinct values matching the query, sorted by relevance
 */
export const fetchSuggestions = async (column, query, limit = 10) => {
  if (!query.trim()) return [];

  const q      = query.trim();
  const words  = q.split(/\s+/).filter(Boolean);
  const url    = new URL(tableUrl());

  url.searchParams.set('select', column);
  // PostgREST ANDs multiple filters on the same column
  words.forEach(word => {
    url.searchParams.append(column, `ilike.*${word}*`);
  });
  url.searchParams.set('order', `${column}.asc`);
  url.searchParams.set('limit', '500'); // large pool for proper dedup + relevance sort

  const data = await apiFetch(url.toString());

  // Deduplicate
  const seen     = new Set();
  const distinct = [];
  for (const row of data) {
    const val = row[column];
    if (val && !seen.has(val)) {
      seen.add(val);
      distinct.push(val);
    }
  }

  // Sort by relevance (case-insensitive)
  const qLower = q.toLowerCase();
  const rank = (s) => {
    const sl = s.toLowerCase();
    if (sl.startsWith(qLower))                                    return 0; // exact prefix
    if (sl.split(/[\s,/()+]+/).some(w => w.startsWith(qLower)))  return 1; // a word starts with query
    return 2;                                                               // contains anywhere
  };
  distinct.sort((a, b) => {
    const diff = rank(a) - rank(b);
    return diff !== 0 ? diff : a.toLowerCase().localeCompare(b.toLowerCase());
  });

  return distinct.slice(0, limit);
};

/**
 * Fetch a single random chart from the table.
 * Uses a random offset within the total count.
 * @returns {Promise<object>}
 */
export const fetchRandomChart = async () => {
  const total = await fetchTotalCount();
  if (total === 0) throw new Error('No charts available.');

  const offset = Math.floor(Math.random() * total);
  const url    = new URL(tableUrl());
  url.searchParams.set('select', '*');
  url.searchParams.set('limit',  '1');
  url.searchParams.set('offset', String(offset));

  const data = await apiFetch(url.toString());
  return data?.[0] ?? null;
};

/**
 * Fetch a single chart by ID.
 */
export const fetchChartById = async (id) => {
  const url = `${tableUrl()}?id=eq.${encodeURIComponent(id)}&select=*&limit=1`;
  const data = await apiFetch(url);
  return data?.[0] ?? null;
};
