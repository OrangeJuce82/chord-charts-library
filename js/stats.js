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
  { label: 'Waltz', count: 1211 },
  { label: 'Bluegrass', count: 1199 },
  { label: 'Latin', count: 1125 },
  { label: 'Worship', count: 1041 },
  { label: 'Pop - Bluegrass', count: 1015 },
  { label: 'Pop Ballad', count: 964 },
  { label: 'Slow Swing', count: 829 },
  { label: 'Pop Rock', count: 729 },
  { label: 'Even 8ths', count: 621 },
  { label: 'Funk', count: 592 },
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
  { label: 'Jazz-Gypsy Jazz', count: 926 },
  { label: 'Jazz-Up Tempo Swing', count: 748 },
  { label: 'Pop-Soul', count: 700 },
  { label: 'Latin-Brazil: Bossa Electric', count: 584 },
  { label: 'Jazz-Latin', count: 561 },
  { label: 'Jazz-Swing Two/Four', count: 532 },
  { label: 'Pop-Smooth', count: 514 },
  { label: 'Pop-Rock 12/8', count: 506 },
  { label: 'Jazz-Even 8ths', count: 506 },
  { label: 'Latin-Cuba: Bolero', count: 499 },
];
