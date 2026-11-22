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
- `scripts/writing-preview.mjs` and `src/writing-preview.css`: source-backed writing excerpts and the featured Home preview.
- `src/project.css` and `scripts/render-project.mjs`: project grid pages and their responsive layout.
- `src/theme.css`, `src/theme-init.js`, and `src/theme.js`: light/dark palette, first-paint preference, and appearance toggle.
- `src/motion.js` and `src/motion.css`: subtle page entrances, scroll reveals, gallery stagger, and photograph-viewer fades.
- `src/gallery.js`: photograph viewer.
- `src/film.js`: viewport playback that respects native playback choices.
- `scripts/build.mjs`: static page templates.

The galleries include all 56 supplied photographs: 35 from Darkhad Migration, 11 from Homeland, and 10 from Earthlings. The first two photographs introduce each series on Home. Its dedicated grid at `projects/<project-id>/` displays the entire series, with three columns on desktop and two on smaller screens. Thumbnails preserve the complete photograph, and the viewer provides a larger image. Earthlings follows the supplied numbered sequence after its cover photograph. The other galleries retain their introductory images and append the remaining files in filename order.

Originals remain in Drive; the repository contains WebP derivatives in two gallery widths and small 320px variants for writing thumbnails. The Fuji RAW photograph is represented by a web derivative of its embedded 4416 × 2944 camera JPEG preview. No Drive connection is required by the finished website.

To create image variants from local originals, name each JPEG after its asset key in the content file, then run the optional Pillow-based helper:

```sh
python3 scripts/optimize-images.py /path/to/originals
npm run build
```

Image processing is optional for normal builds. All current optimized files are checked in. The helper applies EXIF orientation and converts embedded color profiles to sRGB before saving derivatives without source metadata. It reuses unchanged variants. Use `--available-only` during a partial import or `--force` to regenerate existing variants. Export camera RAW files to JPEG before passing them to the helper.

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

The Home film starts muted when at least half of the inline player enters view. Inline playback pauses when the player leaves view or the page is hidden. In picture-in-picture, playback follows the floating player's controls. Playback resumes at the existing position when eligible and respects an explicit pause, unmute, or completed film. Native controls stay available, including when a browser blocks autoplay or observation is unavailable. Files use `preload="none"` until needed. The local preview server supports byte-range requests for playback and seeking. Additional closed captions can be supplied as WebVTT files.

## Writings

*The Land Remembers* has a native reading page at `writings/the-land-remembers/`, imported from the latest supplied Google Doc with photographs from `Writing Photos / The Land Remembers`. Its eleven numbered photographs follow the manuscript's placement markers; the 4 + 5, 6 + 7, and 8 + 11 pairs remain side by side. Each photograph opens in the shared viewer. Captions, italics, links, references, and paragraph order are preserved, while placement instructions are omitted from the published text.

A link to the New Nomad Institute publication is retained at the bottom. The article, source-file mapping, and image metadata are in `content/writings/the-land-remembers.json`.

Home features the first available essay with its actual photograph and opening text. The Writings list also shows a short excerpt. By default, previews use the first one or two complete sentences from the supplied article; an optional `excerpt` string in `content/portfolio.json` overrides that copy. Empty upcoming entries do not get invented previews.

*Moving with the Wild* at `writings/moving-with-the-wild/` includes nine photographs at the manuscript’s markers, with photographs 4 and 5 side by side. *museum of erasure* at `writings/museum-of-erasure/` preserves the poem’s line breaks, stanza spacing, italics, and closing date.

## Appearance

The header button switches between light and dark mode with a gentle fade of the page colors and borders. Reduced-motion preferences disable the animation, and saved appearance is applied before first paint. The initial appearance follows the system; an explicit choice is saved in browser local storage under `portfolio-theme` and shared across all pages. If storage is unavailable, the toggle still works for the current page. Photos retain their original colors.

Content fades in with a small upward movement when it first enters view, with a short stagger across gallery rows. Sticky containers retain their normal scrolling behavior. Keyboard focus, direct anchors, and history restoration show the relevant content immediately; reduced motion and printing skip the effects. Content remains visible when JavaScript or observation is unavailable. The photograph viewer uses brief opening and image fades without delaying dismissal.

## Validation

`npm run check` checks the generated routes and internal links, all local image references and dimensions, alt text, page headings, blank Contact, and JavaScript syntax. It also checks the gallery contents against the source-file inventory so a supplied photograph cannot be accidentally omitted or duplicated. Visual and interaction checks should also be made in a browser before public launch.
