# Closing narration and cabin exit

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
| Exit | A cabin EXIT light illuminates | 1 s steady reveal, then running-person restart button |

Technology, Protocols and Policy accumulate in italic serif type with muted blue, plum and ochre colors; lighter counterparts preserve their harmony in dark mode. Earlier narration accumulates until the farewell replaces it. Auto never opens the exit scene without an explicit Next, and never changes slides. The final EXIT light warms up once, without flickering. Once it is fully lit, the navigation rail disappears and the green running-person button appears with the label “Back to the beginning.” This reloads at Welcome so the entire story and default Auto setting start again; the saved theme remains.

The globe uses D3's orthographic spherical projection, shaded ocean/land and six illustrative raised connections originating at Atlanta. A single light travels along one route at a time. These are compositional city connections, not an airline schedule, measured traffic, or an encoded safety metric. Ambient motion stops when the slide is inactive, the end card opens, or the tab is hidden. Reduced motion freezes the globe and presents settled scenes, preserving the explicit Next boundary.

The footer divider's wick reflects the real reveal and reading-hold clock across chapters. It is described in [beat-timing.md](beat-timing.md).

## Artwork and offline use

- Land geometry: [Natural Earth 1:110m land](https://github.com/nvkelso/natural-earth-vector/blob/master/geojson/ne_110m_land.geojson), stripped of unused properties and rounded to three decimal places. [Natural Earth terms](https://www.naturalearthdata.com/about/terms-of-use/) place the map data in the public domain.
- EXIT light housing, lettering and running-person restart: inline SVG and CSS, inspired by the supplied cabin exit references. No stock photograph, custom font, or remote icon request is used.
- Authoring references: [D3 orthographic projection](https://d3js.org/d3-geo/azimuthal#geoOrthographic), [spherical interpolation](https://d3js.org/d3-geo/math#geoInterpolate).

Prepared geography lives in `src/assets/conclusion/`, alongside its input URL and hash. Regenerate with `python3 scripts/prepare_conclusion_art.py` on a developer machine. No CDN or art download happens at runtime. The Windows export embeds the entire conclusion. The earlier calligraphic end card and its font assets have been removed.
