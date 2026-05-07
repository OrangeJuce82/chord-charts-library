# 🎵 Chord Charts Library

A clean, fast static web app to browse free chord charts scraped from the [iReal Pro community forum](https://forums.irealpro.com/).

**🚀 Live demo →** <https://OrangeJuce82.github.io/chord-charts-library/>

---

## Features

- 🔍 **Live search** — filters update results instantly as you type
- 🏷️ **Tag filters** with autocomplete for Composer, Groove and Style
- 📊 **Sortable table** — click any column header
- 🎲 **Random chart** button — opens a random chart directly in iReal Pro
- 🎨 **Clickable tags** in the table — click to add to active filters
- 🎼 **MusicXML export** — convert any chart to MusicXML on the fly and download it
- 📱 Responsive layout

---

## Tech stack

| Layer | Technology |
|---|---|
| UI | Vanilla JS (ES Modules) · HTML5 · CSS3 |
| Data | [Supabase](https://supabase.com/) (PostgREST API) |
| Fonts | DM Sans · DM Mono (Google Fonts) |
| Icons | Font Awesome 6 |
| MusicXML | [ireal-musicxml](https://github.com/infojunkie/ireal-musicxml) (loaded on demand via esm.sh) |
| Hosting | GitHub Pages |

No build step. No framework. No dependencies to install.

---

## Getting started

### 1. Clone the repo

```bash
git clone https://github.com/OrangeJuce82/chord-charts-library.git
cd chord-charts-library
```

### 2. Configure Supabase

Edit **`js/config.js`** and fill in your project credentials:

```js
export const SUPABASE_URL      = 'https://YOUR_PROJECT_REF.supabase.co';
export const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';
```

> ⚠️ These are your **anon (public)** keys — they are safe to expose in a static site.
> Make sure your Supabase table has **Row Level Security** enabled with a policy allowing anonymous `SELECT`.

### 3. Supabase table schema

The app expects a table named `ireal_pro_charts` with the following columns:

| Column | Type | Description |
|---|---|---|
| `id` | int8 / uuid | Primary key |
| `url` | text | iReal Pro deep link (`irealb://` or `irealbook://`) |
| `title` | text | Chart title |
| `composer` | text | Composer name |
| `style` | text | Musical style |
| `key` | text | Musical key |
| `transpose` | int4 | Semitones to transpose |
| `groove` | text | Groove type |
| `bpm` | int4 | Beats per minute |
| `repeats` | int4 | Number of repeats |

### 4. Run locally

Because the app uses ES Modules, you need a local HTTP server (not `file://`):

```bash
# Python 3
python -m http.server 8080

# Node (npx)
npx serve .
```

Then open `http://localhost:8080`.

### 5. Deploy to GitHub Pages

Push to your repo and enable **GitHub Pages** from `Settings → Pages → Source: main branch / root`.

The site requires no build step — it deploys as-is.

---

## MusicXML export

Each row in the table has an **XML** button in the rightmost column. Clicking it:

1. Lazy-loads the [`ireal-musicxml`](https://github.com/infojunkie/ireal-musicxml) library from `esm.sh` (only on first use)
2. Parses the chart's `irealb://` URL client-side — no server involved
3. Generates a MusicXML lead sheet and triggers a browser download of the `.xml` file

The resulting file can be opened in any MusicXML-compatible application: MuseScore, Sibelius, Finale, OpenSheetMusicDisplay, etc.

> **Note:** conversion quality depends on how well the source chart is encoded. Complex or non-standard charts may produce imperfect results.

---

## Project structure

```
chord-charts-library/
├── index.html          # Main page
├── view.html           # Chart detail page (stub for future use)
├── css/
│   └── style.css       # All styles (CSS custom properties + dark theme)
└── js/
    ├── config.js       # ← Edit this with your Supabase keys
    ├── api.js          # Supabase REST API calls
    ├── filters.js      # TagInput component + debounce utility
    ├── table.js        # Table & pagination rendering + MusicXML conversion
    └── app.js          # Main orchestrator
```

---

## License

[MIT](LICENSE) — do whatever you want, attribution appreciated.

Charts belong to their respective authors on the iReal Pro forum.
