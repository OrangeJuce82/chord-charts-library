/**
 * @file config.js
 * @description Application configuration constants.
 */

/** Static CSV file that contains the lightweight library index. */
export const INDEX_URL = './data/irealb_index_20260503.csv';

/** Directory containing chart ID → URL shards. */
export const URL_MAP_DIR = './data/url_map_shards';

/** Number of rows per page */
export const PAGE_SIZE = 50;

/** Debounce delay (ms) for text-input triggered searches */
export const DEBOUNCE_MS = 300;

/** Number of autocomplete suggestions to fetch */
export const AUTOCOMPLETE_LIMIT = 10;
