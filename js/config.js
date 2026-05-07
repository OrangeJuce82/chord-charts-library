/**
 * @file config.js
 * @description Application configuration constants.
 *
 * ⚠️  Replace SUPABASE_URL and SUPABASE_ANON_KEY with your own values.
 *     These are PUBLIC (anon) keys — safe to expose in a static site,
 *     as long as your Supabase Row Level Security (RLS) policies are set
 *     to allow anonymous SELECT on the table.
 */

export const SUPABASE_URL     = 'https://mgwxjpryqhpnckruerij.supabase.co';
export const SUPABASE_ANON_KEY = 'sb_publishable_EsbQ_e1BbeQOS3TCcH8hpg_2FbC3DnB';

/** Table name in Supabase */
export const TABLE_NAME = 'ireal_pro_charts';

/** Number of rows per page */
export const PAGE_SIZE = 50;

/** Debounce delay (ms) for text-input triggered searches */
export const DEBOUNCE_MS = 300;

/** Number of autocomplete suggestions to fetch */
export const AUTOCOMPLETE_LIMIT = 10;
