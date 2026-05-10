<p align="center">
  <img src="img/icons/icon-192.png" width="120" height="120" alt="Chord Charts Library icon">
</p>

# Chord Charts Library

A static web app to search, filter, preview, and open chord charts sourced from the [iReal Pro community forum](https://forums.irealpro.com/).

**Live demo:** <https://OrangeJuce82.github.io/chord-charts-library/>

---

## Features

- Instant title search with debounced network requests.
- Tag filters for `composer`, `groove`, and `style`, with autocomplete.
- Shareable filter URLs: search text, tags, sort order, and current page are preserved in the URL.
- Paginated table sortable by title, composer, groove, style, key, and BPM.
- Clickable tags in the result table for quick filtering.
- Random chart button that opens a random chart in the built-in viewer.
- Clickable "Top styles" and "Top grooves" stats, with local caching.
- Direct opening in iReal Pro through `irealb://` and `irealbook://` links.
- MusicXML export from every table row.
- Detailed chart viewer with visual rendering, transposition, adjustable chart size, minor chord notation modes, B/H notation, sign/comment highlighting, iReal URL copy, print support, and decoded iReal data display.
- Installable PWA with manifest, icons, and a service worker caching the app shell, fonts, assets, and selected API responses.
- Responsive interface with no frontend framework and no build step.
- Python tools to scrape iReal links from the forum and convert iReal URLs into CSV data.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | HTML5, CSS3, vanilla JavaScript ES modules |
| Data | [Supabase](https://supabase.com/) through the PostgREST API, without the Supabase SDK |
| iReal rendering | [`ireal-renderer`](https://github.com/daumling/ireal-renderer), vendored in `js/vendor/ireal-renderer/` |
| MusicXML export | [`ireal-musicxml`](https://github.com/infojunkie/ireal-musicxml), lazy-loaded through `esm.sh` |
| PWA | Web App Manifest, Service Worker, Cache API |
| UI | Font Awesome 6, DM Sans, DM Mono |
| Chart rendering fonts | Helvetica, Myriad Pro, Bravura |
| Scraping | [Scrapy](https://scrapy.org/) |
| CLI | [Typer](https://typer.tiangolo.com/) and Rich |
| Python quality | Ruff, configured in `pyproject.toml` |
| Hosting | GitHub Pages |

The web app has no build step and no frontend framework dependency.

---

## Libraries and References

- [iReal Pro Community Forum](https://forums.irealpro.com/): source of the chart links.
- [`ireal-renderer`](https://github.com/daumling/ireal-renderer): used for browser-side iReal URL reading and chart rendering.
- [`ireal-musicxml`](https://github.com/infojunkie/ireal-musicxml): used for client-side iReal to MusicXML conversion.
- [`ireal-reader`](https://github.com/pianosnake/ireal-reader): reference for reading the iReal format.
- [`accompaniser`](https://github.com/ironss/accompaniser): reference for `irealb://` unscrambling details.
- Supabase/PostgREST: static-app friendly storage, filtering, sorting, pagination, and aggregation.
- Scrapy: forum crawling and `irealb://` link extraction.
- Typer/Rich: local CLI for turning iReal URL lists into CSV files with a terminal preview.

---

## Getting Started

### 1. Clone the repo

```bash
git clone https://github.com/OrangeJuce82/chord-charts-library.git
cd chord-charts-library
```

### 2. Configure Supabase

Edit `js/config.js`:

```js
export const SUPABASE_URL = 'https://YOUR_PROJECT_REF.supabase.co';
export const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';
export const TABLE_NAME = 'ireal_pro_charts';
```

These are public `anon`/publishable keys. They are safe to expose in a static app as long as the Supabase table uses Row Level Security with a policy that only allows anonymous `SELECT`.

### 3. Expected Table Schema

The default table name is `ireal_pro_charts`.

| Column | Suggested type | Description |
|---|---|---|
| `id` | uuid | Unique chart identifier |
| `url` | text | iReal link, `irealb://` or `irealbook://` |
| `title` | text | Chart title |
| `composer` | text | Composer |
| `style` | text | Style |
| `key` | text | Key |
| `transpose` | int4 | Default transposition |
| `groove` | text | Groove |
| `bpm` | int4 | Tempo |
| `repeats` | int4 | Repeat count |

### 4. Run Locally

ES modules must be served over HTTP, not opened with `file://`.

```bash
# Python 3
python -m http.server 8080

# Node (npx)
npx serve .
```

Then open <http://localhost:8080>.

---

## Chart Viewer

The eye button opens `view.html?id=...`.

The viewer supports:

- visual chart rendering with `ireal-renderer`;
- transposition from -12 to +12 semitones;
- adjustable chart size;
- minor chord notation modes;
- B/H notation;
- sign and comment highlighting;
- decoded iReal data display;
- source URL copy;
- print support;
- back navigation to the library while preserving browser history.

---

## Project Structure

```text
chord-charts-library/
├── index.html                  # Library, search, filters, stats, table
├── view.html                   # Detailed chart viewer
├── manifest.webmanifest        # PWA configuration
├── sw.js                       # Service worker and cache strategy
├── css/
│   ├── style.css               # Global styles
│   ├── view.css                # Viewer styles
│   ├── fonts/                  # Fonts used by the chart renderer
│   └── img/                    # SVG assets used by the iReal renderer
├── js/
│   ├── api.js                  # Supabase/PostgREST calls
│   ├── app.js                  # State, filters, sorting, pagination, stats
│   ├── config.js               # Supabase configuration
│   ├── filters.js              # TagInput and debounce helper
│   ├── ireal-chart.js          # Helpers around iReal parsing/rendering
│   ├── pwa.js                  # Service worker registration
│   ├── stats.js                # Stats fallback data
│   ├── table.js                # Table rendering and MusicXML export
│   ├── viewer.js               # Viewer controller
│   └── vendor/ireal-renderer/  # Vendored iReal libraries
├── scraper/                    # Scrapy spider
├── cli/                        # iReal parser and CSV export CLI
└── data/                       # Local data exports
```

---

## Deployment

Push the repository to GitHub, then enable GitHub Pages:

`Settings -> Pages -> Source: main branch / root`

The site is deployed as-is, with no compilation step.

---

## License

[MIT](LICENSE)

Charts belong to their respective authors on the iReal Pro forum.
