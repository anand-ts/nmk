# Nyamsuren Erdenebayar

A lightweight photography and writing portfolio with three main navigation items: Home, Writings, and Contact. Project galleries and essay reading pages open within those sections. The Contact page body is intentionally blank.

The homepage pairs project information with large preview photographs. On desktop, the left column sticks within its project section and releases at the section's end. Mobile uses a single column. Clicking a project title, project-list entry, preview photograph, or “View all photographs” link opens that project's grid gallery. Every grid photograph opens in a keyboard-accessible viewer.

## Run locally

Requires Node.js 22 or newer. No dependency installation is needed.

```sh
npm run dev
```

Open `http://127.0.0.1:4173`. To choose a different port after building:

```sh
node scripts/serve.mjs --port 8080
```

After editing content or source files, rebuild and refresh the browser:

```sh
npm run build
npm run check
```

The build produces `dist/`, which can be served by any static host. Routes use relative URLs and work beneath a subdirectory as well as a domain root. The Sites identity is kept in `.openai/hosting.json`; creation alone does not mean it is deployed.

For Vercel, import the repository with its root directory unchanged. `vercel.json` supplies the static build command and `dist` output directory. Directory pages are redirected to URLs ending in `/`, matching the local preview and keeping relative essay links correct when visitors open slashless URLs directly.

## Edit content

- `content/portfolio.json`: name, optional bio, project order, descriptions, image order/alt text/captions, video entries, and writings.
- `content/assets.json`: dimensions and paths for the checked-in image variants.
- `content/media-sources.json`: source-file inventory used to check that all supplied photographs are included.
- `content/writings/`: full essays, formatting, captions, references, and their image variants.
- `src/styles.css`: typography, layout, mobile behavior, and viewer styles.
- `src/article.css`: essay reading layout.
- `src/project.css` and `scripts/render-project.mjs`: project grid pages and their responsive layout.
- `src/theme.css`, `src/theme-init.js`, and `src/theme.js`: light/dark palette, first-paint preference, and appearance toggle.
- `src/gallery.js`: photograph viewer.
- `scripts/build.mjs`: static page templates.

The galleries include all 56 supplied photographs: 35 from Darkhad Migration, 11 from Homeland, and 10 from Earthlings. The first two photographs introduce each series on Home. Its dedicated grid at `projects/<project-id>/` displays the entire series, with three columns on desktop and two on smaller screens. Thumbnails preserve the complete photograph, and the viewer provides a larger image. Earthlings follows the supplied numbered sequence after its cover photograph. The other galleries retain their introductory images and append the remaining files in filename order.

Originals remain in Drive; the repository contains WebP derivatives in two gallery widths and small 320px variants for writing thumbnails. The Fuji RAW photograph is represented by a web derivative of its embedded 4416 × 2944 camera JPEG preview. No Drive connection is required by the finished website.

To create image variants from local originals, name each JPEG after its asset key in the content file, then run the optional Pillow-based helper:

```sh
python3 scripts/optimize-images.py /path/to/originals
npm run build
```

Image processing is optional for normal builds; all current optimized files are checked in. The helper applies EXIF orientation, removes embedded metadata from the derivatives, and reuses unchanged variants. Use `--available-only` during a partial import or `--force` to regenerate existing variants. Export camera RAW files to JPEG before passing them to the helper.

## Add films

Place files in `public/films/` and add entries to the top-level `films` array, or to a project's `videos` array when a film belongs to that series:

```json
{
  "title": "Film title",
  "src": "films/film.mp4",
  "type": "video/mp4",
  "poster": "images/poster.webp",
  "captions": "films/film.en.vtt"
}
```

The English-version film is included on Home with a poster and native controls. It is encoded at 1280 × 720, with WebM/VP9/Opus first (34.9 MB) and MP4/H.264/AAC as a fallback (47.9 MB). Both preserve the complete 5:10 running time and the source's burned-in English subtitles. The 407.5 MB original is kept outside the repository.

Players do not autoplay and use `preload="none"`. The local preview server supports byte-range requests for playback and seeking. Additional closed captions can be supplied as WebVTT files.

## Writings

*The Land Remembers* has a native reading page at `writings/the-land-remembers/`, imported from the latest supplied Google Doc with photographs from `Writing Photos / The Land Remembers`. Its eleven numbered photographs follow the manuscript's placement markers; the 4 + 5, 6 + 7, and 8 + 11 pairs remain side by side. Each photograph opens in the shared viewer. Captions, italics, links, references, and paragraph order are preserved, while placement instructions are omitted from the published text.

A link to the New Nomad Institute publication is retained at the bottom. The article, source-file mapping, and image metadata are in `content/writings/the-land-remembers.json`.

*Moving with the Wild* is shown as a title with “Text to come” until its text is supplied. No biography or project descriptions have been invented; these fields are ready to fill in.

## Appearance

The header button switches between light and dark mode. The initial appearance follows the system; an explicit choice is saved in browser local storage under `portfolio-theme` and shared across all pages. If storage is unavailable, the toggle still works for the current page. Photos retain their original colors.

## Validation

`npm run check` checks the generated routes and internal links, all local image references and dimensions, alt text, page headings, blank Contact, and JavaScript syntax. It also checks the gallery contents against the source-file inventory so a supplied photograph cannot be accidentally omitted or duplicated. Visual and interaction checks should also be made in a browser before public launch.
