# Closing narration and handwritten thanks

The eighth chapter is an atmospheric ending, with no quantitative chart or new aviation dataset. It keeps the user's confident narration and the existing light/dark controls.

| Beat | Narration / action | Motion and reading hold |
| --- | --- | --- |
| 0 | There’s really nothing to fear. | Title, then 1.8 s |
| 1 | We’ve come a long way. And we’re getting better still. | 650 ms fade + 3.2 s |
| 2 | Technology | 500 ms fade + 450 ms |
| 2.3 | Protocols | 500 ms fade + 450 ms |
| 2.6 | Policy | 500 ms fade + 650 ms |
| 3 | on all fronts, really. | 500 ms fade + 1.8 s |
| 4 | So lean your seat back and relax. You’ll have a safe flight :) | Earlier copy fades, globe eases to a quieter pace; waits for explicit Next |
| Thanks | “Thanks for watching” writes on with Penflow | 4.5 s, then a simple Back to the beginning button |

Technology, Protocols and Policy accumulate in italic serif type with muted blue, plum and ochre colors; lighter counterparts preserve their harmony in dark mode. Earlier narration accumulates until the farewell replaces it. Auto never opens the end card without an explicit Next, and never changes slides. “Back” is italicized in the farewell. The final phrase uses Penflow's glyph-contour handwriting renderer, followed by the earlier plain underlined “Back to the beginning” control. Restart reloads at Welcome, resets the story and default Auto, and preserves the saved theme.

The globe uses D3's orthographic spherical projection, shaded ocean/land and ten illustrative raised connections originating at Atlanta and thirty thinner, fainter onward connections from those hubs. A single light travels along one route at a time. These are compositional city connections, not an airline schedule, measured traffic, or an encoded safety metric. Ambient motion stops when the slide is inactive, the end card opens, or the tab is hidden. Reduced motion freezes the globe and presents settled scenes, preserving the explicit Next boundary.

The footer divider's wick reflects the real reveal and reading-hold clock across chapters. It is described in [beat-timing.md](beat-timing.md).

## Artwork and offline use

- Land geometry: [Natural Earth 1:110m land](https://github.com/nvkelso/natural-earth-vector/blob/master/geojson/ne_110m_land.geojson), stripped of unused properties and rounded to three decimal places. [Natural Earth terms](https://www.naturalearthdata.com/about/terms-of-use/) place the map data in the public domain.
- Handwriting: installed `penflow@0.1.0`, with bundled Pinyon Script under its SIL Open Font License. The TTF and its license are retained locally. No remote font request is needed.
- Penflow has no public seek/pause API in this version. `scripts/penflow-controlled.mjs` adds an optional controlled progress property at build time to its published React renderer; the slide's existing clock owns timing, Space, Back, Next-to-settle, overview and reduced motion. The adapter checks exact source anchors and fails if an upgrade changes them. Development excludes Penflow from prebundling so the same adapter runs in both development and production.
- Penflow's published tarball declares no license and includes no license file. The portable package preserves its package metadata and README as supplied; it does not invent a license declaration.
- Authoring references: [D3 orthographic projection](https://d3js.org/d3-geo/azimuthal#geoOrthographic), [spherical interpolation](https://d3js.org/d3-geo/math#geoInterpolate).

Prepared geography lives in `src/assets/conclusion/`, alongside its input URL and hash. Regenerate with `python3 scripts/prepare_conclusion_art.py` on a developer machine. No CDN or art download happens at runtime. The Windows export embeds the entire conclusion. The EXIT scene and running-person pictogram have been removed.
