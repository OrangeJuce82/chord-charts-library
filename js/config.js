/**
 * @file config.js
 * @description Application configuration constants.
 */

/** Static CSV file that contains the whole library. */
export const DATA_URL = './data/irealb_songs_with_metadata_20260503.csv';

/** Number of rows per page */
export const PAGE_SIZE = 50;

/** Debounce delay (ms) for text-input triggered searches */
export const DEBOUNCE_MS = 300;

/** Number of autocomplete suggestions to fetch */
export const AUTOCOMPLETE_LIMIT = 10;
