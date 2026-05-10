/**
 * Fallback top style/groove counts computed from
 * data/irealb_songs_with_metadata_20260503.csv.
 * Runtime data is fetched from Supabase with aggregated count queries.
 */

export const TOP_STYLE_STATS = [
  { label: 'Medium Swing', count: 19303 },
  { label: 'Ballad', count: 4963 },
  { label: 'Pop', count: 3325 },
  { label: 'Rock', count: 2849 },
  { label: 'Bossa Nova', count: 2074 },
  { label: 'Medium Up Swing', count: 1894 },
  { label: 'Samba', count: 1662 },
  { label: 'Up Tempo Swing', count: 1573 },
  { label: 'Ballad Even', count: 1376 },
  { label: 'Rock Pop', count: 1228 },
];

export const TOP_GROOVE_STATS = [
  { label: 'Jazz-Medium Swing', count: 10022 },
  { label: 'Pop-Rock', count: 5248 },
  { label: 'Jazz-Ballad Swing', count: 2452 },
  { label: 'Latin-Brazil: Samba', count: 1617 },
  { label: 'Jazz-Ballad Even', count: 1363 },
  { label: 'Pop-Slow Rock', count: 1259 },
  { label: 'Pop-Country', count: 1247 },
  { label: 'Jazz-Bossa Nova', count: 1179 },
  { label: 'Jazz-Medium Up Swing', count: 1153 },
  { label: 'Pop-Bluegrass', count: 1040 },
];
