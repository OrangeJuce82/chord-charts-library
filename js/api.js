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
 * Fetch a paginated, filtered, sorted list of charts.
 * Composer/groove/style now support partial (ilike) matching when a raw text
 * search string is provided via composerText / grooveText / styleText,
 * in addition to the exact-match tag arrays.
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

  // Title filter (case-insensitive partial match)
  if (title.trim()) {
    url.searchParams.set('title', `ilike.*${title.trim()}*`);
  }

  // Build OR clauses
  // For composer: combine exact tags + optional ilike on each word of composerText
  const composerClauses = [];

  // Exact-match tags selected via autocomplete
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

  // Groove / style exact tags
  const buildOrFilter = (col, values) => {
    if (!values.length) return;
    const clause = values.map((v) => `${col}.ilike.*${v}*`).join(',');
    url.searchParams.append('or', `(${clause})`);
  };

  buildOrFilter('groove', grooves);
  buildOrFilter('style',  styles);

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
 * @param {string} column - 'composer' | 'groove' | 'style'
 * @param {string} query  - Partial text entered by the user
 * @param {number} limit  - Max results to return
 * @returns {Promise<string[]>} - Distinct values matching the query
 */
export const fetchSuggestions = async (column, query, limit = 10) => {
  if (!query.trim()) return [];

  const words = query.trim().split(/\s+/).filter(Boolean);
  const url = new URL(tableUrl());
  url.searchParams.set('select', column);

  // Apply ilike filter per word (PostgREST AND-s multiple filters on same column)
  words.forEach(word => {
    url.searchParams.append(column, `ilike.*${word}*`);
  });

  url.searchParams.set('order', `${column}.asc`);
  url.searchParams.set('limit', String(limit * 3)); // fetch more to dedupe

  const data = await apiFetch(url.toString());

  // Extract distinct values
  const seen   = new Set();
  const result = [];
  for (const row of data) {
    const val = row[column];
    if (val && !seen.has(val)) {
      seen.add(val);
      result.push(val);
      if (result.length >= limit) break;
    }
  }
  return result;
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
